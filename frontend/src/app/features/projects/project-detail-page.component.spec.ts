import { TestBed } from '@angular/core/testing';
import { ElementRef } from '@angular/core';
import { ShowcaseActionsDirective } from '../../core/showcase/showcase-actions.directive';
import { ShowcaseService } from '../../core/showcase/showcase.service';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { UserService } from '../../core/users/user.service';
import { CompanyService } from '../companies/company.service';
import { ProjectDocumentService } from './project-document.service';
import { ProjectDetailPageComponent } from './project-detail-page.component';
import { ProjectVendor } from './project-vendor.models';
import { ProjectVendorService } from './project-vendor.service';
import { ProjectService } from './project.service';
import { QuotationService } from './quotation.service';

describe('ProjectDetailPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectDetailPageComponent, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: { currentUser$: of({ id: 'user-1', fullName: 'Admin', role: 'ADMIN' }), currentUser: () => ({ role: 'ADMIN' }) } },
        { provide: UserService, useValue: {} },
        { provide: CompanyService, useValue: {} },
        { provide: ProjectDocumentService, useValue: {} },
        { provide: ProjectVendorService, useValue: {} },
        { provide: ProjectService, useValue: {} },
        { provide: QuotationService, useValue: {} }
      ]
    }).compileComponents();
  });

  it('intercepts actual assignment, quotation and document controls before workflows run', () => {
    spyOn(ProjectDetailPageComponent.prototype,'ngOnInit').and.stub();
    const fixture = TestBed.createComponent(ProjectDetailPageComponent);
    const page = fixture.componentInstance;
    page.project = {id:'project',name:'Demo',reference:'DEMO',clientId:'client',clientName:'Client',status:'PLANNED',currencyCode:'USD',createdAt:'2026-10-01T09:00:00Z',updatedAt:'2026-10-01T09:00:00Z'};
    const assign = spyOn(page,'addVendor'); const quote = spyOn(page,'createQuote'); const upload = spyOn(page,'uploadDocument');
    fixture.detectChanges();
    const showcase = TestBed.inject(ShowcaseService);
    const boundary = new ShowcaseActionsDirective(new ElementRef(fixture.nativeElement),showcase);
    for(const [tab,selector] of [['vendors','.vendor-form button[type="submit"]'],['quotations','.quote-form button[type="submit"]'],['documents','.document-form button[type="submit"]']]) {
      page.setTab(tab as 'vendors'); fixture.detectChanges();
      const button:HTMLButtonElement = fixture.nativeElement.querySelector(selector);
      expect(button.disabled).toBeFalse(); button.click(); expect(showcase.dialog$.value).toBe('restricted'); showcase.close();
    }
    expect(assign).not.toHaveBeenCalled(); expect(quote).not.toHaveBeenCalled(); expect(upload).not.toHaveBeenCalled();
    boundary.ngOnDestroy();
  });

  it('preserves workspace tab state and filters vendors without mutating assignments', () => {
    const component = TestBed.createComponent(ProjectDetailPageComponent).componentInstance;
    component.vendors = [
      { id: 'vendor-1', status: 'SOW_SENT', vendorName: 'Vendor One' },
      { id: 'vendor-2', status: 'QUOTE_RECEIVED', vendorName: 'Vendor Two' }
    ] as ProjectVendor[];

    component.setTab('vendors');
    component.vendorStatusFilter = 'QUOTE_RECEIVED';

    expect(component.activeTab).toBe('vendors');
    expect(component.filteredVendors.map(vendor => vendor.id)).toEqual(['vendor-2']);
    expect(component.vendors.length).toBe(2);
  });

  it('opens each summary destination with native buttons and shows only recorded timestamps', () => {
    spyOn(ProjectDetailPageComponent.prototype, 'ngOnInit').and.stub();
    const fixture = TestBed.createComponent(ProjectDetailPageComponent);
    const component = fixture.componentInstance;
    component.project = { id: 'project', name: 'Demo project', reference: 'DEMO', clientId: 'client', clientName: 'Client', status: 'PLANNED', currencyCode: 'EUR', createdAt: '2026-10-01T09:00:00Z', updatedAt: '2026-10-16T15:30:00Z' };
    component.quoteForm.controls.notes.setValue('Unsaved quotation note');
    fixture.detectChanges();
    const times = fixture.nativeElement.querySelectorAll('.project-history time');
    expect(times.length).toBe(2);
    expect(times[0].getAttribute('datetime')).toBe(component.project.createdAt);
    expect(times[1].getAttribute('datetime')).toBe(component.project.updatedAt);
    for (const [index, tab] of ['vendors', 'quotations', 'documents'].entries()) {
      component.setTab('overview'); fixture.detectChanges();
      const button: HTMLButtonElement = fixture.nativeElement.querySelectorAll('.overview-stats button')[index];
      expect(button.type).toBe('button'); button.click(); fixture.detectChanges();
      expect(component.activeTab).toBe(tab);
      expect(component.quoteForm.controls.notes.value).toBe('Unsaved quotation note');
    }
  });
});
