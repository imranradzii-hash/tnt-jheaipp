const test = require('node:test');
const assert = require('node:assert');
const { muat, TULEN } = require('./muat');
const { KADAR, KUMPULAN, DATA } = require('./contoh');

const g = muat(TULEN);
const salin = (o) => JSON.parse(JSON.stringify(o));

test('mileage dibahagi ikut peringkat 500 km', () => {
  const d = g.bersihkanData(DATA);
  const h = g.kiraTuntutan(d, { kadar: KADAR, kumpulan: KUMPULAN });
  assert.strictEqual(h.km.kereta, 600);
  assert.strictEqual(h.C.mileage.kereta_1.km, 500);
  assert.strictEqual(h.C.mileage.kereta_2.km, 100);
  assert.strictEqual(h.C.mileage.jumlah, 530); // 500*0.9 + 100*0.8
});

test('jumlah A, B, C, D dan keseluruhan', () => {
  const h = g.kiraTuntutan(g.bersihkanData(DATA), { kadar: KADAR, kumpulan: KUMPULAN });
  // A: sarapan 12x1 + tengah hari 24x2 + makan penuh 60 + harian 30
  assert.strictEqual(h.A.jumlah, 12 + 48 + 60 + 30);
  // B: BSP 150 + lojing 100 (templat asal tertinggal BSP dalam jumlah B)
  assert.strictEqual(h.B.jumlah, 250);
  assert.strictEqual(h.C.jumlah, 555);
  // D: tol + parkir (templat asal tertinggal tol)
  assert.strictEqual(h.D.jumlah, 14.4);
  assert.strictEqual(h.jumlah, 150 + 250 + 555 + 14.4);
  assert.strictEqual(h.amaran.length, 0, h.amaran.join("; "));
});

test('kadar baharu ikut tarikh kuat kuasa: bulan lama kekal kadar lama', () => {
  const kadar = KADAR.concat([{ kod: 'KERETA_1', kumpulan: '', nilai: '1.00', kuat_kuasa: '2027-01-01', rujukan: 'Pekeliling baharu' }]);
  const lama = g.kiraTuntutan(g.bersihkanData(DATA), { kadar, kumpulan: KUMPULAN });
  assert.strictEqual(lama.C.mileage.kereta_1.kadar, 0.9);
  const d = salin(DATA); d.bulan = '2027-01';
  d.perjalanan.forEach((r) => { r.tarikh = '2027-01' + r.tarikh.slice(7); });
  const baru = g.kiraTuntutan(g.bersihkanData(d), { kadar, kumpulan: KUMPULAN });
  assert.strictEqual(baru.C.mileage.kereta_1.kadar, 1);
  assert.strictEqual(baru.kadar.rujukan.KERETA_1, 'Pekeliling baharu');
});

test('gred tidak sepadan kumpulan → amaran, elaun makan 0', () => {
  const d = salin(DATA); d.pegawai.gred = 'S41';
  const h = g.kiraTuntutan(g.bersihkanData(d), { kadar: KADAR, kumpulan: KUMPULAN });
  assert.strictEqual(h.kadar.kumpulan, 'KUMP C');
  assert.strictEqual(h.A.makan_penuh.rm, 0);
  assert.ok(h.amaran.some((a) => /elaun makan/.test(a)));
});

test('bersihkanData buang nilai negatif, medan asing dan tarikh tidak sah', () => {
  const d = g.bersihkanData({ bulan: '2026-13', perjalanan: [{ tarikh: 'x', jarak: -5, butiran: 'a', jahat: 1 }], tol: { rm: -3 }, pegawai: { nama: 'ali', jahat: '=X' } });
  assert.strictEqual(d.bulan, '');
  assert.strictEqual(d.perjalanan[0].jarak, 0);
  assert.strictEqual(d.perjalanan[0].tarikh, '');
  assert.strictEqual(d.perjalanan[0].jahat, undefined);
  assert.strictEqual(d.tol.rm, 0);
  assert.strictEqual(d.pegawai.nama, 'ALI');
  assert.strictEqual(d.pegawai.jahat, undefined);
});

