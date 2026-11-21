import { expect, test } from '@playwright/test';

import { advancedGame, seedSave } from './support/game-states';

// Smartphone im Querformat: schmaler als 768 px und niedriger als 480 px (Variante `short:`).
test.use({ viewport: { width: 740, height: 360 } });

test('Querformat: Szene, Umgebung und Genom bleiben bedienbar', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Querformat gibt es nur auf dem Smartphone');
  const game = advancedGame(Date.now());
  await seedSave(page, game.save);
  await page.goto('./');

  await expect(page.getByTestId('hud.units.drones.buy')).toBeInViewport({ ratio: 1 });
  await expect(page.getByTestId('hud.drawers.pheromones.tab')).toBeInViewport({ ratio: 1 });
  await expect(page.getByTestId('settings.open')).toBeInViewport({ ratio: 1 });

  // Umgebung: kein eingeklapptes Sheet, Zielliste und Aufbruch im Panel rechts.
  await page.getByTestId('shell.zoom.map').click();
  await expect(page.getByTestId('sonar.status.site')).toBeVisible();
  await expect(page.getByTestId('sonar.sheet.toggle')).toBeHidden();
  await page.getByTestId('sonar.targets.toggle').click();
  await page.getByTestId(`sonar.targets.${game.departTarget}.select`).click();
  const depart = page.getByTestId('sonar.detail.depart');
  await depart.scrollIntoViewIfNeeded();
  await expect(depart).toBeInViewport({ ratio: 1 });
  await expect(depart).toBeEnabled();

  await page.getByTestId('shell.zoom.gen').click();
  await expect(page.getByTestId('genome.tree.svg')).toBeVisible();
  await expect(page.getByTestId('genome.side')).toBeInViewport();

  await page.getByTestId('shell.back').click();
  await expect(page).toHaveURL(/\/$/);
});
