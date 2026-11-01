const test = require('node:test');
const assert = require('node:assert');
const { muat, IMPORT } = require('./muat');
const g = muat(IMPORT);

// Tarikh Excel (nombor siri) untuk 2026-08-07 = 46241
const siri = (iso) => Math.round((Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 86400000);

test('format WP1.4 2026: perjalanan, bulan ikut tarikh, parkir, nota BSP dan jarak berbeza', () => {
  const buku = {
    'Muka 1': { E6: 'JANUARI 2026', C9: 'ALI BIN ABU', C10: '900101071234', C12: 'S9', C20: 'Jenis/ Model: Myvi', C21: 'No. Pendaftaran: PAA 1', E16: 2500 },
    'Muka 2': {
      A6: siri('2026-08-07'), B6: '2.15 PM', C6: '3.00 PM', D6: 'Pejabat ke Kompleks X', E6: 34,
      A7: siri('2026-08-09'), B7: '5.00 pm', C7: '6.30 pm', D7: 'Kompleks X ke rumah', E7: 37,
      A8: '1 Ogos hingga 30 Ogos 2026', D8: 'Bayaran Tempat Letak Kereta',
      A9: 'JUMLAH', E9: 71
    },
    'Muka 3': { B20: 280.46, D20: 1 },
    'Muka 4': { G18: 588, I18: 1 },
    'Muka 5': { L33: 90 },
    'Muka 6': { L18: 161 }
  };
  const r = g.importBorang(buku);
  assert.strictEqual(r.data.bulan, '2026-08');
  assert.strictEqual(r.data.perjalanan.length, 3);
  assert.strictEqual(r.data.perjalanan[0].bertolak, '14:15');
  assert.strictEqual(r.data.perjalanan[1].tiba, '18:30');
  assert.strictEqual(r.data.perjalanan[2].kenderaan, 'TIADA');
  assert.match(r.data.perjalanan[2].butiran, /Tempat Letak Kereta \(1 Ogos/);
  assert.strictEqual(r.data.pegawai.kereta_model, 'Myvi');
  assert.strictEqual(r.data.pegawai.kereta_no, 'PAA 1');
  assert.strictEqual(r.data.parkir.rm, 90);
  assert.strictEqual(r.data.bsp.length, 0);
  const nota = r.nota.join('\n');
  assert.match(nota, /RM280\.46.*tidak diimport/);
  assert.match(nota, /588 km/);
  assert.match(nota, /JANUARI 2026.*OGOS 2026/);
  // Dengan kadar RM1.00 jumlah sama dengan fail: 71 + 90
  const K = [['AMBANG_KM', 500], ['KERETA_1', 1], ['KERETA_2', 0.9]].map(([kod, n]) => ({ kod, kumpulan: '', nilai: String(n), kuat_kuasa: '2000-01-01' }));
  assert.strictEqual(g.kiraTuntutan(g.bersihkanData(r.data), { kadar: K, kumpulan: [] }).jumlah, r.jumlahFail);
});

test('format 2024: profil daripada teks berlabel, tarikh teks d/m/yy, tol dan parkir', () => {
  const buku = {
    'MUKA SURAT 1': {
      A2: 'BORANG TUNTUTAN ELAUN PERJALANAN DALAM NEGERI WP1.4\nBAGI BULAN SEPTEMBER 2025',
      A4: 'Nama (Huruf Besar)  : ALI BIN ABU', A5: 'No. Kad Pengenalan : 900101-07-1234', B6: ': PEGAWAI', B7: ': S9',
      B8: ': 0123', B9: ': BANK X', A10: 'No. Telefon (Pejabat/Bimbit) : 0123456789', D11: ': 2281', D12: ':  900 ',
      C15: 'Jenis/ Model: Kelisa', C16: 'No. Pendaftaran: ABC 1', C17: 'JABATAN X', C18: 'NO 1, JALAN Y'
    },
    'MUKA SURAT 2': {
      A4: siri('2025-09-04'), B4: '5.30 pm', C4: '06.30 pm', D4: 'Rumah ke masjid', E4: 38,
      A5: '25/9/25', B5: '    10.00 pm', C5: '10.40 pm', D5: 'Pulang', E5: 37,
      A6: siri('2025-06-06'), B6: '12.30 pm', C6: '1.10 pm', D6: 'Silap taip', E6: 5,
      A7: 'JUMLAH', E7: 80
    },
    'MUKA SURAT 3': { D4: 80, G4: 'RM   0.85sen/km' },
    'MUKA SURAT 5': { B8: 'RM 10.60', B9: 'RM 37.32', B13: 'RM 115.92' }
  };
  const r = g.importBorang(buku);
  const p = r.data.pegawai;
  assert.strictEqual(r.data.bulan, '2025-09');
  assert.strictEqual(p.nama, 'ALI BIN ABU');
  assert.strictEqual(p.ic, '900101-07-1234');
  assert.strictEqual(p.gred, 'S9');
  assert.strictEqual(p.telefon, '0123456789');
  assert.strictEqual(p.gaji, '2281');
  assert.strictEqual(p.elaun, '900');
  assert.strictEqual(p.kereta_no, 'ABC 1');
  assert.strictEqual(r.data.perjalanan[1].tarikh, '2025-09-25');
  assert.strictEqual(r.data.perjalanan[1].bertolak, '22:00');
  assert.strictEqual(r.data.tol.rm, 37.32);
  assert.strictEqual(r.data.parkir.rm, 10.6);
  assert.match(r.nota.join('\n'), /06\/06\/2025 bukan dalam bulan/);
  const K = [['AMBANG_KM', 500], ['KERETA_1', 0.85], ['KERETA_2', 0.75]].map(([kod, n]) => ({ kod, kumpulan: '', nilai: String(n), kuat_kuasa: '2000-01-01' }));
  assert.strictEqual(g.kiraTuntutan(g.bersihkanData(r.data), { kadar: K, kumpulan: [] }).jumlah, r.jumlahFail);
});

test('masa dan tarikh pelbagai bentuk', () => {
  assert.strictEqual(g.masaImport('12.10 pm'), '12:10');
  assert.strictEqual(g.masaImport('12.30 am'), '00:30');
  assert.strictEqual(g.masaImport('7:40'), '07:40');
  assert.strictEqual(g.masaImport(0.75), '18:00');
  assert.strictEqual(g.masaImport('esok'), '');
  assert.strictEqual(g.tarikhImport('26/9/25'), '2025-09-26');
  assert.strictEqual(g.tarikhImport('2026-08-07T00:00:00'), '2026-08-07');
  assert.strictEqual(g.tarikhImport('31/13/2025'), '');
  assert.throws(() => g.importBorang({ Sheet1: {} }), /tidak dikenali/);
});
