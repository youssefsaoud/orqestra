import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ShowcaseService } from './showcase.service';

export const showcaseFormGuard: CanActivateFn = (_route, state) => {
  inject(ShowcaseService).restricted();
  const path = state.url.split('?')[0];
  const destination = path === '/activate-account' ? '/login' : path.replace(/\/(new|[^/]+\/edit)$/, '');
  return inject(Router).parseUrl(destination);
};
