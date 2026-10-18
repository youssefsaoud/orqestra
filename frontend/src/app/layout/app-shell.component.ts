import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';
import { ShowcaseActionsDirective } from '../core/showcase/showcase-actions.directive';
import { ShowcaseService } from '../core/showcase/showcase.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  adminOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  collapsible?: boolean;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, RouterLink, RouterLinkActive, RouterOutlet, ShowcaseActionsDirective],
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.css']
})
export class AppShellComponent {
  readonly navGroups: NavGroup[] = [
    {
      label: 'Workspace',
      items: [
        { label: 'Dashboard', route: '/dashboard', icon: 'M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z' },
        { label: 'Projects', route: '/projects', icon: 'M4 5h6l2 2h8v12H4z' },
        { label: 'Vendors', route: '/vendors', icon: 'M4 20V8l8-5 8 5v12M8 20v-6h8v6M8 9h.01M12 9h.01M16 9h.01' },
        { label: 'Clients', route: '/clients', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
        { label: 'Contacts', route: '/contacts', icon: 'M20 21V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v16M9 7h6M9 11h6M9 15h3M2 21h20' },
        { label: 'Activities', route: '/activities', icon: 'M12 8v4l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9' }
      ]
    },
    {
      label: 'Sales CRM',
      collapsible: true,
      items: [
        { label: 'Companies', route: '/companies', icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M12 9h.01M15 9h.01M9 13h.01M12 13h.01M15 13h.01M10 21v-4h4v4' },
        { label: 'Leads', route: '/leads', icon: 'M12 2a7 7 0 0 0-4 12.74V18h8v-3.26A7 7 0 0 0 12 2M9 22h6M9 18h6' },
        { label: 'Opportunities', route: '/opportunities', icon: 'M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0zM7 6H4v1a4 4 0 0 0 4 4M17 6h3v1a4 4 0 0 1-4 4' }
      ]
    },
    {
      label: 'System',
      items: [
        { label: 'Team', route: '/team', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M17 11h6', adminOnly: true },
        { label: 'API status', route: '/status', icon: 'M4 12h3l2-5 4 10 2-5h5M3 3h18v18H3z' }
      ]
    }
  ];

  readonly currentUser$ = this.authService.currentUser$;
  mobileOpen = false;
  legacyOpen = false;

  @ViewChild('sidebar') private sidebar?: ElementRef<HTMLElement>;
  @ViewChild('menuButton') private menuButton?: ElementRef<HTMLButtonElement>;
  constructor(private readonly authService: AuthService, private readonly router: Router, private readonly changeDetector: ChangeDetectorRef, showcase: ShowcaseService) {
    showcase.welcome();
  }

  openNavigation(): void {
    this.mobileOpen = true;
    this.changeDetector.detectChanges();
    this.sidebar?.nativeElement.querySelector<HTMLElement>('a')?.focus();
  }

  @HostListener('document:keydown.escape')
  escapeNavigation(): void { if (this.mobileOpen) this.closeNavigation(); }

  navigationKeydown(event: KeyboardEvent): void {
    if (!this.mobileOpen || event.key !== 'Tab' || !window.matchMedia('(max-width:900px)').matches) return;
    const targets = this.sidebar?.nativeElement.querySelectorAll<HTMLElement>('a, button:not(:disabled)');
    if (!targets?.length) return;
    const first = targets[0]; const last = targets[targets.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  logout(): void {
    this.authService.logout();
    this.mobileOpen = false;
    void this.router.navigateByUrl('/login');
  }

  closeNavigation(): void {
    const wasOpen = this.mobileOpen;
    this.mobileOpen = false;
    if (wasOpen) this.menuButton?.nativeElement.focus();
  }

  visibleItems(items: NavItem[]): NavItem[] {
    return items.filter(item => !item.adminOnly || this.authService.currentUser()?.role === 'ADMIN');
  }

  roleLabel(role: string): string {
    return role === 'SALES_REP' ? 'Associate' : role.charAt(0) + role.slice(1).toLowerCase();
  }

  initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase() || 'U';
  }
}
