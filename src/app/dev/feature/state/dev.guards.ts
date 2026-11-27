import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';

import { isCatalogEntryId } from '../../domain/catalog-logic';

export function catalogEntryGuard(): CanActivateFn {
  return (route) => {
    if (isCatalogEntryId(route.paramMap.get('entryId'))) return true;
    const router = inject(Router);
    return new RedirectCommand(router.parseUrl('/katalog'), { replaceUrl: true });
  };
}
