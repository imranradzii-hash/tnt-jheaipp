/**
 * Daftar dan log masuk.
 *  - Daftar: hanya emel domain dalam Tetapan DOMAIN_EMEL (lalai penang.gov.my). Kod 6 digit dihantar
 *    ke emel untuk sahkan pemilikan emel sebelum akaun dicipta.
 *  - Kata laluan disimpan sebagai SHA-256 berulang dengan salt unik setiap pengguna (bukan teks biasa).
 *  - Log masuk menghasilkan token sesi (CacheService, 6 jam). Setiap panggilan API sahkan token di server.
 *  - Had cubaan: log masuk 8 kali / 5 minit, minta kod 5 kali / 15 minit, cuba kod 5 kali.
 */

var KOD_TTL_SAAT = 15 * 60;
var ULANGAN_HASH = 500;
var MIN_KATA_LALUAN = 8;

function hexDigest(s) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  return raw.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}

function hashKataLaluan(kataLaluan, salt) {
  var h = hexDigest(salt + '|' + kataLaluan);
  for (var i = 0; i < ULANGAN_HASH; i++) h = hexDigest(h + '|' + salt);
  return h;
}

function saltBaru() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

/** Bandingan masa tetap supaya hash tidak boleh diteka melalui masa respons. */
function samaSelamat(a, b) {
  a = teks(a); b = teks(b);
  if (a.length !== b.length) return false;
  var beza = 0;
  for (var i = 0; i < a.length; i++) beza |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return beza === 0;
}

function hadKadar(kunci, maks, saat) {
  var cache = CacheService.getScriptCache();
  var n = Number(cache.get(kunci) || 0);
  if (n >= maks) throw new Error('Terlalu banyak percubaan. Cuba lagi selepas ' + Math.round(saat / 60) + ' minit.');
  cache.put(kunci, String(n + 1), saat);
}

function semakKataLaluan(k) {
  k = String(k || '');
  if (k.length < MIN_KATA_LALUAN) throw new Error('Kata laluan mesti sekurang-kurangnya ' + MIN_KATA_LALUAN + ' aksara.');
  if (k.length > 128) throw new Error('Kata laluan terlalu panjang.');
  if (!/[A-Za-z]/.test(k) || !/\d/.test(k)) throw new Error('Kata laluan mesti mengandungi huruf dan nombor.');
  return k;
}

function normalEmel(emel) {
  var e = teks(emel).toLowerCase();
  if (!emelSah(e) || e.length > 120) throw new Error('Format emel tidak sah.');
  return e;
}

function rekodPengguna(emel) {
  return cariRekod(TAB.PENGGUNA, 'emel', teks(emel).toLowerCase());
}

function penggunaAktif(emel) {
  var p = rekodPengguna(emel);
  if (!p || p.aktif.toUpperCase() !== 'YA') return null;
  return { emel: p.emel, nama: p.nama, role: p.role.toLowerCase() === ROLE.ADMIN ? ROLE.ADMIN : ROLE.PENGGUNA };
}

function kodRawak() {
  return ('000000' + (parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 12), 16) % 1000000)).slice(-6);
}

function hantarKod(emel, tajuk, kod) {
  MailApp.sendEmail({
    to: emel,
    subject: tajuk + ' - ' + NAMA_SISTEM,
    body: 'Kod pengesahan anda: ' + kod + '\n\nKod ini sah selama 15 minit. Abaikan emel ini jika anda tidak membuat permintaan ini.'
  });
}

function ciptaSesi(p) {
  var token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('sesi_' + token, p.emel, SESI_TTL_SAAT);
  return { token: token, pengguna: { emel: p.emel, nama: p.nama, role: p.role } };
}

// ---------------------------------------------------------------- Daftar

/** Langkah 1: semak domain, simpan permohonan dalam cache dan hantar kod ke emel. */
function daftarMula(emel, nama, kataLaluan) {
  var e = normalEmel(emel);
  var domain = bacaTetapan().DOMAIN_EMEL || 'penang.gov.my';
  if (!emelDalamDomain(e, domain)) throw new Error('Pendaftaran hanya untuk emel @' + domain.split(',').map(teks).join(' / @') + '.');
  var n = teks(nama).toUpperCase().slice(0, 120);
  if (n.length < 3) throw new Error('Sila isi nama penuh.');
  semakKataLaluan(kataLaluan);
  hadKadar('kod_minta_' + e, 5, 15 * 60);
  var mesej = 'Kod pengesahan telah dihantar ke ' + e + '. Semak emel anda (termasuk folder spam).';
  if (rekodPengguna(e)) {
    // Jangan dedahkan sama ada emel berdaftar: hantar emel makluman sahaja
    MailApp.sendEmail({ to: e, subject: 'Percubaan daftar - ' + NAMA_SISTEM,
      body: 'Emel ini sudah berdaftar. Jika anda terlupa kata laluan, guna pautan "Lupa kata laluan" di halaman log masuk.' });
    return mesej;
  }
  var kod = kodRawak(), salt = saltBaru();
  CacheService.getScriptCache().put('daftar_' + e, JSON.stringify({
    nama: n, salt: salt, hash: hashKataLaluan(kataLaluan, salt), kod: hexDigest(e + '|' + kod)
  }), KOD_TTL_SAAT);
  CacheService.getScriptCache().remove('kod_cuba_' + e);
  hantarKod(e, 'Kod pengesahan pendaftaran', kod);
  return mesej;
}

