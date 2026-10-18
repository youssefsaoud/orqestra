import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router, RouterLink } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ShowcaseActionsDirective } from './showcase-actions.directive';
import { ShowcaseDialogComponent } from './showcase-dialog.component';
import { ShowcaseService } from './showcase.service';
import { showcaseInterceptor } from './showcase.interceptor';
import { showcaseFormGuard } from './showcase.guard';

@Component({ standalone:true, imports:[ShowcaseActionsDirective, RouterLink], template:`
  <main appShowcaseActions>
    <a routerLink="/projects/new">Create Project</a>
    <a routerLink="/companies/new" [queryParams]="{role:'VENDOR'}">Add Vendor</a>
    <button data-showcase-action type="button" (click)="writes = writes + 1">Invite Employee</button>
    <button data-showcase-action type="button" (click)="writes = writes + 1">Edit Outreach</button>
    <form (submit)="writes = writes + 1"><button type="submit">Upload Document</button><input type="file"></form>
    <button type="button" (click)="reads = reads + 1">Search</button>
    <button type="button" (click)="reads = reads + 1">Download Document</button>
  </main>` })
class ActionsFixture { writes = 0; reads = 0; }

describe('Showcase interactions', () => {
  beforeEach(() => {
    sessionStorage.removeItem('orqestra-showcase-welcome');
    TestBed.configureTestingModule({ imports:[ActionsFixture, ShowcaseDialogComponent, RouterTestingModule] });
  });
  afterEach(() => sessionStorage.removeItem('orqestra-showcase-welcome'));

  for (const text of ['Create Project','Add Vendor','Invite Employee','Edit Outreach','Upload Document']) {
    it(`keeps ${text} visible and opens the modal before navigation or mutation`, () => {
      const fixture = TestBed.createComponent(ActionsFixture); fixture.detectChanges();
      const action = Array.from(fixture.nativeElement.querySelectorAll('a,button') as NodeListOf<HTMLElement>)
        .find(element => element.textContent === text)!;
      expect(action).toBeTruthy();
      action.click();
      expect(TestBed.inject(ShowcaseService).dialog$.value).toBe('restricted');
      expect(fixture.componentInstance.writes).toBe(0);
      expect(TestBed.inject(Router).url).toBe('/');
    });
  }

  it('blocks Enter/form submission and native file selection before handlers', () => {
    const fixture = TestBed.createComponent(ActionsFixture); fixture.detectChanges();
    const submit = new Event('submit', {bubbles:true, cancelable:true});
    fixture.nativeElement.querySelector('form').dispatchEvent(submit);
    expect(submit.defaultPrevented).toBeTrue();
    expect(fixture.componentInstance.writes).toBe(0);
    const click = new MouseEvent('click', {bubbles:true, cancelable:true});
    fixture.nativeElement.querySelector('input').dispatchEvent(click);
    expect(click.defaultPrevented).toBeTrue();
  });

  it('preserves search and document download actions', () => {
    const fixture = TestBed.createComponent(ActionsFixture); fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('main > button');
    buttons[2].click(); buttons[3].click();
    expect(fixture.componentInstance.reads).toBe(2);
    expect(TestBed.inject(ShowcaseService).dialog$.value).toBeNull();
  });

  it('welcomes once per browser session including after service recreation', () => {
    const service = TestBed.inject(ShowcaseService);
    service.welcome(); expect(service.dialog$.value).toBe('welcome');
    service.close(); service.welcome(); expect(service.dialog$.value).toBeNull();
    const next = new ShowcaseService(); next.welcome(); expect(next.dialog$.value).toBeNull();
  });

  it('uses a native modal with an accessible name and restores focus', () => {
    const fixture = TestBed.createComponent(ShowcaseDialogComponent); fixture.detectChanges();
    const trigger = document.createElement('button'); document.body.appendChild(trigger); trigger.focus();
    const service = TestBed.inject(ShowcaseService); service.restricted(); fixture.detectChanges();
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    expect(dialog.open).toBeTrue();
    expect(dialog.getAttribute('aria-labelledby')).toBe('showcase-title');
    expect(dialog.textContent).toContain('Available in the Full Version');
    fixture.componentInstance.close(); fixture.componentInstance.restoreFocus();
    expect(dialog.open).toBeFalse(); expect(document.activeElement).toBe(trigger);
    trigger.remove(); fixture.destroy();
  });

  it('blocks direct mutation-form URLs without entering the form', () => {
    const tree = TestBed.runInInjectionContext(() => showcaseFormGuard({} as never, {url:'/projects/new'} as never));
    expect(tree?.toString()).toBe('/projects');
    expect(TestBed.inject(ShowcaseService).dialog$.value).toBe('restricted');
  });
});

describe('Showcase HTTP boundary', () => {
  let http: HttpClient; let backend: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({providers:[provideHttpClient(withInterceptors([showcaseInterceptor])), provideHttpClientTesting()]});
    http = TestBed.inject(HttpClient); backend = TestBed.inject(HttpTestingController);
  });
  afterEach(() => backend.verify());
  it('sends no project, vendor, invitation, upload or activation mutation requests', () => {
    for (const path of ['/projects','/companies','/project-vendors/id','/admin/invitations','/projects/id/documents','/invitations/accept']) {
      http.post('/api/v1' + path, {}).subscribe(); backend.expectNone('/api/v1' + path);
    }
    expect(TestBed.inject(ShowcaseService).dialog$.value).toBe('restricted');
  });
  it('permits exact login and authenticated read requests', () => {
    http.post('/api/v1/auth/login', {}).subscribe(); backend.expectOne('/api/v1/auth/login').flush({});
    http.get('/api/v1/projects?search=network').subscribe(); backend.expectOne('/api/v1/projects?search=network').flush([]);
    http.get('/api/v1/documents/id/download').subscribe(); backend.expectOne('/api/v1/documents/id/download').flush({});
    expect(TestBed.inject(ShowcaseService).dialog$.value).toBeNull();
  });
  it('blocks activation validation and preview links even on GET', () => {
    for (const path of ['/invitations/validate','/admin/invitations/id/preview']) {
      http.get('/api/v1' + path).subscribe(); backend.expectNone('/api/v1' + path);
    }
    expect(TestBed.inject(ShowcaseService).dialog$.value).toBe('restricted');
  });
});
