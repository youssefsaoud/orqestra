import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { BackendStatusService } from './backend-status.service';
import { HealthService } from './health.service';

describe('BackendStatusService', () => {
  let health: jasmine.SpyObj<HealthService>;
  let status: BackendStatusService;
  beforeEach(() => {
    health = jasmine.createSpyObj('HealthService', ['getHealth']);
    health.getHealth.and.returnValue(of({status:'UP',service:'crm-api'}));
    TestBed.configureTestingModule({providers:[{provide:HealthService,useValue:health}]});
    status = TestBed.inject(BackendStatusService);
  });
  it('checks once when healthy without keeping the server awake', fakeAsync(() => {
    const stop = status.monitor();
    expect(status.state).toBe('ready'); tick(300000);
    expect(health.getHealth).toHaveBeenCalledTimes(1); stop();
  }));
  it('bounds retrying, supports recovery and cleans up polling', fakeAsync(() => {
    health.getHealth.and.returnValue(throwError(() => ({status:503})));
    const stop = status.monitor(); expect(status.state).toBe('waking');
    tick(180000); expect(status.state).toBe('unavailable');
    const calls = health.getHealth.calls.count(); tick(60000);
    expect(health.getHealth.calls.count()).toBe(calls);
    health.getHealth.and.returnValue(of({status:'UP',service:'crm-api'}));
    status.retry(); expect(status.state).toBe('ready'); stop();
  }));
  it('stops polling when the last page releases monitoring', fakeAsync(() => {
    health.getHealth.and.returnValue(throwError(() => ({status:0})));
    const stop = status.monitor(); stop(); tick(60000);
    expect(health.getHealth).toHaveBeenCalledTimes(1);
  }));
});
