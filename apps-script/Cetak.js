/**
 * Cetak "sebiji borang": salin Google Sheet templat (ditukar daripada xlsx asal), tulis nilai ke sel,
 * export PDF (setiap helaian = satu halaman A4), kemudian buang salinan sementara.
 */

var PARAM_PDF = {
  format: 'pdf', size: 'A4', portrait: 'true', scale: '4', // 4 = muat satu halaman setiap helaian
  gridlines: 'false', printtitle: 'false', sheetnames: 'false', pagenum: 'UNDEFINED', fzr: 'false',
  attachment: 'false', top_margin: '0.4', bottom_margin: '0.4', left_margin: '0.4', right_margin: '0.4',
  horizontal_alignment: 'CENTER', vertical_alignment: 'TOP'
};

function urlExportPdf(ssId) {
  return 'https://docs.google.com/spreadsheets/d/' + ssId + '/export?' + Object.keys(PARAM_PDF).map(function (k) {
    return k + '=' + encodeURIComponent(PARAM_PDF[k]);
  }).join('&');
}

/** Tulis peta sel ke dalam spreadsheet (salinan templat). Diasingkan supaya boleh diuji dengan mock. */
function isiSalinan(ss, peta) {
  var sh2 = ss.getSheetByName('Muka 2');
  if (peta.tambahBaris > 0) {
    sh2.insertRowsAfter(BARIS_PERJALANAN_MULA + BARIS_PERJALANAN_TEMPLAT - 1, peta.tambahBaris);
    var lebar = sh2.getMaxColumns();
    sh2.getRange(BARIS_PERJALANAN_MULA + 1, 1, 1, lebar).copyTo(
      sh2.getRange(BARIS_PERJALANAN_MULA + BARIS_PERJALANAN_TEMPLAT, 1, peta.tambahBaris, lebar),
      SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  }
  if (peta.tinggiBaris) peta.tinggiBaris.forEach(function (t, i) { sh2.setRowHeight(BARIS_PERJALANAN_MULA + i, t); });

  var ikutHelaian = {};
  peta.sel.forEach(function (x) { (ikutHelaian[x[0]] = ikutHelaian[x[0]] || []).push(x); });
  Object.keys(ikutHelaian).forEach(function (nama) {
    var sh = ss.getSheetByName(nama);
    if (!sh) throw new Error('Templat tiada helaian "' + nama + '". Semak TEMPLAT_ID.');
    ikutHelaian[nama].forEach(function (x) {
      var v = x[2];
      // Teks yang bermula = + - @ tidak boleh jadi formula dalam salinan
      sh.getRange(x[1]).setValue(typeof v === 'number' ? v : sanitizeForSheet(v));
    });
  });

  // Buang lajur/baris kosong di luar borang supaya export tidak mengecilkan halaman
  Object.keys(peta.julat).forEach(function (nama) {
    var sh = ss.getSheetByName(nama), j = peta.julat[nama];
    if (!sh) return;
    if (sh.getMaxColumns() > j.lajur) sh.deleteColumns(j.lajur + 1, sh.getMaxColumns() - j.lajur);
    if (sh.getMaxRows() > j.baris) sh.deleteRows(j.baris + 1, sh.getMaxRows() - j.baris);
  });
}

function janaPdf(data, hasil, tetapan) {
  var templatId = teks(tetapan.TEMPLAT_ID);
  if (!templatId) throw new Error('Templat borang belum disediakan. Admin perlu jalankan sediakanTemplat().');
  var folderId = teks(tetapan.FOLDER_SEMENTARA_ID);
  var nama = 'SEMENTARA TNT ' + data.bulan + ' ' + Utilities.getUuid().slice(0, 8);
  var fail = folderId ? DriveApp.getFileById(templatId).makeCopy(nama, DriveApp.getFolderById(folderId))
    : DriveApp.getFileById(templatId).makeCopy(nama);
  try {
    var ss = SpreadsheetApp.openById(fail.getId());
    isiSalinan(ss, petaBorang(data, hasil, tetapan));
    SpreadsheetApp.flush();
    var res = null;
    for (var cuba = 0; cuba < 4; cuba++) {
      res = UrlFetchApp.fetch(urlExportPdf(fail.getId()), {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) break;
      Utilities.sleep(1500 * (cuba + 1)); // 429: had export Google, cuba semula
    }
    if (res.getResponseCode() !== 200) throw new Error('Gagal menjana PDF (kod ' + res.getResponseCode() + '). Cuba sebentar lagi.');
    return res.getBlob().setName(nama + '.pdf');
  } finally {
    fail.setTrashed(true);
  }
}
