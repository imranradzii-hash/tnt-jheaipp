// Data contoh untuk ujian dan pratonton cetakan.
const KADAR = [
  { kod: 'AMBANG_KM', kumpulan: '', nilai: '500', kuat_kuasa: '2000-01-01', rujukan: 'Templat' },
  { kod: 'KERETA_1', kumpulan: '', nilai: '0.90', kuat_kuasa: '2000-01-01', rujukan: 'Templat' },
  { kod: 'KERETA_2', kumpulan: '', nilai: '0.80', kuat_kuasa: '2000-01-01', rujukan: 'Templat' },
  { kod: 'MOTO_1', kumpulan: '', nilai: '0.60', kuat_kuasa: '2000-01-01', rujukan: 'Templat' },
  { kod: 'MOTO_2', kumpulan: '', nilai: '0.50', kuat_kuasa: '2000-01-01', rujukan: 'Templat' },
  { kod: 'ELAUN_MAKAN', kumpulan: 'KUMP B', nilai: '60', kuat_kuasa: '2000-01-01', rujukan: 'Contoh' },
  { kod: 'ELAUN_HARIAN', kumpulan: 'KUMP B', nilai: '30', kuat_kuasa: '2000-01-01', rujukan: 'Contoh' },
  { kod: 'LOJING', kumpulan: 'KUMP B', nilai: '100', kuat_kuasa: '2000-01-01', rujukan: 'Contoh' }
];
const KUMPULAN = [
  { nama: 'KUMP A', gred_min: '1', gred_maks: '18' },
  { nama: 'KUMP B', gred_min: '19', gred_maks: '40' },
  { nama: 'KUMP C', gred_min: '41', gred_maks: '' }
];
const DATA = {
  bulan: '2026-01',
  pegawai: {
    nama: 'Ahmad bin Ali', ic: '850101075123', jawatan: 'Penolong Pegawai Hal Ehwal Islam', gred: 'S29',
    no_akaun: '157012345678', bank: 'Maybank', telefon: '012-3456789', gaji: '3500', elaun: '600',
    kereta_model: 'Perodua Myvi', kereta_no: 'PKA 1234', moto_model: '', moto_no: '',
    alamat_rumah: 'No 1, Jalan Contoh, 14000 Bukit Mertajam'
  },
  perjalanan: [
    { tarikh: '2026-01-05', bertolak: '08:00', tiba: '10:00', butiran: 'Pejabat ke Masjid Negeri, Ayer Itam. Mesyuarat pemantauan.', jarak: 180, kenderaan: 'KERETA' },
    { tarikh: '2026-01-05', bertolak: '15:00', tiba: '17:00', butiran: 'Masjid Negeri ke pejabat.', jarak: 180, kenderaan: 'KERETA' },
    { tarikh: '2026-01-12', bertolak: '07:30', tiba: '12:00', butiran: 'Pejabat ke Kepala Batas. Lawatan pusat kursus. Tol RM4.20.', jarak: 120, kenderaan: 'KERETA' },
    { tarikh: '2026-01-12', bertolak: '16:00', tiba: '18:30', butiran: 'Kepala Batas ke pejabat.', jarak: 120, kenderaan: 'KERETA' }
  ],
  makan: { sarapan: 1, tengahari: 2, malam: 0, hari_makan: 1, hari_harian: 1 },
  lojing: { malam: 1, senarai: [{ tarikh: '12/01/2026', alamat: 'Rumah saudara, Kepala Batas' }] },
  bsp: [{ kadar: 150, hari: 1, resit: 'Hotel ABC No. 4471' }],
  awam: { teksi: { rm: 25, resit: 'Grab 12/01' } },
  tol: { rm: 8.4, rujukan: 'Penyata TNG Jan 2026' },
  parkir: { rm: 6, rujukan: 'Resit parkir MBPP' },
  pengakuan: { tanpa_resit: 0, resit_bukan_nama: 0, tarikh: '2026-02-02' },
  pendahuluan: 0
};
module.exports = { KADAR, KUMPULAN, DATA };
