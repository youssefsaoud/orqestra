import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ShowcaseService {
  readonly dialog$ = new BehaviorSubject<'welcome' | 'restricted' | null>(null);
  private welcomed = false;

  restricted(): void { this.dialog$.next('restricted'); }

  welcome(): void {
    try { this.welcomed ||= sessionStorage.getItem('orqestra-showcase-welcome') === 'seen'; } catch { /* Storage can be unavailable. */ }
    if (this.welcomed) return;
    this.welcomed = true;
    try { sessionStorage.setItem('orqestra-showcase-welcome', 'seen'); } catch { /* In-memory state still prevents repeated navigation prompts. */ }
    this.dialog$.next('welcome');
  }

  close(): void { this.dialog$.next(null); }
}
