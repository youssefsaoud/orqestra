import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BackendStatusService } from './backend-status.service';

export const connectivityInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(environment.apiBaseUrl + '/') || request.url.split('?')[0].endsWith('/health')) return next(request);
  const status = inject(BackendStatusService);
  return next(request).pipe(tap({
    next: response => { if ('status' in response) status.recordResponse(response.status); },
    error: (error: HttpErrorResponse) => status.recordResponse(error.status)
  }));
};
