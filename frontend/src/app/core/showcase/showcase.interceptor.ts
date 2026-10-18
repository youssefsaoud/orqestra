import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { EMPTY } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ShowcaseService } from './showcase.service';

export const showcaseInterceptor: HttpInterceptorFn = (request, next) => {
  const base = environment.apiBaseUrl;
  const api = request.url === base || request.url.startsWith(base + '/');
  const login = request.method === 'POST' && request.url === `${base}/auth/login`;
  const read = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  const onboarding = request.url.startsWith(`${base}/invitations/`)
    || new RegExp('/admin/invitations/[^/]+/preview(?:\\?|$)').test(request.url);
  if (api && (onboarding || (!read && !login))) {
    inject(ShowcaseService).restricted();
    return EMPTY;
  }
  return next(request);
};
