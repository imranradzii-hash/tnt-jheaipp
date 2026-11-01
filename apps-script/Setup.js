/**
 * Dijalankan oleh admin dari editor Apps Script (bukan dari web app):
 *  1. setupSistem()     — cipta semua tab, header, kadar lalai, tetapkan admin awal (emel anda).
 *  2. sediakanTemplat() — tukar fail xlsx borang asal di Drive kepada Google Sheet templat.
 * Kedua-duanya selamat dijalankan semula (naik taraf tanpa memadam data).
 */

// ID fail "TNT JAN 2026 -KOSONG.xlsx" dalam folder Drive TNT 2026. Tukar jika guna fail lain.
var TEMPLAT_XLSX_ID = '1WDCa-hCDifDJtEqguyJdKMdzBm-cbiWm';

function setupSistem() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Jalankan dari skrip yang terikat pada Google Sheet sistem (Extensions > Apps Script).');
  var props = PropertiesService.getScriptProperties();
  props.setProperty('SHEET_ID', ss.getId());
  var emel = Session.getEffectiveUser().getEmail().toLowerCase();
  if (!props.getProperty('ADMIN_AWAL')) props.setProperty('ADMIN_AWAL', emel);

  Object.keys(HEADER).forEach(function (nama) {
    var sh = ss.getSheetByName(nama) || ss.insertSheet(nama);
    var h = HEADER[nama];
    if (sh.getMaxColumns() < h.length) sh.insertColumnsAfter(sh.getMaxColumns(), h.length - sh.getMaxColumns());
    // Teks biasa untuk semua lajur: IC dan no. akaun kekal dengan sifar di depan
    sh.getRange(1, 1, sh.getMaxRows(), h.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold').setBackground('#d9ead3');
    sh.setFrozenRows(1);
    if (LALAI[nama] && sh.getLastRow() < 2) {
      sh.getRange(2, 1, LALAI[nama].length, h.length).setValues(LALAI[nama].map(function (r) {
        return h.map(function (_, i) { return i < r.length ? String(r[i]) : ''; });
      }));
    }
  });

  var lalai = ss.getSheetByName('Sheet1') || ss.getSheetByName('Helaian1');
  if (lalai && lalai.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(lalai);

  _jadualCache = {};
  // Naik taraf: tambah kunci Tetapan baharu tanpa mengubah nilai sedia ada
  var adaKunci = {};
  bacaJadual(TAB.TETAPAN).forEach(function (r) { adaKunci[r.kunci] = true; });
  LALAI.Tetapan.forEach(function (r) {
    if (!adaKunci[r[0]]) tambahRekod(TAB.TETAPAN, { kunci: r[0], nilai: String(r[1]), keterangan: r[2] });
  });

  logAudit(emel, 'SETUP', '', '', 'setupSistem');
  Logger.log('Setup selesai. Admin awal: ' + emel + '. Daftar akaun di web app menggunakan emel ini untuk menjadi admin.');
}

/**
 * Tukar xlsx asal kepada Google Sheet (perlukan perkhidmatan lanjutan Drive API v3).
 * Simbol kotak Wingdings (U+F063) di Muka 5 ditukar kepada ☐ kerana fon Wingdings tiada dalam Google Sheets.
 */
function sediakanTemplat(xlsxId) {
  var id = xlsxId || TEMPLAT_XLSX_ID;
  var baru = Drive.Files.copy({ name: 'TEMPLAT BORANG TNT WP1.4 (JANGAN UBAH)', mimeType: MimeType.GOOGLE_SHEETS }, id);
  var ss = SpreadsheetApp.openById(baru.id);
  ss.getSheets().forEach(function (sh) {
    var julat = sh.getDataRange();
    var nilai = julat.getValues(), formula = julat.getFormulas();
    for (var r = 0; r < nilai.length; r++) {
      for (var c = 0; c < nilai[r].length; c++) {
        if (!formula[r][c] && typeof nilai[r][c] === 'string' && nilai[r][c].indexOf('\uf063') >= 0) {
          sh.getRange(r + 1, c + 1).setValue(nilai[r][c].replace(/\uf063/g, '\u2610'));
        }
      }
    }
  });
  var wajib = ['Muka 1', 'Muka 2', 'Muka 3', 'Muka 4', 'Muka 5', 'Muka 6', 'Muka 7'];
  wajib.forEach(function (n) { if (!ss.getSheetByName(n)) throw new Error('Templat tiada helaian ' + n); });
  _jadualCache = {};
  if (cariRekod(TAB.TETAPAN, 'kunci', 'TEMPLAT_ID')) kemaskiniRekod(TAB.TETAPAN, 'kunci', 'TEMPLAT_ID', { nilai: baru.id });
  else tambahRekod(TAB.TETAPAN, { kunci: 'TEMPLAT_ID', nilai: baru.id, keterangan: 'ID Google Sheet templat borang' });
  logAudit(Session.getEffectiveUser().getEmail(), 'SEDIAKAN_TEMPLAT', TAB.TETAPAN, baru.id, 'daripada ' + id);
  Logger.log('Templat siap: https://docs.google.com/spreadsheets/d/' + baru.id + '/edit');
}

/** Ujian cetak dari editor: jana PDF tuntutan contoh dan simpan dalam My Drive anda. */
function ujiCetak() {
  var d = bersihkanData({
    bulan: Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM'),
    pegawai: { nama: 'CONTOH PEGAWAI', gred: '29', kereta_model: 'CONTOH', kereta_no: 'PAA 1' },
    perjalanan: [{ tarikh: '', bertolak: '08:00', tiba: '10:00', butiran: 'Ujian cetak', jarak: 50, kenderaan: 'KERETA' }]
  });
  var pdf = janaPdf(d, kiraTuntutan(d, bacaKonteks()), bacaTetapan());
  var f = DriveApp.createFile(pdf.setName('UJIAN CETAK TNT.pdf'));
  Logger.log('PDF ujian: ' + f.getUrl());
}
