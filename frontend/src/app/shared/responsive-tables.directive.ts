import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy } from '@angular/core';

@Directive({ selector: '[appResponsiveTables]', standalone: true })
export class ResponsiveTablesDirective implements AfterViewInit, OnDestroy {
  private observer?: MutationObserver;
  private resize?: ResizeObserver;
  private frame = 0;
  private readonly containers = new Set<HTMLElement>();
  constructor(private readonly root: ElementRef<HTMLElement>, private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.resize = new ResizeObserver(() => this.updateOverflow());
      this.observer = new MutationObserver(() => this.schedule());
      this.observer.observe(this.root.nativeElement, { childList: true, subtree: true });
      this.decorate();
    });
  }

  private schedule(): void {
    if (!this.frame) this.frame = requestAnimationFrame(() => { this.frame = 0; this.decorate(); });
  }

  private decorate(): void {
    for (const element of this.containers) {
      if (!element.isConnected) { this.resize?.unobserve(element); this.containers.delete(element); }
    }
    this.root.nativeElement.querySelectorAll('table').forEach(table => {
      const container = table.closest<HTMLElement>('.table-shell,.project-table,.quote-table');
      if (!container) return;
      table.classList.add('responsive-table');
      container.setAttribute('role', 'region');
      container.tabIndex = 0;
      if (!container.hasAttribute('aria-label')) container.setAttribute('aria-label', `${this.root.nativeElement.querySelector('h1')?.textContent?.trim() || 'Records'} table`);
      if (!this.containers.has(container)) { this.containers.add(container); this.resize?.observe(container); }
      const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent?.trim().toLowerCase() || '');
      table.querySelectorAll('tbody tr').forEach(row => Array.from(row.children).forEach((cell, index) => {
        const heading = headers[index];
        if (/date|deadline|received|valid until|invitation sent/.test(heading)) cell.classList.add('col-date');
        if (/amount|budget|quote$/.test(heading)) cell.classList.add('col-money');
        if (/owner|associate|assignee/.test(heading)) cell.classList.add('col-person');
        if (/email|primary contact/.test(heading)) cell.classList.add('col-email');
      }));
    });
    this.updateOverflow();
  }

  private updateOverflow(): void {
    for (const container of this.containers) {
      const scrollable = container.scrollWidth > container.clientWidth + 1;
      container.classList.toggle('is-scrollable', scrollable);
      if (scrollable) container.setAttribute('aria-description', 'Additional columns are available by scrolling horizontally.');
      else container.removeAttribute('aria-description');
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect(); this.resize?.disconnect();
    if (this.frame) cancelAnimationFrame(this.frame);
  }
}
