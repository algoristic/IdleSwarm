// Erzeugt den Golden Master der Spielregeln aus dem eingefrorenen Prototyp: führt dessen Logikteil
// unter Node aus, spielt die Szenarien mit festem Seed und schreibt die Fixtures nach
// src/app/game/domain (golden-master.fixture.ts, prototype-game-config.fixture.ts).
// Aufruf im Repo-Wurzelverzeichnis: node tools/golden-master/generate.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

import * as prettier from 'prettier';

const ROOT = new URL('../../', import.meta.url);
const PROTOTYPE = new URL('public/prototype/index.html', ROOT);
const DOMAIN = new URL('src/app/game/domain/', ROOT);
const NOW = 1700000000000;

const UNIT_IDS = ['eater', 'brooder', 'eggBearer', 'clutch', 'broodClump', 'primalNest'];
const ZONE_IDS = ['droplet', 'tidePool', 'rockPool', 'shallows'];
const UPGRADES = { herd: 'hearth', verd: 'digestion', geis: 'flagella', kropf: 'crop' };
const SITE_TYPES = {
  algen: 'algae',
  plankton: 'plankton',
  krebs: 'carcass',
  schnee: 'marineSnow',
  seegras: 'seagrass',
};
const FINDS = {
  fress: 'feedingFrenzy',
  lege: 'layingBoost',
  verm: 'breedingFrenzy',
  wind: 'tailwind',
  blase: 'foodBubble',
  ballen: 'eggBall',
  schub: 'growthSpurt',
  keim: 'germCell',
};
const BUY_MODES = { one: '1', quarter: 'q', max: 'max' };
const EVENT_TYPES = [
  'siteDried',
  'zoneChanged',
  'departed',
  'travelAborted',
  'arrived',
  'findCollected',
  'unmarked',
  'noTarget',
  'ended',
];
const MARK_RESULTS = [
  'unmarked',
  'marked',
  'markedDriesBeforeArrival',
  'notFound',
  'currentSite',
  'dried',
  'unreachable',
];

function between(html, from, to) {
  const start = html.indexOf(from);
  const end = html.indexOf(to, start);
  if (start < 0 || end < 0) throw new Error(`Abschnitt ${from} nicht gefunden`);
  return html.slice(start, end);
}

function extractLine(html, prefix) {
  const line = html.split('\n').find((l) => l.startsWith(prefix));
  if (!line) throw new Error(`Zeile ${prefix} nicht gefunden`);
  return line;
}

const HTML = readFileSync(PROTOTYPE, 'utf8');
const LOGIC =
  between(HTML, 'const CFG = {', '\nfunction buyChainUp(') +
  between(HTML, '\nfunction buyChainUp(', '\n}\n') +
  '\n}\n';
const INPUTS = [
  between(HTML, 'function onMark(ref) {', "\n$('btnUnmark')"),
  extractLine(HTML, "$('btnUnmark').addEventListener('click',"),
  extractLine(HTML, "$('btnLeave').addEventListener('click',"),
].join('\n');
const EXPORTS = [
  'CFG',
  'newGame',
  'step',
  'derive',
  'maxBuy',
  'buyAmount',
  'buyUnit',
  'buyUpgrade',
  'buyChainUp',
  'upCost',
  'chainCost',
  'chainLocked',
  'currentSite',
  'targetable',
  'findTargetable',
  'rate',
  'onMark',
];

// Eingaben des Prototyps mit aufzeichnenden Stubs für Toasts, Render und die Schaltflächen
function loadPrototype() {
  const sandbox = { toasts: [], listeners: {} };
  const code = `'use strict';
Date.now = () => ${NOW};
const toast = (html) => toasts.push(html);
const render = () => {};
const fmt = String;
const $ = (id) => ({ addEventListener: (_type, listener) => (listeners[id] = listener) });
let S = null;
${LOGIC}
${INPUTS}
;({ ${EXPORTS.join(', ')}, setState: (state) => (S = state) });`;
  const api = vm.runInContext(code, vm.createContext(sandbox));
  return { ...api, toasts: sandbox.toasts, listeners: sandbox.listeners };
}

