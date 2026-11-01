/**
 * Sistem Tuntutan Perjalanan (TNT) WP1.4 - JHEAIPP
 * FAIL DIJANA (npm run bina) daripada folder apps-script/. Jangan sunting terus;
 * ubah fail sumber dan jana semula.
 */

// ==================== Config.js ====================
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
  // Kadar mileage (EPK) Pulau Pinang. Tarikh kuat kuasa di sini = 1hb BULAN TUNTUTAN pertama yang terpakai.
  // Surat JKN 24/04/2026: kadar baharu berkuat kuasa 1 Mei 2026 bagi tuntutan bulan April 2026 → 2026-04-01.
  // Kadar sebelum 2026 diambil daripada borang TNT Sept 2025 (kereta sahaja; motosikal tiada data).
  Kadar: [
    ['k1', 'AMBANG_KM', '', '500', TARIKH_ASAS, 'PP WP1.4', 'setup', ''],
    ['k2', 'KERETA_1', '', '0.85', TARIKH_ASAS, 'Borang TNT Sept 2025 (sebelum PP WP1.4 2026)', 'setup', ''],
    ['k3', 'KERETA_2', '', '0.75', TARIKH_ASAS, 'Borang TNT Sept 2025 (sebelum PP WP1.4 2026)', 'setup', ''],
    ['k4', 'KERETA_1', '', '0.90', '2026-01-01', 'JKNPP.100.4/1/4(22) 28/01/2026: PP WP1.4 2026, EPK mulai 1 Jan 2026', 'setup', ''],
    ['k5', 'KERETA_2', '', '0.80', '2026-01-01', 'JKNPP.100.4/1/4(22) 28/01/2026: PP WP1.4 2026, EPK mulai 1 Jan 2026', 'setup', ''],
    ['k6', 'MOTO_1', '', '0.60', '2026-01-01', 'JKNPP.100.4/1/4(22) 28/01/2026: PP WP1.4 2026, EPK mulai 1 Jan 2026', 'setup', ''],
    ['k7', 'MOTO_2', '', '0.50', '2026-01-01', 'JKNPP.100.4/1/4(22) 28/01/2026: PP WP1.4 2026, EPK mulai 1 Jan 2026', 'setup', ''],
    ['k8', 'KERETA_1', '', '1.00', '2026-04-01', 'JKNPP.100.4/1/4 (26) 24/04/2026: kuat kuasa 1 Mei 2026 bagi tuntutan bulan April 2026', 'setup', ''],
    ['k9', 'KERETA_2', '', '0.90', '2026-04-01', 'JKNPP.100.4/1/4 (26) 24/04/2026: kuat kuasa 1 Mei 2026 bagi tuntutan bulan April 2026', 'setup', ''],
    ['k10', 'MOTO_1', '', '0.65', '2026-04-01', 'JKNPP.100.4/1/4 (26) 24/04/2026: kuat kuasa 1 Mei 2026 bagi tuntutan bulan April 2026', 'setup', ''],
    ['k11', 'MOTO_2', '', '0.55', '2026-04-01', 'JKNPP.100.4/1/4 (26) 24/04/2026: kuat kuasa 1 Mei 2026 bagi tuntutan bulan April 2026', 'setup', '']
  ],
  Tetapan: [
    ['DOMAIN_EMEL', 'penang.gov.my', 'Hanya emel domain ini boleh mendaftar (pisahkan dengan koma jika lebih dari satu)'],
    ['ALAMAT_PEJABAT', 'JABATAN HAL EHWAL AGAMA ISLAM PULAU PINANG, 10300 LEBUH PANTAI, PULAU PINANG', 'Alamat pejabat yang dicetak di Muka 1 (huruf besar)'],
    ['TEMPLAT_ID', '', 'ID Google Sheet templat borang (diisi oleh sediakanTemplat)'],
    ['FOLDER_SEMENTARA_ID', '', 'Folder Drive untuk salinan sementara semasa cetak (kosong = My Drive)'],
    ['TEMPOH_SIMPAN_BULAN', '24', 'Tempoh simpan tuntutan (bulan) sebelum boleh dipadam admin']
  ]
};

// ==================== Util.js ====================
/**
 * Fungsi utiliti tulen (tiada panggilan Apps Script) supaya boleh diuji di Node.
 */

