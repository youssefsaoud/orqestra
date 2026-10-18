import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ShowcaseService } from './showcase.service';

@Component({
  selector: 'app-showcase-dialog', standalone: true,
  template: `
    <dialog #dialog aria-labelledby="showcase-title" aria-describedby="showcase-description" (cancel)="close()" (close)="restoreFocus()">
      <img src="assets/brand/orqestra-symbol.png" alt="" width="44" height="44">
      <h2 id="showcase-title">{{ welcome ? 'Welcome to Orqestra Showcase' : 'Available in the Full Version' }}</h2>
      <p id="showcase-description">{{ welcome
        ? "You're viewing the read-only online demonstration of Orqestra. Explore projects, vendors, quotations, documents, and operational dashboards using realistic synthetic data."
        : "You're exploring Orqestra's read-only online showcase. Creating, editing, and managing records is available in the full application, which you can run locally with Docker." }}</p>
      <p [hidden]="!welcome">To create, edit, upload, or manage records, run the full Orqestra application locally using Docker.</p>
      <div class="showcase-actions">
        <button type="button" autofocus (click)="close()">{{ welcome ? 'Start Exploring' : 'Continue Exploring' }}</button>
        <a href="https://github.com/youssefsaoud/orqestra" target="_blank" rel="noopener noreferrer">{{ welcome ? 'View Full Version on GitHub' : 'Explore Full Version' }}</a>
      </div>
    </dialog>`,
  styles: [`
    dialog { box-sizing:border-box; width:calc(100% - 32px); max-width:520px; max-height:calc(100dvh - 48px); overflow:auto; padding:32px; color:var(--color-text); background:var(--color-surface, #17191f); border:1px solid #353b48; border-radius:8px; box-shadow:0 24px 80px #03060bcc; }
    dialog::backdrop { background:#06080db8; backdrop-filter:blur(6px); }
    img { display:block; margin-bottom:20px; }
    h2 { font-family:var(--font-display); font-size:24px; line-height:1.3; margin:0 0 16px; }
    p { color:#b8bdc9; font-size:14px; line-height:1.7; margin:0 0 16px; }
    .showcase-actions { display:flex; flex-wrap:wrap; gap:12px; align-items:center; margin-top:24px; }
    button,a { box-sizing:border-box; padding:11px 14px; font:inherit; font-size:13px; border-radius:6px; text-decoration:none; }
    button { color:white; background:#1769d6; border:1px solid #3989f3; cursor:pointer; }
    button:hover { background:#237be9; } a { color:#a8ccff; }
    a:hover { background:#232832; } :is(a,button):focus-visible { outline:2px solid #84b8ff; outline-offset:3px; }
    @media(max-width:480px) { dialog { padding:24px; } h2 { font-size:21px; } .showcase-actions { align-items:stretch; flex-direction:column; } a { text-align:center; } }
  `]
})
export class ShowcaseDialogComponent implements OnDestroy {
  welcome = false;
  private previous: HTMLElement | null = null;
  private subscription?: Subscription;
  @ViewChild('dialog', { static: true }) set dialogRef(ref: ElementRef<HTMLDialogElement>) {
    this.dialog = ref.nativeElement;
    this.subscription = this.showcase.dialog$.subscribe(mode => {
      if (!mode) { this.dialog.close(); return; }
      this.welcome = mode === 'welcome';
      if (!this.dialog.open) {
        this.previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        this.dialog.showModal();
      }
    });
  }
  private dialog!: HTMLDialogElement;
  constructor(private readonly showcase: ShowcaseService) {}
  close(): void { this.showcase.close(); }
  restoreFocus(): void {
    if (this.previous?.isConnected) this.previous.focus();
    else document.querySelector<HTMLElement>('#main-content')?.focus();
  }
  ngOnDestroy(): void { this.subscription?.unsubscribe(); this.dialog?.close(); }
}
