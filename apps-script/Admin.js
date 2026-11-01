/**
 * Fungsi admin. Semua panggil requireAuth(token, [ROLE.ADMIN]) di server.
 *
 * Kadar tidak diubah di tempat: admin TAMBAH baris baharu dengan tarikh kuat kuasa
 * (cth mileage kereta RM1.00 mulai 01/01/2027). Baris lama kekal untuk tuntutan bulan lama.
 */

var KUNCI_TETAPAN_ADMIN = ['DOMAIN_EMEL', 'ALAMAT_PEJABAT', 'TEMPLAT_ID', 'FOLDER_SEMENTARA_ID', 'TEMPOH_SIMPAN_BULAN'];

function apiAdminData(token) {
  requireAuth(token, [ROLE.ADMIN]);
  var tetapan = bacaJadual(TAB.TETAPAN).map(function (r) { return { kunci: r.kunci, nilai: r.nilai, keterangan: r.keterangan }; });
  return {
    konteks: bacaKonteks(),
    kodKadar: KOD_KADAR,
    tetapan: tetapan,
    pengguna: bacaJadual(TAB.PENGGUNA).map(function (r) {
      return { emel: r.emel, nama: r.nama, role: r.role, aktif: r.aktif, dicipta_pada: r.dicipta_pada, log_masuk_terakhir: r.log_masuk_terakhir };
    })
  };
}

function apiAdminTambahKadar(token, k) {
  var p = requireAuth(token, [ROLE.ADMIN]);
  k = k || {};
  var kod = teks(k.kod);
  if (!KOD_KADAR[kod]) throw new Error('Kod kadar tidak sah.');
  var kumpulan = KOD_KADAR[kod].per_kumpulan ? teks(k.kumpulan) : '';
  if (KOD_KADAR[kod].per_kumpulan && !cariRekod(TAB.KUMPULAN, 'nama', kumpulan)) throw new Error('Pilih kumpulan gred.');
  var nilai = nombor(k.nilai);
  if (teks(k.nilai) === '' || nilai < 0 || nilai > 100000) throw new Error('Nilai kadar tidak sah.');
  if (!sahTarikh(k.kuat_kuasa)) throw new Error('Tarikh kuat kuasa tidak sah.');
  var rujukan = teks(k.rujukan).slice(0, 200);
  if (!rujukan) throw new Error('Sila isi rujukan pekeliling.');
  return denganKunci(function () {
    var id = idBaru();
    tambahRekod(TAB.KADAR, { id: id, kod: kod, kumpulan: kumpulan, nilai: String(nilai), kuat_kuasa: k.kuat_kuasa,
      rujukan: rujukan, oleh: p.emel, pada: sekarang() });
    logAudit(p.emel, 'TAMBAH_KADAR', TAB.KADAR, id, kod + ' ' + kumpulan + ' = ' + nilai + ' mulai ' + k.kuat_kuasa + ' (' + rujukan + ')');
    return bacaKonteks();
  });
}

function apiAdminPadamKadar(token, id) {
  var p = requireAuth(token, [ROLE.ADMIN]);
  return denganKunci(function () {
    var r = cariRekod(TAB.KADAR, 'id', id);
    if (!r) throw new Error('Kadar tidak dijumpai.');
    padamRekodJika(TAB.KADAR, function (x) { return x.id === id; });
    logAudit(p.emel, 'PADAM_KADAR', TAB.KADAR, id, r.kod + ' ' + r.kumpulan + ' = ' + r.nilai + ' mulai ' + r.kuat_kuasa);
    return bacaKonteks();
  });
}

function apiAdminSimpanKumpulan(token, k) {
  var p = requireAuth(token, [ROLE.ADMIN]);
  k = k || {};
  var nama = teks(k.nama).toUpperCase().slice(0, 60);
  if (!nama) throw new Error('Nama kumpulan diperlukan.');
  var min = nombor(k.gred_min), maks = teks(k.gred_maks);
  if (teks(k.gred_min) === '' || min < 0) throw new Error('Gred minimum tidak sah.');
  if (maks !== '' && nombor(maks) < min) throw new Error('Gred maksimum mesti >= gred minimum.');
  return denganKunci(function () {
    var lama = k.id ? cariRekod(TAB.KUMPULAN, 'id', k.id) : null;
    var sama = cariRekod(TAB.KUMPULAN, 'nama', nama);
    if (sama && (!lama || sama.id !== lama.id)) throw new Error('Nama kumpulan sudah wujud.');
    if (lama && lama.nama !== nama) throw new Error('Nama kumpulan tidak boleh ditukar kerana kadar dirujuk ikut nama. Cipta kumpulan baharu.');
    var rek = { nama: nama, gred_min: String(min), gred_maks: maks === '' ? '' : String(nombor(maks)), catatan: teks(k.catatan).slice(0, 200) };
    if (lama) kemaskiniRekod(TAB.KUMPULAN, 'id', lama.id, rek);
    else { rek.id = idBaru(); tambahRekod(TAB.KUMPULAN, rek); }
    logAudit(p.emel, lama ? 'KEMASKINI_KUMPULAN' : 'TAMBAH_KUMPULAN', TAB.KUMPULAN, nama, rek.gred_min + '-' + rek.gred_maks);
    return bacaKonteks();
  });
}

