import { createBot, handleSimRequest } from './sim-core';
import type { SimRequest, SimResponse } from './sim-protocol';

const REQUEST: SimRequest = {
  runId: 7,
  seed: 'kern',
  durationMs: 600_000,
  bots: [{ kind: 'active' }, { kind: 'idle' }],
  params: { droneCost: 5 },
};

function run(request: SimRequest): SimResponse[] {
  const responses: SimResponse[] = [];
  let clock = 0;
  handleSimRequest(
    request,
    (response) => responses.push(response),
    () => (clock += 10),
  );
  return responses;
}

describe('handleSimRequest', () => {
  it('meldet je Bot ein Ergebnis und dann das Ende', () => {
    const responses = run(REQUEST);
    expect(responses.map((response) => response.type)).toEqual(['result', 'result', 'done']);
    expect(responses.every((response) => response.runId === 7)).toBe(true);
    const [first, second] = responses;
    if (first.type !== 'result' || second.type !== 'result') {
      throw new Error('Ergebnis erwartet');
    }
    expect([first.run.bot, second.run.bot]).toEqual(['active', 'idle']);
    expect(first.run.params.droneCost).toBe(5);
    expect(first.run.computeMs).toBe(10);
    expect(first.run.durationMs).toBe(600_000);
  });

  it('ist reproduzierbar und per JSON übertragbar', () => {
    const [a] = run(REQUEST);
    const [b] = run(REQUEST);
    expect(JSON.parse(JSON.stringify(a))).toEqual(b);
  });

  it('meldet Fehler als Nachricht', () => {
    const responses = run({ ...REQUEST, durationMs: -1 });
    expect(responses).toHaveLength(1);
    expect(responses[0]).toMatchObject({ type: 'error', runId: 7 });
    expect((responses[0] as { message: string }).message).toContain('ungültige Dauer');
  });

  it('gibt Bot-Optionen weiter', () => {
    expect(createBot({ kind: 'idle', options: { visitEveryMs: 1000 } }).nextActionMs(0)).toBe(1000);
    expect(() => createBot({ kind: 'active', options: { decideEveryMs: 0 } })).toThrow(RangeError);
  });
});
