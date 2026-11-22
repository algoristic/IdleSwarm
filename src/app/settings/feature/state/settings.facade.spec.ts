import { TestBed } from '@angular/core/testing';

import { GameStore } from '@app/engine/data-access/game-store/game-store.service';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import { KEY_VALUE_STORE } from '@app/persistence/data-access/persistence/persistence-service.tokens';
import { PersistenceService } from '@app/persistence/data-access/persistence/persistence.service';
import { encodeSave } from '@app/persistence/domain/serialize-logic';
import type { KeyValueStore } from '@app/persistence/domain/slots-logic';
import { PREFERS_REDUCED_MOTION } from '@app/shared/data-access/motion-preference/motion-preference-service.tokens';
import { MotionPreferenceService } from '@app/shared/data-access/motion-preference/motion-preference.service';
import { CLIPBOARD, CLOCK } from '@app/shared/data-access/platform/platform.tokens';
import { NUMBER_NOTATION } from '@app/shared/ui/pipes/number-notation/number-notation.token';

import { SettingsFacade } from './settings.facade';
import { provideAppliedSettings, provideSettingsState } from './settings.providers';
import { BUILD_INFO } from './settings.tokens';

const NOW = 1_700_000_000_000;

function memoryStore(): KeyValueStore {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

describe('SettingsFacade', () => {
  let facade: SettingsFacade;
  let store: GameStore;
  let writeText: ReturnType<typeof vi.fn<(text: string) => Promise<void>>>;

  beforeEach(() => {
    writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        GameStore,
        PersistenceService,
        provideSettingsState(),
        { provide: KEY_VALUE_STORE, useValue: memoryStore() },
        { provide: CLOCK, useValue: { now: () => NOW, monotonic: () => 0 } },
        { provide: CLIPBOARD, useValue: { writeText } },
        {
          provide: BUILD_INFO,
          useValue: { version: '1.2.3', buildTime: NOW, buildNumber: 7, commit: 'abc1234' },
        },
      ],
    });
    facade = TestBed.inject(SettingsFacade);
    store = TestBed.inject(GameStore);
    store.load(createInitialState({ seed: 'aktuell', now: NOW }));
  });

  it('ändert Einstellungen über das Kommando und stellt das Zahlenformat bereit', () => {
    const notation = TestBed.inject(NUMBER_NOTATION);
    facade.update({ numberFormat: 'scientific' });

    expect(store.state().settings.numberFormat).toBe('scientific');
    expect(notation()).toBe('scientific');
    expect(facade.view()).toEqual({
      settings: store.state().settings,
      version: '1.2.3',
      buildTime: NOW,
      buildNumber: 7,
      commit: 'abc1234',
    });
  });

  it('exportiert beim Öffnen der Export-Ansicht und kopiert den Text', async () => {
    facade.openDialog();
    facade.showPanel('export');
    const text = facade.dialog().exportText;
    expect(text).not.toBeNull();

    await facade.copyExport();
    expect(writeText).toHaveBeenCalledWith(text);
    expect(facade.dialog().copyStatus).toBe('copied');

    writeText.mockRejectedValueOnce(new Error('verweigert'));
    await facade.copyExport();
    expect(facade.dialog().copyStatus).toBe('failed');
  });

  it('importiert erst nach der Bestätigung und meldet Erfolg in der Übersicht', () => {
    const text = encodeSave(createInitialState({ seed: 'importiert', now: NOW }));
    facade.openDialog();
    facade.showPanel('import');
    facade.requestImport(text);

    expect(facade.dialog().panel).toBe('import-confirm');
    expect(store.state().seed).toBe('aktuell');

    facade.confirmImport();
    expect(store.state().seed).toBe('importiert');
    expect(facade.dialog()).toMatchObject({ panel: 'main', notice: 'imported', importText: '' });
  });

  it('zeigt bei fehlerhaftem Text den Fehler und behält den Text', () => {
    facade.openDialog();
    facade.requestImport('Unsinn');
    facade.confirmImport();

    expect(store.state().seed).toBe('aktuell');
    expect(facade.dialog()).toMatchObject({
      panel: 'import',
      importError: 'corrupt',
      importText: 'Unsinn',
    });
  });

  it('setzt nach der zweiten Bestätigung zurück und schließt den Dialog', () => {
    facade.openDialog();
    facade.showPanel('reset');
    facade.showPanel('reset-confirm');
    facade.confirmReset();

    expect(store.state().seed).not.toBe('aktuell');
    expect(facade.open()).toBe(false);
  });

  it('zeigt die Hinweise erneut', () => {
    store.dispatch({ type: 'markHintSeen', hint: 'collect' });
    facade.openDialog();
    facade.resetHints();

    expect(store.state().onboarding.seenHints).toEqual([]);
    expect(facade.dialog().notice).toBe('hints-reset');
  });
});

describe('provideAppliedSettings', () => {
  it('lässt den MotionPreferenceService der Einstellung im Spielstand folgen', () => {
    TestBed.configureTestingModule({
      providers: [
        GameStore,
        MotionPreferenceService,
        provideAppliedSettings(),
        {
          provide: PREFERS_REDUCED_MOTION,
          useValue: { matches: () => true, onChange: () => () => undefined },
        },
      ],
    });
    const store = TestBed.inject(GameStore);
    const motion = TestBed.inject(MotionPreferenceService);

    expect(motion.reducedMotion()).toBe(true);
    store.dispatch({ type: 'updateSettings', settings: { motion: 'full' } });
    expect(motion.reducedMotion()).toBe(false);
    store.dispatch({ type: 'updateSettings', settings: { motion: 'reduced' } });
    expect(motion.reducedMotion()).toBe(true);
  });
});