function teks(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

/** Nombor daripada input pengguna; kosong/tidak sah → 0. */
function nombor(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  var n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : 0;
}

function bundar2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Neutralkan nilai yang boleh dibaca sebagai formula oleh Sheets/Excel. */
function sanitizeForSheet(value) {
  var str = teks(value);
  if (/^[=+\-@]/.test(str)) return "'" + str;
  return str;
}

/** Papar 4 aksara terakhir sahaja, cth ********5973 */
function samarkan(v) {
  var s = teks(v).replace(/\s/g, '');
  if (!s) return '';
  if (s.length <= 4) return '****';
  return new Array(s.length - 3).join('*') + s.slice(-4);
}

function hanyaDigit(v) {
  return teks(v).replace(/\D/g, '');
}

function sahTarikh(t) {
  return /^\d{4}-\d{2}-\d{2}$/.test(teks(t));
}

function sahBulan(b) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(teks(b));
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY' */
function formatTarikh(t) {
  var s = teks(t);
  if (!sahTarikh(s)) return s;
  return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
}

var NAMA_BULAN = ['JANUARI', 'FEBRUARI', 'MAC', 'APRIL', 'MEI', 'JUN', 'JULAI', 'OGOS',
  'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DISEMBER'];

/** '2026-01' → 'JANUARI 2026' */
function labelBulan(bulan) {
  var b = teks(bulan);
  if (!sahBulan(b)) return b;
  return NAMA_BULAN[parseInt(b.slice(5, 7), 10) - 1] + ' ' + b.slice(0, 4);
}

/** '2026-02' → '2026-02-28' */
function hariAkhirBulan(bulan) {
  var y = +bulan.slice(0, 4), m = +bulan.slice(5, 7);
  var d = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return bulan + '-' + ('0' + d).slice(-2);
}

/** 1234.5 → 'RM1,234.50' */
function ringgit(n) {
  var v = bundar2(nombor(n));
  var bah = v.toFixed(2).split('.');
  return 'RM' + bah[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + bah[1];
}

/** 'N19', 'DG44', 'S 48', 'UD52 (KUP)' → 19, 44, 48, 52. Ambil nombor pertama. */
function nomborGred(gred) {
  var m = /(\d+)/.exec(teks(gred));
  return m ? parseInt(m[1], 10) : NaN;
}

function emelSah(emel) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(teks(emel));
}

/** domain: 'penang.gov.my' atau 'penang.gov.my, jheaipp.gov.my'. Subdomain tidak diterima. */
function emelDalamDomain(emel, domain) {
  var e = teks(emel).toLowerCase();
  if (!emelSah(e)) return false;
  var d = e.split('@')[1];
  return teks(domain).toLowerCase().split(',').map(teks).filter(Boolean).indexOf(d) >= 0;
}

function masaSah(m) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(teks(m));
}

// ==================== Kiraan.js ====================
/**
 * Kiraan tuntutan (fungsi tulen, diuji di Node).
 *
 * Kadar dipilih ikut tarikh kuat kuasa: bagi setiap kod, ambil baris dengan kuat_kuasa paling
 * lewat yang <= 1hb bulan tuntutan. Jadi bila pekeliling baharu keluar, admin tambah baris baharu
 * (bukan ubah baris lama) dan tuntutan bulan sebelumnya kekal dikira dengan kadar lama.
 */

var MAKS_PERJALANAN = 80;
var MAKS_TEKS = 300;

function tarikhRujukanKadar(bulan) {
  return bulan + '-01';
}

/** Kumpulan gred yang sepadan dengan nombor gred pegawai, atau null. */
function cariKumpulan(senaraiKumpulan, gred) {
  var n = nomborGred(gred);
  if (isNaN(n)) return null;
  for (var i = 0; i < senaraiKumpulan.length; i++) {
    var k = senaraiKumpulan[i];
    var min = nombor(k.gred_min), maks = teks(k.gred_maks) === '' ? Infinity : nombor(k.gred_maks);
    if (n >= min && n <= maks) return k;
  }
  return null;
}

/** Baris kadar berkuat kuasa pada tarikh, atau null. kumpulan '' untuk kadar umum. */
function kadarPada(senaraiKadar, kod, kumpulan, tarikh) {
  var calon = null;
  for (var i = 0; i < senaraiKadar.length; i++) {
    var r = senaraiKadar[i];
    if (r.kod !== kod || teks(r.kumpulan) !== teks(kumpulan)) continue;
    if (!sahTarikh(r.kuat_kuasa) || r.kuat_kuasa > tarikh) continue;
    if (teks(r.nilai) === '') continue;
    if (!calon || r.kuat_kuasa > calon.kuat_kuasa || (r.kuat_kuasa === calon.kuat_kuasa && teks(r.pada) >= teks(calon.pada))) calon = r;
  }
  return calon;
}

/** Semua kadar yang terpakai bagi bulan dan gred ini. */
function kadarUntuk(konteks, bulan, gred) {
  var tarikh = tarikhRujukanKadar(bulan);
  var kumpulan = cariKumpulan(konteks.kumpulan || [], gred);
  var hasil = { tarikh: tarikh, kumpulan: kumpulan ? kumpulan.nama : '', nilai: {}, rujukan: {}, tiada: [] };
  Object.keys(KOD_KADAR).forEach(function (kod) {
    var def = KOD_KADAR[kod];
    var r = def.per_kumpulan ? (kumpulan ? kadarPada(konteks.kadar, kod, kumpulan.nama, tarikh) : null)
      : kadarPada(konteks.kadar, kod, '', tarikh);
    if (r) {
      hasil.nilai[kod] = nombor(r.nilai);
      hasil.rujukan[kod] = teks(r.rujukan);
    } else {
      hasil.nilai[kod] = 0;
      hasil.tiada.push(kod);
    }
  });
  return hasil;
}

// ---------------------------------------------------------------- Pembersihan input

function potong(v, maks) {
  return teks(v).slice(0, maks || MAKS_TEKS);
}

function amaun(v) {
  return Math.max(0, bundar2(nombor(v)));
}

function bilangan(v) {
  return Math.max(0, Math.floor(nombor(v)));
}

