import { Component, output } from '@angular/core';

@Component({
  selector: 'app-menu-button',
  templateUrl: './menu-button.component.html',
  host: { class: 'block' },
})
export class MenuButtonComponent {
  clicked = output();

  onClick(): void {
    this.clicked.emit();
  }
}
