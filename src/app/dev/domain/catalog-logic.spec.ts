import {
  catalogNeighbours,
  isCatalogEntryId,
  parseCatalogControls,
  parseLevel,
  searchCatalog,
  unitsForLevel,
} from './catalog-logic';
import { CATALOG_DEFAULT_CONTROLS, CATALOG_ENTRIES } from './data/catalog.data';
import {
  CATALOG_CATEGORY_IDS,
  CATALOG_ENTRY_IDS,
  CatalogCategoryId,
  CatalogEntryId,
} from './models/catalog.model';

const entryNames = Object.fromEntries(
  CATALOG_ENTRY_IDS.map((id) => [id, `Eintrag ${id}`]),
) as Record<CatalogEntryId, string>;
const categoryNames = Object.fromEntries(
  CATALOG_CATEGORY_IDS.map((id) => [id, `Kategorie ${id}`]),
) as Record<CatalogCategoryId, string>;

describe('catalog-logic', () => {
  it('führt jede ID genau einmal', () => {
    expect(CATALOG_ENTRIES.map((entry) => entry.id)).toEqual([...CATALOG_ENTRY_IDS]);
  });

  it('erkennt bekannte IDs', () => {
    expect(isCatalogEntryId('swarm-canvas')).toBe(true);
    expect(isCatalogEntryId('gibt-es-nicht')).toBe(false);
    expect(isCatalogEntryId(null)).toBe(false);
  });

  it('liefert Nachbarn am Rand ohne Vorgänger bzw. Nachfolger', () => {
    expect(catalogNeighbours('unit-sprite')).toEqual({ previous: null, next: 'eater-designs' });
    expect(catalogNeighbours('pipes')).toEqual({ previous: 'dialog-frame', next: null });
  });

  it('zeigt ohne Suche alle Kategorien', () => {
    const groups = searchCatalog('  ', entryNames, categoryNames);
    expect(groups.map((group) => group.category)).toEqual([...CATALOG_CATEGORY_IDS]);
  });

  it('sucht im Namen ohne Groß- und Kleinschreibung', () => {
    const groups = searchCatalog('EINTRAG MAP-FIND', entryNames, categoryNames);
    expect(groups).toEqual([{ category: 'finds', entries: ['map-find'] }]);
  });

  it('findet über den Namen der Kategorie alle ihre Einträge', () => {
    const groups = searchCatalog('kategorie travel', entryNames, categoryNames);
    expect(groups).toEqual([{ category: 'travel', entries: ['swarm-travel'] }]);
  });

  it('wächst die Einheiten je Stufe logarithmisch', () => {
    expect(unitsForLevel(0)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(unitsForLevel(1)).toEqual([1, 0, 0, 0, 0, 0]);
    expect(unitsForLevel(5)).toEqual([100, 10, 1, 0, 0, 0]);
    expect(unitsForLevel(11)).toEqual([100000, 10000, 1000, 100, 10, 1]);
  });

  it('begrenzt die Stufe und fällt bei Unsinn auf den Standard zurück', () => {
    expect(parseLevel(99)).toBe(18);
    expect(parseLevel(-3)).toBe(0);
    expect(parseLevel(4.6)).toBe(5);
    expect(parseLevel(Number.NaN)).toBe(7);
  });

  it('liest die Regler und ersetzt unbekannte Werte', () => {
    const controls = parseCatalogControls({
      ...CATALOG_DEFAULT_CONTROLS,
      fill: '25',
      dead: 'on',
      site: 'seagrass',
      zone: '9',
      motion: 'off',
      blur: 'off',
    });
    expect(controls.fill).toBe(0.25);
    expect(controls.dead).toBe(true);
    expect(controls.site).toBe('seagrass');
    expect(controls.zone).toBe(0);
    expect(controls.motion).toBe(false);
    expect(controls.blur).toBe(false);
    expect(parseCatalogControls(CATALOG_DEFAULT_CONTROLS).blur).toBe(true);
    expect(controls.units).toEqual(unitsForLevel(7));
  });
});