const pick = (object, keys) =>
  Object.fromEntries(keys.filter((key) => key in object).map((key) => [key, object[key]]));
const renameKeys = (object, names) =>
  Object.fromEntries(Object.entries(object).map(([key, value]) => [names[key], value]));

function toGameConfig(cfg) {
  const siteType = (t) => ({
    factor: t.factor,
    growth: t.g,
    ...pick(t, ['lifetime', 'decay']),
    ...(t.minFrac !== undefined && { minFraction: t.minFrac }),
    ...(t.eggMult !== undefined && { eggMultiplier: t.eggMult }),
    ...pick(t, ['threshold']),
    ...(t.floorFrac !== undefined && { floorFraction: t.floorFrac }),
    ...pick(t, ['goal', 'zone']),
  });
  const f = cfg.finds;
  return {
    dt: cfg.dt,
    start: { food: cfg.start.vorrat, eggs: cfg.start.eier, eaters: cfg.start.fress },
    units: cfg.units.map((u, i) => ({
      id: UNIT_IDS[i],
      cost: u.cost,
      requirement: u.req,
      production: u.prod,
    })),
    upgrades: renameKeys(
      Object.fromEntries(
        Object.entries(cfg.upgrades).map(([k, u]) => [
          k,
          pick(u, ['base', 'factor', 'cost', 'growth']),
        ]),
      ),
      UPGRADES,
    ),
    chainUpgrade: {
      enabled: cfg.chainUp.enabled,
      effectPerRank: cfg.chainUp.w,
      baseCost: cfg.chainUp.a,
      costGrowth: cfg.chainUp.k,
    },
    reach: { ...cfg.reach },
    travel: { base: cfg.travel.base, reference: cfg.travel.ref },
    zones: cfg.zones.map((z, i) => ({ id: ZONE_IDS[i], threshold: z.threshold })),
    map: {
      baseSize: cfg.map.baseSize,
      ramp: cfg.map.ramp,
      goalBase: cfg.map.goalBase,
      sizeFactorMin: cfg.map.randMin,
      sizeFactorMax: cfg.map.randMax,
      startSizeFactor: cfg.map.startRand,
      zoneRadius: cfg.map.zoneRadius,
      minDistance: cfg.map.minDist,
      initialSites: renameKeys(cfg.map.initial, SITE_TYPES),
      removeDelay: cfg.map.goneDelay,
    },
    siteTypes: renameKeys(
      Object.fromEntries(Object.entries(cfg.siteTypes).map(([k, t]) => [k, siteType(t)])),
      SITE_TYPES,
    ),
    spawn: {
      interval: cfg.spawn.interval,
      maxInReach: cfg.spawn.maxInReach,
      minTargets: cfg.spawn.minTargets,
      weights: renameKeys(cfg.spawn.weights, SITE_TYPES),
    },
    finds: {
      respawnMin: f.respawnMin,
      respawnMax: f.respawnMax,
      weights: renameKeys(
        Object.fromEntries(Object.entries(f.types).map(([k, t]) => [k, t.weight])),
        FINDS,
      ),
      buffDuration: f.buffDuration,
      multipliers: renameKeys(f.mult, FINDS),
      foodBubbleMin: f.blaseMin,
      foodBubbleSeconds: f.blaseSec,
      averageWindow: f.avgWindow,
      eggBallMin: f.ballenMin,
      eggBallSeconds: f.ballenSec,
      growthSpurtSeconds: f.schubSec,
    },
    offlineMax: cfg.offlineMax,
    saveInterval: cfg.saveEvery,
  };
}

