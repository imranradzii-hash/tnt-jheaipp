// Simulasi ringkas perkhidmatan Apps Script yang digunakan sistem, untuk ujian di Node.
const crypto = require('crypto');
const { muat } = require('./muat');

class MockRange {
  constructor(sheet, r, c, nr, nc) { Object.assign(this, { sheet, r, c, nr, nc }); }
  setValues(v) {
    // Sama seperti Sheets sebenar: dimensi data mesti tepat sama dengan julat
    if (v.length !== this.nr || v.some((r) => r.length !== this.nc)) {
      throw new Error(`setValues: dimensi data ${v.length}x${v[0] && v[0].length} tidak sepadan dengan julat ${this.nr}x${this.nc}`);
    }
    for (let i = 0; i < this.nr; i++) {
      for (let j = 0; j < this.nc; j++) this.sheet.set(this.r + i, this.c + j, v[i][j]);
    }
    return this;
  }
  getDisplayValues() {
    const out = [];
    for (let i = 0; i < this.nr; i++) {
      const row = [];
      for (let j = 0; j < this.nc; j++) row.push(this.sheet.get(this.r + i, this.c + j));
      out.push(row);
    }
    return out;
  }
  setNumberFormat() { return this; }
  setFontWeight() { return this; }
  setBackground() { return this; }
}

class MockSheet {
  constructor(name, maxCols) { this.name = name; this.rows = []; this.maxRows = 1000; this.maxCols = maxCols || 26; }
  // Simulasi format teks: nilai disimpan sebagai rentetan, "'" di depan dibuang seperti Sheets
  set(r, c, v) {
    while (this.rows.length < r) this.rows.push([]);
    let s = v === null || v === undefined ? '' : String(v);
    if (s.startsWith("'")) s = s.slice(1);
    this.rows[r - 1][c - 1] = s;
  }
  get(r, c) { return ((this.rows[r - 1] || [])[c - 1]) || ''; }
  getLastRow() {
    for (let i = this.rows.length; i > 0; i--) if ((this.rows[i - 1] || []).some((x) => x !== '' && x !== undefined)) return i;
    return 0;
  }
  getLastColumn() { return Math.max(0, ...this.rows.map((r) => r.length)); }
  getMaxRows() { return this.maxRows; }
  getMaxColumns() { return this.maxCols; }
  insertColumnsAfter(_, n) { this.maxCols += n; }
  insertRowsAfter(_, n) { this.maxRows += n; }
  getRange(r, c, nr, nc) {
    if (r + (nr || 1) - 1 > this.maxRows || c + (nc || 1) - 1 > this.maxCols) throw new Error('Range out of bounds');
    return new MockRange(this, r, c, nr || 1, nc || 1);
  }
  getDataRange() { return new MockRange(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, Math.min(this.maxCols, this.getLastColumn()))); }
  setFontWeight() { return this; }
  appendRow(v) { const r = this.getLastRow() + 1; v.forEach((x, j) => this.set(r, j + 1, x)); }
  deleteRow(r) { this.rows.splice(r - 1, 1); }
  setFrozenRows() {}
  getName() { return this.name; }
}

// ---- Tambahan untuk sistem TNT
function a1(a) {
  const m = /^([A-Z]+)(\d+)$/.exec(a);
  let c = 0;
  for (const ch of m[1]) c = c * 26 + (ch.charCodeAt(0) - 64);
  return [+m[2], c];
}
MockSheet.prototype.getRange = function (r, c, nr, nc) {
  if (typeof r === 'string') {
    const [rr, cc] = a1(r);
    const rg = new MockRange(this, rr, cc, 1, 1);
    rg.setValue = (v) => { this.nilai = this.nilai || {}; this.nilai[r] = v; this.set(rr, cc, v); return rg; };
    return rg;
  }
  if (r + (nr || 1) - 1 > this.maxRows || c + (nc || 1) - 1 > this.maxCols) throw new Error('Range out of bounds');
  const rg = new MockRange(this, r, c, nr || 1, nc || 1);
  rg.copyTo = (sasaran, jenis) => { this.salinFormat = (this.salinFormat || []).concat([[r, sasaran.r, sasaran.nr, jenis]]); };
  return rg;
};
MockSheet.prototype.setRowHeight = function (r, h) { (this.tinggi = this.tinggi || {})[r] = h; };
MockSheet.prototype.deleteColumns = function (c, n) { if (c + n - 1 > this.maxCols) throw new Error('deleteColumns luar julat'); this.maxCols -= n; };
MockSheet.prototype.deleteRows = function (r, n) { if (r + n - 1 > this.maxRows) throw new Error('deleteRows luar julat'); this.maxRows -= n; };
MockSheet.prototype.insertRowsAfter = function (r, n) { this.disisip = [r, n]; this.maxRows += n; };

