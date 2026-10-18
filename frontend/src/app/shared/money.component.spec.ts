import { TestBed } from '@angular/core/testing';
import { MoneyComponent } from './money.component';

describe('MoneyComponent', () => {
  it('renders consistent decimals and compact currency-specific badges with a neutral fallback', () => {
    const fixture = TestBed.createComponent(MoneyComponent);
    fixture.componentInstance.amount = 1234.5;
    for (const code of ['EUR', 'MAD', 'USD', 'GBP']) {
      fixture.componentInstance.code = code; fixture.detectChanges();
      const badge: HTMLElement = fixture.nativeElement.querySelector('.currency');
      expect(fixture.nativeElement.textContent).toContain('1,234.50');
      expect(badge.textContent).toBe(code);
      expect(badge.classList.contains('eur')).toBe(code === 'EUR');
      expect(badge.classList.contains('mad')).toBe(code === 'MAD');
      expect(badge.classList.contains('usd')).toBe(code === 'USD');
    }
    fixture.componentInstance.amount = null; fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.currency')).toBeNull();
  });
});