function toGameState(s) {
  const st = s.stats;
  return {
    version: 1,
    seed: s.seed,
    rngState: s.rng,
    time: s.t,
    food: s.vorrat,
    eggs: s.eier,
    units: [...s.units],
    unlocked: [...s.unlocked],
    upgradeRanks: renameKeys(s.ranks, UPGRADES),
    chainRanks: [...s.chainRanks],
    freeUpgrades: s.free,
    zone: s.zone,
    position: { x: s.pos.x, y: s.pos.y },
    siteId: s.at,
    travel: s.travel && {
      kind: s.travel.kind,
      targetId: s.travel.id,
      fromX: s.travel.x0,
      fromY: s.travel.y0,
      toX: s.travel.tx,
      toY: s.travel.ty,
      distance: s.travel.dist,
      covered: s.travel.done,
    },
    sites: s.sites.map((x) => ({
      id: x.id,
      type: SITE_TYPES[x.type],
      zone: x.zone,
      x: x.x,
      y: x.y,
      size: x.size,
      stock: x.stock,
      bornAt: x.born,
      dead: x.dead,
      removeAt: x.goneAt,
      discovered: x.known,
      shape: x.shape,
    })),
    finds: s.finds.map((f) => ({ id: f.id, type: FINDS[f.type], zone: f.zone, x: f.x, y: f.y })),
    findRespawnAt: Object.fromEntries(Object.entries(s.findTimers).map(([z, t]) => [+z, t])),
    spawnTimers: [...s.spawnTimers],
    buffs: renameKeys(s.buffs, FINDS),
    mark: s.mark && { kind: s.mark.kind, targetId: s.mark.id },
    leaveRequested: s.leave,
    nextId: s.nextId,
    harvestHistory: [...s.hist],
    harvestHistoryIndex: s.histI,
    harvestHistorySum: s.histSum,
    lastHarvestRate: s.lastH,
    stats: {
      firstTravelAt: st.firstTravel,
      travels: st.travels,
      driedSites: st.dried,
      spawnedSites: st.spawned,
      collectedFinds: st.finds,
      marks: st.marks,
      leaves: st.leaves,
      idleTime: st.noHarvest,
      idleTimeByZone: [...st.noHarvestZone],
      timeByZone: [...st.timeZone],
      totalHarvest: st.total,
      endedAt: st.endAt,
    },
    ended: s.ended,
    endSeen: s.endSeen,
    savedAt: s.savedAt,
  };
}

function toCompactState(s) {
  return {
    time: s.t,
    rngState: s.rng,
    food: s.vorrat,
    eggs: s.eier,
    units: [...s.units],
    zone: s.zone,
    position: { x: s.pos.x, y: s.pos.y },
    siteId: s.at,
    siteCount: s.sites.length,
    discoveredCount: s.sites.filter((x) => x.known).length,
    stockSum: s.sites.reduce((sum, x) => sum + x.stock, 0),
    findCount: s.finds.length,
    nextId: s.nextId,
    upgradeRanks: renameKeys(s.ranks, UPGRADES),
    chainRanks: [...s.chainRanks],
    freeUpgrades: s.free,
    buffs: renameKeys(s.buffs, FINDS),
    mark: s.mark && { kind: s.mark.kind, targetId: s.mark.id },
    leaveRequested: s.leave,
    findRespawnAt: Object.fromEntries(Object.entries(s.findTimers).map(([z, t]) => [+z, t])),
  };
}

const toGameEvent = {
  dry: (site) => ({ type: 'siteDried', siteId: site.id, siteType: SITE_TYPES[site.type] }),
  zone: (change) => ({ type: 'zoneChanged', from: change.from, to: change.to }),
  depart: (target) => ({ type: 'departed', kind: target.kind, targetId: target.obj.id }),
  abort: () => ({ type: 'travelAborted' }),
  arrive: (site) => ({ type: 'arrived', siteId: site.id }),
  find: (find) => ({ type: 'findCollected', findId: find.id, findType: FINDS[find.type] }),
  unmark: () => ({ type: 'unmarked' }),
  noTarget: () => ({ type: 'noTarget' }),
  end: () => ({ type: 'ended' }),
};

