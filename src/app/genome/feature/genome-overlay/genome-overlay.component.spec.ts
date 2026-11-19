import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GameStore } from '@app/engine/data-access/game-store/game-store.service';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import { Num } from '@app/shared/util/num/num';

import { GenomeLayerComponent } from '../genome-layer/genome-layer.component';
import { provideGenomeState } from '../state/genome.providers';
import { GenomeOverlayComponent } from './genome-overlay.component';

/** Die Shell zeigt Genom-Ebene und Overlay zusammen; beide teilen die Auswahl. */
@Component({
  imports: [GenomeLayerComponent, GenomeOverlayComponent],
  template: '<app-genome-layer /><app-genome-overlay />',
})
class GenomeHostComponent {}

describe('GenomeLayerComponent und GenomeOverlayComponent', () => {
  let store: GameStore;
  let fixture: ComponentFixture<GenomeHostComponent>;

  const element = () => fixture.nativeElement as HTMLElement;
  const query = <T extends Element>(testId: string) =>
    element().querySelector(`[data-testid="${testId}"]`) as T | null;
  const text = (testId: string) => query(testId)?.textContent?.replace(/\s+/g, ' ').trim();
  const status = (id: string) => query(`genome.tree.nodes.${id}`)?.getAttribute('data-status');

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [GenomeHostComponent],
      providers: [provideRouter([]), GameStore, provideGenomeState()],
    });
    store = TestBed.inject(GameStore);
    const state = createInitialState({ seed: 'genome-page', now: 0 });
    store.replace({
      ...state,
      res: { ...state.res, dna: Num.from(30) },
      genome: { owned: ['cilia-1'] },
      finds: { ...state.finds, collected: { 'sulfur-pearl': 2 } },
    });
    fixture = TestBed.createComponent(GenomeHostComponent);
    fixture.detectChanges();
  });

  it('zeigt DNA, Zähler und den Status der Knoten', () => {
    expect(text('genome.status.dna')).toBe('30 DNA');
    expect(text('genome.status.available')).toBe('3 Adaptionen verfügbar');
    expect(status('cilia-1')).toBe('evolved');
    expect(status('cilia-2')).toBe('available');
    expect(status('filter-feeder')).toBe('locked');
    expect(status('sulfur-shell')).toBe('undiscovered');
    expect(text('genome.tree.nodes.cilia-2.cost')).toBe('25 DNA');
    expect(text('genome.tree.nodes.sulfur-shell.progress')).toBe('2 / 5');
  });

  it('wählt einen Knoten per Klick und entwickelt ihn mit genug DNA (US-05.03)', () => {
    query<SVGElement>('genome.tree.nodes.cilia-2')?.dispatchEvent(new MouseEvent('click'));
    fixture.detectChanges();
    expect(query('genome.tree.nodes.cilia-2')?.getAttribute('aria-pressed')).toBe('true');
    expect(text('genome.detail.name')).toBe('Cilien-Schlag II');
    expect(text('genome.detail.kind')).toBe('Sammeln');
    expect(text('genome.detail.predecessor')).toBe('Cilien-Schlag I ✓');
    expect(text('genome.detail.effects.collectRate')).toBe(
      'Sammelleistung je Drohne 120 % → 150 %',
    );
    expect(text('genome.detail.evolve')).toBe('Für 25 DNA entwickeln');

    query<HTMLButtonElement>('genome.detail.evolve')?.click();
    fixture.detectChanges();

    expect(store.state().genome.owned).toEqual(['cilia-1', 'cilia-2']);
    expect(status('cilia-2')).toBe('evolved');
    expect(status('filter-feeder')).toBe('too-expensive');
    expect(text('genome.status.dna')).toBe('5 DNA');
    expect(text('genome.detail.evolved')).toBe('✓ entwickelt · wirkt dauerhaft');
    expect(text('genome.status.available')).toBe('Keine Adaption verfügbar');
  });

  it('wählt per Tastatur und sperrt den Knopf bei zu wenig DNA, Vorgänger oder Fund', () => {
    const select = (id: string) => {
      query(`genome.tree.nodes.${id}`)?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter' }),
      );
      fixture.detectChanges();
    };
    store.replace({ ...store.state(), res: { ...store.state().res, dna: Num.from(10) } });
    select('cilia-2');
    expect(query<HTMLButtonElement>('genome.detail.evolve')?.disabled).toBe(true);
    expect(text('genome.detail.evolve')).toBe('25 DNA · es fehlen 15');

    select('filter-feeder');
    expect(text('genome.detail.evolve')).toBe('gesperrt');
    expect(text('genome.detail.predecessor')).toBe('Cilien-Schlag II ✗');

    select('sulfur-shell');
    expect(text('genome.detail.kind')).toBe('Einzigartig (Fund)');
    expect(text('genome.detail.progress')).toBe('Fund: Schwefelperle 2 / 5');
    expect(text('genome.detail.evolve')).toBe('noch nicht gefunden');
    expect(text('genome.detail.effects.attackPerSoldier')).toBe('Angriff je Soldat +1,0');
  });
});
