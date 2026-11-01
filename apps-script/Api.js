/**
 * Titik masuk web app dan fungsi yang dipanggil melalui google.script.run.
 * Setiap fungsi api* (kecuali daftar/log masuk) wajib panggil requireAuth() dahulu.
 * Pengguna biasa hanya boleh baca/ubah profil dan tuntutan sendiri; tapisan dibuat di server.
 */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Tuntutan Perjalanan (TNT) JHEAIPP')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

// ---------------------------------------------------------------- Auth (tanpa token)

function apiDaftar(emel, nama, kataLaluan) { return daftarMula(emel, nama, kataLaluan); }
function apiDaftarSahkan(emel, kod) { return daftarSahkan(emel, kod); }
function apiLogMasuk(emel, kataLaluan) { return logMasuk(emel, kataLaluan); }
function apiLupa(emel) { return lupaMula(emel); }
function apiLupaSahkan(emel, kod, baru) { return lupaSahkan(emel, kod, baru); }
function apiLogKeluar(token) { return logKeluar(token); }
function apiTukarKataLaluan(token, lama, baru) { return tukarKataLaluan(token, lama, baru); }
function apiDomain() { return bacaTetapan().DOMAIN_EMEL || 'penang.gov.my'; }

// ---------------------------------------------------------------- Profil

function profilKosong(emel, nama) {
  var o = {};
  HEADER.Profil.forEach(function (k) { o[k] = ''; });
  o.emel = emel;
  o.nama = nama || '';
  return o;
}

function bacaProfil(p) {
  var r = cariRekod(TAB.PROFIL, 'emel', p.emel);
  var o = profilKosong(p.emel, p.nama);
  if (r) HEADER.Profil.forEach(function (k) { o[k] = r[k]; });
  return o;
}

function apiSimpanProfil(token, profil) {
  var p = requireAuth(token);
  var bersih = bersihkanData({ pegawai: profil }).pegawai;
  bersih.emel = p.emel;
  bersih.dikemaskini_pada = sekarang();
  if (bersih.ic && !/^\d{12}$/.test(hanyaDigit(bersih.ic))) throw new Error('No. kad pengenalan mesti 12 digit.');
  return denganKunci(function () {
    if (cariRekod(TAB.PROFIL, 'emel', p.emel)) kemaskiniRekod(TAB.PROFIL, 'emel', p.emel, bersih);
    else tambahRekod(TAB.PROFIL, bersih);
    logAudit(p.emel, 'SIMPAN_PROFIL', TAB.PROFIL, p.emel, '');
    return bacaProfil(p);
  });
}

// ---------------------------------------------------------------- Tuntutan

function ringkasTuntutan(r, denganPemilik) {
  var o = { id: r.id, bulan: r.bulan, label: labelBulan(r.bulan), jumlah: r.jumlah,
    dikemaskini_pada: r.dikemaskini_pada, dicetak_pada: r.dicetak_pada };
  if (denganPemilik) {
    o.emel = r.emel;
    try { o.nama = JSON.parse(r.data).pegawai.nama; } catch (e) { o.nama = ''; }
  }
  return o;
}

function senaraiTuntutanSendiri(p) {
  return bacaJadual(TAB.TUNTUTAN).filter(function (r) { return r.emel === p.emel; })
    .map(function (r) { return ringkasTuntutan(r, false); })
    .sort(function (a, b) { return a.bulan < b.bulan ? 1 : -1; });
}

/** Tuntutan dengan semakan pemilikan. Admin boleh akses semua. */
function tuntutanDenganAkses(p, id) {
  var r = cariRekod(TAB.TUNTUTAN, 'id', id);
  if (!r) throw new Error('Tuntutan tidak dijumpai.');
  if (r.emel !== p.emel && p.role !== ROLE.ADMIN) throw new Error('Anda tiada akses kepada tuntutan ini.');
  return r;
}