// Leitet den Ergebniscode aus Zustandsänderung und Toast ab; die Prüfungen selbst macht der Prototyp
function createInputs(P, S) {
  P.setState(S);
  const markResult = (kind, id, markBefore, marksBefore) => {
    if (P.toasts.length > 1) throw new Error('Mehrere Toasts');
    const toast = P.toasts.splice(0).join('');
    const marked = S.mark?.kind === kind && S.mark.id === id && S.stats.marks === marksBefore + 1;
    if (toast.includes('versiegt vor der Ankunft') && marked) return 'markedDriesBeforeArrival';
    if (toast.includes('Hier frisst der Schwarm')) return 'currentSite';
    if (toast.includes('Diese Stelle ist versiegt')) return 'dried';
    if (toast.includes('erreichbar')) return 'unreachable';
    if (toast !== '') throw new Error(`Unbekannter Toast: ${toast}`);
    if (marked) return 'marked';
    if (markBefore && S.mark === null) return 'unmarked';
    if (S.mark === markBefore && S.stats.marks === marksBefore) return 'notFound';
    throw new Error('Markierungsergebnis nicht ableitbar');
  };
  return {
    toggleMark(kind, id) {
      const markBefore = S.mark;
      const marksBefore = S.stats.marks;
      P.onMark(`${kind}:${id}`);
      return markResult(kind, id, markBefore, marksBefore);
    },
    clearMark() {
      const before = S.mark;
      P.listeners.btnUnmark();
      return before !== null && S.mark === null;
    },
    requestLeave() {
      const before = S.leave;
      P.listeners.btnLeave();
      return S.leave && (!before || P.currentSite(S) !== null);
    },
  };
}

function createActions(P, S, record) {
  const inputs = createInputs(P, S);
  return {
    buyUnit(unit, mode) {
      const count = P.buyAmount(S, unit, BUY_MODES[mode]);
      record({ action: 'buyUnit', unit, mode, count, result: P.buyUnit(S, unit, count) });
    },
    buyUpgrade(id) {
      const key = Object.keys(UPGRADES).find((k) => UPGRADES[k] === id);
      const result = P.buyUpgrade(S, key);
      record({
        action: 'buyUpgrade',
        id,
        result: result === 'free' ? 'free' : result ? 'paid' : 'unaffordable',
      });
    },
    buyChainUpgrade(index) {
      const paid = P.buyChainUp(S, index);
      const result = paid ? 'paid' : P.CFG.chainUp.enabled ? 'unaffordable' : 'disabled';
      record({ action: 'buyChainUpgrade', index, result });
    },
    toggleMark(kind, targetId) {
      record({ action: 'toggleMark', kind, targetId, result: inputs.toggleMark(kind, targetId) });
    },
    clearMark() {
      record({ action: 'clearMark', result: inputs.clearMark() });
    },
    requestLeave() {
      record({ action: 'requestLeave', result: inputs.requestLeave() });
    },
  };
}

const GREEDY_EVERY = 40;
const UNIT_MODES = ['one', 'quarter', 'max'];

