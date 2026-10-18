import { MoneyComponent } from '../../shared/money.component';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import type { EChartsOption } from 'echarts';

import { AuthService } from '../../core/auth/auth.service';
import { UserSummary } from '../../core/users/user.models';
import { UserService } from '../../core/users/user.service';
import { DashboardChartComponent, DashboardChartSelection } from './dashboard-chart.component';
import {
  DashboardCurrencyTotal,
  DashboardDateRange,
  DashboardSummary,
  PipelineStageSummary,
  ProjectDashboardActivity,
  ProjectDashboardAnalytics,
  ProjectDashboardSummary,
  RecentActivity
} from './dashboard.models';
import { DashboardService } from './dashboard.service';

interface PipelineStageView {
  stage: string;
  count: number;
  totals: DashboardCurrencyTotal[];
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, DashboardChartComponent, MoneyComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.css']
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  private analyticsRequest?: Subscription;
  private readonly subscriptions = new Subscription();
  readonly dateRanges: { value: DashboardDateRange; label: string }[] = [
    { value: 'LAST_30_DAYS', label: 'Last 30 days' },
    { value: 'LAST_90_DAYS', label: 'Last 90 days' },
    { value: 'THIS_YEAR', label: 'This year' },
    { value: 'ALL_TIME', label: 'All time' }
  ];

  analytics: ProjectDashboardAnalytics | null = null;
  projectSummary: ProjectDashboardSummary | null = null;
  summary: DashboardSummary | null = null;
  pipeline: PipelineStageSummary[] = [];
  activities: RecentActivity[] = [];
  associates: UserSummary[] = [];
  selectedDateRange: DashboardDateRange = 'LAST_90_DAYS';
  selectedAssociateId = '';
  selectedCurrency = 'ALL';
  loading = false;
  error = '';

  projectStatusOption: EChartsOption = {};
  vendorOutreachOption: EChartsOption = {};
  quotationTrendOption: EChartsOption = {};
  workloadOption: EChartsOption = {};

