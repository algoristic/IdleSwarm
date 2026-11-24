/*
 * Gemeinsame Helfer der Klick-Dummies: Zahlenformat (de-DE), DOM-Helfer,
 * Testleiste (Tempo, Abwesenheit, Entdecken-Modus) sowie Abwesenheits- und Abschlussdialog.
 */
(function (global) {
  'use strict';

  const nf0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
  const nf2 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const SUFFIXES = [
    [1e15, 'Brd.'],
    [1e12, 'Bio.'],
    [1e9, 'Mrd.'],
    [1e6, 'Mio.'],
  ];

  function num(x) {
    if (!isFinite(x)) return '∞';
    const a = Math.abs(x);
    if (a >= 1e18) return x.toExponential(2).replace('.', ',').replace('e+', 'e');
    for (const [v, s] of SUFFIXES) if (a >= v) return `${nf2.format(x / v)} ${s}`;
    if (a < 10 && a !== Math.floor(a)) return nf1.format(x);
    return nf0.format(x);
  }
  const int = (x) => num(Math.floor(x + 1e-9));
  const rate = (x) => `${Math.abs(x) < 100 ? nf1.format(x) : num(x)}/s`;
  const pct = (x) => `${nf0.format(x * 100)} %`;

  function time(sec) {
    if (!isFinite(sec)) return '–';
    sec = Math.max(0, sec);
    if (sec < 60) return `${Math.ceil(sec)} s`;
    if (sec < 3600) {
      const m = Math.floor(sec / 60);
      const r = Math.floor(sec % 60);
      return `${m}:${String(r).padStart(2, '0')} min`;
    }
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h} h ${String(m).padStart(2, '0')} min`;
  }
  const clock = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const r = Math.floor(sec % 60);
    return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // Ersetzt Inhalt nur bei Änderung, damit Hover und Klicks stabil bleiben
  function setHTML(el, html) {
    if (!el) return;
    if (el.__html !== html) {
      el.innerHTML = html;
      el.__html = html;
    }
  }

  // Aktionen über data-action; pointerdown, weil Inhalte regelmäßig neu gerendert werden
  function delegate(root, handler) {
    const fire = (ev) => {
      const el = ev.target.closest('[data-action]');
      if (!el || !root.contains(el) || el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return;
      ev.preventDefault();
      handler(el.dataset.action, el.dataset, el, ev);
    };
    root.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      fire(ev);
    });
    root.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') fire(ev);
    });
  }

  const STARRE_TEXT = {
    unterwegs: 'Starre: unterwegs',
    'keine-stelle': 'Starre: an keiner Stelle',
    'stelle-leer': 'Starre: Stelle leer',
  };

  function statusOf(sim, d) {
    if (sim.state.ended) return { code: 'ende', text: 'Ziel erreicht' };
    if (!d.starre) return { code: 'frisst', text: 'Frisst' };
    return { code: d.starre, text: STARRE_TEXT[d.starre] };
  }

  function dialog(html, buttons) {
    const dlg = document.createElement('dialog');
    dlg.className = 'dummy-dialog';
    dlg.innerHTML = `<div class="dummy-dialog__body">${html}</div><div class="dummy-dialog__actions">${buttons
      .map((b, i) => `<button class="btn ${i === 0 ? 'btn--primary' : ''}" data-i="${i}">${esc(b.label)}</button>`)
      .join('')}</div>`;
    dlg.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-i]');
      if (!b) return;
      dlg.close();
      dlg.remove();
      const fn = buttons[Number(b.dataset.i)].onClick;
      if (fn) fn();
    });
    document.body.appendChild(dlg);
    dlg.showModal();
    return dlg;
  }

  function awaySummary(sim, seconds) {
    const a = sim.snapshot();
    sim.advance(seconds);
    const b = sim.snapshot();
    const s = sim.state;
    const idx = a.firstLog ? s.log.indexOf(a.firstLog) : -1;
    const fresh = idx < 0 ? s.log.slice() : s.log.slice(0, idx);
    dialog(
      `<h2>Willkommen zurück</h2>
      <p class="muted">Du warst ${time(seconds)} weg. Die Wanderautomatik hat weitergearbeitet.</p>
      <dl class="kv">
        <dt>Gesamternte</dt><dd>${num(b.harvest - a.harvest)}</dd>
        <dt>Vorrat</dt><dd>${num(a.vorrat)} → ${num(b.vorrat)}</dd>
        <dt>Fresslinge</dt><dd>${int(a.units[0])} → ${int(b.units[0])}</dd>
        <dt>Reisen</dt><dd>${b.travels - a.travels}</dd>
        <dt>Versiegte Stellen</dt><dd>${b.sealed - a.sealed}</dd>
        <dt>Zeit in Starre</dt><dd>${time(b.starre - a.starre)}</dd>
      </dl>
      <h3>Ereignisse</h3>
      <ul class="log">${fresh
        .slice(0, 8)
        .map((e) => `<li class="log__item log__item--${e.kind}">${esc(e.text)}</li>`)
        .join('') || '<li class="muted">Keine besonderen Ereignisse.</li>'}${fresh.length > 8 ? `<li class="muted">… und ${fresh.length - 8} weitere</li>` : ''}</ul>`,
      [{ label: 'Weiter' }],
    );
  }

  function endDialog(sim) {
    const st = sim.state.stats;
    dialog(
      `<h2>Die Seegraswiese ist erreicht</h2>
      <p class="muted">Der Schwarm erntet mit einem Urnest an der Zielstelle der Winzlinge. Hier wird später der Evolutionssprung ins Zeitalter Organismen möglich.</p>
      <dl class="kv">
        <dt>Spielzeit</dt><dd>${time(sim.state.t)}</dd>
        <dt>Erste Reise nach</dt><dd>${st.firstTravelAt === null ? '–' : time(st.firstTravelAt)}</dd>
        <dt>Reisen</dt><dd>${st.travels}</dd>
        <dt>Fundstücke</dt><dd>${st.finds}</dd>
        <dt>Versiegte Stellen</dt><dd>${st.sealed}</dd>
        <dt>Markierte Ziele</dt><dd>${st.marks}</dd>
        <dt>„Stelle verlassen“</dt><dd>${st.leaves}</dd>
        <dt>Anteil Starre</dt><dd>${pct(st.starreTime / Math.max(1, sim.state.t))}</dd>
      </dl>`,
      [{ label: 'Weiterspielen' }, { label: 'Neues Spiel', onClick: () => sim.reset() }],
    );
  }

  // Gemeinsame Panel-Bausteine (Dummies E bis G); Stile in base.css unter .plist
  function chainList(sim, d) {
    const s = sim.state;
    const C = sim.CFG;
    return C.units
      .map((u, i) => {
        if (!s.unlocked[i])
          return `<div class="plist__row plist__row--locked"><div><div class="plist__name">🔒 ${u.name}</div><div class="plist__meta">ab 1 ${C.units[i - 1].name}</div></div></div>`;
        const max = sim.maxBuy(i);
        const dis = max < 1 ? 'disabled' : '';
        const q = Math.max(1, Math.floor(max * 0.25));
        const effect = i === 0 ? `erntet ${num(d.feed)}/s` : `+${rate(d.production[i - 1])} ${C.units[i - 1].plural}`;
        const cost = `${num(u.cost)} Vorrat · 1 Ei${i ? ` · ${num(u.req)} ${C.units[i - 1].plural}` : ''}`;
        return `<div class="plist__row">
          <div><div class="plist__name">${u.name}</div><div class="plist__meta">${effect}</div><div class="plist__meta">${cost}</div></div>
          <div class="plist__value">${int(s.units[i])}</div>
          <div class="plist__actions">
            <button class="btn btn--small" data-action="buy" data-i="${i}" data-mode="1" ${dis}>+1</button>
            <button class="btn btn--small" data-action="buy" data-i="${i}" data-mode="25" ${dis}>+${int(q)}</button>
            <button class="btn btn--small btn--primary" data-action="buy" data-i="${i}" data-mode="max" ${dis}>Max ${int(max)}</button>
          </div></div>`;
      })
      .join('');
  }

  function upgradeList(sim, d) {
    const s = sim.state;
    const C = sim.CFG;
    const free = s.freeRanks > 0;
    return (
      (free ? `<p class="plist__free">✨ ${s.freeRanks} Keimzelle: nächster Rang gratis</p>` : '') +
      C.upgradeOrder
        .map((k) => {
          const u = C.upgrades[k];
          const l = s.upg[k];
          const cost = sim.upgradeCost(k);
          const extra = k === 'geisseln' ? ` · Reichweite ${num(d.range)}${l % 3 === 2 ? ' → ' + num(d.range + 70) : ''}` : '';
          return `<div class="plist__row">
            <div><div class="plist__name">${u.name} <span class="muted">Rang ${l}</span></div><div class="plist__meta">${u.label} ${num(u.effect(l))} → ${num(u.effect(l + 1))}${extra}</div></div>
            <div class="plist__actions plist__actions--side"><button class="btn btn--small ${free ? 'btn--mark' : ''}" data-action="upg" data-k="${k}" ${free || s.vorrat >= cost ? '' : 'disabled'}>${free ? '✨ gratis' : num(cost)}</button></div>
          </div>`;
        })
        .join('')
    );
  }

  function effectsList(sim) {
    const eff = Object.entries(sim.state.effects).filter(([, v]) => v > 0);
    if (!eff.length) return '<p class="muted">Keine aktiven Wirkungen.</p>';
    return `<div class="plist__effects">${eff.map(([k, v]) => `<span>${sim.CFG.finds[k].icon} ${sim.CFG.finds[k].name} ${time(v)}</span>`).join('')}</div>`;
  }

  function logList(sim, n) {
    return `<ul class="log">${sim.state.log
      .slice(0, n)
      .map((e) => `<li class="log__item log__item--${e.kind}"><span class="muted">${clock(e.t)}</span> ${esc(e.text)}</li>`)
      .join('')}</ul>`;
  }

  // Karte für eine ausgewählte Stelle oder ein Fundstück, mit Markier-Button (data-action="mark")
  function targetCard(sim, d, sel) {
    if (!sel) return '';
    const s = sim.state;
    const C = sim.CFG;
    const obj = sel.kind === 'place' ? sim.placeById(sel.id) : sim.findById(sel.id);
    if (!obj) return '';
    const isMark = s.mark && s.mark.kind === sel.kind && s.mark.id === obj.id;
    let body;
    let can;
    if (sel.kind === 'place') {
      const t = C.placeTypes[obj.type];
      const info = sim.travelInfo(obj);
      const thr = sim.placeThreshold(obj);
      can = sim.placeTargetable(obj) && obj !== d.here;
      body = `<div class="tcard__title">${t.name}<span class="muted">${esc(C.zones[obj.zone].name)}</span></div>
        <div class="meter"><div class="meter__fill" style="width:${(obj.sealed ? 0 : obj.stock / obj.size) * 100}%"></div></div>
        <div class="tcard__meta">${num(obj.stock)} / ${num(obj.size)} Nahrung · ${esc(t.trait)}</div>
        ${obj === d.here ? '<div class="tcard__meta">Hier frisst der Schwarm.</div>' : obj.sealed ? '<div class="warn">Versiegt</div>' : d.thrust < thr ? `<div class="warn">Braucht Antrieb ${num(thr)}</div>` : `<div class="tcard__meta">${num(info.distance)} KP · Reise ${time(info.time)} · Ø ${rate(info.avg)}</div>`}`;
    } else {
      const f = C.finds[obj.type];
      can = sim.findTargetable(obj);
      body = `<div class="tcard__title">${f.icon} ${f.name}<span class="muted">${esc(C.zones[obj.zone].name)}</span></div>
        <div class="tcard__meta">${f.text}</div>
        ${can ? `<div class="tcard__meta">${num(sim.travelInfo(obj).distance)} KP · Reise ${time(sim.travelInfo(obj).time)}</div>` : `<div class="warn">Vorschau – ab Antrieb ${num(C.zones[obj.zone].threshold)}</div>`}`;
    }
    const btn = isMark
      ? '<button class="btn btn--mark" data-action="mark">Markierung aufheben</button>'
      : can
        ? '<button class="btn btn--primary" data-action="mark">🚩 Als nächstes Ziel</button>'
        : '';
    return `<div class="tcard"><button class="tcard__close" data-action="close" aria-label="Schließen">×</button>${body}${btn}</div>`;
  }

  function nextLine(sim, d) {
    const s = sim.state;
    const C = sim.CFG;
    const next = sim.nextTarget();
    const nm = next ? (next.kind === 'place' ? C.placeTypes[next.obj.type].name : C.finds[next.obj.type].name) : null;
    const nextText = next ? `${next.reason === 'mark' ? '🚩' : '→'} ${nm} (${esc(C.zones[next.obj.zone].name)})` : 'kein Ziel bekannt';
    if (s.travel) return `Unterwegs, Ankunft in ${time((s.travel.dist - s.travel.done) / d.speed)} · danach ${nextText}`;
    if (d.here) return `${C.placeTypes[d.here.type].name}: ${num(d.here.stock)} Nahrung, ${d.timeToEmpty !== null ? `leer in ${time(d.timeToEmpty)}` : 'versiegt nie'} · danach ${nextText}`;
    return `An keiner Stelle · ${nextText}`;
  }

  const SPEEDS = [0, 1, 5, 20, 100];

  // Testleiste und Spielschleife
  function run(sim, render, opts) {
    opts = opts || {};
    let speed = 1;
    const bar = document.createElement('aside');
    bar.className = 'devbar';
    bar.setAttribute('aria-label', 'Testleiste des Klick-Dummys');
    document.body.appendChild(bar);

    function renderBar() {
      const s = sim.state;
      setHTML(
        bar,
        `<details ${bar.__open ? 'open' : ''}>
          <summary>Testleiste · ${speed === 0 ? 'Pause' : speed + '×'} · ${clock(s.t)}</summary>
          <div class="devbar__row"><span>Tempo</span>${SPEEDS.map(
            (v) => `<button class="chip ${v === speed ? 'chip--on' : ''}" data-action="speed" data-v="${v}">${v === 0 ? '❚❚' : v + '×'}</button>`,
          ).join('')}</div>
          <div class="devbar__row"><span>Abwesend</span>
            <button class="chip" data-action="away" data-v="900">15 min</button>
            <button class="chip" data-action="away" data-v="7200">2 h</button>
          </div>
          <div class="devbar__row"><span>Entdecken</span>
            ${[
              ['range', 'Reichweite'],
              ['zone', 'je Zone'],
              ['spawnRange', 'neu in Reichweite'],
            ]
              .map(([k, l]) => `<button class="chip ${s.discovery === k ? 'chip--on' : ''}" data-action="disc" data-v="${k}">${l}</button>`)
              .join('')}
          </div>
          <div class="devbar__row"><span>Test</span>
            <button class="chip" data-action="cheat">Vorrat ×10, +1.000 Eier</button>
            <button class="chip" data-action="reset">Neue Karte</button>
          </div>
          <div class="devbar__row"><a href="index.html">← Übersicht der Dummies</a></div>
        </details>`,
      );
    }
    bar.addEventListener('toggle', (e) => (bar.__open = e.target.open), true);
    delegate(bar, (action, data) => {
      if (action === 'speed') speed = Number(data.v);
      if (action === 'away') awaySummary(sim, Number(data.v));
      if (action === 'disc') sim.setDiscovery(data.v);
      if (action === 'cheat') sim.cheat();
      if (action === 'reset') sim.reset();
      renderBar();
      render();
    });

    let last = performance.now();
    function tick() {
      const now = performance.now();
      const dt = Math.min(1, (now - last) / 1000);
      last = now;
      if (speed > 0 && !document.querySelector('dialog[open]')) sim.advance(dt * speed);
      if (sim.state.endPending) {
        sim.state.endPending = false;
        (opts.onEnd || endDialog)(sim);
      }
      render();
      renderBar();
    }
    tick();
    setInterval(tick, 100);
    return { setSpeed: (v) => (speed = v) };
  }

  global.IdleSwarmUI = {
    num,
    int,
    rate,
    pct,
    time,
    clock,
    esc,
    setHTML,
    delegate,
    statusOf,
    dialog,
    run,
    endDialog,
    chainList,
    upgradeList,
    effectsList,
    logList,
    targetCard,
    nextLine,
  };
})(window);