/** Bersihkan data tuntutan daripada klien: buang medan asing, hadkan panjang dan nilai negatif. */
function bersihkanData(d) {
  d = d || {};
  var p = d.pegawai || {};
  var peg = {};
  HEADER.Profil.forEach(function (k) {
    if (k !== 'emel' && k !== 'dikemaskini_pada') peg[k] = potong(p[k]);
  });
  peg.nama = peg.nama.toUpperCase();
  var perjalanan = (Array.isArray(d.perjalanan) ? d.perjalanan : []).slice(0, MAKS_PERJALANAN).map(function (r) {
    r = r || {};
    var k = teks(r.kenderaan).toUpperCase();
    return {
      tarikh: sahTarikh(r.tarikh) ? r.tarikh : '',
      bertolak: masaSah(r.bertolak) ? r.bertolak : '',
      tiba: masaSah(r.tiba) ? r.tiba : '',
      butiran: potong(r.butiran, 600),
      jarak: Math.max(0, Math.round(nombor(r.jarak) * 10) / 10),
      kenderaan: ['KERETA', 'MOTOSIKAL', 'TIADA'].indexOf(k) >= 0 ? k : 'KERETA'
    };
  }).filter(function (r) { return r.tarikh || r.butiran || r.jarak; });
  var m = d.makan || {};
  var l = d.lojing || {};
  var awam = {};
  JENIS_AWAM.forEach(function (j) {
    var a = (d.awam || {})[j.kod] || {};
    awam[j.kod] = { rm: amaun(a.rm), resit: potong(a.resit, 120) };
  });
  return {
    bulan: sahBulan(d.bulan) ? d.bulan : '',
    pegawai: peg,
    perjalanan: perjalanan,
    makan: {
      sarapan: bilangan(m.sarapan), tengahari: bilangan(m.tengahari), malam: bilangan(m.malam),
      hari_makan: bilangan(m.hari_makan), hari_harian: bilangan(m.hari_harian)
    },
    lojing: {
      malam: bilangan(l.malam),
      senarai: (Array.isArray(l.senarai) ? l.senarai : []).slice(0, 2).map(function (x) {
        x = x || {};
        return { tarikh: potong(x.tarikh, 80), alamat: potong(x.alamat, 200) };
      })
    },
    bsp: (Array.isArray(d.bsp) ? d.bsp : []).slice(0, 2).map(function (x) {
      x = x || {};
      return { kadar: amaun(x.kadar), hari: bilangan(x.hari), resit: potong(x.resit, 120) };
    }),
    awam: awam,
    tol: { rm: amaun((d.tol || {}).rm), rujukan: potong((d.tol || {}).rujukan, 120) },
    parkir: { rm: amaun((d.parkir || {}).rm), rujukan: potong((d.parkir || {}).rujukan, 120) },
    pengakuan: {
      tanpa_resit: amaun((d.pengakuan || {}).tanpa_resit),
      resit_bukan_nama: amaun((d.pengakuan || {}).resit_bukan_nama),
      tarikh: sahTarikh((d.pengakuan || {}).tarikh) ? d.pengakuan.tarikh : ''
    },
    pendahuluan: amaun(d.pendahuluan)
  };
}

// ---------------------------------------------------------------- Kiraan

function pecahPeringkat(km, ambang) {
  var t1 = Math.min(km, ambang);
  return [t1, Math.max(0, km - ambang)];
}

/**
 * data: hasil bersihkanData. konteks: { kadar: [...], kumpulan: [...] }.
 * Pulangkan semua angka yang dicetak serta amaran untuk pengguna.
 */
