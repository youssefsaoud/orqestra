import { MoneyComponent } from '../../shared/money.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { Opportunity, OpportunityStage, PipelineSummary } from './opportunity.models';
import { OpportunityService } from './opportunity.service';

@Component({
  selector: 'app-opportunities-page',
  standalone: true,
  imports: [MoneyComponent, CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './opportunities-page.component.html',
  styleUrls: ['./opportunities-page.component.css']
})
export class OpportunitiesPageComponent implements OnInit {
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly stageControl = new FormControl<OpportunityStage | ''>('', { nonNullable: true });
  readonly stages: OpportunityStage[] = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];

  opportunities: Opportunity[] = [];
  summary: PipelineSummary[] = [];
  loading = false;
  error = '';
  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(private readonly opportunityService: OpportunityService) {}

  ngOnInit(): void {
    this.load();
    this.loadSummary();
    this.searchControl.valueChanges.pipe(debounceTime(250), distinctUntilChanged()).subscribe(() => this.resetAndLoad());
    this.stageControl.valueChanges.subscribe(() => this.resetAndLoad());
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.opportunityService.search({ search: this.searchControl.value, stage: this.stageControl.value, page: this.page, size: this.size }).subscribe({
      next: (result) => {
        this.opportunities = result.content;
        this.totalElements = result.totalElements;
        this.totalPages = result.totalPages;
        this.loading = false;
      },
      error: () => {
        this.error = 'Could not load opportunities.';
        this.loading = false;
      }
    });
  }

  loadSummary(): void {
    this.opportunityService.pipelineSummary().subscribe({ next: (summary) => this.summary = summary, error: () => this.summary = [] });
  }

  nextPage(): void { if (this.page + 1 < this.totalPages) { this.page += 1; this.load(); } }
  previousPage(): void { if (this.page > 0) { this.page -= 1; this.load(); } }

  totalFor(stage: OpportunityStage): PipelineSummary[] {
    const order = ['EUR', 'USD', 'MAD'];
    const rank = (code: string) => order.includes(code) ? order.indexOf(code) : order.length;
    return this.summary.filter((item) => item.stage === stage)
      .sort((a, b) => rank(a.currencyCode) - rank(b.currencyCode) || a.currencyCode.localeCompare(b.currencyCode));
  }

  countFor(stage: OpportunityStage): number {
    return this.totalFor(stage).reduce((count, item) => count + item.count, 0);
  }

  label(value: string): string { return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase()); }

  private resetAndLoad(): void {
    this.page = 0;
    this.load();
  }
}
