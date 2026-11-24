/*
 * Vereinfachte Simulation des Zeitalters Winzlinge für die Klick-Dummies.
 * Grundlage: docs/produktspezifikation.md, Abschnitt 4. Kein Produktionscode.
 * Bewusste Vereinfachungen stehen in docs/design/archive/README.md.
 */
(function (global) {
  'use strict';

  const STEP = 0.25;

  const CFG = {
    units: [
      { id: 'fressling', name: 'Fressling', plural: 'Fresslinge', cost: 10, req: 0, mass: 1, prod: 0 },
      { id: 'brutling', name: 'Brutling', plural: 'Brutlinge', cost: 500, req: 100, mass: 5, prod: 2 },
      { id: 'eitraegerin', name: 'Eiträgerin', plural: 'Eiträgerinnen', cost: 2e4, req: 1000, mass: 30, prod: 3 },
      { id: 'gelege', name: 'Gelege', plural: 'Gelege', cost: 1e6, req: 1000, mass: 200, prod: 4 },
      { id: 'brutklumpen', name: 'Brutklumpen', plural: 'Brutklumpen', cost: 5e7, req: 1000, mass: 1200, prod: 5 },
      { id: 'urnest', name: 'Urnest', plural: 'Urnester', cost: 2e9, req: 1000, mass: 8000, prod: 6 },
    ],
    upgrades: {
      brutherd: { name: 'Brutherd', base: 30, growth: 3, effect: (l) => Math.pow(1.7, l), label: 'Eier-Rate', unit: 'Eier/s' },
      verdauung: { name: 'Verdauung', base: 300, growth: 5, effect: (l) => Math.pow(1.5, l), label: 'Fressleistung', unit: '/s je Fressling' },
      geisseln: { name: 'Geißeln', base: 125, growth: 2.2, effect: (l) => 50 * Math.pow(1.8, l), label: 'Antrieb', unit: '' },
      kropf: { name: 'Kropf', base: 80, growth: 1.55, effect: (l) => 2000 * Math.pow(1.5, l), label: 'Kapazität', unit: '' },
    },
    upgradeOrder: ['brutherd', 'verdauung', 'geisseln', 'kropf'],
    zones: [
      { name: 'Wassertropfen', threshold: 0 },
      { name: 'Gezeitentümpel', threshold: 500 },
      { name: 'Felsenbecken', threshold: 2e4 },
      { name: 'Flachwasser', threshold: 1e6 },
    ],
    placeTypes: {
      algenfilm: { name: 'Algenfilm', short: 'A', factor: 1, growth: 0.01, weight: 3, trait: 'wächst nach' },
      plankton: { name: 'Planktonwolke', short: 'P', factor: 4, growth: 0, weight: 1, lifetime: 180, trait: 'versiegt nach 180 s' },
      krebs: { name: 'Toter Krebs', short: 'K', factor: 10, growth: 0, weight: 1, decay: 0.003, trait: 'verfällt 0,3 %/s' },
      schnee: { name: 'Meeresschnee', short: 'M', factor: 3, growth: 0.003, weight: 1, eggMult: 2, trait: 'Eier-Rate ×2' },
      seegras: { name: 'Seegraswiese', short: 'S', factor: 1e5, growth: 0.004, weight: 0, threshold: 1e8, floor: 0.01, trait: 'Zielstelle, versiegt nie' },
    },
    finds: {
      fressrausch: { name: 'Fressrausch', icon: '🍴', weight: 3, text: 'Appetit ×3 für 60 s' },
      legeschub: { name: 'Legeschub', icon: '🥚', weight: 3, text: 'Eier-Rate ×5 für 60 s' },
      vermehrungsrausch: { name: 'Vermehrungsrausch', icon: '🧬', weight: 3, text: 'Erzeugung der Kette ×3 für 60 s' },
      rueckenwind: { name: 'Rückenwind', icon: '🌊', weight: 2, text: 'Reisetempo ×4 für 60 s' },
      nahrungsblase: { name: 'Nahrungsblase', icon: '🫧', weight: 3, text: 'Sofort Vorrat: 180 × Ø-Ernte' },
      eierballen: { name: 'Eierballen', icon: '🟡', weight: 2, text: 'Sofort Eier: 180 × Eier-Rate' },
      wachstumsschub: { name: 'Wachstumsschub', icon: '📈', weight: 2, text: 'Jede Stufe erhält 120 s Erzeugung' },
      keimzelle: { name: 'Keimzelle', icon: '✨', weight: 1, text: 'Nächster Ausbau-Rang gratis' },
    },
    effectDurations: { fressrausch: 60, legeschub: 60, vermehrungsrausch: 60, rueckenwind: 60 },
    baseSize: (z) => 5000 * Math.pow(60, z),
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const lerp = (a, b, f) => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function weighted(rng, entries) {
    const total = entries.reduce((sum, e) => sum + e[1], 0);
    let r = rng() * total;
    for (const [key, w] of entries) {
      r -= w;
      if (r < 0) return key;
    }
    return entries[entries.length - 1][0];
  }

  const RING_RADII = [0, 95, 170, 240, 300];

  function makeRings(id, radii) {
    const outer = radii[4];
    return {
      id,
      radii,
      bounds: { x0: -outer, y0: -outer, x1: outer, y1: outer },
      zoneOf: (p) => {
        const r = Math.hypot(p.x, p.y);
        for (let z = 3; z >= 0; z--) if (r >= radii[z]) return z;
        return 0;
      },
      randomPos: (z, rng) => {
        const r0 = radii[z] + (z === 0 ? 18 : 7);
        const r1 = radii[z + 1] - 7;
        const a = rng() * Math.PI * 2;
        const r = Math.sqrt(r0 * r0 + rng() * (r1 * r1 - r0 * r0));
        return { x: r * Math.cos(a), y: r * Math.sin(a) };
      },
      inBounds: (p) => Math.hypot(p.x, p.y) <= outer - 3,
      start: () => ({ x: 0, y: 0 }),
      goal: (rng) => {
        const a = rng() * Math.PI * 2;
        return { x: (outer - 10) * Math.cos(a), y: (outer - 10) * Math.sin(a) };
      },
    };
  }

  // Kartenformen: Streifen (Vorschlag aus 9.1), senkrechter Streifen, Ringe
  const GEOMETRIES = {
    strip: {
      id: 'strip',
      bounds: { x0: 0, y0: 0, x1: 1040, y1: 120 },
      zoneOf: (p) => clamp(Math.floor(p.x / 260), 0, 3),
      randomPos: (z, rng) => ({ x: 260 * z + 12 + rng() * 236, y: 10 + rng() * 100 }),
      inBounds: (p) => p.x >= 2 && p.x <= 1038 && p.y >= 4 && p.y <= 116,
      start: () => ({ x: 14, y: 60 }),
      goal: () => ({ x: 1024, y: 60 }),
    },
    vertical: {
      id: 'vertical',
      bounds: { x0: 0, y0: 0, x1: 120, y1: 1040 },
      zoneOf: (p) => clamp(Math.floor(p.y / 260), 0, 3),
      randomPos: (z, rng) => ({ x: 10 + rng() * 100, y: 260 * z + 12 + rng() * 236 }),
      inBounds: (p) => p.y >= 2 && p.y <= 1038 && p.x >= 4 && p.x <= 116,
      start: () => ({ x: 60, y: 14 }),
      goal: () => ({ x: 60, y: 1024 }),
    },
    rings: makeRings('rings', RING_RADII),
    // Große Ringe für die kameragebundenen Dummies (F, G): mehr Platz je Zone
    bigRings: makeRings('bigRings', [0, 130, 300, 520, 800]),
    // Schichten (E): jede Zone ist eine eigene Ebene von 260 × 260 KP, nebeneinander mit 40 KP Abstand
    layers: {
      id: 'layers',
      layerSize: 260,
      layerPitch: 300,
      bounds: { x0: 0, y0: 0, x1: 1160, y1: 260 },
      zoneOf: (p) => clamp(Math.floor((p.x + 20) / 300), 0, 3),
      randomPos: (z, rng) => ({ x: 300 * z + 12 + rng() * 236, y: 12 + rng() * 236 }),
      inBounds: (p) => p.y >= 4 && p.y <= 256 && p.x >= 4 && p.x <= 1156 && p.x - 300 * Math.floor(p.x / 300) <= 256,
      start: () => ({ x: 30, y: 130 }),
      goal: () => ({ x: 1130, y: 130 }),
    },
  };

  function create(opts) {
    opts = opts || {};
    const geo = GEOMETRIES[opts.geometry || 'strip'];
    let s;
    let rng;

    function log(text, kind) {
      s.log.unshift({ t: s.t, text, kind: kind || 'info' });
      if (s.log.length > 80) s.log.length = 80;
    }

    function placeById(id) {
      return s.places.find((p) => p.id === id) || null;
    }
    function findById(id) {
      return s.finds.find((f) => f.id === id) || null;
    }
    function here() {
      return s.travel ? null : placeById(s.placeId);
    }

    function freePos(z) {
      let p = geo.randomPos(z, rng);
      for (let i = 0; i < 40; i++) {
        const ok =
          s.places.every((o) => dist(o, p) >= 20) && s.finds.every((o) => dist(o, p) >= 20);
        if (ok) return p;
        p = geo.randomPos(z, rng);
      }
      return p;
    }

    function makePlace(type, zone, pos, randFactor) {
      const t = CFG.placeTypes[type];
      const size = CFG.baseSize(zone) * t.factor * randFactor;
      const p = {
        id: s.nextId++,
        type,
        zone,
        x: pos.x,
        y: pos.y,
        size,
        stock: size,
        born: s.t,
        known: false,
        sealed: false,
        vanishAt: null,
      };
      s.places.push(p);
      return p;
    }

    function spawnFind(zone) {
      const type = weighted(
        rng,
        Object.entries(CFG.finds).map(([k, f]) => [k, f.weight]),
      );
      const pos = freePos(zone);
      s.finds.push({ id: s.nextId++, zone, type, x: pos.x, y: pos.y });
    }

    function init(seed) {
      rng = mulberry32(seed);
      s = {
        seed,
        t: 0,
        vorrat: 50,
        eier: 10,
        units: [5, 0, 0, 0, 0, 0],
        unlocked: [true, true, false, false, false, false],
        upg: { brutherd: 0, verdauung: 0, geisseln: 0, kropf: 0 },
        freeRanks: 0,
        places: [],
        finds: [],
        nextId: 1,
        pos: geo.start(),
        placeId: null,
        travel: null,
        mark: null,
        leaveRequested: false,
        effects: { fressrausch: 0, legeschub: 0, vermehrungsrausch: 0, rueckenwind: 0 },
        spawnTimers: [0, 1, 2, 3].map(() => 20 + rng() * 10),
        findRespawns: [],
        reachZone: 0,
        buckets: [],
        bucketAcc: 0,
        bucketT: 0,
        totalHarvest: 0,
        lastRangeSpawn: -99,
        discovery: opts.discovery || 'range',
        stats: {
          firstTravelAt: null,
          travels: 0,
          sealed: 0,
          spawned: 0,
          finds: 0,
          marks: 0,
          leaves: 0,
          starreTime: 0,
          starreByZone: [0, 0, 0, 0],
        },
        log: [],
        ended: false,
        endPending: false,
        lastArrival: null,
      };
      const start = makePlace('algenfilm', 0, geo.start(), 0.6);
      s.placeId = start.id;
      for (let z = 0; z < 4; z++) {
        const types = ['algenfilm', 'algenfilm', 'algenfilm', 'krebs', 'schnee'];
        if (z === 0) types.shift();
        for (const type of types) makePlace(type, z, freePos(z), 0.75 + rng() * 0.5);
      }
      makePlace('seegras', 3, geo.goal(rng), 1);
      for (let z = 0; z < 4; z++) spawnFind(z);
      updateKnown(derive());
      log('Der Schwarm erwacht an einem Algenfilm im Wassertropfen.');
    }

    function upgEffect(key) {
      return CFG.upgrades[key].effect(s.upg[key]);
    }

    function available(p) {
      if (!p || p.sealed) return 0;
      const floor = CFG.placeTypes[p.type].floor;
      return floor ? Math.max(0, p.stock - floor * p.size) : Math.max(0, p.stock);
    }

    function placeThreshold(p) {
      return Math.max(CFG.zones[p.zone].threshold, CFG.placeTypes[p.type].threshold || 0);
    }

    function derive() {
      const u = s.units;
      const thrust = upgEffect('geisseln');
      const mass = u.reduce((m, n, i) => m + n * CFG.units[i].mass, 0);
      const ratio = mass > 0 ? Math.min(1, thrust / mass) : 1;
      const baseSpeed = 20 * Math.max(0.25, Math.sqrt(ratio));
      const speed = baseSpeed * (s.effects.rueckenwind > 0 ? 4 : 1);
      const feed = upgEffect('verdauung');
      const appetite = u[0] * feed * (s.effects.fressrausch > 0 ? 3 : 1);
      const h = here();
      const baseEggRate = upgEffect('brutherd');
      const eggRate =
        baseEggRate *
        (h && CFG.placeTypes[h.type].eggMult ? CFG.placeTypes[h.type].eggMult : 1) *
        (s.effects.legeschub > 0 ? 5 : 1);
      const capacity = upgEffect('kropf');
      const range = 140 + 70 * Math.floor(s.upg.geisseln / 3);
      let reachZone = 0;
      for (let z = 0; z < 4; z++) if (thrust >= CFG.zones[z].threshold) reachZone = z;
      const avail = available(h);
      let starre = null;
      if (s.travel) starre = 'unterwegs';
      else if (!h) starre = 'keine-stelle';
      else if (u[0] > 0 ? avail < appetite * STEP : avail <= 0) starre = 'stelle-leer';
      const harvest = !s.travel && h ? Math.min(appetite, avail / STEP) : 0;
      const production = CFG.units.map((_, i) =>
        i < 5 ? u[i + 1] * CFG.units[i + 1].prod * (s.effects.vermehrungsrausch > 0 ? 3 : 1) : 0,
      );
      return {
        thrust,
        mass,
        ratio,
        baseSpeed,
        speed,
        feed,
        appetite,
        eggRate,
        baseEggRate,
        capacity,
        range,
        reachZone,
        starre,
        harvest,
        here: h,
        hereAvail: avail,
        timeToEmpty: h && appetite > 0 && !CFG.placeTypes[h.type].floor ? avail / appetite : null,
        production,
      };
    }

    function travelInfo(target, d) {
      d = d || derive();
      const from = s.pos;
      const distance = dist(from, target);
      const time = distance / d.speed;
      let A = 0;
      if (target.type && CFG.placeTypes[target.type]) {
        const t = CFG.placeTypes[target.type];
        A = available(target);
        if (t.lifetime && target.born + t.lifetime <= s.t + time) A = 0;
        if (t.decay) {
          const after = target.stock * Math.exp(-t.decay * time);
          A = after < 0.01 * target.size ? 0 : after;
        }
      }
      const avg = d.appetite > 0 ? A / (time + A / d.appetite) : A / (time + 1);
      return { distance, time, A, avg };
    }

    function placeTargetable(p, d) {
      d = d || derive();
      return !!p && p.known && !p.sealed && d.thrust >= placeThreshold(p);
    }
    function findTargetable(f, d) {
      d = d || derive();
      return !!f && f.zone <= d.reachZone;
    }

    function alternatives(d) {
      d = d || derive();
      const cur = here();
      return s.places
        .filter((p) => p !== cur && placeTargetable(p, d))
        .map((p) => ({ place: p, ...travelInfo(p, d) }))
        .sort((a, b) => b.avg - a.avg);
    }

    function markTarget(d) {
      if (!s.mark) return null;
      if (s.mark.kind === 'place') {
        const p = placeById(s.mark.id);
        return placeTargetable(p, d) ? { kind: 'place', obj: p } : null;
      }
      const f = findById(s.mark.id);
      return findTargetable(f, d) ? { kind: 'find', obj: f } : null;
    }

    function nextTarget(d) {
      d = d || derive();
      const m = markTarget(d);
      if (m && !(m.kind === 'place' && m.obj === here())) return { ...m, reason: 'mark' };
      const alts = alternatives(d);
      if (alts.length && alts[0].avg > 0) return { kind: 'place', obj: alts[0].place, reason: 'best', info: alts[0] };
      return null;
    }

    function markWarning(d) {
      if (!s.mark || s.mark.kind !== 'place') return null;
      const p = placeById(s.mark.id);
      if (!p) return null;
      const info = travelInfo(p, d);
      return info.A <= 0 ? 'Die markierte Stelle versiegt vermutlich vor der Ankunft.' : null;
    }

    function startTravel(target) {
      const d = derive();
      const old = here();
      if (old && old.sealed) old.vanishAt = s.t + 10;
      const to = { x: target.obj.x, y: target.obj.y };
      s.travel = { kind: target.kind, id: target.obj.id, from: { ...s.pos }, to, dist: dist(s.pos, to), done: 0, startedAt: s.t };
      s.placeId = null;
      s.stats.travels++;
      if (s.stats.firstTravelAt === null) s.stats.firstTravelAt = s.t;
      const name = target.kind === 'place' ? CFG.placeTypes[target.obj.type].name : CFG.finds[target.obj.type].name;
      const why = target.reason === 'mark' ? 'markiertes Ziel' : 'beste Alternative';
      log(`Aufbruch zu ${name} (${CFG.zones[target.obj.zone].name}, ${why}), ca. ${Math.round(s.travel.dist / d.speed)} s.`, 'travel');
    }

    function applyFind(f) {
      const d = derive();
      const def = CFG.finds[f.type];
      if (CFG.effectDurations[f.type]) s.effects[f.type] += CFG.effectDurations[f.type];
      if (f.type === 'nahrungsblase') {
        const n = Math.max(1, Math.min(120, s.buckets.length));
        const avg = s.buckets.slice(-120).reduce((a, b) => a + b, 0) / n;
        s.vorrat += Math.max(1000, 180 * avg);
      }
      if (f.type === 'eierballen') s.eier += Math.max(50, 180 * d.baseEggRate);
      if (f.type === 'wachstumsschub') {
        const add = d.production.map((p) => p * 120);
        add.forEach((a, i) => (s.units[i] += a));
      }
      if (f.type === 'keimzelle') s.freeRanks++;
      s.stats.finds++;
      log(`Fundstück eingesammelt: ${def.name} – ${def.text}.`, 'find');
    }

    function arrive(tr, target) {
      s.travel = null;
      s.pos = { ...tr.to };
      if (s.mark && s.mark.kind === tr.kind && s.mark.id === tr.id) s.mark = null;
      if (tr.kind === 'place') {
        s.placeId = target.id;
        s.lastArrival = s.t;
        log(`Angekommen: ${CFG.placeTypes[target.type].name} im ${CFG.zones[target.zone].name}.`, 'travel');
      } else {
        applyFind(target);
        s.finds = s.finds.filter((f) => f !== target);
        if (target.zone >= s.reachZone - 1) s.findRespawns.push({ zone: target.zone, at: s.t + 120 + rng() * 120 });
        s.placeId = null;
      }
    }

    function seal(p) {
      p.sealed = true;
      p.stock = 0;
      s.stats.sealed++;
      const atHere = s.placeId === p.id && !s.travel;
      if (!atHere) p.vanishAt = s.t + 10;
      if (p.known) log(`${CFG.placeTypes[p.type].name} im ${CFG.zones[p.zone].name} ist versiegt.`, 'sealed');
    }

    function updateKnown(d) {
      for (const p of s.places) {
        if (p.known) continue;
        if (s.discovery === 'zone') {
          if (p.zone <= d.reachZone) p.known = true;
        } else if (dist(p, s.pos) <= d.range) p.known = true;
      }
    }

    function spawnInRange(d) {
      if (s.t - s.lastRangeSpawn < 5) return;
      const cur = here();
      const count = s.places.filter(
        (p) => p !== cur && placeTargetable(p, d) && dist(p, s.pos) <= d.range,
      ).length;
      if (count >= 3) return;
      let best = null;
      for (let i = 0; i < 40; i++) {
        const a = rng() * Math.PI * 2;
        const r = Math.sqrt(rng()) * d.range;
        const p = { x: s.pos.x + r * Math.cos(a), y: s.pos.y + r * Math.sin(a) };
        if (!geo.inBounds(p)) continue;
        const z = geo.zoneOf(p);
        if (z > d.reachZone) continue;
        if (s.places.some((o) => dist(o, p) < 20)) continue;
        if (!best || z > best.z) best = { p, z };
      }
      if (!best) return;
      s.lastRangeSpawn = s.t;
      const type = weighted(rng, [['algenfilm', 3], ['plankton', 1], ['krebs', 1], ['schnee', 1]]);
      makePlace(type, best.z, best.p, 0.75 + rng() * 0.5);
      s.stats.spawned++;
    }

    function step(dt) {
      const d = derive();
      const u = s.units;
      const h = d.here;

      // Ernte mit weicher Obergrenze (P1-VOR-02)
      if (h) {
        const amount = d.harvest * dt;
        h.stock -= amount;
        let rest = amount;
        if (s.vorrat < d.capacity) {
          const take = Math.min(rest, d.capacity - s.vorrat);
          s.vorrat += take;
          rest -= take;
        }
        if (rest > 0) s.vorrat = Math.sqrt(s.vorrat * s.vorrat + 2 * d.capacity * rest);
        s.totalHarvest += amount;
        s.bucketAcc += amount;
      }

      if (!d.starre) {
        d.production.forEach((p, i) => (u[i] += p * dt));
        s.eier += d.eggRate * dt;
        for (const k of ['fressrausch', 'legeschub', 'vermehrungsrausch']) s.effects[k] = Math.max(0, s.effects[k] - dt);
      } else {
        s.stats.starreTime += dt;
        s.stats.starreByZone[geo.zoneOf(s.pos)] += dt;
      }
      for (let i = 2; i < 6; i++) if (u[i - 1] >= 1) s.unlocked[i] = true;

      if (s.travel) {
        const tr = s.travel;
        const target = tr.kind === 'place' ? placeById(tr.id) : findById(tr.id);
        if (!target) {
          s.travel = null;
          s.placeId = null;
          log('Das Reiseziel ist verschwunden – der Schwarm treibt an keiner Stelle.', 'warn');
        } else {
          tr.done += d.speed * dt;
          const f = tr.dist > 0 ? Math.min(1, tr.done / tr.dist) : 1;
          s.pos = lerp(tr.from, tr.to, f);
          s.effects.rueckenwind = Math.max(0, s.effects.rueckenwind - dt);
          if (f >= 1) arrive(tr, target);
        }
      }

      for (const p of s.places) {
        if (p.sealed) continue;
        const t = CFG.placeTypes[p.type];
        if (t.growth && p.stock > 0) p.stock += t.growth * p.stock * (1 - p.stock / p.size) * dt;
        if (t.decay) {
          p.stock -= p.stock * t.decay * dt;
          if (p.stock < 0.01 * p.size) seal(p);
        }
        if (!p.sealed && t.lifetime && s.t - p.born >= t.lifetime) seal(p);
        if (!p.sealed && !t.floor && p.stock <= p.size * 1e-9) seal(p);
      }
      const vanished = s.places.filter((p) => p.vanishAt !== null && s.t >= p.vanishAt);
      if (vanished.length) {
        s.places = s.places.filter((p) => !vanished.includes(p));
        if (s.mark && s.mark.kind === 'place' && vanished.some((p) => p.id === s.mark.id)) s.mark = null;
      }

      for (let z = 0; z < 4; z++) {
        s.spawnTimers[z] -= dt;
        if (s.spawnTimers[z] > 0) continue;
        s.spawnTimers[z] = 20 + rng() * 10;
        const count = s.places.filter((p) => p.zone === z && !p.sealed && p.type !== 'seegras').length;
        if (count < 10) {
          const type = weighted(rng, [['algenfilm', 3], ['plankton', 1], ['krebs', 1], ['schnee', 1]]);
          makePlace(type, z, freePos(z), 0.75 + rng() * 0.5);
          s.stats.spawned++;
        }
      }
      if (s.discovery === 'spawnRange') spawnInRange(d);

      // Vorderste Zonen und Fundstücke (P1-FUN-02, P1-FUN-07)
      if (d.reachZone > s.reachZone) {
        s.reachZone = d.reachZone;
        log(`Zone ${CFG.zones[d.reachZone].name} ist erreichbar.`, 'zone');
        const gone = s.finds.filter((f) => f.zone < s.reachZone - 1);
        if (s.mark && s.mark.kind === 'find' && gone.some((f) => f.id === s.mark.id)) s.mark = null;
        s.finds = s.finds.filter((f) => !gone.includes(f));
        s.findRespawns = s.findRespawns.filter((r) => r.zone >= s.reachZone - 1);
      }
      s.findRespawns = s.findRespawns.filter((r) => {
        if (s.t < r.at) return true;
        if (r.zone >= s.reachZone - 1 && !s.finds.some((f) => f.zone === r.zone)) spawnFind(r.zone);
        return false;
      });

      const d2 = derive();
      updateKnown(d2);

      if (s.mark && !markTarget(d2)) {
        s.mark = null;
        log('Die Markierung ist erloschen: Ziel nicht mehr ansteuerbar.', 'warn');
      }

      // Wanderautomatik (P1-AUT-01)
      if (!s.travel) {
        const cur = here();
        const leave = s.leaveRequested || !cur || d2.starre === 'stelle-leer';
        if (leave) {
          const target = nextTarget(d2);
          if (target) startTravel(target);
          else if (s.leaveRequested) log('Kein ansteuerbares Ziel – der Schwarm bleibt.', 'warn');
          s.leaveRequested = false;
        }
      }

      const h2 = here();
      if (!s.ended && h2 && h2.type === 'seegras' && s.units[5] >= 1) {
        s.ended = true;
        s.endPending = true;
        log('Sprungbedingung erfüllt: Der Schwarm erntet mit einem Urnest an der Seegraswiese.', 'zone');
      }

      s.bucketT += dt;
      while (s.bucketT >= 1) {
        s.bucketT -= 1;
        s.buckets.push(s.bucketAcc);
        s.bucketAcc = 0;
        if (s.buckets.length > 120) s.buckets.shift();
      }
      s.t += dt;
    }

    function advance(seconds) {
      let rest = seconds;
      while (rest > 1e-9) {
        const dt = Math.min(STEP, rest);
        step(dt);
        rest -= dt;
      }
    }

    function maxBuy(i) {
      const c = CFG.units[i];
      if (!s.unlocked[i]) return 0;
      let m = Math.min(Math.floor(s.vorrat / c.cost), Math.floor(s.eier));
      if (i > 0) m = Math.min(m, Math.floor(s.units[i - 1] / c.req));
      return Math.max(0, m);
    }

    function buyUnit(i, mode) {
      const max = maxBuy(i);
      if (max <= 0) return 0;
      const n = mode === 'max' ? max : mode === '25' ? Math.max(1, Math.floor(max * 0.25)) : 1;
      const c = CFG.units[i];
      s.vorrat -= n * c.cost;
      s.eier -= n;
      if (i > 0) s.units[i - 1] -= n * c.req;
      s.units[i] += n;
      return n;
    }

    function upgradeCost(key) {
      const u = CFG.upgrades[key];
      return u.base * Math.pow(u.growth, s.upg[key]);
    }

    function buyUpgrade(key) {
      if (s.freeRanks > 0) {
        s.freeRanks--;
        s.upg[key]++;
        log(`Keimzelle eingelöst: ${CFG.upgrades[key].name} Rang ${s.upg[key]}.`, 'find');
        return true;
      }
      const cost = upgradeCost(key);
      if (s.vorrat < cost) return false;
      s.vorrat -= cost;
      s.upg[key]++;
      return true;
    }

    function toggleMark(kind, id) {
      if (s.mark && s.mark.kind === kind && s.mark.id === id) {
        s.mark = null;
        return true;
      }
      const d = derive();
      if (kind === 'place') {
        const p = placeById(id);
        if (!placeTargetable(p, d) || p === here()) return false;
      } else if (!findTargetable(findById(id), d)) return false;
      s.mark = { kind, id };
      s.stats.marks++;
      return true;
    }

    function leave() {
      if (s.travel || !here()) return false;
      s.leaveRequested = true;
      s.stats.leaves++;
      return true;
    }

    function cheat() {
      s.vorrat = s.vorrat * 10 + 1000;
      s.eier += 1000;
    }

    function setDiscovery(mode) {
      s.discovery = mode;
      updateKnown(derive());
    }

    function snapshot() {
      return {
        t: s.t,
        vorrat: s.vorrat,
        eier: s.eier,
        harvest: s.totalHarvest,
        travels: s.stats.travels,
        sealed: s.stats.sealed,
        finds: s.stats.finds,
        starre: s.stats.starreTime,
        units: s.units.slice(),
        logLen: s.log.length,
        firstLog: s.log[0],
      };
    }

    init(opts.seed || Math.floor(Math.random() * 1e9));

    return {
      CFG,
      geo,
      get state() {
        return s;
      },
      reset: (seed) => init(seed || Math.floor(Math.random() * 1e9)),
      step,
      advance,
      derive,
      available,
      placeThreshold,
      placeTargetable: (p) => placeTargetable(p),
      findTargetable: (f) => findTargetable(f),
      travelInfo: (p) => travelInfo(p),
      alternatives: () => alternatives(),
      nextTarget: () => nextTarget(),
      markWarning: () => markWarning(),
      placeById,
      findById,
      here,
      maxBuy,
      buyUnit,
      upgradeCost,
      buyUpgrade,
      toggleMark,
      leave,
      cheat,
      setDiscovery,
      snapshot,
    };
  }

  global.IdleSwarmSim = { create, CFG, GEOMETRIES, STEP };
})(window);
