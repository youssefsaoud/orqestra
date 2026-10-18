import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { OpportunitiesPageComponent } from './opportunities-page.component';
import { OpportunityService } from './opportunity.service';
import { PipelineSummary } from './opportunity.models';

describe('OpportunitiesPageComponent presentation', () => {
  let service: jasmine.SpyObj<OpportunityService>;
  const summary: PipelineSummary[] = [
    { stage: 'PROPOSAL', currencyCode: 'MAD', count: 1, totalAmount: 185000 },
    { stage: 'PROPOSAL', currencyCode: 'USD', count: 3, totalAmount: 36500 },
    { stage: 'PROPOSAL', currencyCode: 'EUR', count: 2, totalAmount: 24800 }
  ];

  beforeEach(async () => {
    service = jasmine.createSpyObj('OpportunityService', ['search', 'pipelineSummary']);
    service.pipelineSummary.and.returnValue(of(summary));
    service.search.and.returnValue(of({ content: [{
      id: 'opportunity-a', name: 'Campus network modernization', companyId: 'company-a', companyName: 'Aster Education Network',
      ownerUserId: 'owner-a', ownerName: 'Amina El Mansouri', stage: 'PROPOSAL', amount: 24800, currencyCode: 'EUR',
      expectedCloseDate: '2026-10-08', createdAt: '2026-09-01T09:00:00Z', updatedAt: '2026-09-04T10:00:00Z'
    }], totalElements: 1, totalPages: 1, number: 0, size: 10, first: true, last: true }));
    await TestBed.configureTestingModule({
      imports: [OpportunitiesPageComponent, RouterTestingModule],
      providers: [{ provide: OpportunityService, useValue: service }]
    }).compileComponents();
  });

  function render() {
    const fixture = TestBed.createComponent(OpportunitiesPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows one prominent stage count and separate aligned currency values without summing money', () => {
    const fixture = render();
    const card: HTMLElement = fixture.nativeElement.querySelector('[aria-labelledby="stage-PROPOSAL"]');
    expect(card.querySelector('.pipeline-count strong')?.textContent).toBe('6');
    expect(Array.from(card.querySelectorAll('dt')).map(e => e.textContent)).toEqual(['EUR', 'USD', 'MAD']);
    expect(Array.from(card.querySelectorAll('dd')).map(e => e.textContent)).toEqual(['24,800.00', '36,500.00', '185,000.00']);
    expect(summary.map(row => row.currencyCode)).toEqual(['MAD', 'USD', 'EUR']);
    expect(fixture.nativeElement.querySelectorAll('.pipeline-board article').length).toBe(6);
  });

  it('handles empty stages and preserves unknown currencies with a neutral fallback', () => {
    const fixture = render();
    fixture.componentInstance.summary = [{ stage: 'PROPOSAL', currencyCode: 'GBP', count: 1, totalAmount: 9832.25 }];
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-labelledby="stage-PROSPECTING"] .pipeline-count strong').textContent).toBe('0');
    expect(fixture.nativeElement.querySelector('[aria-labelledby="stage-PROSPECTING"]').textContent).toContain('No pipeline value');
    const badge = fixture.nativeElement.querySelector('[aria-labelledby="stage-PROPOSAL"] dt');
    expect(badge.textContent).toBe('GBP');
    expect(badge.classList.contains('eur')).toBeFalse();
    expect(badge.classList.contains('mad')).toBeFalse();
  });

  it('formats dates, preserves readable money and owners, and exposes a keyboard-scrollable table', () => {
    const fixture = render();
    const region: HTMLElement = fixture.nativeElement.querySelector('[role="region"]');
    expect(region.tabIndex).toBe(0);
    expect(region.getAttribute('aria-label')).toBe('Opportunities table');
    const date = region.querySelector('time');
    expect(date?.textContent).toBe('08 Oct 2026');
    expect(date?.getAttribute('datetime')).toBe('2026-10-08');
    expect(region.querySelector('.owner-cell')?.textContent).toBe('Amina El Mansouri');
    expect(region.querySelector('.amount-cell app-money')?.textContent).toContain('24,800.00');
    expect(region.querySelector('.action-cell a')?.textContent).toBe('View');
    expect(region.querySelector('.action-cell a')?.getAttribute('href')).toBe('/opportunities/opportunity-a');
  });

  it('preserves stage filtering and pagination reset independently of the summary', () => {
    const fixture = render();
    fixture.componentInstance.page = 3;
    fixture.componentInstance.stageControl.setValue('PROPOSAL');
    expect(service.search).toHaveBeenCalledWith({ search: '', stage: 'PROPOSAL', page: 0, size: 10 });
    expect(fixture.componentInstance.countFor('PROPOSAL')).toBe(6);
    expect(service.pipelineSummary).toHaveBeenCalledTimes(1);
  });
});