function kiraTuntutan(data, konteks) {
  var k = kadarUntuk(konteks, data.bulan, data.pegawai.gred);
  var v = k.nilai;
  var amaran = [];

  // C: mileage
  var kmKereta = 0, kmMoto = 0, jumlahKm = 0;
  data.perjalanan.forEach(function (r) {
    jumlahKm += r.jarak;
    if (r.kenderaan === 'KERETA') kmKereta += r.jarak;
    else if (r.kenderaan === 'MOTOSIKAL') kmMoto += r.jarak;
    if (r.tarikh && r.tarikh.slice(0, 7) !== data.bulan) amaran.push('Perjalanan ' + formatTarikh(r.tarikh) + ' bukan dalam bulan tuntutan.');
  });
  kmKereta = Math.round(kmKereta * 10) / 10;
  kmMoto = Math.round(kmMoto * 10) / 10;
  var ambang = v.AMBANG_KM || 500;
  var pk = pecahPeringkat(kmKereta, ambang), pm = pecahPeringkat(kmMoto, ambang);
  var mileage = {
    kereta_1: { km: pk[0], kadar: v.KERETA_1, rm: bundar2(pk[0] * v.KERETA_1) },
    kereta_2: { km: pk[1], kadar: v.KERETA_2, rm: bundar2(pk[1] * v.KERETA_2) },
    moto_1: { km: pm[0], kadar: v.MOTO_1, rm: bundar2(pm[0] * v.MOTO_1) },
    moto_2: { km: pm[1], kadar: v.MOTO_2, rm: bundar2(pm[1] * v.MOTO_2) }
  };
  mileage.jumlah = bundar2(mileage.kereta_1.rm + mileage.kereta_2.rm + mileage.moto_1.rm + mileage.moto_2.rm);
  var awamJumlah = 0;
  JENIS_AWAM.forEach(function (j) { awamJumlah += data.awam[j.kod].rm; });
  awamJumlah = bundar2(awamJumlah);
  var C = { mileage: mileage, awam: awamJumlah, jumlah: bundar2(mileage.jumlah + awamJumlah) };

  // A: makan minum
  var em = v.ELAUN_MAKAN, eh = v.ELAUN_HARIAN, m = data.makan;
  function bahagian(nama, bil) {
    var kadar = bundar2(em * PERATUS_MAKAN[nama]);
    return { kadar: kadar, bil: bil, rm: bundar2(kadar * bil) };
  }
  var A = {
    sarapan: bahagian('sarapan', m.sarapan),
    tengahari: bahagian('tengahari', m.tengahari),
    malam: bahagian('malam', m.malam),
    makan_penuh: { kadar: em, hari: m.hari_makan, rm: bundar2(em * m.hari_makan) },
    harian: { kadar: eh, hari: m.hari_harian, rm: bundar2(eh * m.hari_harian) }
  };
  A.jumlah_bahagian = bundar2(A.sarapan.rm + A.tengahari.rm + A.malam.rm);
  A.jumlah = bundar2(A.jumlah_bahagian + A.makan_penuh.rm + A.harian.rm);
  var gunaMakan = m.sarapan + m.tengahari + m.malam + m.hari_makan > 0;
  if (gunaMakan && !em) amaran.push('Kadar elaun makan belum ditetapkan admin untuk gred ' + (data.pegawai.gred || '(kosong)') + '.');
  if (m.hari_harian > 0 && !eh) amaran.push('Kadar elaun harian belum ditetapkan admin untuk gred ' + (data.pegawai.gred || '(kosong)') + '.');

  // B: penginapan
  var bsp = data.bsp.map(function (x) { return { kadar: x.kadar, hari: x.hari, resit: x.resit, rm: bundar2(x.kadar * x.hari) }; });
  var bspJumlah = bundar2(bsp.reduce(function (s, x) { return s + x.rm; }, 0));
  var lj = { kadar: v.LOJING, malam: data.lojing.malam, rm: bundar2(v.LOJING * data.lojing.malam) };
  if (lj.malam > 0 && !lj.kadar) amaran.push('Kadar elaun lojing belum ditetapkan admin untuk gred ' + (data.pegawai.gred || '(kosong)') + '.');
  var B = { bsp: bsp, bsp_jumlah: bspJumlah, lojing: lj, jumlah: bundar2(bspJumlah + lj.rm) };

  // D: lain-lain (tol dan parkir dalam Belanja Pelbagai)
  var pelbagai = bundar2(data.tol.rm + data.parkir.rm);
  var D = { tol: data.tol.rm, parkir: data.parkir.rm, pelbagai: pelbagai, jumlah: pelbagai };

  if ((kmKereta > 0 && (!v.KERETA_1 || (pk[1] > 0 && !v.KERETA_2))) || (kmMoto > 0 && (!v.MOTO_1 || (pm[1] > 0 && !v.MOTO_2)))) {
    amaran.push('Kadar mileage belum ditetapkan admin.');
  }
  if (!k.kumpulan && (gunaMakan || m.hari_harian > 0 || lj.malam > 0)) {
    amaran.push('Gred "' + (data.pegawai.gred || '') + '" tidak sepadan dengan mana-mana kumpulan gred. Maklumkan admin.');
  }
  if (kmKereta > 0 && !data.pegawai.kereta_no) amaran.push('No. pendaftaran kereta belum diisi dalam profil.');
  if (kmMoto > 0 && !data.pegawai.moto_no) amaran.push('No. pendaftaran motosikal belum diisi dalam profil.');

  var jumlah = bundar2(A.jumlah + B.jumlah + C.jumlah + D.jumlah);
  return {
    kadar: k, amaran: amaran,
    km: { kereta: kmKereta, moto: kmMoto, jumlah: Math.round(jumlahKm * 10) / 10 },
    A: A, B: B, C: C, D: D,
    jumlah: jumlah,
    pendapatan: bundar2(nombor(data.pegawai.gaji) + nombor(data.pegawai.elaun)),
    pendahuluan: data.pendahuluan ? { diberi: data.pendahuluan, baki: bundar2(data.pendahuluan - jumlah) } : null
  };
}

// ==================== PetaBorang.js ====================
/**
 * Peta sel templat "BORANG TUNTUTAN ELAUN PERJALANAN DALAM NEGERI WP1.4" (Lampiran D, 7 helaian).
 * Fungsi tulen: pulangkan senarai [helaian, sel, nilai] untuk ditulis ke salinan templat.
 *
 * Nilai jumlah ditulis sebagai nombor (menggantikan formula templat) kerana formula asal
 * ada dua kesilapan: Jumlah Belanja Pelbagai (Muka 6 L8) tidak mengambil kira Tol dan
 * Jumlah B (Muka 4 J12) tidak mengambil kira Bayaran Sewa Penginapan.
 */

var BARIS_PERJALANAN_MULA = 6;   // Muka 2: baris data pertama
var BARIS_PERJALANAN_TEMPLAT = 2; // templat asal ada 2 baris data (6 dan 7)
var TINGGI_RUANG_PERJALANAN = 430; // jumlah tinggi (pt) baris 6-7 templat
var AKSARA_SEBARIS = 48;             // anggaran aksara sebaris dalam lajur Butiran (D)
var TINGGI_SEBARIS = 14;             // pt bagi setiap baris teks

