import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { OpportunityDetailPageComponent } from './opportunity-detail-page.component';
import { OpportunityService } from './opportunity.service';
import { Opportunity } from './opportunity.models';

describe('Full-version opportunity writes after UI port',()=>{
  const item:Opportunity={id:'fixture',name:'Network upgrade',companyId:'company',companyName:'Northbridge',stage:'PROPOSAL',amount:500,currencyCode:'EUR',createdAt:'',updatedAt:''};
  let http:HttpTestingController;let service:OpportunityService;
  beforeEach(()=>{
    TestBed.configureTestingModule({imports:[OpportunityDetailPageComponent,HttpClientTestingModule,RouterTestingModule],providers:[{provide:AuthService,useValue:{currentUser$:of({role:'ADMIN'})}}]});
    http=TestBed.inject(HttpTestingController);service=TestBed.inject(OpportunityService);
    spyOn(TestBed.inject(Router),'navigateByUrl').and.resolveTo(true);
  });
  afterEach(()=>http.verify());
  it('preserves functional create and edit request contracts',()=>{
    const payload={name:item.name,companyId:item.companyId,amount:item.amount,currencyCode:item.currencyCode};
    service.create(payload).subscribe(value=>expect(value.id).toBe(item.id));
    const create=http.expectOne(`${environment.apiBaseUrl}/opportunities`);expect(create.request.method).toBe('POST');create.flush(item);
    service.update(item.id,payload).subscribe(value=>expect(value.name).toBe(item.name));
    const edit=http.expectOne(`${environment.apiBaseUrl}/opportunities/fixture`);expect(edit.request.method).toBe('PUT');edit.flush(item);
  });
  it('preserves detail-page stage updates and confirmed deletion',()=>{
    const component=TestBed.createComponent(OpportunityDetailPageComponent).componentInstance;component.opportunity=item;
    component.stageControl.setValue('NEGOTIATION');component.changeStage();
    const stage=http.expectOne(`${environment.apiBaseUrl}/opportunities/fixture/stage`);
    expect(stage.request.method).toBe('PATCH');expect(stage.request.body).toEqual({stage:'NEGOTIATION'});stage.flush({...item,stage:'NEGOTIATION'});
    spyOn(window,'confirm').and.returnValue(true);component.deleteOpportunity();
    const deletion=http.expectOne(`${environment.apiBaseUrl}/opportunities/fixture`);expect(deletion.request.method).toBe('DELETE');deletion.flush(null);
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/opportunities');
  });
  it('does not delete when confirmation is cancelled',()=>{
    const component=TestBed.createComponent(OpportunityDetailPageComponent).componentInstance;component.opportunity=item;
    spyOn(window,'confirm').and.returnValue(false);component.deleteOpportunity();http.expectNone(`${environment.apiBaseUrl}/opportunities/fixture`);
  });
});
