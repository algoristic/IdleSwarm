import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-view-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './view-nav.component.html',
  host: { class: 'grid gap-2.5' },
})
export class ViewNavComponent {}
