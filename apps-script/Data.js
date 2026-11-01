/**
 * Akses Google Sheet. Semua nilai dibaca sebagai teks (getDisplayValues)
 * dan semua lajur diformat teks biasa semasa setup, supaya IC dan no. akaun
 * tidak hilang sifar di depan.
 */

var _jadualCache = {};

function bukaSS() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function tabSheet(nama) {
  var sh = bukaSS().getSheetByName(nama);
  if (!sh) throw new Error('Tab "' + nama + '" tiada. Jalankan setupSistem() dahulu.');
  return sh;
}

/** Senarai objek bagi satu tab. Setiap objek ada _baris (nombor baris Sheet). */
function bacaJadual(nama) {
  if (_jadualCache[nama]) return _jadualCache[nama];
  var nilai = tabSheet(nama).getDataRange().getDisplayValues();
  var h = HEADER[nama];
  var hasil = [];
  for (var r = 1; r < nilai.length; r++) {
    var baris = nilai[r];
    if (baris.join('') === '') continue;
    var o = { _baris: r + 1 };
    for (var c = 0; c < h.length; c++) o[h[c]] = teks(baris[c]);
    hasil.push(o);
  }
  _jadualCache[nama] = hasil;
  return hasil;
}

function cariRekod(nama, medan, nilai) {
  var senarai = bacaJadual(nama);
  for (var i = 0; i < senarai.length; i++) if (senarai[i][medan] === teks(nilai)) return senarai[i];
  return null;
}

function keBaris(nama, obj) {
  return HEADER[nama].map(function (k) { return sanitizeForSheet(obj[k]); });
}

/** Julat satu baris yang diformat teks, supaya nilai seperti 0208... tidak ditukar jadi nombor. */
function julatBarisTeks(sh, baris, lebar) {
  if (baris > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 200);
  if (lebar > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), lebar - sh.getMaxColumns());
  return sh.getRange(baris, 1, 1, lebar).setNumberFormat('@');
}

function tambahRekod(nama, obj) {
  var sh = tabSheet(nama);
  julatBarisTeks(sh, sh.getLastRow() + 1, HEADER[nama].length).setValues([keBaris(nama, obj)]);
  delete _jadualCache[nama];
}

function kemaskiniRekod(nama, medan, nilai, perubahan) {
  var lama = cariRekod(nama, medan, nilai);
  if (!lama) throw new Error('Rekod tidak dijumpai.');
  var baru = {};
  HEADER[nama].forEach(function (k) { baru[k] = perubahan.hasOwnProperty(k) ? perubahan[k] : lama[k]; });
  julatBarisTeks(tabSheet(nama), lama._baris, HEADER[nama].length).setValues([keBaris(nama, baru)]);
  delete _jadualCache[nama];
  return baru;
}

/** Padam semua baris yang memenuhi syarat (dari bawah ke atas supaya nombor baris kekal sah). */
function padamRekodJika(nama, syarat) {
  var sh = tabSheet(nama);
  var sasaran = bacaJadual(nama).filter(syarat).map(function (o) { return o._baris; });
  sasaran.sort(function (a, b) { return b - a; }).forEach(function (r) { sh.deleteRow(r); });
  delete _jadualCache[nama];
  return sasaran.length;
}

function idBaru() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}

function sekarang() {
  return Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm:ss');
}

function bacaTetapan() {
  var t = {};
  bacaJadual(TAB.TETAPAN).forEach(function (r) { t[r.kunci] = r.nilai; });
  return t;
}

/** Konteks kiraan: semua kadar dan kumpulan gred (data bukan peribadi). */
function bacaKonteks() {
  return {
    kadar: bacaJadual(TAB.KADAR).map(function (r) {
      return { id: r.id, kod: r.kod, kumpulan: r.kumpulan, nilai: r.nilai, kuat_kuasa: r.kuat_kuasa, rujukan: r.rujukan, oleh: r.oleh, pada: r.pada };
    }),
    kumpulan: bacaJadual(TAB.KUMPULAN).map(function (r) {
      return { id: r.id, nama: r.nama, gred_min: r.gred_min, gred_maks: r.gred_maks, catatan: r.catatan };
    })
  };
}

function logAudit(emel, tindakan, tab, rekodId, butiran) {
  tabSheet(TAB.LOG).appendRow([sekarang(), sanitizeForSheet(emel), tindakan, tab, sanitizeForSheet(rekodId),
    sanitizeForSheet(typeof butiran === 'string' ? butiran : JSON.stringify(butiran || '')).slice(0, 2000)]);
}

function denganKunci(fn) {
  var kunci = LockService.getScriptLock();
  kunci.waitLock(20000);
  try {
    _jadualCache = {};
    return fn();
  } finally {
    kunci.releaseLock();
  }
}
