// Draws the property sheet on a canvas and turns it into a one-page PDF.
// Page coordinates are in a fixed 1205 x 1805 grid; the PDF page is 576 x 864 pt.
import { jsPDF } from 'jspdf';
import { WHATSAPP, CONTACT } from '../config.js';
import { fileName } from '../lib/form.js';

import logoUrl from '../assets/logo-transparent.png';
import headerUrl from '../assets/header.jpg';
import qrUrl from '../assets/whatsapp-qr.png';
import expresswayUrl from '../assets/photo-expressway.jpg';
import airportUrl from '../assets/photo-airport.jpg';
import metroUrl from '../assets/photo-metro.jpg';
import abcdUrl from '../assets/photo-abcd.jpg';

const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img); // a missing image is drawn as a grey box instead of stopping the PDF
    img.src = src;
  });

// Images are loaded once, the first time a PDF is made.
const IMG = {};
// Photos supplied by the client from dholerametrocity.com (concept renders), cropped to remove the site's banners.
const PHOTOS = [
  { cap: 'Ahmedabad–Dholera Expressway', src: expresswayUrl },
  { cap: 'Dholera International Airport', src: airportUrl },
  { cap: 'Ahmedabad–Dholera Metro', src: metroUrl },
  { cap: 'ABCD Building', src: abcdUrl },
];
let imagesReady = null;
function loadSheetImages() {
  if (!imagesReady) {
    imagesReady = Promise.all([
      loadImage(logoUrl).then((i) => {
        IMG.logo = i;
      }),
      loadImage(headerUrl).then((i) => {
        IMG.header = i;
      }),
      loadImage(qrUrl).then((i) => {
        IMG.qr = i;
      }),
      ...PHOTOS.map((p) =>
        loadImage(p.src).then((i) => {
          p.img = i;
        }),
      ),
    ]);
  }
  return imagesReady;
}

const fontsReady = () =>
  Promise.all([
    document.fonts.load('600 40px "Cinzel"'),
    document.fonts.load('600 22px "Montserrat"'),
    document.fonts.load('500 19px "Montserrat"'),
    document.fonts.load('700 21px "Montserrat"'),
    document.fonts.load('600 22px "Noto Sans Gujarati"', 'ભડિયાદ'),
  ]).catch(() => {});

let stampDate = null;
const W = 1205,
  H = 1805;
