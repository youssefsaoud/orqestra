import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardAssociate, UserSummary } from './user.models';
@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private readonly http: HttpClient) {}
  salesRepresentatives(): Observable<UserSummary[]> { return this.http.get<UserSummary[]>(`${environment.apiBaseUrl}/users/sales-representatives`); }
  dashboardAssociates(): Observable<DashboardAssociate[]> { return this.http.get<DashboardAssociate[]>(`${environment.apiBaseUrl}/users/dashboard-associates`); }
}