// Kauft gierig, holt Fundstücke, markiert, löst und verlässt ab und zu und probiert Randfälle aus
function playGreedy(P, S, act, i, budget) {
  if (i % GREEDY_EVERY !== 0) return;
  const d = P.derive(S);
  const tick = i / GREEDY_EVERY;

  const upgradeKeys = Object.keys(UPGRADES);
  if (S.free > 0) act.buyUpgrade(UPGRADES[upgradeKeys[tick % upgradeKeys.length]]);
  const cheapest = upgradeKeys.reduce((a, b) =>
    P.upCost(b, S.ranks[b]) < P.upCost(a, S.ranks[a]) ? b : a,
  );
  if (S.vorrat >= P.upCost(cheapest, S.ranks[cheapest])) {
    act.buyUpgrade(UPGRADES[cheapest]);
  }

  for (let k = P.CFG.units.length - 1; k >= 0; k--) {
    if (S.unlocked[k] && P.maxBuy(S, k) >= 1) act.buyUnit(k, UNIT_MODES[(tick + k) % 3]);
  }
  if (tick % 60 === 0) act.buyUnit((tick / 60) % P.CFG.units.length, 'one');

  for (let c = 0; c < 4; c++) {
    const affordable = S.units[c + 1] >= 4 * P.chainCost(S.chainRanks[c]);
    if (P.CFG.chainUp.enabled && !P.chainLocked(S, c) && affordable) act.buyChainUpgrade(c);
  }
  if (tick % 400 === 0) act.buyChainUpgrade(tick % 4);

  if (!S.mark && !S.travel && tick % 10 === 0) {
    const finds = S.finds.filter((f) => P.findTargetable(S, f, d));
    const find = finds.find((f) => !budget.collected.has(f.type)) ?? (tick % 20 === 0 && finds[0]);
    if (find) act.toggleMark('find', find.id);
  }
  if (S.mark && tick % 97 === 0) act.toggleMark(S.mark.kind, S.mark.id);
  if (S.mark && tick % 131 === 0) act.clearMark();
  if (tick % 211 === 0 || (S.travel && budget.leavesOnTheWay-- > 0)) act.requestLeave();

  if (budget.probes > 0 && tick % 50 === 0) {
    budget.probes--;
    const priciest = upgradeKeys.reduce((a, b) =>
      P.upCost(b, S.ranks[b]) > P.upCost(a, S.ranks[a]) ? b : a,
    );
    act.buyUpgrade(UPGRADES[priciest]);
    act.clearMark();
    act.toggleMark('site', S.nextId + 1000);
    act.toggleMark('find', S.nextId + 1000);
    if (S.at != null) act.toggleMark('site', S.at);
    const hidden = S.sites.find((x) => !x.known && !x.dead);
    if (hidden) act.toggleMark('site', hidden.id);
    const far = S.finds.find((f) => !P.findTargetable(S, f, d));
    if (far) act.toggleMark('find', far.id);
  }
  const dead = S.sites.find((x) => x.dead && x.id !== S.at);
  if (dead && budget.dried > 0) {
    budget.dried--;
    act.toggleMark('site', dead.id);
  }
  if (budget.doomed > 0 && !S.travel && S.at != null) {
    const doomed = S.sites.find(
      (x) => x.id !== S.at && P.targetable(S, x, d) && P.rate(S, x, d).A <= 0,
    );
    if (doomed) {
      budget.doomed--;
      if (S.mark?.kind !== 'site' || S.mark.id !== doomed.id) act.toggleMark('site', doomed.id);
      act.requestLeave();
    }
  }
}

// Verlassen ohne Ziel gleich zu Beginn, dann Reisen zu Planktonwolken, die unterwegs versiegen
// und verschwinden
function playEdgeCases(P, S, act, i, budget) {
  if (i === 0) act.requestLeave();
  if (budget.aborts === 0 || S.travel || S.at == null) return;
  const d = P.derive(S);
  const vanishesFirst = (x) => {
    const lifetime = P.CFG.siteTypes[x.type].lifetime;
    const vanishAt = x.born + lifetime + P.CFG.map.goneDelay + 1;
    return lifetime && vanishAt < S.t + P.rate(S, x, d).tt;
  };
  const doomed = S.sites.find((x) => x.id !== S.at && P.targetable(S, x, d) && vanishesFirst(x));
  if (doomed) {
    budget.aborts--;
    act.toggleMark('site', doomed.id);
    act.requestLeave();
  }
}

const SCENARIOS = [
  { name: 'default', variant: 'default', seed: 19, strategy: playGreedy, maxSteps: 40000 },
  {
    name: 'chainUpgrade',
    variant: 'chainUpgrade',
    seed: 10,
    strategy: playGreedy,
    maxSteps: 40000,
  },
  { name: 'edgeCases', variant: 'edgeCases', seed: 1, strategy: playEdgeCases, maxSteps: 6000 },
];
const STEPS_AFTER_END = 400;
const COMPACT_EVERY = 150;
const FULL_STATE_EVENTS = ['zoneChanged', 'travelAborted', 'noTarget', 'ended'];

function applyVariant(cfg, variant) {
  if (variant === 'chainUpgrade') cfg.chainUp.enabled = true;
  if (variant === 'edgeCases') {
    cfg.map.initial = {};
    cfg.spawn.minTargets = 0;
    cfg.travel.base = 1;
  }
}