const C = {
  ink: '#0e1621',
  ink2: '#26303f',
  muted: '#5b6372',
  gold: '#b8913a',
  goldDeep: '#8a6a22',
  goldLight: '#e3c47e',
  line: '#e2e4e9',
  zebra: '#f7f6f2',
  navy: '#0f1a2b',
};
const F = {
  display: '"Cinzel","Trajan Pro",Georgia,serif',
  body: '"Montserrat","Noto Sans Gujarati","Hind Vadodara",Arial,sans-serif',
};
const ROWS = [
  ['Village / Town', 'village'],
  ['Zone', 'zone'],
  ['New Survey No.', 'newSurvey'],
  ['Old Survey No.', 'oldSurvey'],
  ['T.P. Type', 'tpType'],
  ['T.P. No.', 'tpNo'],
  ['F.P. No.', 'fpNo'],
  ['F.P. Area (Sq. Mtr.)', 'sqm'],
  ['F.P. Area (Sq. Yd.)', 'sqyd'],
  ['Vigha', 'vigha'],
  ['Road (Mtr.)', 'road'],
  ['FSI', 'fsi'],
  ['NA Status', 'na'],
  ['Features', 'features'],
  ['Google Map', 'map'],
];
// Any text that had to be shortened with "…" is listed here (handy when testing very long entries).
window.__sheetOverflow = [];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function setFont(ctx, w, s, fam) {
  ctx.font = `${w} ${s}px ${fam}`;
}
function fitSize(ctx, text, maxW, size, min, w, fam) {
  let s = size;
  for (; s >= min; s--) {
    setFont(ctx, w, s, fam);
    if (ctx.measureText(text).width <= maxW) return s;
  }
  return 0;
}
function wrapLines(ctx, text, maxW) {
  // word wrap; a single word longer than the line is split by characters
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let a = '';
  words.forEach((wd) => {
    while (ctx.measureText(wd).width > maxW) {
      // break an over-long word
      let n = wd.length;
      while (n > 1 && ctx.measureText((a ? a + ' ' : '') + wd.slice(0, n)).width > maxW) n--;
      if (n <= 1 && a) {
        lines.push(a);
        a = '';
        continue;
      }
      lines.push((a ? a + ' ' : '') + wd.slice(0, n));
      a = '';
      wd = wd.slice(n);
    }
    const t = a ? a + ' ' + wd : wd;
    if (ctx.measureText(t).width > maxW && a) {
      lines.push(a);
      a = wd;
    } else a = t;
  });
  if (a) lines.push(a);
  return lines;
}
// Draw text inside a box: try one line at the largest size that fits, then 2..maxLines lines, shrinking to `min`.
// If it still cannot fit, the last line ends with "…" and the field is recorded in window.__sheetOverflow.
function layoutText(ctx, text, w, o) {
  for (let n = 1; n <= o.maxLines; n++) {
    for (let s = n === 1 ? o.size : Math.min(o.size, o.multi || 17); s >= o.min; s--) {
      setFont(ctx, o.weight || 600, s, o.fam || F.body);
      const lines = n === 1 ? [text] : wrapLines(ctx, text, w);
      if (lines.length <= n && lines.every((l) => ctx.measureText(l).width <= w)) return { lines, size: s, ok: true };
    }
  }
  setFont(ctx, o.weight || 600, o.min, o.fam || F.body);
  let lines = wrapLines(ctx, text, w);
  const cut = lines.slice(0, o.maxLines);
  let last = cut[cut.length - 1];
  while (last.length && ctx.measureText(last + '…').width > w) last = last.slice(0, -1);
  cut[cut.length - 1] = last + '…';
  return { lines: cut, size: o.min, ok: false };
}
function drawBox(ctx, text, x, yMid, w, o, tag) {
  const r = layoutText(ctx, text, w, o);
  setFont(ctx, o.weight || 600, r.size, o.fam || F.body);
  const lh = Math.round(r.size * 1.25);
  const y0 = yMid - ((r.lines.length - 1) * lh) / 2 + r.size * 0.36;
  r.lines.forEach((ln, i) => ctx.fillText(ln, x, y0 + i * lh));
  if (!r.ok) window.__sheetOverflow.push(tag || text);
  return r;
}
function spaced(ctx, text, x, y, sp, align) {
  // letter-spaced text
  const chars = [...text];
  const w = chars.reduce((s, c) => s + ctx.measureText(c).width + sp, 0) - sp;
  let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  chars.forEach((c) => {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + sp;
  });
  return w;
}
function goldRule(ctx, x, y, w, fadeBoth) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  if (fadeBoth) {
    g.addColorStop(0, 'rgba(184,145,58,0)');
    g.addColorStop(0.2, C.gold);
    g.addColorStop(0.8, C.gold);
    g.addColorStop(1, 'rgba(184,145,58,0)');
  } else {
    g.addColorStop(0, C.gold);
    g.addColorStop(1, 'rgba(184,145,58,0)');
  }
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, 2);
}
function coverImg(ctx, img, x, y, w, h) {
  if (!(img.complete && img.naturalWidth)) {
    ctx.fillStyle = '#dfe3ea';
    ctx.fillRect(x, y, w, h);
    return;
  }
  const r = Math.max(w / img.naturalWidth, h / img.naturalHeight),
    sw = w / r,
    sh = h / r;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}
function icon(ctx, kind, cx, cy) {
  ctx.save();
  ctx.strokeStyle = C.goldLight;
  ctx.fillStyle = C.goldLight;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, Math.PI * 2);
  ctx.stroke();
  if (kind === 'phone') {
    roundRect(ctx, cx - 6, cy - 11, 12, 22, 3);
    ctx.stroke();
    ctx.fillRect(cx - 2, cy + 6, 4, 2);
  }
  if (kind === 'web') {
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy, 4.5, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.stroke();
  }
  if (kind === 'mail') {
    ctx.strokeRect(cx - 11, cy - 7, 22, 14);
    ctx.beginPath();
    ctx.moveTo(cx - 11, cy - 7);
    ctx.lineTo(cx, cy + 2);
    ctx.lineTo(cx + 11, cy - 7);
    ctx.stroke();
  }
  ctx.restore();
}

