import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ResponsiveTablesDirective } from './responsive-tables.directive';

@Component({standalone:true,imports:[ResponsiveTablesDirective],template:`<main appResponsiveTables><h1>Clients</h1><div class="table-shell"><table><thead><tr><th>Email</th><th>Owner</th><th>Close date</th><th>Amount</th></tr></thead><tbody><tr><td>a@example.test</td><td>Full Name</td><td>08 Oct 2026</td><td>500 EUR</td></tr></tbody></table></div></main>`})
class TableHost {}
describe('Responsive tables', () => {
  it('decorates the scroll region and cells without widening the page container', () => {
    const fixture=TestBed.createComponent(TableHost); fixture.detectChanges();
    const region=fixture.nativeElement.querySelector('.table-shell');
    expect(region.getAttribute('role')).toBe('region');
    expect(region.tabIndex).toBe(0);
    expect(region.classList.contains('responsive-table')).toBeFalse();
    expect(region.querySelector('table').classList.contains('responsive-table')).toBeTrue();
    expect(region.querySelectorAll('.col-date,.col-money,.col-person,.col-email').length).toBe(4);
    fixture.destroy();
  });
});