test('peta borang: sel utama dan sisipan baris Muka 2', () => {
  const d = g.bersihkanData(DATA);
  const h = g.kiraTuntutan(d, { kadar: KADAR, kumpulan: KUMPULAN });
  const p = g.petaBorang(d, h, { ALAMAT_PEJABAT: 'Alamat JHEAIPP' });
  const sel = {};
  p.sel.forEach(([s, a, v]) => { sel[s + '!' + a] = v; });
  assert.strictEqual(p.tambahBaris, 2);
  assert.strictEqual(sel['Muka 1!E6'], 'JANUARI 2026');
  assert.strictEqual(sel['Muka 1!C9'], 'AHMAD BIN ALI');
  assert.strictEqual(sel['Muka 1!C22'], 'ALAMAT JHEAIPP');
  assert.strictEqual(sel['Muka 2!A9'], '12/01/2026');
  assert.strictEqual(sel['Muka 2!E10'], 600); // baris JUMLAH selepas sisipan
  assert.strictEqual(sel['Muka 4!G18'], 500);
  assert.strictEqual(sel['Muka 4!L27'], 530);
  assert.strictEqual(sel['Muka 6!L18'], h.jumlah);
  assert.strictEqual(p.julat['Muka 2'].baris, 12);
});

test('format bantuan', () => {
  assert.strictEqual(g.nomborGred('DG44'), 44);
  assert.ok(g.emelDalamDomain('ali@penang.gov.my', 'penang.gov.my'));
  assert.ok(!g.emelDalamDomain('ali@evil.penang.gov.my', 'penang.gov.my'));
  assert.ok(!g.emelDalamDomain('ali@gmail.com', 'penang.gov.my'));
  assert.strictEqual(g.hariAkhirBulan('2028-02'), '2028-02-29');
});

test('tinggi baris Muka 2 ikut panjang butiran', () => {
  const pendek = g.tinggiBarisPerjalanan([{ butiran: 'a' }, { butiran: 'b' }]);
  assert.strictEqual(pendek, null); // kekal tinggi templat
  const panjang = 'x'.repeat(200);
  const t = g.tinggiBarisPerjalanan(Array.from({ length: 13 }, (_, i) => ({ butiran: i === 0 ? panjang : 'pendek' })));
  assert.strictEqual(t.length, 13);
  assert.ok(t[0] > t[1], 'baris panjang lebih tinggi');
  assert.ok(t[0] >= 5 * 14, 'muat 5 baris teks');
});

test('kadar manual pemohon mengatasi kadar admin, dengan amaran', () => {
  const d = salin(DATA);
  d.kadar_manual = { ELAUN_MAKAN: '75', LOJING: '' };
  const h = g.kiraTuntutan(g.bersihkanData(d), { kadar: KADAR, kumpulan: KUMPULAN });
  assert.strictEqual(h.A.makan_penuh.kadar, 75);
  assert.strictEqual(h.A.sarapan.kadar, 15); // 20% daripada 75
  assert.strictEqual(h.B.lojing.kadar, 100); // kosong → ikut admin
  assert.strictEqual(h.kadar.rujukan.ELAUN_MAKAN, 'Diisi manual oleh pemohon');
  assert.ok(h.amaran.some((a) => /diisi manual RM75\.00, berbeza/.test(a)));
  // Tiada kumpulan gred tetapi kadar manual diisi: tiada amaran "gred tidak sepadan"
  const d2 = salin(DATA); d2.pegawai.gred = 'S99';
  d2.kadar_manual = { ELAUN_MAKAN: '60', ELAUN_HARIAN: '30', LOJING: '100' };
  const h2 = g.kiraTuntutan(g.bersihkanData(d2), { kadar: KADAR, kumpulan: KUMPULAN.slice(0, 2) });
  assert.strictEqual(h2.A.jumlah, 150);
  assert.ok(!h2.amaran.some((a) => /tidak sepadan/.test(a)));
  assert.ok(h2.amaran.some((a) => /tiada kadar admin/.test(a)));
});
