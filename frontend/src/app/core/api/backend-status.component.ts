import { AsyncPipe, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { BackendState, BackendStatusService } from './backend-status.service';

@Component({
  selector: 'app-backend-status', standalone: true, imports: [AsyncPipe, NgIf],
  template: `<span class="api-status" *ngIf="backend.state$ | async as state" role="status" [class]="'api-status ' + state">
    <span class="dot" aria-hidden="true"></span><span>{{ compact ? 'API: ' : 'Backend: ' }}{{ labels[state] }}</span>
    <button *ngIf="state === 'unavailable'" type="button" (click)="backend.retry()" aria-label="Retry API connection">Retry</button>
  </span>`,
  styles: [`.api-status{display:flex;align-items:center;flex-wrap:wrap;gap:.5rem;color:var(--color-text-secondary);font-size:.75rem;line-height:1.5}.dot{width:.45rem;height:.45rem;flex:0 0 auto;border-radius:50%;background:var(--color-warning)}.ready .dot{background:var(--color-success)}.unavailable .dot{background:var(--color-danger)}button{min-height:1.75rem;padding:.2rem .5rem;border:1px solid var(--color-border);background:transparent;color:var(--color-accent-hover);font-size:inherit}`]
})
export class BackendStatusComponent {
  @Input() compact = false;
  readonly labels: Record<BackendState, string> = { checking: 'Checking', waking: 'Waking up', ready: 'Ready', unavailable: 'Unavailable' };
  constructor(readonly backend: BackendStatusService) {}
}
