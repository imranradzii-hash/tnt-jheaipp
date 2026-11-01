/**
 * Fungsi utiliti tulen (tiada panggilan Apps Script) supaya boleh diuji di Node.
 */

function teks(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

/** Nombor daripada input pengguna; kosong/tidak sah → 0. */
function nombor(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  var n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : 0;
}

function bundar2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Neutralkan nilai yang boleh dibaca sebagai formula oleh Sheets/Excel. */
function sanitizeForSheet(value) {
  var str = teks(value);
  if (/^[=+\-@]/.test(str)) return "'" + str;
  return str;
}

/** Papar 4 aksara terakhir sahaja, cth ********5973 */
function samarkan(v) {
  var s = teks(v).replace(/\s/g, '');
  if (!s) return '';
  if (s.length <= 4) return '****';
  return new Array(s.length - 3).join('*') + s.slice(-4);
}

function hanyaDigit(v) {
  return teks(v).replace(/\D/g, '');
}

function sahTarikh(t) {
  return /^\d{4}-\d{2}-\d{2}$/.test(teks(t));
}

function sahBulan(b) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(teks(b));
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY' */
function formatTarikh(t) {
  var s = teks(t);
  if (!sahTarikh(s)) return s;
  return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
}

var NAMA_BULAN = ['JANUARI', 'FEBRUARI', 'MAC', 'APRIL', 'MEI', 'JUN', 'JULAI', 'OGOS',
  'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DISEMBER'];

/** '2026-01' → 'JANUARI 2026' */
function labelBulan(bulan) {
  var b = teks(bulan);
  if (!sahBulan(b)) return b;
  return NAMA_BULAN[parseInt(b.slice(5, 7), 10) - 1] + ' ' + b.slice(0, 4);
}

/** '2026-02' → '2026-02-28' */
function hariAkhirBulan(bulan) {
  var y = +bulan.slice(0, 4), m = +bulan.slice(5, 7);
  var d = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return bulan + '-' + ('0' + d).slice(-2);
}

/** 1234.5 → 'RM1,234.50' */
function ringgit(n) {
  var v = bundar2(nombor(n));
  var bah = v.toFixed(2).split('.');
  return 'RM' + bah[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + bah[1];
}

/** 'N19', 'DG44', 'S 48', 'UD52 (KUP)' → 19, 44, 48, 52. Ambil nombor pertama. */
function nomborGred(gred) {
  var m = /(\d+)/.exec(teks(gred));
  return m ? parseInt(m[1], 10) : NaN;
}

function emelSah(emel) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(teks(emel));
}

/** domain: 'penang.gov.my' atau 'penang.gov.my, jheaipp.gov.my'. Subdomain tidak diterima. */
function emelDalamDomain(emel, domain) {
  var e = teks(emel).toLowerCase();
  if (!emelSah(e)) return false;
  var d = e.split('@')[1];
  return teks(domain).toLowerCase().split(',').map(teks).filter(Boolean).indexOf(d) >= 0;
}

function masaSah(m) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(teks(m));
}
