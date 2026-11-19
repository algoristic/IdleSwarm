import {
  nodeDecoration,
  NODE_RADIUS,
  NO_TEXT_SCALE,
  polarPoint,
  ROOT_RADIUS,
  type TextScale,
  TREE_SIZE,
  treeTextScale,
} from '../../domain/genome-tree-logic';
import { genomeEntryLabel } from '../genome-labels/genome-labels';
import type { GenomeEntryId } from '../models/genome-entry.model';
import { GENOME_LAYOUT, GENOME_NEAREST, GENOME_TREE_MIN_SIZE } from './genome-tree.layout';

interface Box {
  readonly id: string;
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Großzügig geschätzte Zeichenbreite von Nunito halbfett (wie auf der Sonar-Karte). */
const CHAR_WIDTH_EM = 0.58;
/** Breitestes Kostenschild: „1.234 DNA“. */
const TAG_CHARS = 9;

const IDS = Object.keys(GENOME_LAYOUT) as GenomeEntryId[];

function boxes(scale: TextScale): Box[] {
  return IDS.flatMap((id) => {
    const layout = GENOME_LAYOUT[id];
    const radius = id === 'root' ? ROOT_RADIUS : NODE_RADIUS;
    const center = polarPoint(layout);
    const deco = nodeDecoration(radius, layout.label, layout.tag, scale);
    const name = genomeEntryLabel(id);
    const width = name.length * CHAR_WIDTH_EM * deco.labelSize;
    const left =
      deco.label.anchor === 'start'
        ? deco.label.x
        : deco.label.anchor === 'end'
          ? deco.label.x - width
          : deco.label.x - width / 2;
    const labelTop = deco.label.y - 0.9 * deco.labelSize;
    const result: Box[] = [
      {
        id: `${id}:node`,
        left: center.x - radius,
        top: center.y - radius,
        right: center.x + radius,
        bottom: center.y + radius,
      },
      {
        id: `${id}:label`,
        left: center.x + left,
        top: center.y + labelTop,
        right: center.x + left + width,
        bottom: center.y + labelTop + 1.1 * deco.labelSize,
      },
    ];
    if (id !== 'root') {
      const tagWidth = Math.max(deco.tag.width, TAG_CHARS * CHAR_WIDTH_EM * deco.tagTextSize);
      result.push({
        id: `${id}:tag`,
        left: center.x + deco.tag.textX - tagWidth / 2,
        top: center.y + deco.tag.y,
        right: center.x + deco.tag.textX + tagWidth / 2,
        bottom: center.y + deco.tag.y + deco.tag.height,
      });
    }
    return result;
  });
}

function overlaps(all: readonly Box[]): string[] {
  const owner = (box: Box): string => box.id.split(':')[0];
  const found: string[] = [];
  all.forEach((a, i) =>
    all.slice(i + 1).forEach((b) => {
      if (owner(a) === owner(b)) {
        return;
      }
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) {
        found.push(`${a.id} × ${b.id}`);
      }
    }),
  );
  return found;
}

describe('GENOME_LAYOUT', () => {
  it('wird auf dem Smartphone so groß, dass Trefferflächen und Texte passen', () => {
    // Für 44 px reichten 595 px (kleinster Knotenabstand 59,2 Einheiten), für 12-px-Texte ohne
    // Überschneidung braucht es Maßstab 1.
    expect(Math.min(...Object.values(GENOME_NEAREST))).toBeCloseTo(59.2, 1);
    expect(GENOME_TREE_MIN_SIZE).toBe(TREE_SIZE);
  });

  it('überschneidet Knoten, Beschriftungen und Kostenschilder nicht (wie im Mockup)', () => {
    expect(overlaps(boxes(NO_TEXT_SCALE))).toEqual([]);
  });

  it('überschneidet nichts mit den Texten bei Mindestgröße (Schilder vergrößert)', () => {
    const scaled = boxes(
      treeTextScale(GENOME_TREE_MIN_SIZE / TREE_SIZE, GENOME_TREE_MIN_SIZE / TREE_SIZE),
    );
    expect(overlaps(scaled)).toEqual([]);
    const outside = scaled.filter(
      (box) => box.left < 0 || box.top < 0 || box.right > TREE_SIZE || box.bottom > TREE_SIZE,
    );
    expect(outside.map((box) => box.id)).toEqual([]);
  });
});
