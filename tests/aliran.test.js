const test = require('node:test');
const assert = require('node:assert');
const { binaGas } = require('./mock-gas');
const { DATA } = require('./contoh');

const kodDariEmel = (state) => /Kod pengesahan anda: (\d{6})/.exec(state.peti[state.peti.length - 1].body)[1];

function daftar(g, emel, nama) {
  g.ctx.apiDaftar(emel, nama, 'rahsia123');
  return g.ctx.apiDaftarSahkan(emel, kodDariEmel(g.state));
}

function sistem() {
  const g = binaGas();
  g.sediakan();
  const admin = daftar(g, 'admin@penang.gov.my', 'Pentadbir');
  g.ctx.apiAdminSimpanTetapan(admin.token, 'TEMPLAT_ID', 'TEMPLAT');
  g.ctx.apiAdminSimpanTetapan(admin.token, 'ALAMAT_PEJABAT', 'Alamat JHEAIPP');
  return { g, admin };
}

test('daftar: hanya domain penang.gov.my, kod emel wajib, admin awal jadi admin', () => {
  const { g, admin } = sistem();
  assert.strictEqual(admin.pengguna.role, 'admin');
  assert.throws(() => g.ctx.apiDaftar('ali@gmail.com', 'Ali', 'rahsia123'), /penang\.gov\.my/);
  assert.throws(() => g.ctx.apiDaftar('ali@penang.gov.my', 'Ali', 'pendek'), /8 aksara/);
  g.ctx.apiDaftar('ali@penang.gov.my', 'Ali bin Abu', 'rahsia123');
  assert.throws(() => g.ctx.apiDaftarSahkan('ali@penang.gov.my', '000000x'), /Kod tidak sah/);
  const r = g.ctx.apiDaftarSahkan('ali@penang.gov.my', kodDariEmel(g.state));
  assert.strictEqual(r.pengguna.role, 'pengguna');
  // Kata laluan tidak disimpan sebagai teks biasa
  const baris = g.ss.SISTEM.getSheetByName('Pengguna').rows.map((x) => x.join('|')).join('\n');
  assert.ok(!baris.includes('rahsia123'));
});

test('log masuk, salah kata laluan, had cubaan, log keluar', () => {
  const { g } = sistem();
  daftar(g, 'ali@penang.gov.my', 'Ali');
  assert.throws(() => g.ctx.apiLogMasuk('ali@penang.gov.my', 'salah1234'), /tidak betul/);
  const s = g.ctx.apiLogMasuk('ALI@penang.gov.my', 'rahsia123');
  assert.ok(g.ctx.apiMula(s.token).pengguna.emel === 'ali@penang.gov.my');
  g.ctx.apiLogKeluar(s.token);
  assert.throws(() => g.ctx.apiMula(s.token), /Unauthorized/);
  for (let i = 0; i < 8; i++) { try { g.ctx.apiLogMasuk('ali@penang.gov.my', 'salah' + i + 'aaa'); } catch (e) { /* */ } }
  assert.throws(() => g.ctx.apiLogMasuk('ali@penang.gov.my', 'rahsia123'), /Terlalu banyak/);
});

test('lupa kata laluan: set semula dengan kod', () => {
  const { g } = sistem();
  daftar(g, 'ali@penang.gov.my', 'Ali');
  g.ctx.apiLupa('ali@penang.gov.my');
  g.ctx.apiLupaSahkan('ali@penang.gov.my', kodDariEmel(g.state), 'baharu999');
  assert.ok(g.ctx.apiLogMasuk('ali@penang.gov.my', 'baharu999').token);
});

test('tuntutan: simpan, satu bulan satu tuntutan, akses pemilik sahaja, cetak', () => {
  const { g, admin } = sistem();
  const ali = daftar(g, 'ali@penang.gov.my', 'Ali');
  const abu = daftar(g, 'abu@penang.gov.my', 'Abu');
  g.ctx.apiSimpanProfil(ali.token, DATA.pegawai);
  const r = g.ctx.apiSimpanTuntutan(ali.token, null, DATA);
  assert.strictEqual(r.hasil.C.mileage.jumlah, 530);
  assert.throws(() => g.ctx.apiSimpanTuntutan(ali.token, null, DATA), /sudah ada/);
  assert.throws(() => g.ctx.apiBukaTuntutan(abu.token, r.id), /tiada akses/);
  assert.throws(() => g.ctx.apiCetak(abu.token, r.id), /tiada akses/);
  assert.strictEqual(g.ctx.apiMula(abu.token).tuntutan.length, 0);
  // Admin boleh buka
  assert.strictEqual(g.ctx.apiBukaTuntutan(admin.token, r.id).data.bulan, '2026-01');

  const pdf = g.ctx.apiCetak(ali.token, r.id);
  assert.ok(pdf.nama.startsWith('TNT JANUARI 2026'));
  const salinan = g.state.salinan[0];
  assert.deepStrictEqual(g.state.dibuang, [salinan.id]); // salinan sementara dibuang
  const m2 = salinan.getSheetByName('Muka 2');
  assert.strictEqual(m2.disisip[0], 7); assert.strictEqual(m2.disisip[1], 2);
  assert.strictEqual(m2.nilai.E10, 600);
  assert.strictEqual(salinan.getSheetByName('Muka 1').nilai.C22, 'ALAMAT JHEAIPP');
  assert.strictEqual(salinan.getSheetByName('Muka 2').maxCols, 6); // lajur lebihan dibuang
  assert.ok(/scale=4/.test(g.state.fetch[0]));
});

