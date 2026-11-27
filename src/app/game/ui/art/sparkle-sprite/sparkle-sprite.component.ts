import { Component } from '@angular/core';

import { SPARKLE_COLOR } from '../art-palette';

@Component({
  selector: 'g[app-sparkle-sprite]',
  templateUrl: './sparkle-sprite.component.html',
})
export class SparkleSpriteComponent {
  color = SPARKLE_COLOR;
}
