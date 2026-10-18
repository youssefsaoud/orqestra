import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-money', standalone: true, imports: [CommonModule],
  template: `<span class="money" *ngIf="amount !== null && amount !== undefined; else missing"><span>{{ amount | number:'1.2-2' }}</span><span class="currency" [class.eur]="currency === 'EUR'" [class.mad]="currency === 'MAD'" [class.usd]="currency === 'USD'">{{ currency }}</span></span><ng-template #missing><span class="missing">{{ empty }}</span></ng-template>`,
  styles: [`:host{display:inline-block;max-width:100%;vertical-align:baseline}.money{display:inline-flex;align-items:center;white-space:nowrap;gap:.4rem;font-variant-numeric:tabular-nums}.currency{display:inline-block;padding:.12rem .35rem;border:1px solid var(--color-border);border-radius:4px;background:var(--color-surface);color:var(--color-text-secondary);font-size:.72rem;font-weight:600;line-height:1.4}.eur{background:var(--currency-eur-bg);color:var(--currency-eur-text);border-color:var(--currency-eur-border)}.mad{background:var(--currency-mad-bg);color:var(--currency-mad-text);border-color:var(--currency-mad-border)}.usd{background:var(--currency-usd-bg);color:var(--currency-usd-text);border-color:var(--currency-usd-border)}.missing{color:var(--color-text-secondary)}`]
})
export class MoneyComponent {
  @Input() amount: number | null | undefined;
  @Input() code = '';
  @Input() empty = '-';
  get currency(): string { return this.code.trim().toUpperCase(); }
}
