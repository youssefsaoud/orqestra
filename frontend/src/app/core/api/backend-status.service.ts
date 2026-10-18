import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, catchError, filter, map, of, take, timeout, timer } from 'rxjs';
import { HealthService } from './health.service';

export type BackendState = 'checking' | 'waking' | 'ready' | 'unavailable';

@Injectable({ providedIn: 'root' })
export class BackendStatusService implements OnDestroy {
  private readonly stateSubject = new BehaviorSubject<BackendState>('checking');
  readonly state$ = this.stateSubject.asObservable();
  private request?: Subscription;
  private retryTimer?: Subscription;
  private watchers = 0;
  private startedAt = 0;
  private lastReady = 0;
  private readonly visibility = () => {
    if (document.hidden) this.stop();
    else if (Date.now() - this.lastReady > 60000) this.retry();
  };
  private readonly online = () => this.retry();
  private readonly offline = () => { this.stop(); this.stateSubject.next('unavailable'); };

  constructor(private readonly health: HealthService) {}
  get state(): BackendState { return this.stateSubject.value; }

  monitor(): () => void {
    if (++this.watchers === 1) {
      document.addEventListener('visibilitychange', this.visibility);
      window.addEventListener('online', this.online);
      window.addEventListener('offline', this.offline);
      if (!this.lastReady || Date.now() - this.lastReady > 60000) this.retry();
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (--this.watchers === 0) {
        this.stop();
        document.removeEventListener('visibilitychange', this.visibility);
        window.removeEventListener('online', this.online);
        window.removeEventListener('offline', this.offline);
      }
    };
  }

  retry(): void {
    if (this.request && !this.request.closed) return;
    this.stop();
    this.startedAt = Date.now();
    this.stateSubject.next('checking');
    this.check();
  }

  whenReady(): Observable<boolean> {
    if (this.state === 'ready') return of(true);
    if (this.state === 'unavailable') this.retry();
    return this.state$.pipe(filter(state => state === 'ready' || state === 'unavailable'), take(1),
      map(state => state === 'ready'), timeout(190000), catchError(() => of(false)));
  }

  recordResponse(status: number): void {
    if (status > 0 && status < 500) this.ready();
    else if (this.watchers && this.state === 'ready') this.retry();
  }

  private check(): void {
    if (!this.watchers || document.hidden) return;
    if (!navigator.onLine) { this.offline(); return; }
    this.request = this.health.getHealth().pipe(timeout(10000)).subscribe({
      next: response => response.status === 'UP' ? this.ready() : this.failed(),
      error: () => this.failed()
    });
  }

  private ready(): void {
    this.lastReady = Date.now();
    this.stateSubject.next('ready');
    this.stop();
  }

  private failed(): void {
    if (Date.now() - this.startedAt >= 180000) { this.stateSubject.next('unavailable'); return; }
    this.stateSubject.next('waking');
    this.retryTimer = timer(15000).subscribe(() => this.check());
  }

  private stop(): void { this.request?.unsubscribe(); this.retryTimer?.unsubscribe(); }
  ngOnDestroy(): void {
    this.stop();
    document.removeEventListener('visibilitychange', this.visibility);
    window.removeEventListener('online', this.online);
    window.removeEventListener('offline', this.offline);
  }
}
