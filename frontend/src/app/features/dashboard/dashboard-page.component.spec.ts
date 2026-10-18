import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { CurrentUser, UserRole } from '../../core/auth/auth.models';
import { UserService } from '../../core/users/user.service';
import { DashboardPageComponent } from './dashboard-page.component';
import { ProjectDashboardAnalytics } from './dashboard.models';
import { DashboardService } from './dashboard.service';

describe('DashboardPageComponent', () => {
  let dashboardService: jasmine.SpyObj<DashboardService>;
  let authService: jasmine.SpyObj<AuthService>;
  let userService: jasmine.SpyObj<UserService>;
  let currentRole: UserRole;

  beforeEach(async () => {
    currentRole = 'ADMIN';
    dashboardService = jasmine.createSpyObj('DashboardService', ['summary', 'projectSummary', 'projectAnalytics', 'pipeline', 'recentActivities']);
    dashboardService.projectAnalytics.and.returnValue(of(analytics('ADMIN')));
    dashboardService.projectSummary.and.returnValue(of({
      totalProjects: 2, activeProjects: 1, nearingDeadlineProjects: 0, overdueProjects: 0,
      vendorsContacted: 1, vendorsAwaitingResponse: 1, quotationsReceived: 1, quotationsPending: 1,
      quoteResponseRate: 50, upcomingFollowUps: 1, overdueFollowUps: 0, projectsByStatus: [],
      quotationValueByCurrency: [], recentActivities: []
    }));
    dashboardService.summary.and.returnValue(of({ totalLeads: 3, leadsByStatus: [], openOpportunities: 1, openPipelineValue: [], recentInteractionCount: 0 }));
    dashboardService.pipeline.and.returnValue(of([]));
    dashboardService.recentActivities.and.returnValue(of([]));

    authService = jasmine.createSpyObj('AuthService', ['currentUser']);
    authService.currentUser.and.callFake((): CurrentUser => ({ id: 'user-1', fullName: 'Amina Haddad', email: 'amina@example.com', role: currentRole }));
    userService = jasmine.createSpyObj('UserService', ['dashboardAssociates']);
    userService.dashboardAssociates.and.returnValue(of([{ id: 'user-1', fullName: 'Amina Haddad', active: true }]));

    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent, RouterTestingModule],
      providers: [
        { provide: DashboardService, useValue: dashboardService },
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService }
      ]
    }).compileComponents();
  });

  it('loads analytics and maps the four operational charts', () => {
    const fixture = createFixture();

    expect(fixture.componentInstance.analytics?.totalProjects).toBe(2);
    expect(dashboardService.projectAnalytics).toHaveBeenCalledWith('LAST_90_DAYS', undefined);
    expect(fixture.componentInstance.projectStatusOption.series).toBeDefined();
    expect(fixture.componentInstance.vendorOutreachOption.series).toBeDefined();
    expect(fixture.componentInstance.quotationTrendOption.series).toBeDefined();
    expect(fixture.componentInstance.workloadOption.series).toBeDefined();
  });

  it('displays the same initial trend period that is sent to the API', () => {
    const fixture = createFixture();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('.compact-filter select');
    expect(select.value).toBe('LAST_90_DAYS');
    expect(select.selectedOptions[0].textContent).toContain('Last 90 days');
    expect(dashboardService.projectAnalytics).toHaveBeenCalledWith('LAST_90_DAYS', undefined);
  });

  it('reloads role-scoped analytics when dashboard filters change', () => {
    const fixture = createFixture();
    dashboardService.projectAnalytics.calls.reset();

    fixture.componentInstance.selectDateRange('THIS_YEAR');
    fixture.componentInstance.selectAssociate('associate-2');

    expect(dashboardService.projectAnalytics).toHaveBeenCalledWith('THIS_YEAR', undefined);
    expect(dashboardService.projectAnalytics).toHaveBeenCalledWith('THIS_YEAR', 'associate-2');
  });

  it('hides the associate filter and uses personal labels for Associates', () => {
    currentRole = 'SALES_REP';
    dashboardService.projectAnalytics.and.returnValue(of(analytics('SALES_REP')));
    const fixture = createFixture();

    expect(userService.dashboardAssociates).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('My dashboard');
    expect(fixture.nativeElement.querySelectorAll('.compact-filter').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('My workload');
  });

  it('shows an error when authorized analytics cannot be loaded', () => {
    dashboardService.projectAnalytics.and.returnValue(throwError(() => new Error('down')));
    const fixture = createFixture();

    expect(fixture.componentInstance.error).toContain('could not be loaded');
  });

  it('includes assigned inactive Associates and keeps currency totals separated', () => {
    userService.dashboardAssociates.and.returnValue(of([{id:'inactive',fullName:'Nadia Benali',active:false}]));
    const fixture=createFixture();
    expect(fixture.nativeElement.textContent).toContain('Nadia Benali (inactive)');
    fixture.componentInstance.selectCurrency('USD'); fixture.detectChanges();
    const rows=fixture.nativeElement.querySelectorAll('.quotation-currencies > div');
    expect(rows.length).toBe(1); expect(rows[0].textContent).toContain('USD');
    expect(rows[0].textContent).toContain('17,200.00');
  });

  function createFixture(): ComponentFixture<DashboardPageComponent> {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  function analytics(role: UserRole): ProjectDashboardAnalytics {
    return {
      role, dateRange: 'LAST_90_DAYS', trendStartDate: '2026-07-18', trendEndDate: '2026-10-15', trendGranularity: 'MONTH',
      selectedAssociateId: role === 'SALES_REP' ? 'user-1' : null, selectedAssociateName: role === 'SALES_REP' ? 'Amina Haddad' : null,
      totalProjects: 2, activeProjects: 1, completedProjects: 1, nearingDeadlineProjects: 1, overdueProjects: 0,
      totalVendorAssignments: 2, vendorsAwaitingResponse: 1, quotationsReceived: 2, vendorAssignmentsWithQuotes: 1,
      quoteResponseRate: 50, followUpsDueToday: 1, overdueFollowUps: 0, upcomingFollowUps: 1,
      projectsByStatus: [{ status: 'IN_PROGRESS', count: 1 }, { status: 'COMPLETED', count: 1 }],
      vendorOutreachByStatus: [{ status: 'SOW_SENT', count: 1 }, { status: 'QUOTE_RECEIVED', count: 1 }],
      quotationTrends: [{ periodStart: '2026-09-01', quotationCount: 1 }, { periodStart: '2026-10-01', quotationCount: 1 }],
      associateWorkloads: [{ associateId: 'user-1', associateName: 'Amina Haddad', activeProjects: 1, dueFollowUps: 1 }],
      quotationValueByCurrency: [{ currencyCode: 'USD', amount: 17200 }]
    };
  }
});
