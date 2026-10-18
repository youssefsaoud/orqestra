import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ContactService } from './contact.service';
import { ContactsPageComponent } from './contacts-page.component';

describe('Contacts directory layout', () => {
  let service: jasmine.SpyObj<ContactService>;
  beforeEach(() => {
    service=jasmine.createSpyObj('ContactService',['search']);
    service.search.and.returnValue(of({content:[{id:'contact',companyId:'company',companyName:'Northbridge Infrastructure',firstName:'Nadia',lastName:'Benali',jobTitle:'Operations Director',email:'nadia.benali@northbridge.example',phone:'+212 522 48 16 90',createdAt:'',updatedAt:''}],totalElements:1,totalPages:1,number:0,size:10,first:true,last:true}));
    TestBed.configureTestingModule({imports:[ContactsPageComponent,RouterTestingModule],providers:[{provide:ContactService,useValue:service},{provide:AuthService,useValue:{currentUser$:of(null)}}]});
  });
  it('keeps complete phone/email values in dedicated columns and preserves actions', () => {
    const fixture=TestBed.createComponent(ContactsPageComponent);fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.phone-cell').textContent).toBe('+212 522 48 16 90');
    expect(fixture.nativeElement.querySelector('.email-cell a').getAttribute('href')).toBe('mailto:nadia.benali@northbridge.example');
    expect(fixture.nativeElement.querySelector('.action-cell a').getAttribute('href')).toBe('/contacts/contact');
    expect(fixture.nativeElement.querySelector('.contacts-table')).not.toBeNull();
  });
  it('preserves search and pagination reset', fakeAsync(() => {
    const fixture=TestBed.createComponent(ContactsPageComponent);fixture.detectChanges();
    fixture.componentInstance.page=2;fixture.componentInstance.searchControl.setValue('Nadia');tick(250);
    expect(service.search).toHaveBeenCalledWith({search:'Nadia',companyId:'',page:0,size:10});fixture.destroy();
  }));
});