/* small line icons used before each field name */
function fieldIcon(ctx, key, cx, cy, col, s) {
  s = s || 1;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 1.9;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const P = (pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  };
  switch (key) {
    case 'village':
      P([
        [-8, -1],
        [0, -8],
        [8, -1],
      ]);
      ctx.stroke();
      ctx.strokeRect(-6, -1, 12, 9);
      ctx.strokeRect(-2, 3, 4, 5);
      break;
    case 'zone':
      P([
        [0, -8],
        [9, -3],
        [0, 2],
        [-9, -3],
      ]);
      ctx.closePath();
      ctx.stroke();
      P([
        [-9, 2],
        [0, 7],
        [9, 2],
      ]);
      ctx.stroke();
      break;
    case 'newSurvey':
    case 'oldSurvey':
      P([
        [-6, -9],
        [3, -9],
        [7, -5],
        [7, 9],
        [-6, 9],
      ]);
      ctx.closePath();
      ctx.stroke();
      P([
        [-3, -2],
        [4, -2],
      ]);
      ctx.stroke();
      P([
        [-3, 2],
        [4, 2],
      ]);
      ctx.stroke();
      P([
        [-3, 6],
        [2, 6],
      ]);
      ctx.stroke();
      break;
    case 'tpType':
      ctx.beginPath();
      ctx.arc(-6, 6, 2.4, 0, 7);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(6, -6, 2.4, 0, 7);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-6, 6);
      ctx.bezierCurveTo(6, 6, -6, -6, 6, -6);
      ctx.stroke();
      break;
    case 'tpNo':
      P([
        [-9, -6],
        [-3, -8],
        [3, -6],
        [9, -8],
        [9, 6],
        [3, 8],
        [-3, 6],
        [-9, 8],
      ]);
      ctx.closePath();
      ctx.stroke();
      P([
        [-3, -8],
        [-3, 6],
      ]);
      ctx.stroke();
      P([
        [3, -6],
        [3, 8],
      ]);
      ctx.stroke();
      break;
    case 'fpNo':
      ctx.setLineDash([3, 2.5]);
      ctx.strokeRect(-8, -8, 16, 16);
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(0, 0, 2.6, 0, 7);
      ctx.fill();
      break;
    case 'sqm':
    case 'sqyd':
      ctx.save();
      ctx.rotate(-Math.PI / 4);
      ctx.strokeRect(-10, -4, 20, 8);
      [-6, -2, 2, 6].forEach((x, i) => {
        P([
          [x, -4],
          [x, i % 2 ? -1 : 0],
        ]);
        ctx.stroke();
      });
      ctx.restore();
      break;
    case 'vigha':
      P([
        [0, 9],
        [0, -2],
      ]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -1);
      ctx.quadraticCurveTo(-9, -2, -8, -9);
      ctx.quadraticCurveTo(-1, -9, 0, -1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 3);
      ctx.quadraticCurveTo(8, 2, 8, -4);
      ctx.quadraticCurveTo(1, -4, 0, 3);
      ctx.stroke();
      break;
    case 'road':
      P([
        [-4, -9],
        [-8, 9],
      ]);
      ctx.stroke();
      P([
        [4, -9],
        [8, 9],
      ]);
      ctx.stroke();
      [-6, -1, 4].forEach((y) => {
        P([
          [0, y],
          [0, y + 3],
        ]);
        ctx.stroke();
      });
      break;
    case 'fsi':
      ctx.strokeRect(-7, -9, 14, 18);
      [
        [-3, -5],
        [2, -5],
        [-3, -1],
        [2, -1],
        [-3, 3],
        [2, 3],
      ].forEach(([x, y]) => ctx.fillRect(x - 0.5, y, 2, 2));
      break;
    case 'na':
      P([
        [0, -9],
        [8, -6],
        [8, 1],
        [0, 9],
        [-8, 1],
        [-8, -6],
      ]);
      ctx.closePath();
      ctx.stroke();
      P([
        [-3.5, 0],
        [-0.5, 3],
        [4, -3],
      ]);
      ctx.stroke();
      break;
    case 'features': {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 4 : 9,
          a = -Math.PI / 2 + (i * Math.PI) / 5;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'map':
      ctx.beginPath();
      ctx.arc(0, -3, 6, Math.PI * 0.85, Math.PI * 0.15);
      ctx.lineTo(0, 9);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -3, 2.2, 0, 7);
      ctx.fill();
      break;
  }
  ctx.restore();
}
function diamond(ctx, x, y, r, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fill();
}
function sectionTitle(ctx, text, x, y, right, size) {
  diamond(ctx, x + 6, y - 9, 6, C.gold);
  ctx.fillStyle = C.ink;
  setFont(ctx, 600, size || 25, F.display);
  const w = spaced(ctx, text, x + 22, y, 3);
  const rx = x + 22 + w + 18;
  goldRule(ctx, rx, y - 10, right - rx - 14, false);
  diamond(ctx, right - 4, y - 9, 3.5, C.gold);
  return w;
}

