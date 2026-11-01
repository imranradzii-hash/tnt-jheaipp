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
