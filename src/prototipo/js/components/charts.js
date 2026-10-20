/* ==========================================================================
   One — components/charts.js
   Gráficos simples em SVG puro (sem bibliotecas externas). Suficiente para os
   indicadores demonstrativos: barras horizontais e um donut.
   Construção via namespace SVG; rótulos acessíveis com <title>/aria.
   ========================================================================== */

const SVGNS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs = {}) {
  const n = document.createElementNS(SVGNS, tag);
  Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
  return n;
}

/**
 * Gráfico de barras horizontais.
 * @param {{label:string, value:number}[]} data
 * @param {object} [opts] { ariaLabel }
 * @returns {SVGElement}
 */
export function barChart(data, { ariaLabel = "Gráfico de barras" } = {}) {
  const w = 420, rowH = 34, pad = 8, labelW = 150, barMax = w - labelW - 50;
  const h = Math.max(rowH, data.length * rowH) + pad * 2;
  const max = Math.max(1, ...data.map((d) => d.value));

  const svg = svgEl("svg", {
    viewBox: `0 0 ${w} ${h}`, width: "100%", height: String(h),
    role: "img", "aria-label": ariaLabel,
  });

  data.forEach((d, i) => {
    const y = pad + i * rowH;
    const bw = Math.round((d.value / max) * barMax);

    const label = svgEl("text", { x: "0", y: String(y + rowH / 2 + 4), "font-size": "12", fill: "currentColor", class: "one-chart-label" });
    label.textContent = truncar(d.label, 22);
    const title = svgEl("title"); title.textContent = `${d.label}: ${d.value}`;
    label.append(title);

    const bg = svgEl("rect", { x: String(labelW), y: String(y + 6), width: String(barMax), height: String(rowH - 14), rx: "6", fill: "var(--one-surface-muted)" });
    const bar = svgEl("rect", { x: String(labelW), y: String(y + 6), width: String(bw), height: String(rowH - 14), rx: "6", fill: "var(--one-brand)" });
    const val = svgEl("text", { x: String(labelW + barMax + 8), y: String(y + rowH / 2 + 4), "font-size": "12", fill: "currentColor", "text-anchor": "end" });
    val.setAttribute("x", String(w - 2));
    val.textContent = String(d.value);

    svg.append(label, bg, bar, val);
  });

  return svg;
}

/**
 * Donut (rosca) de proporções.
 * @param {{label:string, value:number, color:string}[]} data
 * @param {object} [opts] { ariaLabel, centerText }
 * @returns {SVGElement}
 */
export function donutChart(data, { ariaLabel = "Gráfico de rosca", centerText = "" } = {}) {
  const size = 180, stroke = 26, r = (size - stroke) / 2, cx = size / 2, cy = size / 2;
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  const circ = 2 * Math.PI * r;

  const svg = svgEl("svg", { viewBox: `0 0 ${size} ${size}`, width: String(size), height: String(size), role: "img", "aria-label": ariaLabel });
  svg.append(svgEl("circle", { cx: String(cx), cy: String(cy), r: String(r), fill: "none", stroke: "var(--one-surface-muted)", "stroke-width": String(stroke) }));

  let offset = 0;
  data.forEach((d) => {
    const frac = d.value / total;
    const seg = svgEl("circle", {
      cx: String(cx), cy: String(cy), r: String(r), fill: "none",
      stroke: d.color, "stroke-width": String(stroke),
      "stroke-dasharray": `${circ * frac} ${circ * (1 - frac)}`,
      "stroke-dashoffset": String(-offset * circ),
      transform: `rotate(-90 ${cx} ${cy})`,
    });
    const title = svgEl("title"); title.textContent = `${d.label}: ${d.value}`;
    seg.append(title);
    svg.append(seg);
    offset += frac;
  });

  if (centerText) {
    const t = svgEl("text", { x: String(cx), y: String(cy + 6), "text-anchor": "middle", "font-size": "22", "font-weight": "700", fill: "currentColor" });
    t.textContent = centerText;
    svg.append(t);
  }
  return svg;
}

function truncar(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
