import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MediaQuery, PREFERS_REDUCED_MOTION } from './motion-preference-service.tokens';
import { MOTION_ATTRIBUTE, MotionPreferenceService } from './motion-preference.service';

describe('MotionPreferenceService', () => {
  let systemReduced: boolean;
  let listeners: Set<() => void>;

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
      providers: [MotionPreferenceService, { provide: PREFERS_REDUCED_MOTION, useValue: media }],
    });
    return TestBed.inject(MotionPreferenceService);
  }

  const attribute = (): string | null => document.documentElement.getAttribute(MOTION_ATTRIBUTE);

  beforeEach(() => {
    systemReduced = false;
    listeners = new Set();
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
    motion.setOverride(true);
    expect(motion.reducedMotion()).toBe(true);
    setSystem(true);
    motion.setOverride(false);
    expect(motion.reducedMotion()).toBe(false);
    motion.setOverride(null);
    expect(motion.reducedMotion()).toBe(true);
  });

  it('setzt das Attribut an <html>', () => {
    const motion = create();
    TestBed.inject(ApplicationRef).tick();
    expect(attribute()).toBe('full');
    motion.setOverride(true);
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