  private readonly currentUser = this.authService.currentUser();
  private readonly chartText = '#a1a1aa';
  private readonly chartGrid = '#2a2d35';
  private readonly chartTooltip = {
    backgroundColor: '#111318',
    borderColor: '#353945',
    borderWidth: 1,
    textStyle: { color: '#f5f5f7', fontFamily: 'Geist Variable, sans-serif' }
  };

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly router: Router
  ) {}

  get canFilterAssociates(): boolean {
    return this.currentUser?.role === 'ADMIN' || this.currentUser?.role === 'MANAGER';
  }

  get isAssociate(): boolean {
    return this.currentUser?.role === 'SALES_REP';
  }

  get scopeLabel(): string {
    if (this.isAssociate) return 'Your assigned projects';
    if (this.analytics?.selectedAssociateName) return `${this.analytics.selectedAssociateName}'s projects`;
    return 'Organization-wide authorized projects';
  }

  get availableCurrencies(): string[] {
    const currencies = new Set<string>();
    this.analytics?.quotationValueByCurrency.forEach(item => currencies.add(item.currencyCode));
    this.summary?.openPipelineValue.forEach(item => currencies.add(item.currencyCode));
    this.pipeline.forEach(item => currencies.add(item.currencyCode));
    return [...currencies].sort();
  }

  get groupedPipeline(): PipelineStageView[] {
    const grouped = new Map<string, PipelineStageView>();
    this.pipeline
      .filter(item => this.selectedCurrency === 'ALL' || item.currencyCode === this.selectedCurrency)
      .forEach(item => {
        const row = grouped.get(item.stage) || { stage: item.stage, count: 0, totals: [] };
        row.count += item.count;
        row.totals.push({ currencyCode: item.currencyCode, amount: item.totalAmount });
        grouped.set(item.stage, row);
      });
    return [...grouped.values()];
  }

  get hasTrendData(): boolean {
    return this.analytics?.quotationTrends.some(item => item.quotationCount > 0) ?? false;
  }

  get hasWorkloadData(): boolean {
    return this.analytics?.associateWorkloads.some(item => item.activeProjects > 0 || item.dueFollowUps > 0) ?? false;
  }

  ngOnInit(): void {
    if (this.canFilterAssociates) {
      this.subscriptions.add(this.userService.salesRepresentatives().subscribe({ next: associates => this.associates = associates, error: () => this.associates = [] }));
    }
    this.load();
  }

  load(): void {
    this.loadAnalytics();
    this.loadSupportingData();
  }

  selectDateRange(range: DashboardDateRange): void {
    if (range === this.selectedDateRange) return;
    this.selectedDateRange = range;
    this.loadAnalytics();
  }

  selectAssociate(associateId: string): void {
    if (!this.canFilterAssociates || associateId === this.selectedAssociateId) return;
    this.selectedAssociateId = associateId;
    this.loadAnalytics();
  }

  selectCurrency(currency: string): void {
    this.selectedCurrency = currency;
  }

  currencyTotals(values: DashboardCurrencyTotal[] | undefined): DashboardCurrencyTotal[] {
    const totals = (values || []).filter(item => this.selectedCurrency === 'ALL' || item.currencyCode === this.selectedCurrency);
    return totals.length ? totals : this.selectedCurrency === 'ALL' ? [] : [{ currencyCode: this.selectedCurrency, amount: 0 }];
  }

  displayTotals(values: DashboardCurrencyTotal[] | undefined): string {
    const filtered = (values || []).filter(item => this.selectedCurrency === 'ALL' || item.currencyCode === this.selectedCurrency);
    if (filtered.length === 0) return this.selectedCurrency === 'ALL' ? 'No recorded value' : `0 ${this.selectedCurrency}`;
    return filtered.map(item => `${item.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${item.currencyCode}`).join(' · ');
  }

  statusLabel(value: string): string {
    return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase());
  }

  activityLink(activity: RecentActivity): string[] {
    if (activity.opportunityId) return ['/opportunities', activity.opportunityId];
    if (activity.leadId) return ['/leads', activity.leadId];
    if (activity.contactId) return ['/contacts', activity.contactId];
    if (activity.companyId) return ['/companies', activity.companyId];
    return ['/dashboard'];
  }

  activityTarget(activity: RecentActivity): string {
    return activity.opportunityName || activity.leadName || activity.contactName || activity.companyName || 'CRM record';
  }

  projectActivityLink(activity: ProjectDashboardActivity): string[] {
    return ['/projects', activity.projectId];
  }

  onProjectStatusSelected(selection: DashboardChartSelection): void {
    const status = (selection.data as { status?: string } | undefined)?.status;
    if (status) void this.router.navigate(['/projects'], { queryParams: { status } });
  }

  onAssociateSelected(selection: DashboardChartSelection): void {
    if (!this.canFilterAssociates) return;
    const associateId = (selection.data as { associateId?: string } | undefined)?.associateId;
    if (associateId) this.selectAssociate(associateId);
  }

  private loadAnalytics(): void {
    this.analyticsRequest?.unsubscribe();
    this.loading = true;
    this.error = '';
    this.analyticsRequest = this.dashboardService.projectAnalytics(this.selectedDateRange, this.selectedAssociateId || undefined).subscribe({
      next: analytics => {
        this.analytics = analytics;
        this.buildCharts(analytics);
        this.loading = false;
      },
      error: () => {
        this.analytics = null;
        this.error = 'Operational analytics could not be loaded.';
        this.loading = false;
      }
    });
  }

  private loadSupportingData(): void {
    this.subscriptions.add(this.dashboardService.projectSummary().subscribe({ next: summary => this.projectSummary = summary, error: () => this.projectSummary = null }));
    this.subscriptions.add(this.dashboardService.summary().subscribe({ next: summary => this.summary = summary, error: () => this.summary = null }));
    this.subscriptions.add(this.dashboardService.pipeline().subscribe({ next: pipeline => this.pipeline = pipeline, error: () => this.pipeline = [] }));
    this.subscriptions.add(this.dashboardService.recentActivities(10).subscribe({ next: activities => this.activities = activities, error: () => this.activities = [] }));
  }

  ngOnDestroy(): void { this.analyticsRequest?.unsubscribe(); this.subscriptions.unsubscribe(); }

  private buildCharts(data: ProjectDashboardAnalytics): void {
    const projectColors = ['#4b9bff', '#75b6ff', '#e9b75f', '#46c98a', '#ff7285'];
    this.projectStatusOption = {
      color: projectColors,
      tooltip: { ...this.chartTooltip, trigger: 'item', valueFormatter: value => `${value} projects` },
      legend: { bottom: 0, type: 'scroll', textStyle: { color: this.chartText, fontFamily: 'Geist Variable, sans-serif' } },
      series: [{
        name: 'Projects', type: 'pie', radius: ['55%', '77%'], center: ['50%', '43%'], avoidLabelOverlap: true,
        itemStyle: { borderColor: '#17191f', borderWidth: 3, borderRadius: 4 }, label: { show: false },
        emphasis: { scaleSize: 6, label: { show: true, color: '#f5f5f7', fontSize: 13, fontWeight: 600, formatter: '{b}\n{c}' } },
        data: data.projectsByStatus.map(item => ({ name: this.statusLabel(item.status), value: item.count, status: item.status }))
      }]
    };

    const outreachColors: Record<string, string> = {
      NOT_CONTACTED: '#71717a', NO_CONTACT_REACHED: '#8b8b95', SOW_SENT: '#e9b75f',
      QUOTE_IN_PROCESS: '#75b6ff', QUOTE_RECEIVED: '#46c98a', QUOTE_DECLINED: '#ff7285'
    };
    this.vendorOutreachOption = {
      tooltip: { ...this.chartTooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { top: 8, right: 18, bottom: 24, left: 128 },
      xAxis: { type: 'value', minInterval: 1, axisLabel: { color: this.chartText }, splitLine: { lineStyle: { color: this.chartGrid } } },
      yAxis: { type: 'category', inverse: true, data: data.vendorOutreachByStatus.map(item => this.statusLabel(item.status)), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: this.chartText, width: 116, overflow: 'truncate' } },
      series: [{ type: 'bar', barMaxWidth: 18, data: data.vendorOutreachByStatus.map(item => ({ value: item.count, status: item.status, itemStyle: { color: outreachColors[item.status] || '#4b9bff', borderRadius: [0, 4, 4, 0] } })) }]
    };

    const dateFormatter = new Intl.DateTimeFormat(undefined, data.trendGranularity === 'DAY' ? { month: 'short', day: 'numeric' } : { month: 'short', year: '2-digit' });
    this.quotationTrendOption = {
      tooltip: { ...this.chartTooltip, trigger: 'axis' },
      grid: { top: 16, right: 18, bottom: 42, left: 42 },
      xAxis: { type: 'category', boundaryGap: false, data: data.quotationTrends.map(item => dateFormatter.format(new Date(`${item.periodStart}T00:00:00`))), axisLine: { lineStyle: { color: this.chartGrid } }, axisLabel: { color: this.chartText, hideOverlap: true } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: this.chartText }, splitLine: { lineStyle: { color: this.chartGrid } } },
      series: [{ name: 'Quotation submissions', type: 'line', smooth: 0.3, symbol: data.quotationTrends.length <= 12 ? 'circle' : 'none', symbolSize: 7, lineStyle: { color: '#4b9bff', width: 2.5 }, itemStyle: { color: '#75b6ff' }, areaStyle: { color: 'rgba(35,131,255,.12)' }, data: data.quotationTrends.map(item => item.quotationCount) }]
    };

    this.workloadOption = {
      color: ['#4b9bff', '#e9b75f'],
      tooltip: { ...this.chartTooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { top: 0, right: 0, textStyle: { color: this.chartText } },
      grid: { top: 40, right: 18, bottom: 24, left: 118 },
      xAxis: { type: 'value', minInterval: 1, axisLabel: { color: this.chartText }, splitLine: { lineStyle: { color: this.chartGrid } } },
      yAxis: { type: 'category', inverse: true, data: data.associateWorkloads.map(item => item.associateName), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: this.chartText, width: 108, overflow: 'truncate' } },
      series: [
        { name: 'Active projects', type: 'bar', barMaxWidth: 15, data: data.associateWorkloads.map(item => ({ value: item.activeProjects, associateId: item.associateId })), itemStyle: { borderRadius: [0, 3, 3, 0] } },
        { name: 'Follow-ups due', type: 'bar', barMaxWidth: 15, data: data.associateWorkloads.map(item => ({ value: item.dueFollowUps, associateId: item.associateId })), itemStyle: { borderRadius: [0, 3, 3, 0] } }
      ]
    };
  }
}