/**
 * Tinggi setiap baris perjalanan (pt), ikut panjang butiran supaya teks tidak terpotong.
 * null = kekal tinggi templat (2 baris atau kurang dan butiran muat).
 */
function tinggiBarisPerjalanan(perjalanan) {
  var perlu = perjalanan.map(function (r) {
    var baris = teks(r.butiran).split(/\n/).reduce(function (s, x) { return s + Math.max(1, Math.ceil(x.length / AKSARA_SEBARIS)); }, 0);
    return Math.max(28, baris * TINGGI_SEBARIS + 8);
  });
  if (perjalanan.length <= BARIS_PERJALANAN_TEMPLAT) {
    var templat = TINGGI_RUANG_PERJALANAN / BARIS_PERJALANAN_TEMPLAT;
    if (perlu.every(function (t) { return t <= templat; })) return null;
    return perlu.map(function (t) { return Math.max(t, templat); });
  }
  // Isi ruang templat jika masih ada baki, supaya Muka 2 tidak nampak kosong di bawah
  var jumlah = perlu.reduce(function (s, t) { return s + t; }, 0);
  var tambah = jumlah < TINGGI_RUANG_PERJALANAN ? (TINGGI_RUANG_PERJALANAN - jumlah) / perlu.length : 0;
  return perlu.map(function (t) { return Math.floor(t + tambah); });
}

/** Baris terakhir dan lajur terakhir yang dicetak bagi setiap helaian (selepas sisipan baris Muka 2). */
function julatCetak(tambahBaris) {
  return {
    'Muka 1': { baris: 27, lajur: 8 },
    'Muka 2': { baris: 10 + tambahBaris, lajur: 6 },
    'Muka 3': { baris: 26, lajur: 14 },
    'Muka 4': { baris: 27, lajur: 13 },
    'Muka 5': { baris: 33, lajur: 13 },
    'Muka 6': { baris: 42, lajur: 13 },
    'Muka 7': { baris: 30, lajur: 8 }
  };
}

function kosongJikaSifar(n) {
  return n ? n : '';
}

function rmTeks(n) {
  return 'RM ' + bundar2(n).toFixed(2);
}

/**
 * data: bersihkanData(...). hasil: kiraTuntutan(...). tetapan: { ALAMAT_PEJABAT }.
 * Pulangkan { sel: [[helaian, alamat, nilai]], tambahBaris: n, julat: {...} }
 */
