import { VILLAGES, SQM_TO_SQYD } from '../config.js';

export const EMPTY_FORM = {
  village: '',
  villageOther: '',
  zone: '',
  zoneOther: '',
  newSurvey: '',
  oldSurvey: '',
  tpType: '',
  tpTypeOther: '',
  tpNo: '',
  tpNoOther: '',
  fpNo: '',
  sqm: '',
  sqyd: '',
  ydManual: false,
  vigha: '',
  road: '',
  fsi: '',
  na: '',
  naOther: '',
  features: [],
  featExtra: '',
  map: '',
};

/** A number with optional decimals, commas/spaces ignored. Returns the clean string or null. */
export const num = (v) => {
  const t = String(v).replace(/[,\s]/g, '');
  return /^\d+(\.\d+)?$/.test(t) ? t : null;
};

/** Keeps only digits and a single decimal point (used while typing in number boxes). */
export const cleanNumber = (raw) => {
  let clean = raw.replace(/,/g, '').replace(/[^\d.]/g, '');
  const i = clean.indexOf('.');
  if (i > -1) clean = clean.slice(0, i + 1) + clean.slice(i + 1).replace(/\./g, '');
  return clean;
};

/** Tidies a number when the box loses focus: ".5" -> "0.5", "55." -> "55". */
export const tidyNumber = (v) => {
  let out = v;
  if (out.startsWith('.')) out = '0' + out;
  if (out.endsWith('.')) out = out.slice(0, -1);
  return out;
};

export const calcYd = (sqm) => {
  const m = parseFloat(num(sqm));
  return Number.isFinite(m) ? String(Math.round(m * SQM_TO_SQYD)) : '';
};

/** Adds https:// to a pasted link like "maps.app.goo.gl/abc". */
export const normMap = (v) => {
  let out = v.trim();
  if (out && !/^https?:\/\//i.test(out) && /^[\w-]+(\.[\w-]+)+/.test(out)) out = 'https://' + out;
  return out;
};

const pick = (value, other) => (value === 'other' ? other.trim() : value);

/** Converts the form state into the values printed on the sheet. */
export function toSheetData(f) {
  let village = '',
    vEn = '',
    vGu = '';
  if (f.village === 'other') {
    village = f.villageOther.trim();
    vEn = village;
  } else if (f.village !== '') {
    [vEn, vGu] = VILLAGES[+f.village];
    village = `${vEn} (${vGu})`;
  }

  const feats = [...f.features];
  f.featExtra
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((s) => feats.push(s));
  const road = num(f.road) ?? f.road.trim();

  return {
    village,
    vEn,
    vGu,
    zone: pick(f.zone, f.zoneOther),
    newSurvey: f.newSurvey.trim(),
    oldSurvey: f.oldSurvey.trim(),
    tpType: pick(f.tpType, f.tpTypeOther),
    tpNo: pick(f.tpNo, f.tpNoOther),
    fpNo: f.fpNo.trim(),
    sqm: num(f.sqm) ?? f.sqm.trim(),
    sqyd: num(f.sqyd) ?? f.sqyd.trim(),
    vigha: num(f.vigha) ?? f.vigha.trim(),
    road: road ? road + ' Mtr.' : '',
    fsi: f.fsi.trim(),
    na: pick(f.na, f.naOther),
    features: feats.join(' + '),
    map: normMap(f.map),
  };
}

/**
 * All fields are optional. A field is only flagged when "Other" is chosen with its box empty,
 * or when a number / link box holds something that is not a number / link.
 * Returns { fieldKey: message } in form order.
 */
export function validate(f) {
  const errors = {};
  const other = (key, value, otherVal, word) => {
    if (value === 'other' && !otherVal.trim())
      errors[key] = `You chose “Other”. Type the ${word} in the box below it, or pick an option.`;
  };
  const number = (key, value, label, eg) => {
    if (value.trim() && num(value) === null) errors[key] = `${label} must be a number, like ${eg}.`;
  };
  other('village', f.village, f.villageOther, 'village name');
  other('zone', f.zone, f.zoneOther, 'zone');
  other('tpType', f.tpType, f.tpTypeOther, 'T.P. type');
  other('tpNo', f.tpNo, f.tpNoOther, 'T.P. No.');
  number('sqm', f.sqm, 'F.P. Area (Sq. Mtr.)', '8635.5');
  number('sqyd', f.sqyd, 'F.P. Area (Sq. Yd.)', '10328');
  number('vigha', f.vigha, 'Vigha', '10.67');
  number('road', f.road, 'Road width', '55');
  number('fsi', f.fsi, 'FSI', '1.8');
  other('na', f.na, f.naOther, 'NA status');
  const m = normMap(f.map);
  if (m && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(m))
    errors.map = 'Paste the full Google Maps link, like https://maps.app.goo.gl/…, or leave it empty.';
  return errors;
}

/**
 * Browsers drop a download name that has Gujarati letters (the file then arrives as "download"),
 * so the file name uses English letters only. The Gujarati name still prints on the sheet.
 */
export function fileName(d) {
  let n = d.vEn || 'Property';
  if (d.newSurvey) n += ' ' + d.newSurvey;
  n =
    n
      .replace(/[^\x20-\x7E]+/g, '')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim() || 'Property';
  return n + '.pdf';
}

export const SUMMARY_ROWS = [
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
];
