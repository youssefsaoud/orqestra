import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ElementRef } from '@angular/core';
import { ShowcaseActionsDirective } from '../../core/showcase/showcase-actions.directive';
import { ShowcaseService } from '../../core/showcase/showcase.service';
import { of, throwError } from 'rxjs';
import { TeamPageComponent } from './team-page.component';
import { Invitation, TeamService } from './team.service';

describe('TeamPageComponent', () => {
  let fixture: ComponentFixture<TeamPageComponent>;
  let page: TeamPageComponent;
  let service: jasmine.SpyObj<TeamService>;
  const pending: Invitation = {
    id: 'invite-1', fullName: 'Taylor Lee', email: 'taylor@example.test', role: 'SALES_REP',
    status: 'PENDING', deliveryStatus: 'SENT', createdAt: '2026-10-15T10:00:00Z',
    expiresAt: '2026-10-16T10:00:00Z', lastSentAt: '2026-10-15T10:00:00Z', acceptedAt: null, deliveryAttempts: 1
  };
  beforeEach(async () => {
    service = jasmine.createSpyObj<TeamService>('TeamService', ['employees', 'invitations', 'invite', 'resend', 'revoke']);
    service.employees.and.returnValue(of([]));
    service.invitations.and.returnValue(of([pending, { ...pending, id: 'expired', status: 'EXPIRED' }]));
    await TestBed.configureTestingModule({ imports: [TeamPageComponent], providers: [{ provide: TeamService, useValue: service }] }).compileComponents();
    fixture = TestBed.createComponent(TeamPageComponent); page = fixture.componentInstance; fixture.detectChanges();
  });
  it('keeps Admin invitation actions visible but blocks their real handlers in the showcase shell', () => {
    const showcase = TestBed.inject(ShowcaseService);
    const boundary = new ShowcaseActionsDirective(new ElementRef(fixture.nativeElement),showcase);
    const open = spyOn(page,'openInvite');
    const actions = fixture.nativeElement.querySelectorAll('[data-showcase-action]') as NodeListOf<HTMLButtonElement>;
    expect(actions.length).toBeGreaterThan(2);
    actions.forEach(button => {button.click();expect(showcase.dialog$.value).toBe('restricted');showcase.close();});
    expect(open).not.toHaveBeenCalled(); expect(service.invite).not.toHaveBeenCalled();
    expect(service.resend).not.toHaveBeenCalled(); expect(service.revoke).not.toHaveBeenCalled();
    boundary.ngOnDestroy();
  });
  it('renders human-readable roles, invitation statuses, and counts', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Pending invitation'); expect(text).toContain('Expired'); expect(text).toContain('Associate');
    expect(page.pendingCount).toBe(1); expect(page.expiredCount).toBe(1);
  });
  it('validates the invitation form and does not offer Admin', () => {
    page.invite(); expect(service.invite).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('option[value="ADMIN"]')).toBeNull();
    page.form.setValue({ fullName: 'Taylor Lee', email: 'invalid', role: 'MANAGER' }); expect(page.form.valid).toBeFalse();
  });
  it('submits an invitation and reports mail-server submission', () => {
    service.invite.and.returnValue(of({ invitation: pending, submitted: true, message: 'Submitted to mail server.' }));
    page.openInvite(); page.form.setValue({ fullName: 'Taylor Lee', email: 'taylor@example.test', role: 'SALES_REP' }); page.invite();
    expect(service.invite).toHaveBeenCalledWith({ fullName: 'Taylor Lee', email: 'taylor@example.test', role: 'SALES_REP' });
    expect(page.message).toContain('Submitted'); expect(page.dialog.nativeElement.open).toBeFalse();
  });
  it('resends an invitation and refreshes delivery state', () => {
    service.resend.and.returnValue(of({ invitation: pending, submitted: true, message: 'Resent.' }));
    page.resend(pending.id); expect(service.resend).toHaveBeenCalledWith(pending.id); expect(page.message).toBe('Resent.');
  });
  it('revokes an invitation', () => {
    service.revoke.and.returnValue(of({ ...pending, status: 'REVOKED' }));
    page.revoke(pending.id); expect(service.revoke).toHaveBeenCalledWith(pending.id); expect(page.message).toContain('revoked');
  });
  it('does not show success when delivery fails', () => {
    service.invite.and.returnValue(throwError(() => ({ status: 502, error: { invitation: pending, message: 'Email could not be submitted.' } })));
    page.form.setValue({ fullName: 'Taylor Lee', email: 'taylor@example.test', role: 'SALES_REP' }); page.invite();
    expect(page.message).toBe(''); expect(page.error).toContain('could not');
  });
});
