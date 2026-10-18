import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { BackendStatusService } from '../../core/api/backend-status.service';
import { LoginPageComponent } from './login-page.component';

describe('Showcase demo account picker', () => {
  let auth: jasmine.SpyObj<AuthService>;
  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService',['login']);
    await TestBed.configureTestingModule({imports:[LoginPageComponent],providers:[
      {provide:AuthService,useValue:auth}, {provide:Router,useValue:{navigateByUrl:jasmine.createSpy('navigateByUrl')}},
      {provide:BackendStatusService,useValue:{state:'ready',state$:of('ready'),monitor:()=>()=>{},whenReady:()=>of(true)}}
    ]}).compileComponents();
    spyOn(LoginPageComponent.prototype,'ngAfterViewInit').and.stub();
  });
  it('changes displayed role credentials without filling or submitting the real form', () => {
    const fixture = TestBed.createComponent(LoginPageComponent); fixture.detectChanges();
    const radios = fixture.nativeElement.querySelectorAll('.demo-roles input') as NodeListOf<HTMLInputElement>;
    for (const [index,role] of fixture.componentInstance.demoRoles.entries()) {
      radios[index].click(); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.demo-credential code').textContent).toBe(role.email);
      expect(fixture.componentInstance.form.getRawValue()).toEqual({email:'',password:''});
    }
    expect(fixture.nativeElement.textContent).toContain('OrqestraDemo2026!');
    expect(auth.login).not.toHaveBeenCalled();
    for (const button of fixture.nativeElement.querySelectorAll('.copy-credential')) expect(button.type).toBe('button');
  });
  it('copies exactly the selected email and password, with accessible success feedback', async () => {
    const copy = spyOn(navigator.clipboard,'writeText').and.resolveTo();
    const fixture = TestBed.createComponent(LoginPageComponent); fixture.detectChanges();
    const page=fixture.componentInstance; page.selectDemoRole(page.demoRoles[1]);
    await page.copyDemoValue('email'); expect(copy).toHaveBeenCalledWith('manager@orqestra.demo');
    await page.copyDemoValue('password'); expect(copy).toHaveBeenCalledWith('OrqestraDemo2026!');
    fixture.detectChanges(); expect(fixture.nativeElement.querySelector('.copy-status').textContent).toContain('Password copied');
    expect(auth.login).not.toHaveBeenCalled();
  });
  it('handles denied clipboard permissions without altering login', async () => {
    spyOn(navigator.clipboard,'writeText').and.rejectWith(new Error('Denied'));
    const page=TestBed.createComponent(LoginPageComponent).componentInstance;
    await page.copyDemoValue('email'); expect(page.copyMessage).toContain('Select the credential text');
    expect(auth.login).not.toHaveBeenCalled();
  });
  it('still requires manual valid credentials and the real authentication call', () => {
    auth.login.and.returnValue(of({id:'demo',fullName:'Admin',email:'admin@orqestra.demo',role:'ADMIN'}));
    const page=TestBed.createComponent(LoginPageComponent).componentInstance;
    page.submit(); expect(auth.login).not.toHaveBeenCalled();
    page.form.setValue({email:'admin@orqestra.demo',password:'OrqestraDemo2026!'}); page.submit();
    expect(auth.login).toHaveBeenCalledWith(page.form.getRawValue());
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });
  it('distinguishes unavailable hosting from an invalid password without leaking server details', () => {
    const page=TestBed.createComponent(LoginPageComponent).componentInstance;
    page.form.setValue({email:'admin@orqestra.demo',password:'wrong'});
    auth.login.and.returnValue(throwError(()=>({status:503,message:'private upstream detail'}))); page.submit();
    expect(page.errorMessage).toContain('service is unavailable');
    expect(page.errorMessage).not.toContain('private');
    auth.login.and.returnValue(throwError(()=>({status:401}))); page.submit();
    expect(page.errorMessage).toBe('Invalid email or password.');
  });
});