function petaBorang(data, hasil, tetapan) {
  var sel = [];
  function tulis(h, a, v) { sel.push([h, a, v === undefined || v === null ? '' : v]); }
  var p = data.pegawai;

  // ---- Muka 1: maklumat pegawai
  var M1 = 'Muka 1';
  tulis(M1, 'E6', labelBulan(data.bulan));
  tulis(M1, 'C9', p.nama);
  tulis(M1, 'C10', p.ic);
  tulis(M1, 'C11', p.jawatan);
  tulis(M1, 'C12', p.gred);
  tulis(M1, 'C13', p.no_akaun);
  tulis(M1, 'C14', p.bank);
  tulis(M1, 'C15', p.telefon);
  tulis(M1, 'E16', p.gaji === '' ? '' : bundar2(nombor(p.gaji)));
  tulis(M1, 'E17', p.elaun === '' ? '' : bundar2(nombor(p.elaun)));
  tulis(M1, 'E18', hasil.pendapatan);
  tulis(M1, 'C20', 'Jenis/ Model: ' + p.kereta_model);
  tulis(M1, 'F20', 'Jenis/ Model: ' + p.moto_model);
  tulis(M1, 'C21', 'No. Pendaftaran: ' + p.kereta_no);
  tulis(M1, 'F21', 'No. Pendaftaran: ' + p.moto_no);
  // Sentiasa tulis supaya alamat pejabat dalam templat asal (PDT SPT) tidak tercetak
  tulis(M1, 'C22', teks(tetapan.ALAMAT_PEJABAT).toUpperCase());
  tulis(M1, 'C23', p.alamat_rumah.toUpperCase());

  // ---- Muka 2: kenyataan tuntutan
  var M2 = 'Muka 2';
  var n = data.perjalanan.length;
  var tambah = Math.max(0, n - BARIS_PERJALANAN_TEMPLAT);
  data.perjalanan.forEach(function (r, i) {
    var b = BARIS_PERJALANAN_MULA + i;
    tulis(M2, 'A' + b, formatTarikh(r.tarikh));
    tulis(M2, 'B' + b, r.bertolak);
    tulis(M2, 'C' + b, r.tiba);
    tulis(M2, 'D' + b, r.butiran);
    tulis(M2, 'E' + b, kosongJikaSifar(r.jarak));
  });
  tulis(M2, 'E' + (BARIS_PERJALANAN_MULA + BARIS_PERJALANAN_TEMPLAT + tambah), hasil.km.jumlah);

  // ---- Muka 3: A (Semenanjung) dan BSP
  var M3 = 'Muka 3', A = hasil.A;
  [['7', A.sarapan], ['8', A.tengahari], ['9', A.malam]].forEach(function (x) {
    tulis(M3, 'C' + x[0], x[1].bil ? x[1].kadar : '');
    tulis(M3, 'D' + x[0], kosongJikaSifar(x[1].bil));
    tulis(M3, 'G' + x[0], x[1].rm);
  });
  tulis(M3, 'G10', A.jumlah_bahagian);
  tulis(M3, 'B11', A.makan_penuh.hari ? A.makan_penuh.kadar : '');
  tulis(M3, 'D11', kosongJikaSifar(A.makan_penuh.hari));
  tulis(M3, 'G11', A.makan_penuh.rm);
  tulis(M3, 'B13', A.harian.hari ? A.harian.kadar : '');
  tulis(M3, 'D13', kosongJikaSifar(A.harian.hari));
  tulis(M3, 'G13', A.harian.rm);
  tulis(M3, 'D14', A.jumlah);
  tulis(M3, 'L15', A.jumlah);
  var B = hasil.B;
  [['20', '22'], ['23', '25']].forEach(function (b, i) {
    var x = B.bsp[i] || { kadar: 0, hari: 0, resit: '', rm: 0 };
    tulis(M3, 'B' + b[0], kosongJikaSifar(x.kadar));
    tulis(M3, 'D' + b[0], kosongJikaSifar(x.hari));
    tulis(M3, 'G' + b[0], x.rm);
    if (x.resit) tulis(M3, 'A' + b[1], '[Resit: ' + x.resit + ']');
  });
  tulis(M3, 'G26', B.bsp_jumlah);

  // ---- Muka 4: lojing dan mileage
  var M4 = 'Muka 4';
  tulis(M4, 'B5', B.lojing.malam ? B.lojing.kadar : '');
  tulis(M4, 'D5', kosongJikaSifar(B.lojing.malam));
  tulis(M4, 'G5', B.lojing.rm);
  tulis(M4, 'K5', '');
  [['7', '8'], ['9', '10']].forEach(function (b, i) {
    var x = data.lojing.senarai[i];
    if (!x || !(x.tarikh || x.alamat)) return;
    tulis(M4, 'A' + b[0], 'Tarikh Lojing: ' + x.tarikh);
    tulis(M4, 'A' + b[1], 'Alamat Lojing: ' + x.alamat);
  });
  tulis(M4, 'E11', B.lojing.rm);
  tulis(M4, 'J12', B.jumlah);
  var ml = hasil.C.mileage;
  [['18', ml.kereta_1], ['19', ml.kereta_2], ['20', ml.moto_1], ['21', ml.moto_2]].forEach(function (x) {
    tulis(M4, 'G' + x[0], kosongJikaSifar(x[1].km));
    tulis(M4, 'I' + x[0], x[1].kadar);
    tulis(M4, 'L' + x[0], x[1].rm);
  });
  tulis(M4, 'L27', ml.jumlah);

  // ---- Muka 5: tambang awam, parkir
  var M5 = 'Muka 5';
  JENIS_AWAM.forEach(function (j, i) {
    var a = data.awam[j.kod], b = 4 + i;
    tulis(M5, 'L' + b, kosongJikaSifar(a.rm));
    if (a.resit) tulis(M5, 'A' + b, j.label + ' [Resit: ' + a.resit + ']');
  });
  tulis(M5, 'L10', hasil.C.awam);
  tulis(M5, 'L11', hasil.C.jumlah);
  tulis(M5, 'L33', kosongJikaSifar(data.parkir.rm));
  if (data.parkir.rujukan) tulis(M5, 'A33', 'Tempat Letak Kereta [Resit/Penyata Touch&Go/Lain-lain: ' + data.parkir.rujukan + ']');

  // ---- Muka 6: tol, jumlah, pengakuan
  var M6 = 'Muka 6';
  tulis(M6, 'L3', kosongJikaSifar(data.tol.rm));
  if (data.tol.rujukan) tulis(M6, 'A3', 'Tol [Resit/Penyata Touch&Go/RFID/Lain-lain: ' + data.tol.rujukan + ']');
  tulis(M6, 'L8', hasil.D.pelbagai);
  tulis(M6, 'L17', hasil.D.jumlah);
  tulis(M6, 'L18', hasil.jumlah);
  tulis(M6, 'G28', data.pengakuan.tanpa_resit ? bundar2(data.pengakuan.tanpa_resit).toFixed(2) : '');
  tulis(M6, 'I31', data.pengakuan.resit_bukan_nama ? bundar2(data.pengakuan.resit_bukan_nama).toFixed(2) : '');
  tulis(M6, 'B40', formatTarikh(data.pengakuan.tarikh));

  // ---- Muka 7: pendahuluan diri
  if (hasil.pendahuluan) {
    tulis('Muka 7', 'G23', rmTeks(hasil.pendahuluan.diberi));
    tulis('Muka 7', 'G24', rmTeks(hasil.jumlah));
    tulis('Muka 7', 'G25', rmTeks(Math.abs(hasil.pendahuluan.baki)));
  }

  return { sel: sel, tambahBaris: tambah, bilPerjalanan: n, tinggiBaris: tinggiBarisPerjalanan(data.perjalanan), julat: julatCetak(tambah) };
}

// ==================== Data.js ====================
/**
 * Akses Google Sheet. Semua nilai dibaca sebagai teks (getDisplayValues)
 * dan semua lajur diformat teks biasa semasa setup, supaya IC dan no. akaun
 * tidak hilang sifar di depan.
 */

