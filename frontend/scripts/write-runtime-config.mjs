import { writeFile } from 'node:fs/promises';

const apiBaseUrl = process.env.PUBLIC_API_BASE_URL || '/api/v1';
if (apiBaseUrl !== '/api/v1') {
  const url = new URL(apiBaseUrl);
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.pathname !== '/api/v1' || url.search || url.hash || url.username || url.password
    || !(url.protocol === 'https:' || (local && url.protocol === 'http:'))) {
    throw new Error('PUBLIC_API_BASE_URL must be an HTTPS API origin ending in /api/v1 (HTTP is loopback-only).');
  }
}
await writeFile(new URL('../dist/crm-frontend/assets/runtime-config.json', import.meta.url), JSON.stringify({ apiBaseUrl }) + '\n');