function runScenario(scenario) {
  const P = loadPrototype();
  applyVariant(P.CFG, scenario.variant);
  const S = P.newGame(scenario.seed);
  const actions = [];
  const events = [];
  const states = [{ step: 0, state: toGameState(S) }];
  const checkpoints = [{ step: 0, ...toCompactState(S) }];
  const budget = {
    probes: 3,
    dried: 3,
    doomed: 4,
    aborts: 2,
    leavesOnTheWay: 2,
    collected: new Set(),
  };
  let i = 0;
  let stopAt = scenario.maxSteps;
  let tailwindSteps = 0;
  const act = createActions(P, S, (a) => actions.push({ step: i, ...a }));
  while (i < stopAt) {
    scenario.strategy(P, S, act, i, budget);
    let fullState = false;
    P.step(S, (type, obj) => {
      const event = toGameEvent[type](obj);
      events.push({ step: i, ...event });
      if (type === 'find') budget.collected.add(obj.type);
      fullState ||= FULL_STATE_EVENTS.includes(event.type);
      if (type === 'end' || (type === 'abort' && budget.aborts === 0)) {
        stopAt = Math.min(stopAt, i + 1 + STEPS_AFTER_END);
      }
    });
    if (S.travel && S.buffs.wind > 0) tailwindSteps++;
    i++;
    if (fullState || i === stopAt) states.push({ step: i, state: toGameState(S) });
    if (fullState || i === stopAt || i % COMPACT_EVERY === 0) {
      checkpoints.push({ step: i, ...toCompactState(S) });
    }
  }
  return {
    ...scenario,
    steps: i,
    actions,
    events,
    states,
    checkpoints,
    ended: S.ended,
    tailwindSteps,
  };
}

// Die kürzeste Darstellung von String() rundet die letzte Stelle teils anders als toPrecision();
// ESLint meldet sie dann fälschlich als ungenau (no-loss-of-precision)
function numberLiteral(value) {
  if (Number.isSafeInteger(value)) return String(value);
  for (let digits = 1; digits <= 17; digits++) {
    const literal = value.toPrecision(digits);
    if (Number(literal) === value) return literal;
  }
  throw new Error(`Zahl nicht genau darstellbar: ${value}`);
}

