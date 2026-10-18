import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ShowcaseDialogComponent } from './core/showcase/showcase-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ShowcaseDialogComponent],
  template: '<router-outlet></router-outlet><app-showcase-dialog></app-showcase-dialog>'
})
export class AppComponent {}
