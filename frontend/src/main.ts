import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/auth/auth.interceptor';
import { showcaseInterceptor } from './app/core/showcase/showcase.interceptor';
import { configureApiBaseUrl } from './app/core/showcase/runtime-config';
import { connectivityInterceptor } from './app/core/api/connectivity.interceptor';

fetch(new URL('assets/runtime-config.json', document.baseURI), { cache: 'no-store' }).then(response => {
  if (!response.ok) throw new Error('Runtime configuration unavailable');
  return response.json();
}).then(config => {
  configureApiBaseUrl(config.apiBaseUrl);
  return bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), provideHttpClient(withInterceptors([showcaseInterceptor, authInterceptor, connectivityInterceptor]))]
  });
}).catch(() => {
  document.body.textContent = 'Showcase configuration is unavailable. Please try again later.';
  console.error('Showcase configuration or initialization failed.');
});
