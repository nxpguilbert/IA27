/* =========================================================
   Mini-bibliothèque de graphiques SVG (sans dépendance)
   ========================================================= */
const Charts = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const fmt = (v, d = 1) => v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function el(tag, attrs = {}, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  /* ---------- Tooltip partagé ---------- */
  let tip;
  function tooltip() {
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'tooltip';
      tip.setAttribute('role', 'status');
      document.body.appendChild(tip);
    }
    return tip;
  }
  function showTip(evt, html) {
    const t = tooltip();
    t.innerHTML = html;
    t.classList.add('on');
    moveTip(evt);
  }
  function moveTip(evt) {
    const t = tooltip();
    const pad = 14, w = t.offsetWidth, h = t.offsetHeight;
    let x = evt.clientX + pad, y = evt.clientY + pad;
    if (x + w > innerWidth - 8) x = evt.clientX - w - pad;
    if (y + h > innerHeight - 8) y = evt.clientY - h - pad;
    t.style.left = x + 'px'; t.style.top = y + 'px';
  }
  function hideTip() { tooltip().classList.remove('on'); }
  function bindTip(node, html) {
    node.addEventListener('mouseenter', (e) => showTip(e, typeof html === 'function' ? html() : html));
    node.addEventListener('mousemove', moveTip);
    node.addEventListener('mouseleave', hideTip);
    node.addEventListener('touchstart', (e) => showTip(e.touches[0], typeof html === 'function' ? html() : html), { passive: true });
  }

  function niceMax(v) {
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return step * p;
  }
  function ticks(max, count = 5) {
    const raw = max / count;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((s) => s * p).find((s) => s >= raw);
    const out = [];
    for (let v = 0; v <= max + 1e-9; v += step) out.push(+v.toFixed(6));
    return out;
  }
  const range = (r) => (Array.isArray(r) ? r : [r, r]);
  const rangeTxt = (r, unit) => {
    const [a, b] = range(r);
    return a === b ? `${fmt(a)} ${unit}` : `${fmt(a)} à ${fmt(b)} ${unit}`;
  };

  /* =========================================================
     1. Graphique « fourchettes » : chiffrage candidat vs évaluation
        rows: [{label, cand:[lo,hi]|v, indep:[lo,hi]|v, median?, note}]
     ========================================================= */
  function rangeChart(container, rows, opts = {}) {
    const unit = opts.unit || 'Md€';
    const draw = () => {
      container.innerHTML = '';
      const W = Math.max(container.clientWidth, 300);
      const narrow = W < 560;
      const labelW = narrow ? 0 : Math.min(230, W * 0.32);
      const rowH = narrow ? 74 : 54;
      const top = 8, bottom = 30, right = 56;
      const H = top + rows.length * rowH + bottom;
      const x0 = labelW + 8, x1 = W - right;
      const maxV = niceMax(opts.max || Math.max(...rows.flatMap((r) => [...range(r.cand), ...range(r.indep)])));
      const sx = (v) => x0 + (v / maxV) * (x1 - x0);

      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.aria || '' }, container);
      const gGrid = el('g', {}, svg);
      ticks(maxV).forEach((t) => {
        const x = sx(t);
        el('line', { x1: x, x2: x, y1: top, y2: H - bottom, class: t === 0 ? 'baseline' : 'grid-line' }, gGrid);
        const g = el('g', { class: 'tick' }, gGrid);
        const tx = el('text', { x, y: H - bottom + 18, 'text-anchor': 'middle' }, g);
        tx.textContent = fmt(t, 0);
      });
      const ut = el('text', { x: x1 + 6, y: H - bottom + 18, class: 'tick', 'text-anchor': 'start' }, svg);
      ut.textContent = unit; ut.setAttribute('style', `fill:${css('--muted')};font-size:11px`);

      const cCand = css('--s-cand'), cIndep = css('--s-indep'), surf = css('--surface');

      rows.forEach((r, i) => {
        const y = top + i * rowH;
        const g = el('g', { class: 'row' }, svg);
        el('rect', { x: 0, y, width: W, height: rowH, class: 'hover-band', rx: 8 }, g);

        let yC, yI;
        if (narrow) {
          const lab = el('text', { x: x0, y: y + 16, class: 'row-label' }, g);
          lab.textContent = r.label;
          yC = y + 34; yI = y + 52;
        } else {
          const lab = el('text', { x: labelW, y: y + rowH / 2 + 4, class: 'row-label', 'text-anchor': 'end' }, g);
          lab.textContent = r.label;
          yC = y + rowH / 2 - 7; yI = y + rowH / 2 + 9;
        }

        const drawRange = (val, yy, color, isIndep) => {
          const [a, b] = range(val);
          if (Math.abs(sx(b) - sx(a)) < 8) {
            el('circle', { cx: sx((a + b) / 2), cy: yy, r: 5.5, fill: color, stroke: surf, 'stroke-width': 2 }, g);
          } else {
            el('rect', { x: sx(a), y: yy - 5, width: sx(b) - sx(a), height: 10, rx: 4, fill: color, opacity: isIndep ? 0.9 : 1 }, g);
          }
          const t = el('text', { x: sx(b) + 9, y: yy + 4, class: 'val-label' }, g);
          t.textContent = range(val)[0] === range(val)[1] ? fmt(a) : `${fmt(a, 1)}–${fmt(b, 1)}`;
        };
        drawRange(r.cand, yC, cCand, false);
        drawRange(r.indep, yI, cIndep, true);
        if (r.median != null) {
          el('line', { x1: sx(r.median), x2: sx(r.median), y1: yI - 8, y2: yI + 8, stroke: css('--ink'), 'stroke-width': 2, 'stroke-linecap': 'round' }, g);
        }

        const hit = el('rect', { x: 0, y, width: W, height: rowH, class: 'hit' }, g);
        bindTip(hit, () => {
          const ratio = (range(r.indep)[0] + range(r.indep)[1]) / 2 / ((range(r.cand)[0] + range(r.cand)[1]) / 2);
          return `<b>${r.label}</b>
            <div class="tt-row"><span><i style="background:${cCand}"></i>${opts.candLabel || 'Chiffrage candidat'}</span><span class="tnum">${rangeTxt(r.cand, unit)}</span></div>
            <div class="tt-row"><span><i style="background:${cIndep}"></i>${opts.indepLabel || 'Évaluation indépendante'}</span><span class="tnum">${rangeTxt(r.indep, unit)}</span></div>
            ${r.median != null ? `<div class="tt-row"><span>Médiane</span><span class="tnum">${fmt(r.median)} ${unit}</span></div>` : ''}
            <div class="tt-row"><span>Écart (milieu de fourchette)</span><span class="tnum">× ${fmt(ratio, 2)}</span></div>
            ${r.note ? `<div class="tt-note">${r.note}</div>` : ''}`;
        });
      });
    };
    draw();
    watch(container, draw);
  }

  /* =========================================================
     2. Barres verticales simples (une série, couleurs par rôle)
        bars: [{label, value, color, display?, note}]
     ========================================================= */
  function columnChart(container, bars, opts = {}) {
    const draw = () => {
      container.innerHTML = '';
      const W = Math.max(container.clientWidth, 280);
      const H = opts.height || 280;
      const top = 26, bottom = 44, left = 40, right = 8;
      const maxV = opts.max || niceMax(Math.max(...bars.map((b) => b.value)) * 1.08);
      const sy = (v) => H - bottom - (v / maxV) * (H - top - bottom);
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.aria || '' }, container);

      ticks(maxV, 4).forEach((t) => {
        el('line', { x1: left, x2: W - right, y1: sy(t), y2: sy(t), class: t === 0 ? 'baseline' : 'grid-line' }, svg);
        const g = el('g', { class: 'tick' }, svg);
        const tx = el('text', { x: left - 8, y: sy(t) + 4, 'text-anchor': 'end' }, g);
        tx.textContent = fmt(t, 0) + (opts.suffix || '');
      });
      if (opts.refLine != null) {
        el('line', { x1: left, x2: W - right, y1: sy(opts.refLine.value), y2: sy(opts.refLine.value), stroke: css('--ink-2'), 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }, svg);
        const t = el('text', { x: W - right, y: sy(opts.refLine.value) - 6, 'text-anchor': 'end', class: 'val-label' }, svg);
        t.textContent = opts.refLine.label;
      }

      const slot = (W - left - right) / bars.length;
      const bw = Math.min(64, slot * 0.5);
      bars.forEach((b, i) => {
        const cx = left + slot * i + slot / 2;
        const g = el('g', { class: 'row' }, svg);
        el('rect', { x: cx - slot / 2 + 2, y: top - 20, width: slot - 4, height: H - bottom - top + 20, class: 'hover-band', rx: 8 }, g);
        const y = sy(b.value), h = H - bottom - y;
        // barre arrondie en haut, ancrée à la ligne de base
        const r = Math.min(4, h);
        el('path', {
          d: `M${cx - bw / 2},${H - bottom} V${y + r} Q${cx - bw / 2},${y} ${cx - bw / 2 + r},${y} H${cx + bw / 2 - r} Q${cx + bw / 2},${y} ${cx + bw / 2},${y + r} V${H - bottom} Z`,
          fill: b.color,
        }, g);
        const v = el('text', { x: cx, y: y - 7, 'text-anchor': 'middle', class: 'val-label' }, g);
        v.textContent = b.display || fmt(b.value) + (opts.suffix || '');
        v.setAttribute('style', `fill:${css('--ink')};font-weight:700;font-size:13px`);
        const lines = b.label.split('\n');
        lines.forEach((ln, k) => {
          const t = el('text', { x: cx, y: H - bottom + 17 + k * 14, 'text-anchor': 'middle' }, g);
          t.textContent = ln;
          t.setAttribute('style', 'font-size:11.5px');
        });
        const hit = el('rect', { x: cx - slot / 2, y: top - 20, width: slot, height: H - top - bottom + 20, class: 'hit' }, g);
        bindTip(hit, `<b>${b.label.replace('\n', ' ')}</b>
          <div class="tt-row"><span><i style="background:${b.color}"></i>${opts.measure || 'Valeur'}</span><span class="tnum">${b.display || fmt(b.value) + (opts.suffix || '')}</span></div>
          ${b.note ? `<div class="tt-note">${b.note}</div>` : ''}`);
      });
    };
    draw();
    watch(container, draw);
  }

  /* =========================================================
     3. Barres horizontales simples avec ligne de seuil
     ========================================================= */
  function barH(container, bars, opts = {}) {
    const draw = () => {
      container.innerHTML = '';
      const W = Math.max(container.clientWidth, 280);
      const narrow = W < 520;
      const labelW = narrow ? 0 : 210;
      const rowH = narrow ? 56 : 44;
      const top = 10, bottom = 28, right = 50;
      const H = top + bars.length * rowH + bottom;
      const x0 = labelW + 8, x1 = W - right;
      const maxV = opts.max || niceMax(Math.max(...bars.map((b) => b.value)));
      const sx = (v) => x0 + (v / maxV) * (x1 - x0);
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.aria || '' }, container);
      ticks(maxV, 4).forEach((t) => {
        el('line', { x1: sx(t), x2: sx(t), y1: top, y2: H - bottom, class: t === 0 ? 'baseline' : 'grid-line' }, svg);
        const g = el('g', { class: 'tick' }, svg);
        const tx = el('text', { x: sx(t), y: H - bottom + 18, 'text-anchor': 'middle' }, g);
        tx.textContent = fmt(t, opts.tickDigits ?? 1);
      });
      bars.forEach((b, i) => {
        const y = top + i * rowH;
        const g = el('g', { class: 'row' }, svg);
        el('rect', { x: 0, y, width: W, height: rowH, class: 'hover-band', rx: 8 }, g);
        const by = narrow ? y + 32 : y + rowH / 2;
        const lab = el('text', narrow ? { x: x0, y: y + 16, class: 'row-label' } : { x: labelW, y: by + 4, class: 'row-label', 'text-anchor': 'end' }, g);
        lab.textContent = b.label;
        el('rect', { x: x0, y: by - 7, width: Math.max(sx(b.value) - x0, 2), height: 14, rx: 4, fill: b.color }, g);
        const t = el('text', { x: sx(b.value) + 8, y: by + 4, class: 'val-label' }, g);
        t.textContent = b.display || fmt(b.value, 2);
        const hit = el('rect', { x: 0, y, width: W, height: rowH, class: 'hit' }, g);
        bindTip(hit, `<b>${b.label}</b><div class="tt-row"><span><i style="background:${b.color}"></i>${opts.measure || 'Valeur'}</span><span class="tnum">${b.display || fmt(b.value, 2)}</span></div>${b.note ? `<div class="tt-note">${b.note}</div>` : ''}`);
      });
      if (opts.refLine) {
        const x = sx(opts.refLine.value);
        el('line', { x1: x, x2: x, y1: top - 4, y2: H - bottom, stroke: css('--ink'), 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }, svg);
        const t = el('text', { x: x + 6, y: top + 6, class: 'val-label' }, svg);
        t.textContent = opts.refLine.label;
      }
    };
    draw();
    watch(container, draw);
  }

  /* ---------- Donut « structure » ---------- */
  function donut(container, parts, opts = {}) {
    const draw = () => {
      container.innerHTML = '';
      const S = 220, R = 96, r = 62, cx = S / 2, cy = S / 2;
      const total = parts.reduce((s, p) => s + p.value, 0);
      const svg = el('svg', { viewBox: `0 0 ${S} ${S}`, role: 'img', 'aria-label': opts.aria || '' }, container);
      svg.style.maxWidth = '260px'; svg.style.margin = '0 auto';
      let a0 = -Math.PI / 2;
      const gap = 0.025;
      parts.forEach((p) => {
        const a1 = a0 + (p.value / total) * Math.PI * 2;
        const s = a0 + gap / 2, e = a1 - gap / 2;
        const large = e - s > Math.PI ? 1 : 0;
        const pt = (rad, ang) => `${cx + rad * Math.cos(ang)},${cy + rad * Math.sin(ang)}`;
        const path = el('path', {
          d: `M${pt(R, s)} A${R},${R} 0 ${large} 1 ${pt(R, e)} L${pt(r, e)} A${r},${r} 0 ${large} 0 ${pt(r, s)} Z`,
          fill: p.color,
        }, svg);
        bindTip(path, `<b>${p.label}</b><div class="tt-row"><span>Montant</span><span class="tnum">${fmt(p.value)} Md€</span></div><div class="tt-row"><span>Part</span><span class="tnum">${fmt((p.value / total) * 100, 0)} %</span></div>`);
        a0 = a1;
      });
      const t1 = el('text', { x: cx, y: cy - 2, 'text-anchor': 'middle' }, svg);
      t1.textContent = opts.center || fmt(total);
      t1.setAttribute('style', `fill:${css('--ink')};font-size:26px;font-weight:700`);
      const t2 = el('text', { x: cx, y: cy + 18, 'text-anchor': 'middle' }, svg);
      t2.textContent = opts.centerSub || '';
      t2.setAttribute('style', `fill:${css('--muted')};font-size:11px`);
    };
    draw();
    watch(container, draw);
  }

  /* ---------- Redessin au redimensionnement / changement de thème ---------- */
  function watch(container, draw) {
    let w = container.clientWidth;
    new ResizeObserver(() => {
      if (Math.abs(container.clientWidth - w) > 4) { w = container.clientWidth; draw(); }
    }).observe(container);
    document.addEventListener('themechange', draw);
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);
  }

  /* ---------- Table de données accessible ---------- */
  function dataTable(container, headers, rows) {
    const d = document.createElement('details');
    d.className = 'data-view';
    d.innerHTML = `<summary>Voir les données en tableau</summary>
      <div class="table-scroll"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    container.appendChild(d);
  }

  return { rangeChart, columnChart, barH, donut, dataTable, fmt, rangeTxt, css };
})();
