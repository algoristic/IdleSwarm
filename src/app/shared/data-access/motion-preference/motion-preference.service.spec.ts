import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  MediaQuery,
  MOTION_OVERRIDE,
  PREFERS_REDUCED_MOTION,
} from './motion-preference-service.tokens';
import { MOTION_ATTRIBUTE, MotionPreferenceService } from './motion-preference.service';

describe('MotionPreferenceService', () => {
  let systemReduced: boolean;
  let listeners: Set<() => void>;
  const override = signal<boolean | null>(null);

  const media: MediaQuery = {
    matches: () => systemReduced,
    onChange: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  function setSystem(reduced: boolean): void {
    systemReduced = reduced;
    listeners.forEach((listener) => listener());
  }

  function create(): MotionPreferenceService {
    TestBed.configureTestingModule({
      providers: [
        MotionPreferenceService,
        { provide: PREFERS_REDUCED_MOTION, useValue: media },
        { provide: MOTION_OVERRIDE, useValue: override.asReadonly() },
      ],
    });
    return TestBed.inject(MotionPreferenceService);
  }

  const attribute = (): string | null => document.documentElement.getAttribute(MOTION_ATTRIBUTE);

  beforeEach(() => {
    systemReduced = false;
    listeners = new Set();
    override.set(null);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    document.documentElement.removeAttribute(MOTION_ATTRIBUTE);
  });

  it('folgt der Systemeinstellung, auch wenn sie wechselt', () => {
    systemReduced = true;
    const motion = create();
    expect(motion.reducedMotion()).toBe(true);
    setSystem(false);
    expect(motion.reducedMotion()).toBe(false);
  });

  it('lässt die Einstellung im Spiel die Systemeinstellung überstimmen', () => {
    const motion = create();
    override.set(true);
    expect(motion.reducedMotion()).toBe(true);
    setSystem(true);
    override.set(false);
    expect(motion.reducedMotion()).toBe(false);
    override.set(null);
    expect(motion.reducedMotion()).toBe(true);
  });

  it('setzt das Attribut an <html>', () => {
    create();
    TestBed.inject(ApplicationRef).tick();
    expect(attribute()).toBe('full');
    override.set(true);
    TestBed.inject(ApplicationRef).tick();
    expect(attribute()).toBe('reduced');
  });

  it('meldet den Listener beim Zerstören ab', () => {
    create();
    expect(listeners.size).toBe(1);
    TestBed.resetTestingModule();
    expect(listeners.size).toBe(0);
  });
});

describe('MOTION_OVERRIDE', () => {
  it('folgt ohne Bereitstellung dem System', () => {
    expect(TestBed.inject(MOTION_OVERRIDE)()).toBeNull();
  });
});
