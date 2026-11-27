import { Component, computed, input, output } from '@angular/core';

import { BottomSheetComponent } from '@app/shared/ui/bottom-sheet/bottom-sheet.component';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { BUTTON_VARIANTS } from '@app/shared/ui/button/button.model';
import { DialogActionsDirective } from '@app/shared/ui/dialog-actions/dialog-actions.directive';
import { DialogFrameComponent } from '@app/shared/ui/dialog-frame/dialog-frame.component';
import { DialogHeadingDirective } from '@app/shared/ui/dialog-heading/dialog-heading.directive';
import { DialogTextDirective } from '@app/shared/ui/dialog-text/dialog-text.directive';
import { DialogTitleDirective } from '@app/shared/ui/dialog-title/dialog-title.directive';
import { PillComponent } from '@app/shared/ui/pill/pill.component';
import { FormatDurationPipe } from '@app/shared/ui/pipes/format-duration/format-duration.pipe';
import { FormatIntegerPipe } from '@app/shared/ui/pipes/format-integer/format-integer.pipe';
import { FormatNumberPipe } from '@app/shared/ui/pipes/format-number/format-number.pipe';
import { FormatTimePipe } from '@app/shared/ui/pipes/format-time/format-time.pipe';
import { SegmentComponent } from '@app/shared/ui/segment/segment.component';
import { SegmentOption } from '@app/shared/ui/segment/segment.model';
import { TagDirective } from '@app/shared/ui/tag/tag.directive';
import { TAG_TONES } from '@app/shared/ui/tag/tag.model';
import { ToastComponent } from '@app/shared/ui/toast/toast.component';
import { ToastStackComponent } from '@app/shared/ui/toast-stack/toast-stack.component';
import { formatNumber } from '@app/shared/util/format';

import { CatalogControls, CatalogEntryId } from '../../domain/models/catalog.model';

const SAMPLE_NUMBERS = [0, 7.25, 12.34, 99.99, 1234.5, 98765, 1.5e6, 2.25e9, 4e15, 1.5e33, -5];
const SAMPLE_SECONDS = [0, 9.2, 65, 3599.5, 3725, 86400];

@Component({
  selector: 'app-catalog-shared-preview',
  imports: [
    BottomSheetComponent,
    ButtonDirective,
    DialogActionsDirective,
    DialogFrameComponent,
    DialogHeadingDirective,
    DialogTextDirective,
    DialogTitleDirective,
    FormatDurationPipe,
    FormatIntegerPipe,
    FormatNumberPipe,
    FormatTimePipe,
    PillComponent,
    SegmentComponent,
    TagDirective,
    ToastComponent,
    ToastStackComponent,
  ],
  templateUrl: './catalog-shared-preview.component.html',
  host: { class: 'block' },
})
export class CatalogSharedPreviewComponent {
  entry = input.required<CatalogEntryId>();
  controls = input.required<CatalogControls>();
  dialogOpen = input.required<boolean>();
  sheetCollapsed = input.required<boolean>();
  toasts = input.required<readonly number[]>();
  segmentChoice = input.required<string>();

  buttonVariants = BUTTON_VARIANTS;
  tagTones = TAG_TONES;
  sampleNumbers = SAMPLE_NUMBERS;
  sampleSeconds = SAMPLE_SECONDS;
  foodExtra = `/ ${formatNumber(1.2e6)}`;

  clickedOpenDialog = output();
  closedDialog = output();
  changedSheetCollapsed = output<boolean>();
  clickedShowToast = output();
  expiredToast = output<number>();
  selectedSegment = output<string>();

  over = computed(() => this.controls().fill >= 1);

  buttonLabel = $localize`:@@uiDev-catalogSharedPreview-button:Knopf`;
  tagLabel = $localize`:@@uiDev-catalogSharedPreview-tag:Markiert`;
  longTagLabel = $localize`:@@uiDev-catalogSharedPreview-longTag:Ein sehr langer Tag, der gekürzt wird`;
  segmentLabel = $localize`:@@uiDev-catalogSharedPreview-segment:Beispiel-Segment`;
  sheetLabel = $localize`:@@uiDev-catalogSharedPreview-sheet:Beispiel-Blatt`;
  dialogLabel = $localize`:@@uiDev-catalogSharedPreview-dialog:Beispiel-Dialog`;
  pillLabels = {
    food: $localize`:@@uiDev-catalogSharedPreview-pill-food:Vorrat`,
    eggs: $localize`:@@uiDev-catalogSharedPreview-pill-eggs:Eier`,
    harvest: $localize`:@@uiDev-catalogSharedPreview-pill-harvest:Ernte`,
  };
  segmentOptions: SegmentOption[] = [
    {
      id: 'one',
      label: $localize`:@@uiDev-catalogSharedPreview-segment-one:Eins`,
      testId: 'dev.catalog.segment.one',
    },
    {
      id: 'two',
      label: $localize`:@@uiDev-catalogSharedPreview-segment-two:Zwei`,
      tone: 'orange',
      testId: 'dev.catalog.segment.two',
    },
    {
      id: 'three',
      label: $localize`:@@uiDev-catalogSharedPreview-segment-three:Drei`,
      tone: 'pink',
      testId: 'dev.catalog.segment.three',
    },
  ];

  onOpenDialog(): void {
    this.clickedOpenDialog.emit();
  }

  onCloseDialog(): void {
    this.closedDialog.emit();
  }

  onChangedSheetCollapsed(collapsed: boolean): void {
    this.changedSheetCollapsed.emit(collapsed);
  }

  onShowToast(): void {
    this.clickedShowToast.emit();
  }

  onExpiredToast(id: number): void {
    this.expiredToast.emit(id);
  }

  onSelectSegment(id: string): void {
    this.selectedSegment.emit(id);
  }
}