test('admin: kadar baharu ikut tarikh, pengguna biasa tidak boleh ubah kadar', () => {
  const { g, admin } = sistem();
  const ali = daftar(g, 'ali@penang.gov.my', 'Ali');
  assert.throws(() => g.ctx.apiAdminTambahKadar(ali.token, { kod: 'KERETA_1', nilai: '5', kuat_kuasa: '2026-01-01', rujukan: 'x' }), /tiada kebenaran/);
  assert.throws(() => g.ctx.apiAdminData(ali.token), /tiada kebenaran/);
  g.ctx.apiAdminTambahKadar(admin.token, { kod: 'KERETA_1', nilai: '1.00', kuat_kuasa: '2027-01-01', rujukan: 'PP baharu' });
  g.ctx.apiSimpanProfil(ali.token, DATA.pegawai);
  const jan26 = g.ctx.apiSimpanTuntutan(ali.token, null, DATA);
  assert.strictEqual(jan26.hasil.C.mileage.kereta_1.kadar, 0.9);
  const d27 = JSON.parse(JSON.stringify(DATA)); d27.bulan = '2027-01';
  d27.perjalanan.forEach((x) => { x.tarikh = '2027' + x.tarikh.slice(4); });
  const jan27 = g.ctx.apiSimpanTuntutan(ali.token, null, d27);
  assert.strictEqual(jan27.hasil.C.mileage.kereta_1.kadar, 1);
  // Kumpulan gred + elaun makan
  g.ctx.apiAdminSimpanKumpulan(admin.token, { nama: 'Gred 19-40', gred_min: '19', gred_maks: '40' });
  g.ctx.apiAdminTambahKadar(admin.token, { kod: 'ELAUN_MAKAN', kumpulan: 'GRED 19-40', nilai: '60', kuat_kuasa: '2020-01-01', rujukan: 'PP' });
  const r = g.ctx.apiSimpanTuntutan(ali.token, jan26.id, DATA);
  assert.strictEqual(r.hasil.A.makan_penuh.rm, 60);
  assert.throws(() => g.ctx.apiAdminKemaskiniPengguna(admin.token, 'admin@penang.gov.my', { role: 'pengguna' }), /sendiri/);
  g.ctx.apiAdminKemaskiniPengguna(admin.token, 'ali@penang.gov.my', { aktif: 'TIDAK' });
  assert.throws(() => g.ctx.apiMula(ali.token), /tidak aktif/);
});

test('input berbahaya dineutralkan sebelum masuk Sheet', () => {
  const { g } = sistem();
  const ali = daftar(g, 'ali@penang.gov.my', 'Ali');
  const d = JSON.parse(JSON.stringify(DATA));
  d.pegawai.jawatan = '=IMPORTXML("http://x")';
  g.ctx.apiSimpanProfil(ali.token, d.pegawai);
  const sh = g.ss.SISTEM.getSheetByName('Profil');
  // Mock buang "'" seperti Sheets; pastikan nilai disimpan sebagai teks (keBaris guna sanitizeForSheet)
  assert.strictEqual(g.ctx.sanitizeForSheet(d.pegawai.jawatan)[0], "'");
  assert.ok(sh.getLastRow() === 2);
});

test('kadar lalai EPK Pulau Pinang ikut bulan tuntutan', () => {
  const { g } = sistem();
  const ali = daftar(g, 'ali@penang.gov.my', 'Ali');
  g.ctx.apiSimpanProfil(ali.token, DATA.pegawai);
  const kadarBulan = (bulan) => {
    const d = JSON.parse(JSON.stringify(DATA)); d.bulan = bulan;
    d.perjalanan.forEach((x) => { x.tarikh = bulan + x.tarikh.slice(7); });
    d.perjalanan.push({ tarikh: bulan + '-20', butiran: 'moto', jarak: 10, kenderaan: 'MOTOSIKAL' });
    const m = g.ctx.apiSimpanTuntutan(ali.token, null, d).hasil.C.mileage;
    return [m.kereta_1.kadar, m.kereta_2.kadar, m.moto_1.kadar];
  };
  assert.deepStrictEqual(kadarBulan('2025-09'), [0.85, 0.75, 0]);
  assert.deepStrictEqual(kadarBulan('2026-03'), [0.9, 0.8, 0.6]);
  assert.deepStrictEqual(kadarBulan('2026-04'), [1, 0.9, 0.65]); // tuntutan April guna kadar baharu
  assert.deepStrictEqual(kadarBulan('2026-10'), [1, 0.9, 0.65]);
});

test('doPost (hos luar): hanya fungsi api dalam senarai, ralat dipulangkan sebagai JSON', () => {
  const { g } = sistem();
  const p = (o) => g.ctx.prosesPanggilan(JSON.stringify(o));
  assert.strictEqual(p({ fn: 'apiDomain', args: [] }).hasil, 'penang.gov.my');
  assert.match(p({ fn: 'setupSistem', args: [] }).ralat, /tidak dikenali/);
  assert.match(p({ fn: 'hashKataLaluan', args: ['a', 'b'] }).ralat, /tidak dikenali/);
  assert.match(p({ fn: 'apiMula', args: ['token-palsu'] }).ralat, /Unauthorized/);
  assert.match(g.ctx.prosesPanggilan('bukan json').ralat, /tidak sah/);
  const r = p({ fn: 'apiLogMasuk', args: ['admin@penang.gov.my', 'rahsia123'] });
  assert.ok(r.ok && r.hasil.token);
});