function apiMula(token) {
  var p = requireAuth(token);
  return {
    pengguna: p,
    profil: bacaProfil(p),
    konteks: bacaKonteks(),
    tuntutan: senaraiTuntutanSendiri(p),
    kodKadar: KOD_KADAR,
    jenisAwam: JENIS_AWAM,
    alamatPejabat: bacaTetapan().ALAMAT_PEJABAT || ''
  };
}

function apiBukaTuntutan(token, id) {
  var p = requireAuth(token);
  var r = tuntutanDenganAkses(p, id);
  return { id: r.id, emel: r.emel, data: JSON.parse(r.data) };
}

function apiSimpanTuntutan(token, id, data) {
  var p = requireAuth(token);
  var d = bersihkanData(data);
  if (!d.bulan) throw new Error('Sila pilih bulan tuntutan.');
  var hasil = kiraTuntutan(d, bacaKonteks());
  var json = JSON.stringify(d);
  if (json.length > 45000) throw new Error('Tuntutan terlalu panjang. Kurangkan butiran perjalanan.');
  return denganKunci(function () {
    var lama = id ? tuntutanDenganAkses(p, id) : null;
    var pemilik = lama ? lama.emel : p.emel;
    var sama = bacaJadual(TAB.TUNTUTAN).filter(function (r) {
      return r.emel === pemilik && r.bulan === d.bulan && r.id !== (lama ? lama.id : '');
    });
    if (sama.length) throw new Error('Tuntutan bagi ' + labelBulan(d.bulan) + ' sudah ada. Buka tuntutan tersebut untuk dikemaskini.');
    var rekod = { bulan: d.bulan, data: json, jumlah: hasil.jumlah.toFixed(2), dikemaskini_pada: sekarang() };
    if (lama) {
      kemaskiniRekod(TAB.TUNTUTAN, 'id', lama.id, rekod);
    } else {
      rekod.id = idBaru();
      rekod.emel = p.emel;
      rekod.dicipta_pada = rekod.dikemaskini_pada;
      tambahRekod(TAB.TUNTUTAN, rekod);
    }
    var idSimpan = lama ? lama.id : rekod.id;
    logAudit(p.emel, lama ? 'KEMASKINI_TUNTUTAN' : 'CIPTA_TUNTUTAN', TAB.TUNTUTAN, idSimpan, d.bulan + ' ' + rekod.jumlah);
    return { id: idSimpan, hasil: hasil, tuntutan: senaraiTuntutanSendiri(p) };
  });
}

function apiPadamTuntutan(token, id) {
  var p = requireAuth(token);
  return denganKunci(function () {
    var r = tuntutanDenganAkses(p, id);
    padamRekodJika(TAB.TUNTUTAN, function (x) { return x.id === r.id; });
    logAudit(p.emel, 'PADAM_TUNTUTAN', TAB.TUNTUTAN, r.id, r.emel + ' ' + r.bulan);
    return senaraiTuntutanSendiri(p);
  });
}

/** Jana PDF sebiji borang asal. Pulangkan base64 untuk dimuat turun/dicetak oleh pelayar. */
function apiCetak(token, id) {
  var p = requireAuth(token);
  hadKadar('cetak_' + p.emel, 20, 10 * 60);
  var r = tuntutanDenganAkses(p, id);
  var d = bersihkanData(JSON.parse(r.data));
  var hasil = kiraTuntutan(d, bacaKonteks());
  var pdf = janaPdf(d, hasil, bacaTetapan());
  denganKunci(function () {
    kemaskiniRekod(TAB.TUNTUTAN, 'id', r.id, { dicetak_pada: sekarang(), jumlah: hasil.jumlah.toFixed(2) });
  });
  logAudit(p.emel, 'CETAK', TAB.TUNTUTAN, r.id, r.emel + ' ' + r.bulan);
  var nama = 'TNT ' + labelBulan(d.bulan) + ' - ' + (d.pegawai.nama || r.emel) + '.pdf';
  return { nama: nama.replace(/[\\/:*?"<>|]/g, ''), base64: Utilities.base64Encode(pdf.getBytes()) };
}
