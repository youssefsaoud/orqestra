import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { environment } from '../../../environments/environment';
import { CompanyFormPageComponent } from './company-form-page.component';
import { CompanyService } from './company.service';

describe('Full-version organization write workflows',()=>{
  let http:HttpTestingController;
  beforeEach(()=>{
    TestBed.configureTestingModule({imports:[CompanyFormPageComponent,HttpClientTestingModule,RouterTestingModule]});
    http=TestBed.inject(HttpTestingController);spyOn(TestBed.inject(Router),'navigate').and.resolveTo(true);
  });
  afterEach(()=>http.verify());
  for(const editing of [false,true]) it(`submits the ${editing?'edit':'create'} form to the normal write endpoint`,()=>{
    const page=TestBed.createComponent(CompanyFormPageComponent).componentInstance;
    page.companyId=editing?'fixture':null;page.form.patchValue({name:'Northbridge',email:'contact@northbridge.example',phone:'+212 522 48 16 90'});
    page.save();const request=http.expectOne(`${environment.apiBaseUrl}/companies${editing?'/fixture':''}`);
    expect(request.request.method).toBe(editing?'PUT':'POST');expect(request.request.body.roles).toEqual(['CLIENT']);
    expect(request.request.body.phone).toBe('+212 522 48 16 90');request.flush({id:'fixture'});
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/companies','fixture']);
  });
  it('retains form validation before sending a write',()=>{
    const page=TestBed.createComponent(CompanyFormPageComponent).componentInstance;page.save();
    expect(page.form.controls.name.touched).toBeTrue();http.expectNone(`${environment.apiBaseUrl}/companies`);
  });
  it('preserves the deletion API contract',()=>{
    TestBed.inject(CompanyService).delete('fixture').subscribe();
    const request=http.expectOne(`${environment.apiBaseUrl}/companies/fixture`);expect(request.request.method).toBe('DELETE');request.flush(null);
  });
});