function apiAdminPadamKumpulan(token, id) {
  var p = requireAuth(token, [ROLE.ADMIN]);
  return denganKunci(function () {
    var r = cariRekod(TAB.KUMPULAN, 'id', id);
    if (!r) throw new Error('Kumpulan tidak dijumpai.');
    if (bacaJadual(TAB.KADAR).some(function (x) { return x.kumpulan === r.nama; })) {
      throw new Error('Kumpulan ini masih ada kadar. Padam kadarnya dahulu.');
    }
    padamRekodJika(TAB.KUMPULAN, function (x) { return x.id === id; });
    logAudit(p.emel, 'PADAM_KUMPULAN', TAB.KUMPULAN, r.nama, '');
    return bacaKonteks();
  });
}

function apiAdminSimpanTetapan(token, kunci, nilai) {
  var p = requireAuth(token, [ROLE.ADMIN]);
  if (KUNCI_TETAPAN_ADMIN.indexOf(kunci) < 0) throw new Error('Tetapan tidak dikenali.');
  var v = teks(nilai).slice(0, 500);
  if (kunci === 'DOMAIN_EMEL' && !v) throw new Error('Domain emel tidak boleh kosong.');
  return denganKunci(function () {
    if (cariRekod(TAB.TETAPAN, 'kunci', kunci)) kemaskiniRekod(TAB.TETAPAN, 'kunci', kunci, { nilai: v });
    else tambahRekod(TAB.TETAPAN, { kunci: kunci, nilai: v, keterangan: '' });
    logAudit(p.emel, 'TETAPAN', TAB.TETAPAN, kunci, v);
    return true;
  });
}

function apiAdminKemaskiniPengguna(token, emel, perubahan) {
  var p = requireAuth(token, [ROLE.ADMIN]);
  var e = teks(emel).toLowerCase();
  perubahan = perubahan || {};
  return denganKunci(function () {
    var r = rekodPengguna(e);
    if (!r) throw new Error('Pengguna tidak dijumpai.');
    var ubah = {};
    if (perubahan.role !== undefined) {
      if ([ROLE.ADMIN, ROLE.PENGGUNA].indexOf(perubahan.role) < 0) throw new Error('Peranan tidak sah.');
      ubah.role = perubahan.role;
    }
    if (perubahan.aktif !== undefined) ubah.aktif = perubahan.aktif === 'YA' ? 'YA' : 'TIDAK';
    if (e === p.emel && (ubah.role === ROLE.PENGGUNA || ubah.aktif === 'TIDAK')) {
      throw new Error('Anda tidak boleh membuang akses admin anda sendiri.');
    }
    kemaskiniRekod(TAB.PENGGUNA, 'emel', e, ubah);
    logAudit(p.emel, 'KEMASKINI_PENGGUNA', TAB.PENGGUNA, e, ubah);
    return true;
  });
}

/** Senarai tuntutan semua pengguna bagi satu bulan (ringkasan sahaja). */
function apiAdminTuntutan(token, bulan) {
  requireAuth(token, [ROLE.ADMIN]);
  return bacaJadual(TAB.TUNTUTAN).filter(function (r) { return !bulan || r.bulan === bulan; })
    .map(function (r) { return ringkasTuntutan(r, true); })
    .sort(function (a, b) { return a.bulan < b.bulan ? 1 : a.bulan > b.bulan ? -1 : (a.nama < b.nama ? -1 : 1); });
}

function apiAdminLog(token) {
  requireAuth(token, [ROLE.ADMIN]);
  var sh = tabSheet(TAB.LOG);
  var akhir = sh.getLastRow();
  if (akhir < 2) return [];
  var mula = Math.max(2, akhir - 199);
  return sh.getRange(mula, 1, akhir - mula + 1, HEADER.LogAudit.length).getDisplayValues().reverse();
}
