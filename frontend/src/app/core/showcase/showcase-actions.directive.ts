import { Directive, ElementRef, OnDestroy } from '@angular/core';
import { ShowcaseService } from './showcase.service';

/** Capture before RouterLink, form handlers, or native file selection can run. */
@Directive({ selector: '[appShowcaseActions]', standalone: true })
export class ShowcaseActionsDirective implements OnDestroy {
  private readonly host: HTMLElement;
  private readonly block = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const action = target.closest('[data-showcase-action], button[type="submit"], input[type="file"], label.file-upload');
    const link = target.closest<HTMLAnchorElement>('a[href]');
    const mutationLink = link && /\/(?:projects|companies|contacts|leads|opportunities)\/(?:new|[^/]+\/edit)$/.test(new URL(link.href).pathname);
    if (event.type !== 'submit' && !action && !mutationLink) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.showcase.restricted();
  };

  constructor(element: ElementRef<HTMLElement>, private readonly showcase: ShowcaseService) {
    this.host = element.nativeElement;
    this.host.addEventListener('click', this.block, true);
    this.host.addEventListener('submit', this.block, true);
  }

  ngOnDestroy(): void {
    this.host.removeEventListener('click', this.block, true);
    this.host.removeEventListener('submit', this.block, true);
  }
}
