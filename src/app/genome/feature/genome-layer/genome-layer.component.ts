import { Component, inject } from '@angular/core';

import { GenomeTreeComponent } from '../../ui/genome-tree/genome-tree.component';
import { GenomeFacade } from '../state/genome.facade';

/** Genom-Ebene der Shell: der Baum im Zellkern in der Größe `--ms`, zentriert im Viewport. */
@Component({
  selector: 'app-genome-layer',
  imports: [GenomeTreeComponent],
  templateUrl: './genome-layer.component.html',
  styleUrl: './genome-layer.component.css',
  host: { class: 'block' },
})
export class GenomeLayerComponent {
  facade = inject(GenomeFacade);
}
