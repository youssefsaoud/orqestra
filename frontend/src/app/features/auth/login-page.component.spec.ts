import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { BackendStatusService } from '../../core/api/backend-status.service';
import { LoginPageComponent } from './login-page.component';

describe('LoginPageComponent', () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  let component: LoginPageComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent, RouterTestingModule],
      providers: [{ provide: AuthService, useValue: authService }, { provide: BackendStatusService, useValue: { state: 'ready', state$: of('ready'), monitor: () => () => {}, whenReady: () => of(true) } }]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPageComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('keeps invalid credentials local to the form', () => {
    component.submit();
    expect(component.form.controls.email.touched).toBeTrue();
    expect(component.form.controls.password.touched).toBeTrue();
    expect(component.errorMessage).toBe('Enter a valid email address and password.');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('uses the existing authentication flow for a valid submission', () => {
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    authService.login.and.returnValue(of({ id: 'user-1', fullName: 'Amina Haddad', email: 'amina@example.com', role: 'SALES_REP' }));
    component.form.setValue({ email: 'amina@example.com', password: 'valid-password' });

    component.submit();

    expect(authService.login).toHaveBeenCalledWith({ email: 'amina@example.com', password: 'valid-password' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('shows a direct authentication error without exposing server details', () => {
    authService.login.and.returnValue(throwError(() => new Error('server detail')));
    component.form.setValue({ email: 'amina@example.com', password: 'wrong-password' });

    component.submit();

    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toBe('Invalid email or password.');
  });

  it('tracks the pointer for the login card spotlight and fades it on leave', () => {
    spyOn(window, 'requestAnimationFrame').and.callFake(callback => {
      callback(0);
      return 1;
    });
    const card = fixture.nativeElement.querySelector('.login-card') as HTMLFormElement;
    spyOn(card, 'getBoundingClientRect').and.returnValue({
      x: 100,
      y: 80,
      left: 100,
      top: 80,
      right: 540,
      bottom: 420,
      width: 440,
      height: 340,
      toJSON: () => ({})
    });

    card.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 260, clientY: 200, pointerType: 'mouse' }));

    expect(card.style.getPropertyValue('--card-pointer-x')).toBe('160px');
    expect(card.style.getPropertyValue('--card-pointer-y')).toBe('120px');
    expect(card.style.getPropertyValue('--card-glow-opacity')).toBe('1');

    card.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));

    expect(card.style.getPropertyValue('--card-glow-opacity')).toBe('0');
  });

  it('waits for health before sending credentials and prevents duplicate submissions', () => {
    const ready = new Subject<boolean>();
    const backend = TestBed.inject(BackendStatusService);
    spyOn(backend, 'whenReady').and.returnValue(ready);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    authService.login.and.returnValue(of({id:'user',fullName:'Admin',email:'admin@example.test',role:'ADMIN'}));
    component.form.setValue({email:'admin@example.test',password:'password'});
    component.submit(); component.submit();
    expect(authService.login).not.toHaveBeenCalled();
    ready.next(true); ready.complete();
    expect(authService.login).toHaveBeenCalledTimes(1);
  });

  it('cancels waiting without sending or retaining the password', () => {
    const ready = new Subject<boolean>();
    spyOn(TestBed.inject(BackendStatusService), 'whenReady').and.returnValue(ready);
    component.form.setValue({email:'admin@example.test',password:'password'});
    component.submit(); component.cancelPendingLogin(); ready.next(true);
    expect(authService.login).not.toHaveBeenCalled();
    expect(component.form.controls.password.value).toBe('');
    expect(component.loading).toBeFalse();
  });
});
