import {
  PINCH_IDLE,
  pinchDown,
  pinchMove,
  PinchState,
  pinchUp,
  pinchZoom,
  pointDistance,
} from './shell-pinch-logic';

const at = (id: number, x: number, y = 0) => ({ id, x, y });

/** Zwei Finger im Abstand 100 px. */
function twoFingers(): PinchState {
  return pinchDown(pinchDown(PINCH_IDLE, at(1, 0)), at(2, 100));
}

describe('pointDistance', () => {
  it('misst den euklidischen Abstand', () => {
    expect(pointDistance(at(1, 0, 0), at(2, 30, 40))).toBe(50);
  });
});

describe('pinchZoom', () => {
  it('zoomt ab Faktor 1,25 hinein und ab 0,8 hinaus', () => {
    expect(pinchZoom(100, 125)).toBe('in');
    expect(pinchZoom(100, 124)).toBeNull();
    expect(pinchZoom(100, 81)).toBeNull();
    expect(pinchZoom(100, 80)).toBe('out');
  });

  it('rechnet beide Abstände mit mindestens 24 px', () => {
    expect(pinchZoom(2, 10)).toBeNull();
    expect(pinchZoom(2, 30)).toBe('in');
    expect(pinchZoom(10, 2)).toBeNull();
    expect(pinchZoom(30, 2)).toBe('out');
  });
});

describe('Pinch-Geste', () => {
  it('setzt den Bezugsabstand erst mit dem zweiten Finger', () => {
    const one = pinchDown(PINCH_IDLE, at(1, 0));
    expect(one.startDistance).toBeNull();
    expect(one.multiTouch).toBe(false);
    expect(twoFingers()).toMatchObject({ startDistance: 100, multiTouch: true, locked: false });
  });

  it('wechselt beim Auseinanderziehen einmal hinein und sperrt danach', () => {
    const spread = pinchMove(twoFingers(), at(2, 130));
    expect(spread.zoom).toBe('in');
    expect(spread.state.locked).toBe(true);
    // Weiter auseinander oder wieder zusammen: kein zweiter Wechsel in derselben Geste.
    expect(pinchMove(spread.state, at(2, 300)).zoom).toBeNull();
    expect(pinchMove(spread.state, at(2, 10)).zoom).toBeNull();
  });

  it('wechselt beim Zusammenführen hinaus', () => {
    expect(pinchMove(twoFingers(), at(1, 25)).zoom).toBe('out');
  });

  it('ignoriert kleine Bewegungen und unbekannte Finger', () => {
    const small = pinchMove(twoFingers(), at(2, 110));
    expect(small.zoom).toBeNull();
    expect(small.state.locked).toBe(false);
    expect(pinchMove(twoFingers(), at(9, 500)).zoom).toBeNull();
  });

  it('sperrt bei drei Fingern', () => {
    const three = pinchDown(twoFingers(), at(3, 50, 50));
    expect(three.locked).toBe(true);
    expect(pinchMove(three, at(2, 300)).zoom).toBeNull();
    // Hebt der dritte ab, bleibt die Geste gesperrt.
    const back = pinchUp(three, 3).state;
    expect(pinchMove(back, at(2, 300)).zoom).toBeNull();
  });

  it('gibt die Sperre erst frei, wenn alle Finger los sind, und meldet das Ende', () => {
    const spread = pinchMove(twoFingers(), at(2, 130)).state;
    const first = pinchUp(spread, 1);
    expect(first.endedMultiTouch).toBe(false);
    expect(first.state.locked).toBe(true);
    // Ein neuer zweiter Finger löst in derselben Geste nichts aus.
    const again = pinchDown(first.state, at(3, 0));
    expect(pinchMove(again, at(3, -200)).zoom).toBeNull();
    const last = pinchUp(pinchUp(again, 3).state, 2);
    expect(last).toEqual({ state: PINCH_IDLE, endedMultiTouch: true });
  });

  it('meldet bei einem einzelnen Finger kein Gestenende (Tippen bleibt Tippen)', () => {
    const one = pinchDown(PINCH_IDLE, at(1, 0));
    expect(pinchUp(one, 1)).toEqual({ state: PINCH_IDLE, endedMultiTouch: false });
    expect(pinchUp(one, 7).state).toBe(one);
  });

  it('misst nach dem Lösen eines von drei ungesperrten Fingern neu', () => {
    const two = pinchUp(pinchUp(pinchDown(PINCH_IDLE, at(1, 0)), 1).state, 1).state;
    expect(two).toBe(PINCH_IDLE);
    const moved = pinchDown(
      pinchMove(pinchDown(PINCH_IDLE, at(1, 0)), at(1, 40)).state,
      at(2, 140),
    );
    expect(moved.startDistance).toBe(100);
  });
});
