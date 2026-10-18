import { MoneyComponent } from '../../shared/money.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { Opportunity, OpportunityStage } from './opportunity.models';
import { OpportunityService } from './opportunity.service';
import { InteractionTimelineComponent } from '../interactions/interaction-timeline.component';

@Component({ selector: 'app-opportunity-detail-page', standalone: true, imports: [MoneyComponent, CommonModule, ReactiveFormsModule, RouterLink, InteractionTimelineComponent], templateUrl: './opportunity-detail-page.component.html', styleUrls: ['./opportunity-detail-page.component.css'] })
export class OpportunityDetailPageComponent implements OnInit {
  readonly currentUser$ = this.authService.currentUser$;
  readonly stages: OpportunityStage[] = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
  readonly stageControl = new FormControl<OpportunityStage>('PROSPECTING', { nonNullable: true });
  readonly ownerControl = new FormControl('', { nonNullable: true });
  opportunity: Opportunity | null = null;
  loading = false;
  error = '';

  constructor(private readonly route: ActivatedRoute, private readonly router: Router, private readonly opportunityService: OpportunityService, private readonly authService: AuthService) {}

  ngOnInit(): void { const id = this.route.snapshot.paramMap.get('id'); if (!id) { this.router.navigateByUrl('/opportunities'); return; } this.load(id); }

  changeStage(): void { if (!this.opportunity) { return; } this.opportunityService.changeStage(this.opportunity.id, this.stageControl.value).subscribe({ next: (opportunity) => this.apply(opportunity), error: (error) => this.error = apiErrorMessage(error, 'Stage could not be changed.') }); }
  changeOwner(): void { if (!this.opportunity || !this.ownerControl.value.trim()) { return; } this.opportunityService.changeOwner(this.opportunity.id, this.ownerControl.value.trim()).subscribe({ next: (opportunity) => this.apply(opportunity), error: (error) => this.error = apiErrorMessage(error, 'Owner could not be changed.') }); }
  deleteOpportunity(): void { if (!this.opportunity || !confirm('Delete this opportunity?')) { return; } this.opportunityService.delete(this.opportunity.id).subscribe({ next: () => this.router.navigateByUrl('/opportunities'), error: (error) => this.error = apiErrorMessage(error, 'Opportunity could not be deleted.') }); }
  canManage(role: string): boolean { return role === 'ADMIN' || role === 'MANAGER'; }
  stageLabel(stage: string): string { return stage.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase()); }

  private load(id: string): void { this.loading = true; this.error = ''; this.opportunityService.get(id).subscribe({ next: (opportunity) => { this.apply(opportunity); this.loading = false; }, error: (error) => { this.error = apiErrorMessage(error, 'Opportunity not found.'); this.loading = false; } }); }
  private apply(opportunity: Opportunity): void { this.opportunity = opportunity; this.stageControl.setValue(opportunity.stage, { emitEvent: false }); this.ownerControl.setValue(opportunity.ownerUserId ?? '', { emitEvent: false }); }
}
