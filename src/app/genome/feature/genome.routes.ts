import { Routes } from '@angular/router';

import { GenomePage } from './genome/genome.page';
import { provideGenomeState } from './state/genome.providers';

export const genomeRoutes: Routes = [
  { path: '', component: GenomePage, providers: [provideGenomeState()] },
];
