import { environment } from '../../../environments/environment';

export function configureApiBaseUrl(value: unknown): void {
  if (value === '/api/v1') { environment.apiBaseUrl = value; return; }
  if (typeof value !== 'string') throw new Error('Invalid API configuration');
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.pathname !== '/api/v1' || url.search || url.hash || url.username || url.password
    || !(url.protocol === 'https:' || (local && url.protocol === 'http:'))) {
    throw new Error('Invalid API configuration');
  }
  environment.apiBaseUrl = url.origin + url.pathname;
}