class MockSpreadsheet {
  constructor(id, nama) { this.id = id; this.sheets = (nama || ['Sheet1']).map((n) => new MockSheet(n)); }
  getId() { return this.id; }
  getSheetByName(n) { return this.sheets.find((s) => s.name === n) || null; }
  insertSheet(n) { const s = new MockSheet(n); this.sheets.push(s); return s; }
  getSheets() { return this.sheets; }
  deleteSheet(s) { this.sheets = this.sheets.filter((x) => x !== s); }
}

const MUKA = ['Muka 1', 'Muka 2', 'Muka 3', 'Muka 4', 'Muka 5', 'Muka 6', 'Muka 7'];

function binaGas() {
  const ss = {};
  const state = { aktif: null, emelPemilik: 'admin@penang.gov.my', cache: new Map(), props: {}, peti: [], salinan: [], dibuang: [], fetch: [] };
  ss.TEMPLAT = new MockSpreadsheet('TEMPLAT', MUKA);
  const blob = (data, name) => ({ data, name, setName(n) { this.name = n; return this; }, getBytes: () => Array.from(Buffer.from(data)) });
  const gas = {
    SpreadsheetApp: {
      openById: (id) => { if (!ss[id]) throw new Error('Spreadsheet tiada: ' + id); return ss[id]; },
      getActiveSpreadsheet: () => state.aktif,
      flush: () => {},
      CopyPasteType: { PASTE_FORMAT: 'PASTE_FORMAT' }
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => state.props[k] || null, setProperty: (k, v) => { state.props[k] = v; } }) },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (state.cache.has(k) ? state.cache.get(k) : null),
        put: (k, v) => { state.cache.set(k, String(v)); },
        remove: (k) => { state.cache.delete(k); }
      })
    },
    Session: { getEffectiveUser: () => ({ getEmail: () => state.emelPemilik }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      formatDate: (d, tz, fmt) => {
        const p = (n) => String(n).padStart(2, '0');
        const m = { yyyy: d.getFullYear(), MM: p(d.getMonth() + 1), dd: p(d.getDate()), HH: p(d.getHours()), mm: p(d.getMinutes()), ss: p(d.getSeconds()) };
        return fmt.replace(/yyyy|MM|dd|HH|mm|ss/g, (k) => m[k]);
      },
      DigestAlgorithm: { SHA_256: 'sha256' },
      Charset: { UTF_8: 'utf8' },
      computeDigest: (alg, s) => Array.from(crypto.createHash(alg).update(s, 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)),
      base64Encode: (arr) => Buffer.from(arr.map((b) => (b + 256) % 256)).toString('base64'),
      sleep: () => {}
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    MailApp: { sendEmail: (o) => state.peti.push(o) },
    DriveApp: {
      getFileById: (id) => ({
        makeCopy: (nama) => {
          const nid = 'SALINAN' + state.salinan.length;
          ss[nid] = new MockSpreadsheet(nid, MUKA);
          state.salinan.push(ss[nid]);
          return { getId: () => nid, setTrashed: (t) => { if (t) state.dibuang.push(nid); } };
        }
      }),
      getFolderById: (id) => ({ id })
    },
    ScriptApp: { getOAuthToken: () => 'TOKEN' },
    UrlFetchApp: { fetch: (url) => { state.fetch.push(url); return { getResponseCode: () => 200, getBlob: () => blob('%PDF-1.4 mock', 'x.pdf') }; } },
    Logger: { log: () => {} },
    HtmlService: {}
  };
  const ctx = muat(['Config.js', 'Util.js', 'Kiraan.js', 'PetaBorang.js', 'Data.js', 'Auth.js', 'Api.js', 'Admin.js', 'Cetak.js', 'Web.js', 'Setup.js'], gas);
  return {
    ctx, state, ss,
    sediakan() {
      ss.SISTEM = new MockSpreadsheet('SISTEM');
      state.aktif = ss.SISTEM;
      ctx.setupSistem();
      ctx.apiAdminSimpanTetapan; // wujud
    }
  };
}

module.exports = { binaGas, MockSpreadsheet };
