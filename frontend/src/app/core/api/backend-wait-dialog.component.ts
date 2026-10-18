import { AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { BackendStatusComponent } from './backend-status.component';

@Component({
  selector: 'app-backend-wait-dialog', standalone: true, imports: [BackendStatusComponent],
  template: `<dialog #dialog aria-labelledby="backend-wait-title" aria-describedby="backend-wait-description" (cancel)="dismiss($event)">
    <span class="eyebrow">Orqestra Showcase</span><h2 id="backend-wait-title">Connecting to your workspace</h2>
    <p id="backend-wait-description">The free demo server may take a minute or longer to start. We're checking its availability before sending your sign-in request.</p>
    <app-backend-status></app-backend-status>
    <button type="button" autofocus (click)="cancelled.emit()">Cancel</button>
  </dialog>`,
  styles: [`dialog{width:min(28rem,calc(100% - 2rem));max-height:calc(100dvh - 2rem);overflow:auto;padding:1.75rem;border:1px solid var(--color-border-strong);border-radius:8px;background:var(--color-surface);color:var(--color-text);box-shadow:var(--shadow-raised)}dialog::backdrop{background:rgba(0,0,0,.7);backdrop-filter:blur(5px)}h2{font-size:1.3rem;margin:.5rem 0 .75rem}p{font-size:.875rem;color:var(--color-text-secondary);line-height:1.65}button{margin-top:1.5rem;background:var(--color-surface-raised);border:1px solid var(--color-border);color:var(--color-text)}`]
})
export class BackendWaitDialogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('dialog', { static: true }) dialog!: ElementRef<HTMLDialogElement>;
  @Output() cancelled = new EventEmitter<void>();
  ngAfterViewInit(): void { this.dialog.nativeElement.showModal(); }
  dismiss(event: Event): void { event.preventDefault(); this.cancelled.emit(); }
  ngOnDestroy(): void { this.dialog.nativeElement.close(); }
}
