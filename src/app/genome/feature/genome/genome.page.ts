import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FormatDownPipe } from '@app/shared/ui/pipes/format-down/format-down.pipe';
import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';

import { GenomeDetailComponent } from '../../ui/genome-detail/genome-detail.component';
import { GenomeTreeComponent } from '../../ui/genome-tree/genome-tree.component';
import { GenomeFacade } from '../state/genome.facade';

/** Genom: radialer Baum im Zellkern, Detailpanel zum gewählten Knoten, DNA und Zähler. */
@Component({
  selector: 'app-genome-page',
  imports: [FormatDownPipe, FormatNumPipe, GenomeDetailComponent, GenomeTreeComponent, RouterLink],
  templateUrl: './genome.page.html',
  host: { class: 'block' },
})
export class GenomePage {
  facade = inject(GenomeFacade);
}
