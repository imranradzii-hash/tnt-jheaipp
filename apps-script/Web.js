/**
 * Titik masuk untuk paparan yang dihos di luar Apps Script (cth Netlify).
 * Pelayar POST { fn, args } sebagai text/plain (tiada CORS preflight); jawapan JSON { ok, hasil } atau { ok:false, ralat }.
 * Hanya fungsi dalam senarai ini boleh dipanggil. Setiap fungsi tetap semak token sesi sendiri (requireAuth).
 */

function senaraiApiAwam() {
  return {
    apiDaftar: apiDaftar, apiDaftarSahkan: apiDaftarSahkan, apiLogMasuk: apiLogMasuk, apiLupa: apiLupa,
    apiLupaSahkan: apiLupaSahkan, apiLogKeluar: apiLogKeluar, apiTukarKataLaluan: apiTukarKataLaluan, apiDomain: apiDomain,
    apiSimpanProfil: apiSimpanProfil, apiMula: apiMula, apiBukaTuntutan: apiBukaTuntutan, apiSimpanTuntutan: apiSimpanTuntutan,
    apiPadamTuntutan: apiPadamTuntutan, apiCetak: apiCetak,
    apiAdminData: apiAdminData, apiAdminTambahKadar: apiAdminTambahKadar, apiAdminPadamKadar: apiAdminPadamKadar,
    apiAdminSimpanKumpulan: apiAdminSimpanKumpulan, apiAdminPadamKumpulan: apiAdminPadamKumpulan,
    apiAdminSimpanTetapan: apiAdminSimpanTetapan, apiAdminKemaskiniPengguna: apiAdminKemaskiniPengguna,
    apiAdminTuntutan: apiAdminTuntutan, apiAdminLog: apiAdminLog
  };
}

/** Logik doPost tanpa ContentService supaya boleh diuji. */
function prosesPanggilan(badan) {
  var req;
  try { req = JSON.parse(badan || '{}'); } catch (e) { return { ok: false, ralat: 'Permintaan tidak sah.' }; }
  var api = senaraiApiAwam();
  var fn = teks(req.fn);
  if (!Object.prototype.hasOwnProperty.call(api, fn)) return { ok: false, ralat: 'Fungsi tidak dikenali.' };
  var args = Array.isArray(req.args) ? req.args.slice(0, 5) : [];
  try {
    var hasil = api[fn].apply(null, args);
    return { ok: true, hasil: hasil === undefined ? null : hasil };
  } catch (e) {
    return { ok: false, ralat: String((e && e.message) || e) };
  }
}

function doPost(e) {
  var out = prosesPanggilan(e && e.postData ? e.postData.contents : '');
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