/** Langkah 2: sahkan kod dan cipta akaun. Pengguna pertama atau ADMIN_AWAL menjadi admin. */
function daftarSahkan(emel, kod) {
  var e = normalEmel(emel);
  hadKadar('kod_cuba_' + e, 5, KOD_TTL_SAAT);
  var cache = CacheService.getScriptCache();
  var mohon = cache.get('daftar_' + e);
  if (!mohon) throw new Error('Kod tidak sah atau telah tamat tempoh. Sila daftar semula.');
  mohon = JSON.parse(mohon);
  if (!samaSelamat(mohon.kod, hexDigest(e + '|' + teks(kod)))) throw new Error('Kod tidak sah.');
  return denganKunci(function () {
    if (rekodPengguna(e)) throw new Error('Emel ini sudah berdaftar. Sila log masuk.');
    var adminAwal = teks(PropertiesService.getScriptProperties().getProperty('ADMIN_AWAL')).toLowerCase();
    var role = (adminAwal === e || !bacaJadual(TAB.PENGGUNA).length) ? ROLE.ADMIN : ROLE.PENGGUNA;
    tambahRekod(TAB.PENGGUNA, { emel: e, nama: mohon.nama, salt: mohon.salt, hash: mohon.hash, role: role,
      aktif: 'YA', dicipta_pada: sekarang(), log_masuk_terakhir: sekarang() });
    cache.remove('daftar_' + e);
    logAudit(e, 'DAFTAR', TAB.PENGGUNA, e, role);
    return ciptaSesi({ emel: e, nama: mohon.nama, role: role });
  });
}

// ---------------------------------------------------------------- Log masuk

function logMasuk(emel, kataLaluan) {
  var e = normalEmel(emel);
  hadKadar('login_' + e, 8, 5 * 60);
  var r = rekodPengguna(e);
  var hash = r ? hashKataLaluan(String(kataLaluan || ''), r.salt) : hashKataLaluan('x', 'x');
  if (!r || !samaSelamat(hash, r.hash)) throw new Error('Emel atau kata laluan tidak betul.');
  if (r.aktif.toUpperCase() !== 'YA') throw new Error('Akaun anda telah dinyahaktifkan. Hubungi admin.');
  CacheService.getScriptCache().remove('login_' + e);
  kemaskiniRekod(TAB.PENGGUNA, 'emel', e, { log_masuk_terakhir: sekarang() });
  return ciptaSesi(penggunaAktif(e));
}

function logKeluar(token) {
  if (token) CacheService.getScriptCache().remove('sesi_' + token);
  return true;
}

/** Sahkan token dan role. Pengguna dibaca semula supaya akaun yang dinyahaktif terus disekat. */
function requireAuth(token, roleDibenar) {
  var emel = token ? CacheService.getScriptCache().get('sesi_' + token) : null;
  if (!emel) throw new Error('Unauthorized: sesi tamat, sila log masuk semula.');
  var p = penggunaAktif(emel);
  if (!p) throw new Error('Unauthorized: akaun tidak aktif.');
  if (roleDibenar && roleDibenar.indexOf(p.role) < 0) throw new Error('Anda tiada kebenaran untuk tindakan ini.');
  return p;
}

// ---------------------------------------------------------------- Lupa / tukar kata laluan

function lupaMula(emel) {
  var e = normalEmel(emel);
  hadKadar('kod_minta_' + e, 5, 15 * 60);
  var mesej = 'Jika emel ini berdaftar, kod set semula telah dihantar. Kod sah 15 minit.';
  if (!penggunaAktif(e)) return mesej;
  var kod = kodRawak();
  CacheService.getScriptCache().put('lupa_' + e, hexDigest(e + '|' + kod), KOD_TTL_SAAT);
  CacheService.getScriptCache().remove('kod_cuba_' + e);
  hantarKod(e, 'Kod set semula kata laluan', kod);
  return mesej;
}

function lupaSahkan(emel, kod, kataLaluanBaru) {
  var e = normalEmel(emel);
  semakKataLaluan(kataLaluanBaru);
  hadKadar('kod_cuba_' + e, 5, KOD_TTL_SAAT);
  var cache = CacheService.getScriptCache();
  var simpan = cache.get('lupa_' + e);
  if (!simpan || !samaSelamat(simpan, hexDigest(e + '|' + teks(kod)))) throw new Error('Kod tidak sah atau telah tamat tempoh.');
  cache.remove('lupa_' + e);
  return denganKunci(function () {
    var salt = saltBaru();
    kemaskiniRekod(TAB.PENGGUNA, 'emel', e, { salt: salt, hash: hashKataLaluan(kataLaluanBaru, salt) });
    logAudit(e, 'SET_SEMULA_KATA_LALUAN', TAB.PENGGUNA, e, '');
    return 'Kata laluan telah ditukar. Sila log masuk.';
  });
}

function tukarKataLaluan(token, lama, baru) {
  var p = requireAuth(token);
  hadKadar('login_' + p.emel, 8, 5 * 60);
  var r = rekodPengguna(p.emel);
  if (!samaSelamat(hashKataLaluan(String(lama || ''), r.salt), r.hash)) throw new Error('Kata laluan semasa tidak betul.');
  semakKataLaluan(baru);
  return denganKunci(function () {
    var salt = saltBaru();
    kemaskiniRekod(TAB.PENGGUNA, 'emel', p.emel, { salt: salt, hash: hashKataLaluan(baru, salt) });
    logAudit(p.emel, 'TUKAR_KATA_LALUAN', TAB.PENGGUNA, p.emel, '');
    return 'Kata laluan telah ditukar.';
  });
}
