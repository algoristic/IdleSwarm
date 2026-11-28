import { expect, Page, test } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

test.skip(process.env['E2E_BUILD_CONFIGURATION'] !== 'pages', 'Katalog nur im Dev-Build');

async function openSidebar(page: Page, isMobile: boolean): Promise<void> {
  if (!isMobile) return;
  await page.getByTestId('dev.catalog.menu').click();
  await expect(page.getByTestId('dev.catalog.menu')).toHaveAttribute('aria-expanded', 'true');
}

test('öffnet den ersten Eintrag und zeigt die Kategorien in der Sidebar', async ({
  page,
  isMobile,
}) => {
  await page.goto('./katalog');

  await expect(page).toHaveURL(/\/katalog\/unit-sprite$/);
  await openSidebar(page, isMobile);
  await expect(page.getByTestId('dev.catalog.title')).toBeVisible();
  await expect(page.getByTestId('dev.catalog.category.units')).toBeVisible();
  await expect(page.getByTestId('dev.catalog.category.ui')).toBeVisible();
  await expect(page.getByTestId('dev.catalog.entry.unit-sprite')).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('filtert über die Suche nach Name und Kategorie', async ({ page, isMobile }) => {
  await page.goto('./katalog');
  await openSidebar(page, isMobile);
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

test('öffnet einen Eintrag über die Sidebar und per Deep-Link', async ({ page, isMobile }) => {
  await page.goto('./katalog');
  await openSidebar(page, isMobile);
  await page.getByTestId('dev.catalog.entry.swarm-canvas').click();
  await expect(page).toHaveURL(/\/katalog\/swarm-canvas$/);
  await expect(page.getByTestId('game.swarm.canvas')).toBeVisible();
  if (isMobile) {
    await expect(page.getByTestId('dev.catalog.sidebar')).toBeHidden();
  } else {
    await expect(page.getByTestId('dev.catalog.entry.swarm-canvas')).toHaveAttribute(
      'aria-current',
      'page',
    );
  }

  await page.goto('./katalog/swarm-travel');
  await expect(page.getByTestId('dev.catalog.preview')).toHaveAttribute(
    'data-entry',
    'swarm-travel',
  );
  await expect(page.getByTestId('game.swarm.canvas')).toBeVisible();
});

test('klappt die Sidebar mobil ein und auf', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'nur mobil');
  await page.goto('./katalog');

  await expect(page.getByTestId('dev.catalog.sidebar')).toBeHidden();
  await openSidebar(page, isMobile);
  await expect(page.getByTestId('dev.catalog.sidebar')).toBeVisible();
  const viewport = page.viewportSize();
  await page.getByTestId('dev.catalog.menu.close').click({
    position: { x: (viewport?.width ?? 390) - 20, y: 400 },
  });
  await expect(page.getByTestId('dev.catalog.sidebar')).toBeHidden();

  await openSidebar(page, isMobile);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('dev.catalog.sidebar')).toBeHidden();
});

test('zeigt das Original und die Amöbe und hält die Amöbe an', async ({ page }) => {
  await page.goto('./katalog/eater-designs');
  await expect(page.getByTestId('dev.catalog.eaterDesign.original')).toBeVisible();
  await expect(page.getByTestId('dev.catalog.eaterDesign.amoeba')).toBeVisible();

  const amoeba = page.getByTestId('dev.catalog.eaterDesign.amoeba');
  await expect(amoeba.locator('animate').first()).toBeAttached();
  await page.getByTestId('dev.catalog.control.motion.off').click();
  await expect(amoeba.locator('animate, animateTransform')).toHaveCount(0);
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

test('verschiebt den Ebenenstapel und schaltet den Weichzeichner', async ({ page }) => {
  await page.goto('./katalog/backdrop-stack');
  const far = page.getByTestId('dev.catalog.parallax.far');
  await expect(far).toHaveCSS('filter', /blur/);

  const box = await page.getByTestId('dev.catalog.parallax.frame').boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 60, y + 30, { steps: 5 });
    await page.mouse.up();
  }
  await expect(far).not.toHaveAttribute('style', /translate\(0px, 0px\)/);

  await page.getByTestId('dev.catalog.control.blur.off').click();
  await expect(far).not.toHaveCSS('filter', /blur/);
});

test('leitet eine unbekannte ID auf den ersten Eintrag', async ({ page }) => {
  await page.goto('./katalog/gibt-es-nicht');

  await expect(page).toHaveURL(/\/katalog\/unit-sprite$/);
  await expect(page.getByTestId('dev.catalog.entry.title')).toBeVisible();
});
