import { Routes } from '@angular/router';

import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guard';
import { showcaseFormGuard } from './core/showcase/showcase.guard';
import { ActivitiesPageComponent } from './features/activities/activities-page.component';
import { CompaniesPageComponent } from './features/companies/companies-page.component';
import { CompanyDetailPageComponent } from './features/companies/company-detail-page.component';
import { CompanyFormPageComponent } from './features/companies/company-form-page.component';
import { ContactDetailPageComponent } from './features/contacts/contact-detail-page.component';
import { ContactFormPageComponent } from './features/contacts/contact-form-page.component';
import { ContactsPageComponent } from './features/contacts/contacts-page.component';
import { LeadDetailPageComponent } from './features/leads/lead-detail-page.component';
import { LeadFormPageComponent } from './features/leads/lead-form-page.component';
import { LeadsPageComponent } from './features/leads/leads-page.component';
import { OpportunitiesPageComponent } from './features/opportunities/opportunities-page.component';
import { OpportunityDetailPageComponent } from './features/opportunities/opportunity-detail-page.component';
import { OpportunityFormPageComponent } from './features/opportunities/opportunity-form-page.component';
import { ProjectDetailPageComponent } from './features/projects/project-detail-page.component';
import { ProjectFormPageComponent } from './features/projects/project-form-page.component';
import { ProjectsPageComponent } from './features/projects/projects-page.component';
import { StatusPageComponent } from './features/status/status-page.component';
import { AppShellComponent } from './layout/app-shell.component';

const productTitle = 'Orqestra | Project & Vendor Platform';

export const routes: Routes = [
  {
    path: 'activate-account',
    canActivate: [showcaseFormGuard],
    title: productTitle,
    loadComponent: () => import('./features/auth/activation-page.component').then(module => module.ActivationPageComponent)
  },
  {
    path: 'login',
    title: productTitle,
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login-page.component').then(module => module.LoginPageComponent)
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: 'team', title: productTitle, canActivate: [roleGuard(['ADMIN'])], loadComponent: () => import('./features/team/team-page.component').then(module => module.TeamPageComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard-page.component').then(module => module.DashboardPageComponent), title: productTitle },
      { path: 'projects', component: ProjectsPageComponent, title: productTitle },
      { path: 'projects/new', component: ProjectFormPageComponent, title: productTitle, canActivate: [roleGuard(['ADMIN', 'MANAGER']), showcaseFormGuard] },
      { path: 'projects/:id/edit', component: ProjectFormPageComponent, title: productTitle, canActivate: [roleGuard(['ADMIN', 'MANAGER']), showcaseFormGuard] },
      { path: 'projects/:id', component: ProjectDetailPageComponent, title: productTitle },
      { path: 'clients', component: CompaniesPageComponent, data: { role: 'CLIENT' }, title: productTitle },
      { path: 'vendors', component: CompaniesPageComponent, data: { role: 'VENDOR' }, title: productTitle },
      { path: 'companies', component: CompaniesPageComponent, title: productTitle },
      { path: 'companies/new', component: CompanyFormPageComponent, title: productTitle, canActivate: [showcaseFormGuard] },
      { path: 'companies/:id', component: CompanyDetailPageComponent, title: productTitle },
      { path: 'companies/:id/edit', component: CompanyFormPageComponent, title: productTitle, canActivate: [showcaseFormGuard] },
      { path: 'contacts', component: ContactsPageComponent, title: productTitle },
      { path: 'contacts/new', component: ContactFormPageComponent, title: productTitle, canActivate: [showcaseFormGuard] },
      { path: 'contacts/:id', component: ContactDetailPageComponent, title: productTitle },
      { path: 'contacts/:id/edit', component: ContactFormPageComponent, title: productTitle, canActivate: [showcaseFormGuard] },
      { path: 'leads', component: LeadsPageComponent, title: productTitle },
      { path: 'leads/new', component: LeadFormPageComponent, title: productTitle, canActivate: [showcaseFormGuard] },
      { path: 'leads/:id/edit', component: LeadFormPageComponent, title: productTitle, canActivate: [showcaseFormGuard] },
      { path: 'leads/:id', component: LeadDetailPageComponent, title: productTitle },
      { path: 'opportunities', component: OpportunitiesPageComponent, title: productTitle },
      { path: 'opportunities/new', component: OpportunityFormPageComponent, title: productTitle, canActivate: [showcaseFormGuard] },
      { path: 'opportunities/:id/edit', component: OpportunityFormPageComponent, title: productTitle, canActivate: [showcaseFormGuard] },
      { path: 'opportunities/:id', component: OpportunityDetailPageComponent, title: productTitle },
      { path: 'activities', component: ActivitiesPageComponent, title: productTitle },
      { path: 'status', component: StatusPageComponent, title: productTitle }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
