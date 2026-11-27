import { expect, test } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

test.skip(process.env['E2E_BUILD_CONFIGURATION'] !== 'pages', 'Katalog nur im Dev-Build');

test('zeigt Kategorien und Einträge', async ({ page }) => {
  await page.goto('./katalog');

  await expect(page.getByTestId('dev.catalog.title')).toBeVisible();
  await expect(page.getByTestId('dev.catalog.category.units')).toBeVisible();
  await expect(page.getByTestId('dev.catalog.category.ui')).toBeVisible();
  await expect(page.getByTestId('dev.catalog.entry.swarm-canvas')).toBeVisible();
});

test('filtert über die Suche nach Name und Kategorie', async ({ page }) => {
  await page.goto('./katalog');
  const search = page.getByTestId('dev.catalog.search');

  await search.fill('NEURON');
  await expect(page.getByTestId('dev.catalog.category.neuron')).toBeVisible();
  await expect(page.getByTestId('dev.catalog.category.units')).toHaveCount(0);

  await search.fill('futterstellen');
  await expect(page.getByTestId('dev.catalog.entry.map-site')).toBeVisible();
  await expect(page.getByTestId('dev.catalog.entry.button')).toHaveCount(0);

  await search.fill('gibt es nicht');
  await expect(page.getByTestId('dev.catalog.empty')).toBeVisible();
});

test('öffnet einen Eintrag über den Link und per Deep-Link', async ({ page }) => {
  await page.goto('./katalog');
  await page.getByTestId('dev.catalog.entry.swarm-canvas').click();
  await expect(page).toHaveURL(/\/katalog\/swarm-canvas$/);
  await expect(page.getByTestId('game.swarm.canvas')).toBeVisible();

  await page.goto('./katalog/swarm-travel');
  await expect(page.getByTestId('dev.catalog.preview')).toHaveAttribute(
    'data-entry',
    'swarm-travel',
  );
  await expect(page.getByTestId('game.swarm.canvas')).toBeVisible();
});

test('ein Regler ändert die Vorschau', async ({ page }) => {
  await page.goto('./katalog/map-site');
  const site = page.getByTestId('dev.catalog.mapSite');

  await expect(site).not.toHaveClass(/opacity-35/);
  await page.getByTestId('dev.catalog.control.dead.on').click();
  await expect(page.getByTestId('dev.catalog.control.dead.on')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(site).toHaveClass(/opacity-35/);
});

test('leitet eine unbekannte ID auf die Übersicht', async ({ page }) => {
  await page.goto('./katalog/gibt-es-nicht');

  await expect(page).toHaveURL(/\/katalog$/);
  await expect(page.getByTestId('dev.catalog.title')).toBeVisible();
});
