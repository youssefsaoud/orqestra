import { environment } from '../../../environments/environment';
import { configureApiBaseUrl } from './runtime-config';

describe('Public runtime API configuration', () => {
  afterEach(()=>configureApiBaseUrl('/api/v1'));
  it('supports a hosted HTTPS backend or the local development proxy',()=>{
    configureApiBaseUrl('https://api.example.test/api/v1'); expect(environment.apiBaseUrl).toBe('https://api.example.test/api/v1');
    configureApiBaseUrl('/api/v1'); expect(environment.apiBaseUrl).toBe('/api/v1');
  });
  it('rejects insecure, secret-bearing and malformed URLs',()=>{
    for(const url of ['http://public.example.test/api/v1','https://user:secret@example.test/api/v1','https://example.test/api/v1?key=secret','//example.test/api/v1','https://example.test/wrong',null]) {
      expect(()=>configureApiBaseUrl(url)).toThrow();
    }
  });
});