var _jadualCache = {};

function bukaSS() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function tabSheet(nama) {
  var sh = bukaSS().getSheetByName(nama);
  if (!sh) throw new Error('Tab "' + nama + '" tiada. Jalankan setupSistem() dahulu.');
  return sh;
}

/** Senarai objek bagi satu tab. Setiap objek ada _baris (nombor baris Sheet). */
function bacaJadual(nama) {
  if (_jadualCache[nama]) return _jadualCache[nama];
  var nilai = tabSheet(nama).getDataRange().getDisplayValues();
  var h = HEADER[nama];
  var hasil = [];
  for (var r = 1; r < nilai.length; r++) {
    var baris = nilai[r];
    if (baris.join('') === '') continue;
    var o = { _baris: r + 1 };
    for (var c = 0; c < h.length; c++) o[h[c]] = teks(baris[c]);
    hasil.push(o);
  }
  _jadualCache[nama] = hasil;
  return hasil;
}

function cariRekod(nama, medan, nilai) {
  var senarai = bacaJadual(nama);
  for (var i = 0; i < senarai.length; i++) if (senarai[i][medan] === teks(nilai)) return senarai[i];
  return null;
}

function keBaris(nama, obj) {
  return HEADER[nama].map(function (k) { return sanitizeForSheet(obj[k]); });
}

/** Julat satu baris yang diformat teks, supaya nilai seperti 0208... tidak ditukar jadi nombor. */
function julatBarisTeks(sh, baris, lebar) {
  if (baris > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 200);
  if (lebar > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), lebar - sh.getMaxColumns());
  return sh.getRange(baris, 1, 1, lebar).setNumberFormat('@');
}

function tambahRekod(nama, obj) {
  var sh = tabSheet(nama);
  julatBarisTeks(sh, sh.getLastRow() + 1, HEADER[nama].length).setValues([keBaris(nama, obj)]);
  delete _jadualCache[nama];
}

function kemaskiniRekod(nama, medan, nilai, perubahan) {
  var lama = cariRekod(nama, medan, nilai);
  if (!lama) throw new Error('Rekod tidak dijumpai.');
  var baru = {};
  HEADER[nama].forEach(function (k) { baru[k] = perubahan.hasOwnProperty(k) ? perubahan[k] : lama[k]; });
  julatBarisTeks(tabSheet(nama), lama._baris, HEADER[nama].length).setValues([keBaris(nama, baru)]);
  delete _jadualCache[nama];
  return baru;
}

/** Padam semua baris yang memenuhi syarat (dari bawah ke atas supaya nombor baris kekal sah). */
function padamRekodJika(nama, syarat) {
  var sh = tabSheet(nama);
  var sasaran = bacaJadual(nama).filter(syarat).map(function (o) { return o._baris; });
  sasaran.sort(function (a, b) { return b - a; }).forEach(function (r) { sh.deleteRow(r); });
  delete _jadualCache[nama];
  return sasaran.length;
}

function idBaru() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}

function sekarang() {
  return Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm:ss');
}

function bacaTetapan() {
  var t = {};
  bacaJadual(TAB.TETAPAN).forEach(function (r) { t[r.kunci] = r.nilai; });
  return t;
}

/** Konteks kiraan: semua kadar dan kumpulan gred (data bukan peribadi). */
function bacaKonteks() {
  return {
    kadar: bacaJadual(TAB.KADAR).map(function (r) {
      return { id: r.id, kod: r.kod, kumpulan: r.kumpulan, nilai: r.nilai, kuat_kuasa: r.kuat_kuasa, rujukan: r.rujukan, oleh: r.oleh, pada: r.pada };
    }),
    kumpulan: bacaJadual(TAB.KUMPULAN).map(function (r) {
      return { id: r.id, nama: r.nama, gred_min: r.gred_min, gred_maks: r.gred_maks, catatan: r.catatan };
    })
  };
}

function logAudit(emel, tindakan, tab, rekodId, butiran) {
  tabSheet(TAB.LOG).appendRow([sekarang(), sanitizeForSheet(emel), tindakan, tab, sanitizeForSheet(rekodId),
    sanitizeForSheet(typeof butiran === 'string' ? butiran : JSON.stringify(butiran || '')).slice(0, 2000)]);
}

function denganKunci(fn) {
  var kunci = LockService.getScriptLock();
  kunci.waitLock(20000);
  try {
    _jadualCache = {};
    return fn();
  } finally {
    kunci.releaseLock();
  }
}

// ==================== Auth.js ====================
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

// ==================== Api.js ====================
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

// ==================== Admin.js ====================
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

// ==================== Cetak.js ====================
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

// ==================== Setup.js ====================
/**
 * Dijalankan oleh admin dari editor Apps Script (bukan dari web app):
 *  1. setupSistem()     — cipta semua tab, header, kadar lalai, tetapkan admin awal (emel anda).
 *  2. sediakanTemplat() — tukar fail xlsx borang asal di Drive kepada Google Sheet templat.
 * Kedua-duanya selamat dijalankan semula (naik taraf tanpa memadam data).
 */

