/**
 * Konfigurasi: nama tab, header lajur, kod kadar dan nilai lalai.
 * Kadar sebenar disimpan dalam tab Kadar (diubah oleh admin melalui web app),
 * setiap baris ada tarikh kuat kuasa supaya tuntutan bulan lama kekal guna kadar lama.
 */

var NAMA_SISTEM = 'Sistem Tuntutan Perjalanan (TNT) JHEAIPP';
var SESI_TTL_SAAT = 6 * 60 * 60; // had maksimum CacheService

var ROLE = { PENGGUNA: 'pengguna', ADMIN: 'admin' };

var TAB = {
  PENGGUNA: 'Pengguna',
  PROFIL: 'Profil',
  TUNTUTAN: 'Tuntutan',
  KADAR: 'Kadar',
  KUMPULAN: 'KumpulanGred',
  TETAPAN: 'Tetapan',
  LOG: 'LogAudit'
};

var HEADER = {
  Pengguna: ['emel', 'nama', 'salt', 'hash', 'role', 'aktif', 'dicipta_pada', 'log_masuk_terakhir'],
  Profil: ['emel', 'nama', 'ic', 'jawatan', 'gred', 'no_akaun', 'bank', 'telefon', 'gaji', 'elaun',
    'kereta_model', 'kereta_no', 'moto_model', 'moto_no', 'alamat_rumah', 'dikemaskini_pada'],
  Tuntutan: ['id', 'emel', 'bulan', 'data', 'jumlah', 'dicipta_pada', 'dikemaskini_pada', 'dicetak_pada'],
  Kadar: ['id', 'kod', 'kumpulan', 'nilai', 'kuat_kuasa', 'rujukan', 'oleh', 'pada'],
  KumpulanGred: ['id', 'nama', 'gred_min', 'gred_maks', 'catatan'],
  Tetapan: ['kunci', 'nilai', 'keterangan'],
  LogAudit: ['masa', 'emel', 'tindakan', 'tab', 'rekod', 'butiran']
};

/**
 * Kod kadar. per_kumpulan: nilai berbeza ikut kumpulan gred (diisi admin).
 * Kadar kenderaan sama untuk semua pegawai.
 */
var KOD_KADAR = {
  AMBANG_KM: { label: 'Had peringkat pertama mileage (km)', unit: 'km', per_kumpulan: false },
  KERETA_1: { label: 'Kereta: kadar peringkat pertama', unit: 'RM/km', per_kumpulan: false },
  KERETA_2: { label: 'Kereta: kadar peringkat seterusnya', unit: 'RM/km', per_kumpulan: false },
  MOTO_1: { label: 'Motosikal: kadar peringkat pertama', unit: 'RM/km', per_kumpulan: false },
  MOTO_2: { label: 'Motosikal: kadar peringkat seterusnya', unit: 'RM/km', per_kumpulan: false },
  ELAUN_MAKAN: { label: 'Elaun makan sehari (Semenanjung)', unit: 'RM', per_kumpulan: true },
  ELAUN_HARIAN: { label: 'Elaun harian sehari (Semenanjung)', unit: 'RM', per_kumpulan: true },
  LOJING: { label: 'Elaun lojing semalam (Semenanjung)', unit: 'RM', per_kumpulan: true }
};

// Peratus bahagian makan (WP1.4): sarapan 20%, tengah hari 40%, malam 40%
var PERATUS_MAKAN = { sarapan: 0.2, tengahari: 0.4, malam: 0.4 };

// Jenis tambang pengangkutan awam ikut susunan baris Muka 5 (baris 4 hingga 9)
var JENIS_AWAM = [
  { kod: 'teksi', label: 'Teksi/Kereta Sewa/e-Panggilan' },
  { kod: 'bas', label: 'Bas' },
  { kod: 'keretapi', label: 'Kereta Api' },
  { kod: 'feri', label: 'Motobot/Feri' },
  { kod: 'kapalterbang', label: 'Kapal Terbang' },
  { kod: 'lain', label: 'Lain-lain' }
];

var TARIKH_ASAS = '2000-01-01';

var LALAI = {
  // Kadar kenderaan diambil daripada templat "TNT JAN 2026 -KOSONG.xlsx". Admin wajib sahkan dengan pekeliling semasa.
  Kadar: [
    ['k1', 'AMBANG_KM', '', '500', TARIKH_ASAS, 'Templat TNT JAN 2026', 'setup', ''],
    ['k2', 'KERETA_1', '', '0.90', TARIKH_ASAS, 'Templat TNT JAN 2026', 'setup', ''],
    ['k3', 'KERETA_2', '', '0.80', TARIKH_ASAS, 'Templat TNT JAN 2026', 'setup', ''],
    ['k4', 'MOTO_1', '', '0.60', TARIKH_ASAS, 'Templat TNT JAN 2026', 'setup', ''],
    ['k5', 'MOTO_2', '', '0.50', TARIKH_ASAS, 'Templat TNT JAN 2026', 'setup', '']
  ],
  Tetapan: [
    ['DOMAIN_EMEL', 'penang.gov.my', 'Hanya emel domain ini boleh mendaftar (pisahkan dengan koma jika lebih dari satu)'],
    ['ALAMAT_PEJABAT', 'JABATAN HAL EHWAL AGAMA ISLAM PULAU PINANG, 10300 LEBUH PANTAI, PULAU PINANG', 'Alamat pejabat yang dicetak di Muka 1 (huruf besar)'],
    ['TEMPLAT_ID', '', 'ID Google Sheet templat borang (diisi oleh sediakanTemplat)'],
    ['FOLDER_SEMENTARA_ID', '', 'Folder Drive untuk salinan sementara semasa cetak (kosong = My Drive)'],
    ['TEMPOH_SIMPAN_BULAN', '24', 'Tempoh simpan tuntutan (bulan) sebelum boleh dipadam admin']
  ]
};