function draw(canvas, d, scale, plotImg) {
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.textBaseline = 'alphabetic';
  const links = [];
  const FH = 158,
    FY = H - FH; // footer: contacts row + date line
  ctx.fillStyle = '#fffdf9';
  ctx.fillRect(0, 0, W, H);

  /* double gold frame with corner diamonds */
  ctx.strokeStyle = 'rgba(184,145,58,.85)';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(16, 16, W - 32, FY - 16);
  ctx.strokeStyle = 'rgba(184,145,58,.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(23, 23, W - 46, FY - 30);
  [
    [16, 16],
    [W - 16, 16],
  ].forEach(([x, y]) => diamond(ctx, x, y, 6, C.gold));

  /* header: IMG.logo | title | header image */
  if (IMG.logo.complete && IMG.logo.naturalWidth) {
    const lw = 320,
      lh = (lw * IMG.logo.naturalHeight) / IMG.logo.naturalWidth;
    ctx.drawImage(IMG.logo, 52, 40, lw, lh);
    links.push({ x: 52, y: 40, w: 320, h: lh, url: WHATSAPP });
  }
  const dg = ctx.createLinearGradient(0, 52, 0, 252);
  dg.addColorStop(0, 'rgba(184,145,58,0)');
  dg.addColorStop(0.5, C.gold);
  dg.addColorStop(1, 'rgba(184,145,58,0)');
  ctx.fillStyle = dg;
  ctx.fillRect(408, 52, 1.5, 200);
  diamond(ctx, 408.75, 152, 5, C.gold);
  ctx.fillStyle = C.goldDeep;
  setFont(ctx, 600, 15, F.body);
  spaced(ctx, 'DHOLERA SIR  ·  GUJARAT', 440, 110, 3.6);
  ctx.fillStyle = C.ink;
  setFont(ctx, 600, 48, F.display);
  spaced(ctx, 'PROPERTY', 438, 168, 5.5);
  setFont(ctx, 600, 32, F.display);
  spaced(ctx, 'INFORMATION', 439, 212, 4.6);
  goldRule(ctx, 440, 234, 320, false);
  diamond(ctx, 440, 235, 4, C.gold);
  // header image: the client's full poster, never cropped; it sits over the title band on the right
  const hh = 218,
    hw = Math.round(
      hh *
        (IMG.header.naturalWidth && IMG.header.naturalHeight
          ? IMG.header.naturalWidth / IMG.header.naturalHeight
          : 4 / 3),
    ),
    hx = W - 50 - hw,
    hy = 42;

  /* title band: VILLAGE (Gujarati) - NEW SURVEY NO., with the zone as a pill */
  const bandY = 290,
    bandH = 140;
  const bg = ctx.createLinearGradient(0, bandY, W, bandY + bandH);
  bg.addColorStop(0, '#0c1626');
  bg.addColorStop(0.55, '#15233b');
  bg.addColorStop(1, '#0c1626');
  ctx.fillStyle = bg;
  ctx.fillRect(0, bandY, W, bandH);
  ctx.fillStyle = C.gold;
  ctx.fillRect(0, bandY, W, 3);
  ctx.fillRect(0, bandY + bandH - 3, W, 3);
  ctx.fillStyle = 'rgba(227,196,126,.45)';
  ctx.fillRect(0, bandY + 8, W, 1);
  ctx.fillRect(0, bandY + bandH - 9, W, 1);
  {
    const maxW = W - 120;
    const en = (d.vEn || d.village || '').toUpperCase();
    const gu = d.vGu ? ` (${d.vGu})` : '';
    const sv = d.newSurvey ? `  -  ${d.newSurvey}` : '';
    const parts =
      en || sv
        ? [
            [en, 'display', 1],
            [gu, 'guj', 0.74],
            [sv, 'display', 1],
          ]
        : [['PROPERTY DETAILS', 'display', 1]];
    const font = (k, s) => (k === 'guj' ? `600 ${s}px "Noto Sans Gujarati",${F.body}` : `600 ${s}px ${F.display}`);
    const sp = (k) => (k === 'guj' ? 0 : 2.4);
    const segW = (txt, k) =>
      k === 'guj' ? ctx.measureText(txt).width : [...txt].reduce((a, c) => a + ctx.measureText(c).width + sp(k), 0);
    const widthAt = (s) =>
      parts.reduce((t, [txt, k, sc]) => {
        if (!txt) return t;
        ctx.font = font(k, Math.round(s * sc));
        return t + segW(txt, k);
      }, 0);
    let s = 44;
    while (s > 20 && widthAt(s) > maxW) s--;
    const zone = d.zone;
    const ty = zone ? bandY + 66 : bandY + bandH / 2 + 14;
    let x = 60;
    const fits = widthAt(s) <= maxW;
    parts.forEach(([txt, k, sc]) => {
      if (!txt) return;
      ctx.font = font(k, Math.round(s * sc));
      ctx.fillStyle = k === 'guj' ? C.goldLight : '#fff';
      if (k === 'guj') {
        ctx.fillText(txt, x, ty);
        x += ctx.measureText(txt).width;
        return;
      }
      [...txt].forEach((c) => {
        if (x > W - 60) return;
        ctx.fillText(c, x, ty);
        x += ctx.measureText(c).width + sp(k);
      });
    });
    if (!fits) window.__sheetOverflow.push('band:title');
    if (zone) {
      const z = (/zone$/i.test(zone) ? zone : zone + ' Zone').toUpperCase();
      setFont(ctx, 700, 14, F.body);
      const zw = [...z].reduce((a, c) => a + ctx.measureText(c).width + 1.6, 0) + 30;
      const pw = Math.min(zw, W - 120);
      ctx.fillStyle = C.gold;
      roundRect(ctx, 60, bandY + 84, pw, 30, 15);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.rect(60, bandY + 84, pw, 30);
      ctx.clip();
      ctx.fillStyle = C.navy;
      spaced(ctx, z, 75, bandY + 104, 1.6);
      ctx.restore();
    }
  }
  // poster card drawn last so it overlaps the band
  ctx.save();
  ctx.shadowColor = 'rgba(14,22,33,.35)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#fffdf9';
  ctx.fillRect(hx - 8, hy - 8, hw + 16, hh + 16);
  ctx.restore();
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(hx - 8.5, hy - 8.5, hw + 17, hh + 17);
  if (IMG.header.complete && IMG.header.naturalWidth) ctx.drawImage(IMG.header, hx, hy, hw, hh);
  else {
    ctx.fillStyle = '#dfe3ea';
    ctx.fillRect(hx, hy, hw, hh);
  }
  ctx.strokeStyle = 'rgba(184,145,58,.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(hx + 0.5, hy + 0.5, hw - 1, hh - 1);
  [
    [hx - 8.5, hy - 8.5],
    [hx + hw + 8.5, hy - 8.5],
    [hx - 8.5, hy + hh + 8.5],
    [hx + hw + 8.5, hy + hh + 8.5],
  ].forEach(([a, b2]) => diamond(ctx, a, b2, 4.5, C.gold));
  links.push({ x: hx, y: hy, w: hw, h: hh, url: WHATSAPP });

  /* plot details */
  const LX = 50,
    RX = W - 50,
    top0 = 478;
  sectionTitle(ctx, 'PLOT DETAILS', LX, top0, RX);
  // order as marked by the client: left 1-7, right 8-14, Features full width
  const pairs = [
    ['village', 'zone'],
    ['newSurvey', 'oldSurvey'],
    ['tpNo', 'tpType'],
    ['fpNo', 'road'],
    ['sqm', 'fsi'],
    ['sqyd', 'na'],
    ['vigha', 'map'],
    ['features'],
  ];
  const label = Object.fromEntries(ROWS.map(([l, k]) => [k, l]));
  const gapX = 16,
    gapY = 8,
    cy0 = top0 + 22,
    colW = (RX - LX - gapX) / 2,
    baseH = 66,
    LH = 18,
    TX = 60; // TX = text indent after the icon
  const rowH = pairs.map((pr) => {
    const full = pr.length === 1;
    let lines = 1;
    pr.forEach((k) => {
      const v = d[k] || '';
      if (!v || k === 'map') return;
      const r = layoutText(ctx, v, (full ? RX - LX : colW) - TX - 16, { size: 22, min: 15, maxLines: full ? 4 : 2 });
      lines = Math.max(lines, r.lines.length);
    });
    return baseH + Math.max(0, lines - 1) * LH;
  });
  let y = cy0;
  pairs.forEach((pr, ri) => {
    const h = rowH[ri];
    pr.forEach((key, ci) => {
      const full = pr.length === 1;
      const x = LX + ci * (colW + gapX),
        w = full ? RX - LX : colW;
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#ebe4d3';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.fillStyle = C.gold;
      ctx.fillRect(x, y, 3, h);
      // icon badge
      const icx = x + 32,
        icy = y + h / 2;
      ctx.fillStyle = '#f6efe0';
      ctx.beginPath();
      ctx.arc(icx, icy, 17, 0, 7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(184,145,58,.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(icx, icy, 17, 0, 7);
      ctx.stroke();
      fieldIcon(ctx, key, icx, icy, C.goldDeep, 0.95);
      ctx.fillStyle = C.muted;
      setFont(ctx, 600, 12.5, F.body);
      spaced(ctx, label[key].toUpperCase(), x + TX, y + 22, 1.5);
      const v = d[key] || '';
      const maxW = w - TX - 16;
      const mid = y + 30 + (h - 30) / 2;
      if (!v) {
        ctx.fillStyle = '#a3a9b4';
        setFont(ctx, 500, 21, F.body);
        ctx.fillText('—', x + TX, mid + 8);
        return;
      }
      if (key === 'map') {
        ctx.fillStyle = C.goldDeep;
        setFont(ctx, 700, 20, F.body);
        ctx.fillText('Open in Google Maps', x + TX, mid + 7);
        const mw = ctx.measureText('Open in Google Maps').width;
        ctx.fillRect(x + TX, mid + 12, mw, 1.5);
        fieldIcon(ctx, 'map', x + TX + mw + 16, mid, C.goldDeep, 0.8);
        links.push({ x, y, w, h, url: v });
        return;
      }
      ctx.fillStyle = C.ink;
      drawBox(ctx, v, x + TX, mid + 1, maxW, { size: 22, min: 15, maxLines: full ? 4 : 2 }, key);
    });
    y += h + gapY;
  });

  /* images: optional plot image (shown whole) + the 4 Dholera SIR photos; sizes fill the page down to the footer */
  const bottom = FY - 30,
    capH = 32,
    pg = 16;
  const plot = plotImg && plotImg.complete && plotImg.naturalWidth ? plotImg : null;
  const drawPhotos = (top, cols, ph) => {
    const SY = top;
    sectionTitle(ctx, 'DHOLERA SIR', LX, SY, RX, 24);
    const pw = (RX - LX - (cols - 1) * pg) / cols,
      py0 = SY + 18;
    PHOTOS.forEach((p, i) => {
      const col = i % cols,
        row = Math.floor(i / cols);
      const x = LX + col * (pw + pg),
        yy = py0 + row * (ph + capH + pg);
      coverImg(ctx, p.img, x, yy, pw, ph);
      links.push({ x, y: yy, w: pw, h: ph + capH, url: WHATSAPP });
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 6.5, yy + 6.5, pw - 13, ph - 7);
      ctx.fillStyle = C.navy;
      ctx.fillRect(x, yy + ph, pw, capH);
      ctx.fillStyle = C.gold;
      ctx.fillRect(x, yy + ph, pw, 2);
      ctx.fillStyle = C.goldLight;
      const t = p.cap.toUpperCase();
      const fs = fitSize(ctx, t, pw - 24, cols === 2 ? 14.5 : 12.5, 9.5, 600, F.body);
      setFont(ctx, 600, fs || 9.5, F.body);
      const tw = spaced(ctx, t, x + pw / 2, yy + ph + 21, cols === 2 ? 1.6 : 0.6, 'center');
      if (cols === 2) {
        diamond(ctx, x + pw / 2 - tw / 2 - 14, yy + ph + 16, 3, C.gold);
        diamond(ctx, x + pw / 2 + tw / 2 + 14, yy + ph + 16, 3, C.gold);
      }
    });
  };
  const T = 56; // section title + gap
  if (plot) {
    const avail = bottom - (y + T),
      SY = y + 38,
      top = SY + 18,
      colGap = 24,
      half = (RX - LX - colGap) / 2;
    const side = avail >= 230; // side-by-side when there is height; else plot card alone, full width
    const cx = LX,
      cw = side ? half : RX - LX,
      ch = avail;
    sectionTitle(ctx, 'PLOT LOCATION', LX, SY, LX + cw, 24);
    ctx.fillStyle = '#f6efe0';
    ctx.fillRect(cx, top, cw, ch);
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx + 0.75, top + 0.75, cw - 1.5, ch - 1.5);
    ctx.strokeStyle = 'rgba(184,145,58,.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx + 8.5, top + 8.5, cw - 17, ch - 17);
    // whole image, never cropped (maps and site plans must stay complete)
    const ix = cx + 18,
      iy = top + 18,
      iw = cw - 36,
      ih = ch - 36;
    const r = Math.min(iw / plot.naturalWidth, ih / plot.naturalHeight);
    const dw = plot.naturalWidth * r,
      dh = plot.naturalHeight * r;
    const dx = ix + (iw - dw) / 2,
      dy = iy + (ih - dh) / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(14,22,33,.22)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#fff';
    ctx.fillRect(dx, dy, dw, dh);
    ctx.restore();
    ctx.drawImage(plot, dx, dy, dw, dh);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.strokeRect(dx - 2, dy - 2, dw + 4, dh + 4);
    [
      [cx, top],
      [cx + cw, top],
      [cx, top + ch],
      [cx + cw, top + ch],
    ].forEach(([a, b2]) => diamond(ctx, a, b2, 5, C.gold));
    if (d.map) links.push({ x: cx, y: top, w: cw, h: ch, url: d.map });
    if (side) {
      const px0 = LX + half + colGap,
        pw = (half - pg) / 2,
        ph = (avail - pg) / 2 - capH;
      sectionTitle(ctx, 'DHOLERA SIR', px0, SY, RX, 24);
      PHOTOS.forEach((p, i) => {
        const col = i % 2,
          row = Math.floor(i / 2);
        const x = px0 + col * (pw + pg),
          yy = top + row * (ph + capH + pg);
        coverImg(ctx, p.img, x, yy, pw, ph);
        links.push({ x, y: yy, w: pw, h: ph + capH, url: WHATSAPP });
        ctx.strokeStyle = 'rgba(255,255,255,.75)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 5.5, yy + 5.5, pw - 11, ph - 6);
        ctx.fillStyle = C.navy;
        ctx.fillRect(x, yy + ph, pw, capH);
        ctx.fillStyle = C.gold;
        ctx.fillRect(x, yy + ph, pw, 2);
        ctx.fillStyle = C.goldLight;
        const t = p.cap.toUpperCase();
        const fs = fitSize(ctx, t, pw - 16, 11.5, 8.5, 600, F.body);
        setFont(ctx, 600, fs || 8.5, F.body);
        spaced(ctx, t, x + pw / 2, yy + ph + 21, 0.5, 'center');
      });
    }
  } else {
    const room = bottom - (y + T);
    let layout = null;
    if (room >= 2 * (150 + capH) + pg) layout = { cols: 2, ph: (room - pg) / 2 - capH };
    else if (room >= 70 + capH) layout = { cols: 4, ph: Math.min(150, room - capH) };
    if (layout) {
      layout.ph = Math.min(layout.ph, layout.cols === 2 ? 260 : 150);
      drawPhotos(y + 38, layout.cols, layout.ph);
    }
  }

  /* footer: contacts, WhatsApp button + date, and the WhatsApp QR code on the right */
  const fg = ctx.createLinearGradient(0, FY, W, H);
  fg.addColorStop(0, '#0c1626');
  fg.addColorStop(0.55, '#15233b');
  fg.addColorStop(1, '#0c1626');
  ctx.fillStyle = fg;
  ctx.fillRect(0, FY, W, FH);
  ctx.fillStyle = C.gold;
  ctx.fillRect(0, FY, W, 3);
  const qs = 112,
    qx = W - 50 - qs,
    qy = FY + 16; // QR tile
  const A = qx - 30; // width used by contacts
  const items = [
    ['phone', CONTACT.phone, 'tel:' + CONTACT.phone.replace(/\s/g, '')],
    ['web', CONTACT.web, 'https://' + CONTACT.web],
    ['mail', CONTACT.email, 'mailto:' + CONTACT.email],
  ];
  setFont(ctx, 600, 20, F.body);
  const widths = items.map(([k, t]) => 44 + 12 + ctx.measureText(t).width);
  const gap = (A - 50 - widths.reduce((a, b) => a + b, 0)) / 2;
  let fx = 50;
  items.forEach(([k, t, u], i) => {
    const cy = FY + 44;
    icon(ctx, k, fx + 22, cy);
    ctx.fillStyle = '#fff';
    setFont(ctx, 600, 20, F.body);
    ctx.fillText(t, fx + 56, cy + 7);
    links.push({ x: fx, y: FY + 10, w: widths[i], h: 66, url: u });
    fx += widths[i] + gap;
  });
  goldRule(ctx, 50, FY + 80, A - 50, false);
  // WhatsApp button
  const bx = 50,
    by = FY + 96,
    bh = 42,
    waLabel = 'CHAT ON WHATSAPP';
  setFont(ctx, 700, 15, F.body);
  const lw = [...waLabel].reduce((a, c) => a + ctx.measureText(c).width + 1.6, 0);
  const bw = lw + bh + 30;
  ctx.fillStyle = '#1fa855';
  roundRect(ctx, bx, by, bw, bh, bh / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 1;
  roundRect(ctx, bx + 0.5, by + 0.5, bw - 1, bh - 1, bh / 2 - 0.5);
  ctx.stroke();
  {
    const cx = bx + bh / 2 + 2,
      cyy = by + bh / 2;
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(cx, cyy - 1, 10.5, Math.PI * 0.75, Math.PI * 0.62 + Math.PI * 2);
    ctx.lineTo(cx - 10, cyy + 11);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 4.5, cyy - 5);
    ctx.quadraticCurveTo(cx - 5, cyy + 4, cx + 4.5, cyy + 4);
    ctx.lineWidth = 3.2;
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  setFont(ctx, 700, 15, F.body);
  spaced(ctx, waLabel, bx + bh + 8, by + 27, 1.6);
  links.push({ x: bx, y: by, w: bw, h: bh, url: WHATSAPP });
  // date and time, last line
  ctx.fillStyle = C.goldLight;
  setFont(ctx, 500, 14.5, F.body);
  spaced(ctx, 'Generated on ' + stamp(), A, by + 27, 1.1, 'right');
  // QR code
  ctx.fillStyle = '#fff';
  roundRect(ctx, qx, qy, qs, qs, 8);
  ctx.fill();
  if (IMG.qr.complete && IMG.qr.naturalWidth) ctx.drawImage(IMG.qr, qx + 7, qy + 7, qs - 14, qs - 14);
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 1.5;
  roundRect(ctx, qx - 3.5, qy - 3.5, qs + 7, qs + 7, 10);
  ctx.stroke();
  ctx.fillStyle = C.goldLight;
  setFont(ctx, 600, 11, F.body);
  spaced(ctx, 'SCAN TO CHAT', qx + qs / 2, qy + qs + 20, 1.6, 'center');
  links.push({ x: qx, y: qy, w: qs, h: qs, url: WHATSAPP });
  return links;
}
function stamp() {
  const t = stampDate || new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(t.getDate())}/${p(t.getMonth() + 1)}/${t.getFullYear()}  ·  ${p(t.getHours())}:${p(t.getMinutes())}`;
}

/**
 * Builds the PDF.
 * @param {object} d        values from toSheetData()
 * @param {string|null} plotSrc  optional plot image (data URL)
 * @returns {Promise<{blob: Blob, url: string, name: string, preview: string}>}
 */
export async function buildPdf(d, plotSrc) {
  await Promise.all([fontsReady(), loadSheetImages()]);
  const plotImg = plotSrc ? await loadImage(plotSrc) : null;
  stampDate = new Date();
  try {
    const S = 2; // draw at double size for a sharp PDF
    const canvas = document.createElement('canvas');
    canvas.width = W * S;
    canvas.height = H * S;
    const links = draw(canvas, d, S, plotImg);

    const PW = 576,
      PH = 864,
      k = PW / W;
    const doc = new jsPDF({ unit: 'pt', format: [PW, PH], orientation: 'portrait', compress: true });
    const name = fileName(d);
    doc.setProperties({ title: name.replace(/\.pdf$/, ''), creator: 'Ashtalaxmi Dholera SIR 1' });
    const preview = canvas.toDataURL('image/jpeg', 0.9);
    doc.addImage(preview, 'JPEG', 0, 0, PW, PH, undefined, 'FAST');
    links.forEach((l) => doc.link(l.x * k, l.y * k, l.w * k, l.h * k, { url: l.url }));
    const blob = doc.output('blob');
    return { blob, url: URL.createObjectURL(blob), name, preview };
  } finally {
    stampDate = null;
  }
}