// ID fail "TNT JAN 2026 -KOSONG.xlsx" dalam folder Drive TNT 2026. Tukar jika guna fail lain.
var TEMPLAT_XLSX_ID = '1WDCa-hCDifDJtEqguyJdKMdzBm-cbiWm';

function setupSistem() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Jalankan dari skrip yang terikat pada Google Sheet sistem (Extensions > Apps Script).');
  var props = PropertiesService.getScriptProperties();
  props.setProperty('SHEET_ID', ss.getId());
  var emel = Session.getEffectiveUser().getEmail().toLowerCase();
  if (!props.getProperty('ADMIN_AWAL')) props.setProperty('ADMIN_AWAL', emel);

  Object.keys(HEADER).forEach(function (nama) {
    var sh = ss.getSheetByName(nama) || ss.insertSheet(nama);
    var h = HEADER[nama];
    if (sh.getMaxColumns() < h.length) sh.insertColumnsAfter(sh.getMaxColumns(), h.length - sh.getMaxColumns());
    // Teks biasa untuk semua lajur: IC dan no. akaun kekal dengan sifar di depan
    sh.getRange(1, 1, sh.getMaxRows(), h.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold').setBackground('#d9ead3');
    sh.setFrozenRows(1);
    if (LALAI[nama] && sh.getLastRow() < 2) {
      sh.getRange(2, 1, LALAI[nama].length, h.length).setValues(LALAI[nama].map(function (r) {
        return h.map(function (_, i) { return i < r.length ? String(r[i]) : ''; });
      }));
    }
  });

  var lalai = ss.getSheetByName('Sheet1') || ss.getSheetByName('Helaian1');
  if (lalai && lalai.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(lalai);

  _jadualCache = {};
  // Naik taraf: tambah kunci Tetapan baharu tanpa mengubah nilai sedia ada
  var adaKunci = {};
  bacaJadual(TAB.TETAPAN).forEach(function (r) { adaKunci[r.kunci] = true; });
  LALAI.Tetapan.forEach(function (r) {
    if (!adaKunci[r[0]]) tambahRekod(TAB.TETAPAN, { kunci: r[0], nilai: String(r[1]), keterangan: r[2] });
  });

  logAudit(emel, 'SETUP', '', '', 'setupSistem');
  Logger.log('Setup selesai. Admin awal: ' + emel + '. Daftar akaun di web app menggunakan emel ini untuk menjadi admin.');
}

/**
 * Tukar xlsx asal kepada Google Sheet (perlukan perkhidmatan lanjutan Drive API v3).
 * Simbol kotak Wingdings (U+F063) di Muka 5 ditukar kepada ☐ kerana fon Wingdings tiada dalam Google Sheets.
 */
function sediakanTemplat(xlsxId) {
  var id = xlsxId || TEMPLAT_XLSX_ID;
  var baru = Drive.Files.copy({ name: 'TEMPLAT BORANG TNT WP1.4 (JANGAN UBAH)', mimeType: MimeType.GOOGLE_SHEETS }, id);
  var ss = SpreadsheetApp.openById(baru.id);
  ss.getSheets().forEach(function (sh) {
    var julat = sh.getDataRange();
    var nilai = julat.getValues(), formula = julat.getFormulas();
    for (var r = 0; r < nilai.length; r++) {
      for (var c = 0; c < nilai[r].length; c++) {
        if (!formula[r][c] && typeof nilai[r][c] === 'string' && nilai[r][c].indexOf('') >= 0) {
          sh.getRange(r + 1, c + 1).setValue(nilai[r][c].replace(//g, '☐'));
        }
      }
    }
  });
  var wajib = ['Muka 1', 'Muka 2', 'Muka 3', 'Muka 4', 'Muka 5', 'Muka 6', 'Muka 7'];
  wajib.forEach(function (n) { if (!ss.getSheetByName(n)) throw new Error('Templat tiada helaian ' + n); });
  _jadualCache = {};
  if (cariRekod(TAB.TETAPAN, 'kunci', 'TEMPLAT_ID')) kemaskiniRekod(TAB.TETAPAN, 'kunci', 'TEMPLAT_ID', { nilai: baru.id });
  else tambahRekod(TAB.TETAPAN, { kunci: 'TEMPLAT_ID', nilai: baru.id, keterangan: 'ID Google Sheet templat borang' });
  logAudit(Session.getEffectiveUser().getEmail(), 'SEDIAKAN_TEMPLAT', TAB.TETAPAN, baru.id, 'daripada ' + id);
  Logger.log('Templat siap: https://docs.google.com/spreadsheets/d/' + baru.id + '/edit');
}

/** Ujian cetak dari editor: jana PDF tuntutan contoh dan simpan dalam My Drive anda. */
function ujiCetak() {
  var d = bersihkanData({
    bulan: Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM'),
    pegawai: { nama: 'CONTOH PEGAWAI', gred: '29', kereta_model: 'CONTOH', kereta_no: 'PAA 1' },
    perjalanan: [{ tarikh: '', bertolak: '08:00', tiba: '10:00', butiran: 'Ujian cetak', jarak: 50, kenderaan: 'KERETA' }]
  });
  var pdf = janaPdf(d, kiraTuntutan(d, bacaKonteks()), bacaTetapan());
  var f = DriveApp.createFile(pdf.setName('UJIAN CETAK TNT.pdf'));
  Logger.log('PDF ujian: ' + f.getUrl());
}