function toLiteral(value) {
  if (value === null) return 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Zahl ohne Literal: ${value}`);
    return Object.is(value, -0) ? '-0' : numberLiteral(value);
  }
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(toLiteral).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value).map(
      ([k, v]) => `${/^\w+$/.test(k) ? k : JSON.stringify(k)}:${toLiteral(v)}`,
    );
    return `{${entries.join(',')}}`;
  }
  throw new Error(`Wert ohne Literal: ${String(value)}`);
}

function checkCoverage(results) {
  const seen = new Set();
  for (const r of results) {
    for (const e of r.events) {
      seen.add(`event:${e.type}`);
      if (e.type === 'findCollected') seen.add(`findCollected:${e.findType}`);
    }
    for (const a of r.actions) {
      seen.add(`${a.action}:${a.result}`);
      if (a.action === 'buyUnit' && a.result) seen.add(`buyUnit:${a.mode}`);
    }
  }
  const required = [
    ...EVENT_TYPES.map((t) => `event:${t}`),
    ...MARK_RESULTS.map((m) => `toggleMark:${m}`),
    ...Object.values(FINDS).map((f) => `findCollected:${f}`),
    'tailwindWhileTravelling',
    ...Object.keys(BUY_MODES).map((m) => `buyUnit:${m}`),
    'buyUnit:false',
    'buyUpgrade:free',
    'buyUpgrade:paid',
    'buyUpgrade:unaffordable',
    'buyChainUpgrade:paid',
    'buyChainUpgrade:unaffordable',
    'buyChainUpgrade:disabled',
    'clearMark:true',
    'clearMark:false',
    'requestLeave:true',
    'requestLeave:false',
  ];
  if (results.some((r) => r.tailwindSteps > 0)) seen.add('tailwindWhileTravelling');
  const missing = required.filter((key) => !seen.has(key));
  if (missing.length > 0) throw new Error(`Nicht abgedeckt: ${missing.join(', ')}`);
}

async function writeFormatted(name, text) {
  const file = new URL(name, DOMAIN);
  const options = await prettier.resolveConfig(file);
  writeFileSync(file, await prettier.format(text, { ...options, filepath: file.pathname }));
  return file.pathname;
}

const results = SCENARIOS.map(runScenario);
for (const r of results) {
  const finds = {};
  for (const e of r.events)
    if (e.type === 'findCollected') finds[e.findType] = (finds[e.findType] ?? 0) + 1;
  console.log(
    `${r.name}: ${r.steps} Schritte, Zone ${r.checkpoints.at(-1).zone}, Ende ${r.ended},`,
    `${r.actions.length} Aktionen, ${r.events.length} Ereignisse,`,
    `${r.states.length} volle und ${r.checkpoints.length} kompakte Prüfpunkte,`,
    `Fundstücke ${JSON.stringify(finds)}, Reiseschritte mit Rückenwind ${r.tailwindSteps}`,
  );
}
checkCoverage(results);

const configFile = await writeFormatted(
  'prototype-game-config.fixture.ts',
  `import { GameConfig } from './models/game-config.model';

export const PROTOTYPE_GAME_CONFIG: GameConfig = ${toLiteral(toGameConfig(loadPrototype().CFG))};
`,
);

const scenarioLiteral = (r) =>
  toLiteral({
    name: r.name,
    variant: r.variant,
    seed: r.seed,
    steps: r.steps,
    actions: r.actions,
    events: r.events,
    states: r.states,
    checkpoints: r.checkpoints,
  });

const fixtureFile = await writeFormatted(
  'golden-master.fixture.ts',
  `import { GameEvent } from './models/game-event.model';
import { GameState } from './models/game-state.model';
import { TargetKind, MarkResult } from './models/travel.model';
import { BuyMode } from './models/unit.model';
import { ChainUpgradePurchase, UpgradeId, UpgradePurchase } from './models/upgrade.model';

export const GOLDEN_MASTER_VARIANTS = ['default', 'chainUpgrade', 'edgeCases'] as const;
export type GoldenMasterVariant = (typeof GOLDEN_MASTER_VARIANTS)[number];

export interface BuyUnitAction {
  step: number;
  action: 'buyUnit';
  unit: number;
  mode: BuyMode;
  count: number;
  result: boolean;
}

export interface BuyUpgradeAction {
  step: number;
  action: 'buyUpgrade';
  id: UpgradeId;
  result: UpgradePurchase;
}

export interface BuyChainUpgradeAction {
  step: number;
  action: 'buyChainUpgrade';
  index: number;
  result: ChainUpgradePurchase;
}

export interface ToggleMarkAction {
  step: number;
  action: 'toggleMark';
  kind: TargetKind;
  targetId: number;
  result: MarkResult;
}

export interface ClearMarkAction {
  step: number;
  action: 'clearMark';
  result: boolean;
}

export interface RequestLeaveAction {
  step: number;
  action: 'requestLeave';
  result: boolean;
}

export type GoldenMasterAction =
  | BuyUnitAction
  | BuyUpgradeAction
  | BuyChainUpgradeAction
  | ToggleMarkAction
  | ClearMarkAction
  | RequestLeaveAction;

export type GoldenMasterEvent = GameEvent & { step: number };

export interface GoldenMasterState {
  step: number;
  state: GameState;
}

export interface GoldenMasterCheckpoint {
  step: number;
  time: number;
  rngState: number;
  food: number;
  eggs: number;
  units: number[];
  zone: number;
  position: { x: number; y: number };
  siteId: number | null;
  siteCount: number;
  discoveredCount: number;
  stockSum: number;
  findCount: number;
  nextId: number;
  upgradeRanks: GameState['upgradeRanks'];
  chainRanks: number[];
  freeUpgrades: number;
  buffs: GameState['buffs'];
  mark: GameState['mark'];
  leaveRequested: boolean;
  findRespawnAt: GameState['findRespawnAt'];
}

export interface GoldenMasterScenario {
  name: string;
  variant: GoldenMasterVariant;
  seed: number;
  steps: number;
  actions: GoldenMasterAction[];
  events: GoldenMasterEvent[];
  states: GoldenMasterState[];
  checkpoints: GoldenMasterCheckpoint[];
}

export const GOLDEN_MASTER_NOW = ${NOW};

export const GOLDEN_MASTER_SCENARIOS: GoldenMasterScenario[] = [${results.map(scenarioLiteral).join(',')}];
`,
);
console.log(`Geschrieben: ${configFile}, ${fixtureFile}`);
