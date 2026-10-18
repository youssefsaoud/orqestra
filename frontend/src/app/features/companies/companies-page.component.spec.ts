import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CompanyService } from './company.service';
import { CompaniesPageComponent } from './companies-page.component';

describe('Companies directory layout', () => {
  let routeData: {role?:string};
  beforeEach(() => {
    routeData={};
    TestBed.configureTestingModule({imports:[CompaniesPageComponent,RouterTestingModule],providers:[
      {provide:ActivatedRoute,useValue:{snapshot:{data:routeData}}},
      {provide:AuthService,useValue:{currentUser$:of({role:'ADMIN'})}},
      {provide:CompanyService,useValue:{search:()=>of({content:[{id:'company',name:'Northbridge Infrastructure',email:'procurement@northbridge.example',phone:'+33 1 84 25 60 12',roles:['CLIENT','VENDOR'],createdAt:'',updatedAt:''}],totalElements:1,totalPages:1}),relationships:()=>of([])}}
    ]});
  });
  it('preserves full contact values and aligned row actions', () => {
    const fixture=TestBed.createComponent(CompaniesPageComponent);fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.phone-cell').textContent).toBe('+33 1 84 25 60 12');
    expect(fixture.nativeElement.querySelector('.email-cell a').getAttribute('href')).toBe('mailto:procurement@northbridge.example');
    expect(fixture.nativeElement.querySelector('.action-cell a').getAttribute('href')).toBe('/companies/company');
    expect(fixture.nativeElement.querySelector('.companies-directory-table')).not.toBeNull();
  });
  for(const role of ['CLIENT','VENDOR']) it(`does not apply Companies-only sizing to the ${role} directory`,()=>{
    routeData.role=role;const fixture=TestBed.createComponent(CompaniesPageComponent);fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.companies-directory-table')).toBeNull();
  });
});
