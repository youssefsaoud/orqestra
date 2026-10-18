import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { CurrentUser, UserRole } from '../core/auth/auth.models';
import { AppShellComponent } from './app-shell.component';

describe('Team navigation permissions', () => {
  for (const role of ['ADMIN', 'MANAGER', 'SALES_REP'] as UserRole[]) {
    it(`shows Team only to Admin (${role})`, async () => {
      const user: CurrentUser = { id: 'user', fullName: 'Test User', email: 'test@example.test', role };
      await TestBed.configureTestingModule({ imports: [AppShellComponent, RouterTestingModule], providers: [{
        provide: AuthService, useValue: { currentUser: () => user, currentUser$: new BehaviorSubject(user), logout: () => {} }
      }] }).compileComponents();
      const fixture = TestBed.createComponent(AppShellComponent); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.topbar').textContent).toContain('Read-only Showcase');
      expect(!!fixture.nativeElement.querySelector('a[href="/team"]')).toBe(role === 'ADMIN');
      const menu: HTMLButtonElement = fixture.nativeElement.querySelector('.menu-button');
      menu.click(); fixture.detectChanges();
      expect(menu.getAttribute('aria-expanded')).toBe('true');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); fixture.detectChanges();
      expect(menu.getAttribute('aria-expanded')).toBe('false');
      expect(fixture.nativeElement.querySelector('.logout-button').getAttribute('aria-label')).toBe('Sign out');
    });
  }
});
