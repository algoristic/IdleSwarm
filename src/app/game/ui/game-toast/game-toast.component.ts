import { Component, computed, input, output } from '@angular/core';

import { ToastComponent } from '@app/shared/ui/toast/toast.component';

import { GameConfig } from '../../domain/models/game-config.model';
import { FIND_DESCRIPTIONS, FIND_NAMES, ZONE_NAMES } from '../texts/game-texts';
import { GameToast } from './game-toast.model';

@Component({
  selector: 'app-game-toast',
  imports: [ToastComponent],
  templateUrl: './game-toast.component.html',
  host: { class: 'contents' },
})
export class GameToastComponent {
  toast = input.required<GameToast>();
  config = input.required<GameConfig>();

  findNames = FIND_NAMES;
  zoneNames = ZONE_NAMES;

  expired = output();

  findDescription = computed(() => {
    const message = this.toast().message;
    return message.kind === 'findCollected'
      ? FIND_DESCRIPTIONS[message.findType](this.config())
      : '';
  });

  onExpired(): void {
    this.expired.emit();
  }
}
