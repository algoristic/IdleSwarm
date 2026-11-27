import { Component, computed, input } from '@angular/core';

import { FormatNumberPipe } from '@app/shared/ui/pipes/format-number/format-number.pipe';
import { FormatTimePipe } from '@app/shared/ui/pipes/format-time/format-time.pipe';
import { TagDirective } from '@app/shared/ui/tag/tag.directive';

import { ContextBarDirective } from '../context-bar/context-bar.directive';
import { ProgressRingComponent } from '../progress-ring/progress-ring.component';
import { FIND_NAMES, SITE_TYPE_NAMES } from '../texts/game-texts';
import { SwarmContextView, TargetName } from './swarm-context.model';

@Component({
  selector: 'app-swarm-context',
  imports: [FormatNumberPipe, FormatTimePipe, ProgressRingComponent, TagDirective],
  templateUrl: './swarm-context.component.html',
  hostDirectives: [ContextBarDirective],
})
export class SwarmContextComponent {
  context = input.required<SwarmContextView>();

  siteTypeNames = SITE_TYPE_NAMES;

  destinationName = computed(() => {
    const place = this.context().place;
    return place.kind === 'travelling' && place.destination ? targetName(place.destination) : '';
  });
  markName = computed(() => {
    const tag = this.context().tag;
    return tag.kind === 'mark' ? targetName(tag.target) : '';
  });
}

function targetName(target: TargetName): string {
  return target.kind === 'site' ? SITE_TYPE_NAMES[target.siteType] : FIND_NAMES[target.findType];
}
