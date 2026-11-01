/**
 * Import borang TNT lama (.xlsx) ke dalam format data sistem. Fungsi tulen; dijalankan di pelayar
 * (fail tidak dihantar ke server atau disimpan dalam Drive). Pengguna semak dalam editor sebelum simpan.
 *
 * Input: { 'Nama helaian': { A1: nilai, ... } }. Tarikh Excel boleh datang sebagai nombor siri.
 * Dua format disokong:
 *  - WP1.4 2026 (helaian "Muka 1".."Muka 7", sama dengan templat sistem)
 *  - Borang 2024 (helaian "MUKA SURAT 1".."MUKA SURAT 6", Lampiran C)
 * Pulangkan { format, data, nota: [] }. Nota menerangkan perkara yang diabaikan atau berbeza.
 */

var BULAN_MELAYU = { JANUARI: 1, FEBRUARI: 2, MAC: 3, APRIL: 4, MEI: 5, JUN: 6, JULAI: 7, OGOS: 8, SEPTEMBER: 9,
  OKTOBER: 10, NOVEMBER: 11, DISEMBER: 12 };

function selNilai(helaian, alamat) {
  var v = helaian ? helaian[alamat] : undefined;
  return v === undefined || v === null ? '' : v;
}

function selTeks(helaian, alamat) {
  return teks(selNilai(helaian, alamat)).replace(/\s+/g, ' ');
}

/** 'Nama (Huruf Besar)  : ALI' → 'ALI'; ': S9' → 'S9' */
function selepasTitikBertindih(s) {
  var t = teks(s);
  var i = t.indexOf(':');
  return teks(i >= 0 ? t.slice(i + 1) : t);
}

/** 'Jenis/ Model: Perodua Kelisa' → 'Perodua Kelisa' (label templat dibuang). */
function buangLabel(s, label) {
  var t = teks(s);
  var re = new RegExp('^\\s*' + label.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&') + '\\s*:?\\s*', 'i');
  return teks(t.replace(re, ''));
}

/** Nombor daripada 'RM 37.32', ': 2281', 37.32. Tiada nombor → 0. */
function amaunTeks(v) {
  if (typeof v === 'number') return v;
  var m = /-?\d[\d,]*(\.\d+)?/.exec(teks(v));
  return m ? parseFloat(m[0].replace(/,/g, '')) : 0;
}

function pad2(n) { return ('0' + n).slice(-2); }

/** Nombor siri Excel / ISO / 'd/m/yy' / 'd/m/yyyy' → 'YYYY-MM-DD', atau '' */
function tarikhImport(v) {
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    var d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
  }
  var s = teks(v);
  var iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
  var m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/.exec(s);
  if (m) {
    var y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    var mo = +m[2], da = +m[1];
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) return y + '-' + pad2(mo) + '-' + pad2(da);
  }
  return '';
}

/** '2.15 PM', '01.40 pm', '10.00 pm', '7:40', 0.5 (pecahan hari) → 'HH:MM', atau '' */
function masaImport(v) {
  if (typeof v === 'number' && v >= 0 && v < 1) {
    var min = Math.round(v * 1440);
    return pad2(Math.floor(min / 60) % 24) + ':' + pad2(min % 60);
  }
  var m = /^(\d{1,2})[.:](\d{2})\s*(am|pm|a\.m\.|p\.m\.|pagi|petang|malam)?$/i.exec(teks(v).replace(/\s+/g, ' '));
  if (!m) return '';
  var j = +m[1], n = +m[2], ap = (m[3] || '').toLowerCase().replace(/\./g, '');
  if (n > 59) return '';
  if (ap === 'pm' || ap === 'petang' || ap === 'malam') { if (j < 12) j += 12; }
  else if ((ap === 'am' || ap === 'pagi') && j === 12) j = 0;
  if (j > 23) return '';
  return pad2(j) + ':' + pad2(n);
}

/** Bulan yang paling kerap dalam tarikh perjalanan; jika tiada, guna label 'BAGI BULAN'. */
function tentukanBulan(perjalanan, labelBulanFail) {
  var kira = {};
  perjalanan.forEach(function (r) { if (r.tarikh) kira[r.tarikh.slice(0, 7)] = (kira[r.tarikh.slice(0, 7)] || 0) + 1; });
  var terbaik = '', maks = 0;
  Object.keys(kira).forEach(function (b) { if (kira[b] > maks) { maks = kira[b]; terbaik = b; } });
  var dariLabel = '';
  var m = /(JANUARI|FEBRUARI|MAC|APRIL|MEI|JUN|JULAI|OGOS|SEPTEMBER|OKTOBER|NOVEMBER|DISEMBER)\s+(\d{4})/i.exec(teks(labelBulanFail));
  if (m) dariLabel = m[2] + '-' + pad2(BULAN_MELAYU[m[1].toUpperCase()]);
  return { bulan: terbaik || dariLabel, dariLabel: dariLabel };
}

/** Baca baris kenyataan tuntutan sehingga baris 'JUMLAH'. */
function bacaPerjalanan(h, mula, nota, kenderaanLalai) {
  var hasil = [];
  for (var r = mula; r < mula + 200; r++) {
    var a = selNilai(h, 'A' + r);
    if (/^JUMLAH/i.test(teks(a))) break;
    var butiran = selTeks(h, 'D' + r), jarak = amaunTeks(selNilai(h, 'E' + r));
    if (!teks(a) && !butiran && !jarak) continue;
    var tarikh = tarikhImport(a);
    if (teks(a) && !tarikh) {
      // cth '1 Ogos hingga 30 Ogos 2026' bagi baris parkir: simpan dalam butiran
      butiran = teks(butiran + ' (' + teks(a) + ')');
    }
    var bertolak = masaImport(selNilai(h, 'B' + r)), tiba = masaImport(selNilai(h, 'C' + r));
    if (teks(selNilai(h, 'B' + r)) && !bertolak) nota.push('Masa bertolak "' + teks(selNilai(h, 'B' + r)) + '" (baris ' + r + ') tidak dapat dibaca.');
    if (teks(selNilai(h, 'C' + r)) && !tiba) nota.push('Masa tiba "' + teks(selNilai(h, 'C' + r)) + '" (baris ' + r + ') tidak dapat dibaca.');
    hasil.push({ tarikh: tarikh, bertolak: bertolak, tiba: tiba, butiran: butiran, jarak: jarak,
      kenderaan: jarak ? kenderaanLalai : 'TIADA' });
  }
  return hasil;
}

function kenderaanLalai(peg) {
  return !peg.kereta_no && peg.moto_no ? 'MOTOSIKAL' : 'KERETA';
}

function semakBulan(data, bulanInfo, nota) {
  if (bulanInfo.dariLabel && bulanInfo.bulan && bulanInfo.dariLabel !== bulanInfo.bulan) {
    nota.push('Label "Bagi bulan" dalam fail ialah ' + labelBulan(bulanInfo.dariLabel) + ', tetapi kebanyakan tarikh perjalanan dalam '
      + labelBulan(bulanInfo.bulan) + '. Bulan tuntutan ditetapkan ' + labelBulan(bulanInfo.bulan) + '.');
  }
  data.perjalanan.forEach(function (r) {
    if (r.tarikh && r.tarikh.slice(0, 7) !== data.bulan) nota.push('Tarikh ' + formatTarikh(r.tarikh) + ' bukan dalam bulan tuntutan. Mungkin silap taip; semak.');
  });
}

function jumlahKm(perjalanan) {
  return Math.round(perjalanan.reduce(function (s, r) { return s + r.jarak; }, 0) * 10) / 10;
}

// ---------------------------------------------------------------- Format WP1.4 2026 (Muka 1-7)

function importFormat2026(b) {
  var nota = [];
  var m1 = b['Muka 1'] || {}, m2 = b['Muka 2'] || {}, m3 = b['Muka 3'] || {}, m4 = b['Muka 4'] || {};
  var m5 = b['Muka 5'] || {}, m6 = b['Muka 6'] || {}, m7 = b['Muka 7'] || {};
  var peg = {
    nama: selTeks(m1, 'C9'), ic: selTeks(m1, 'C10'), jawatan: selTeks(m1, 'C11'), gred: selTeks(m1, 'C12'),
    no_akaun: selTeks(m1, 'C13'), bank: selTeks(m1, 'C14'), telefon: selTeks(m1, 'C15'),
    gaji: selNilai(m1, 'E16') === '' ? '' : String(amaunTeks(selNilai(m1, 'E16'))),
    elaun: selNilai(m1, 'E17') === '' ? '' : String(amaunTeks(selNilai(m1, 'E17'))),
    kereta_model: buangLabel(selTeks(m1, 'C20'), 'Jenis/ Model'), moto_model: buangLabel(selTeks(m1, 'F20'), 'Jenis/ Model'),
    kereta_no: buangLabel(selTeks(m1, 'C21'), 'No. Pendaftaran'), moto_no: buangLabel(selTeks(m1, 'F21'), 'No. Pendaftaran'),
    alamat_rumah: selTeks(m1, 'C23')
  };
  var perjalanan = bacaPerjalanan(m2, 6, nota, kenderaanLalai(peg));
  var bulanInfo = tentukanBulan(perjalanan, selTeks(m1, 'E6'));

  // A: kadar elaun ikut admin; hanya bilangan diimport. Bilangan tanpa kadar dalam fail = nilai lalai templat.
  var bil = function (kadarSel, bilSel) { return amaunTeks(selNilai(m3, kadarSel)) ? amaunTeks(selNilai(m3, bilSel)) : 0; };
  var makan = { sarapan: bil('C7', 'D7'), tengahari: bil('C8', 'D8'), malam: bil('C9', 'D9'),
    hari_makan: bil('B11', 'D11'), hari_harian: bil('B13', 'D13') };

  // B: BSP dikira jika lajur jumlah (G) ada nilai; jika G dikosongkan, baris dianggap tidak dituntut
  var bsp = [];
  [['20', '22'], ['23', '25']].forEach(function (x) {
    var kadar = amaunTeks(selNilai(m3, 'B' + x[0])), hari = amaunTeks(selNilai(m3, 'D' + x[0]));
    var g = selNilai(m3, 'G' + x[0]);
    if (!kadar) return;
    if (g === '' || amaunTeks(g) === 0) {
      nota.push('Bayaran sewa hotel RM' + kadar.toFixed(2) + ' (Muka 3 baris ' + x[0] + ') tidak diimport kerana jumlahnya kosong dalam fail. Tambah sendiri jika memang dituntut.');
      return;
    }
    var resit = /Resit\s*:?\s*([^\]…\.][^\]]*)\]/i.exec(selTeks(m3, 'A' + x[1]));
    bsp.push({ kadar: kadar, hari: hari || 1, resit: resit ? teks(resit[1]) : '' });
  });
  var lojingMalam = amaunTeks(selNilai(m4, 'B5')) ? amaunTeks(selNilai(m4, 'D5')) : 0;
  var senaraiLojing = [['A7', 'A8'], ['A9', 'A10']].map(function (x) {
    return { tarikh: buangLabel(selTeks(m4, x[0]), 'Tarikh Lojing'), alamat: buangLabel(selTeks(m4, x[1]), 'Alamat Lojing') };
  });

  // C: mileage dikira semula daripada perjalanan; bandingkan dengan fail
  var kmFail = amaunTeks(selNilai(m4, 'G18')) + amaunTeks(selNilai(m4, 'G19'));
  var km = jumlahKm(perjalanan.filter(function (r) { return r.kenderaan === 'KERETA'; }));
  if (kmFail && Math.abs(kmFail - km) > 0.05) {
    nota.push('Jarak kereta di Muka 4 dalam fail ialah ' + kmFail + ' km, tetapi jumlah perjalanan ialah ' + km + ' km. Sistem guna jumlah perjalanan.');
  }
  var kadarFail = amaunTeks(selNilai(m4, 'I18'));
  if (kadarFail) nota.push('Kadar mileage kereta dalam fail: RM' + kadarFail.toFixed(2) + '/km. Sistem guna kadar admin yang berkuat kuasa pada bulan tuntutan.');
  var awam = {};
  JENIS_AWAM.forEach(function (j, i) {
    var resit = /Resit\s*:?\s*([^\]…\.][^\]]*)\]/i.exec(selTeks(m5, 'A' + (4 + i)));
    awam[j.kod] = { rm: amaunTeks(selNilai(m5, 'L' + (4 + i))), resit: resit ? teks(resit[1]) : '' };
  });
  var rujukan = function (s) { var m = /:\s*([^\]…]+)\]/.exec(s); return m ? teks(m[1]) : ''; };

  // D: hanya tol dan parkir disokong; lain-lain dilaporkan
  [['Muka 5', m5, 28, 32], ['Muka 6', m6, 4, 7]].forEach(function (x) {
    for (var r = x[2]; r <= x[3]; r++) {
      var v = amaunTeks(selNilai(x[1], 'L' + r));
      if (v) nota.push('"' + selTeks(x[1], 'A' + r).split('[')[0].trim() + '" RM' + v.toFixed(2) + ' (' + x[0] + ') tidak disokong sistem dan tidak diimport.');
    }
  });
  if (amaunTeks(selNilai(m5, 'L21')) || amaunTeks(selNilai(m5, 'L26')) || amaunTeks(selNilai(m6, 'E16')) || amaunTeks(selNilai(m6, 'L16'))) {
    nota.push('Ada tuntutan pemandu atau elaun gantian tetap dalam fail. Bahagian ini tidak disokong sistem.');
  }

  // Kadar elaun dalam fail dibawa sebagai kadar manual (pemohon boleh kosongkan untuk guna kadar admin)
  var kadarManual = {
    ELAUN_MAKAN: makan.hari_makan || makan.sarapan || makan.tengahari || makan.malam ? amaunTeks(selNilai(m3, 'B11')) : 0,
    ELAUN_HARIAN: makan.hari_harian ? amaunTeks(selNilai(m3, 'B13')) : 0,
    LOJING: lojingMalam ? amaunTeks(selNilai(m4, 'B5')) : 0
  };
  if (kadarManual.ELAUN_MAKAN || kadarManual.ELAUN_HARIAN || kadarManual.LOJING) {
    nota.push('Kadar elaun daripada fail dibawa sebagai kadar manual. Kosongkan di bahagian A jika mahu guna kadar admin.');
  }

  var data = {
    kadar_manual: kadarManual,
    bulan: bulanInfo.bulan, pegawai: peg, perjalanan: perjalanan, makan: makan,
    lojing: { malam: lojingMalam, senarai: senaraiLojing }, bsp: bsp, awam: awam,
    tol: { rm: amaunTeks(selNilai(m6, 'L3')), rujukan: rujukan(selTeks(m6, 'A3')) },
    parkir: { rm: amaunTeks(selNilai(m5, 'L33')), rujukan: rujukan(selTeks(m5, 'A33')) },
    pengakuan: { tanpa_resit: amaunTeks(selNilai(m6, 'G28')), resit_bukan_nama: amaunTeks(selNilai(m6, 'I31')), tarikh: tarikhImport(selNilai(m6, 'B40')) },
    pendahuluan: amaunTeks(selNilai(m7, 'G23'))
  };
  semakBulan(data, bulanInfo, nota);
  return { format: 'WP1.4 (Muka 1-7)', data: data, nota: nota, jumlahFail: amaunTeks(selNilai(m6, 'L18')), alamatPejabat: selTeks(m1, 'C22') };
}

// ---------------------------------------------------------------- Format 2024 (MUKA SURAT 1-6)

function importFormat2024(b) {
  var nota = [];
  var s1 = b['MUKA SURAT 1'] || {}, s2 = b['MUKA SURAT 2'] || {}, s3 = b['MUKA SURAT 3'] || {};
  var s4 = b['MUKA SURAT 4'] || {}, s5 = b['MUKA SURAT 5'] || {};
  var gaji = selepasTitikBertindih(selTeks(s1, 'D11')), elaun = selepasTitikBertindih(selTeks(s1, 'D12'));
  var peg = {
    nama: selepasTitikBertindih(selTeks(s1, 'A4')), ic: selepasTitikBertindih(selTeks(s1, 'A5')),
    jawatan: selepasTitikBertindih(selTeks(s1, 'B6')), gred: selepasTitikBertindih(selTeks(s1, 'B7')),
    no_akaun: selepasTitikBertindih(selTeks(s1, 'B8')), bank: selepasTitikBertindih(selTeks(s1, 'B9')),
    telefon: selepasTitikBertindih(selTeks(s1, 'A10')),
    gaji: gaji ? String(amaunTeks(gaji)) : '', elaun: elaun ? String(amaunTeks(elaun)) : '',
    kereta_model: buangLabel(selTeks(s1, 'C15'), 'Jenis/ Model'), moto_model: buangLabel(selTeks(s1, 'E15'), 'Jenis/ Model'),
    kereta_no: buangLabel(selTeks(s1, 'C16'), 'No. Pendaftaran'), moto_no: buangLabel(selTeks(s1, 'E16'), 'No. Pendaftaran'),
    alamat_rumah: selTeks(s1, 'C18')
  };
  var perjalanan = bacaPerjalanan(s2, 4, nota, kenderaanLalai(peg));
  var bulanInfo = tentukanBulan(perjalanan, selTeks(s1, 'A2'));

  var kadarFail = selTeks(s3, 'G4');
  if (amaunTeks(kadarFail)) nota.push('Kadar mileage kereta dalam fail: RM' + amaunTeks(kadarFail).toFixed(2) + '/km. Sistem guna kadar admin yang berkuat kuasa pada bulan tuntutan.');
  var kmFail = amaunTeks(selNilai(s3, 'D4')) + amaunTeks(selNilai(s3, 'D5'));
  var km = jumlahKm(perjalanan.filter(function (r) { return r.kenderaan === 'KERETA'; }));
  if (kmFail && Math.abs(kmFail - km) > 0.05) nota.push('Jarak kereta dalam fail ' + kmFail + ' km, jumlah perjalanan ' + km + ' km. Sistem guna jumlah perjalanan.');

  // Bahagian makan, hotel dan lojing format 2024 berbentuk teks bebas; hanya dilaporkan jika ada amaun
  ['E19', 'E20', 'E21', 'E22', 'N19', 'N20', 'N21', 'N22'].forEach(function (a) {
    if (amaunTeks(selNilai(s3, a))) nota.push('Ada amaun elaun makan dalam fail (MUKA SURAT 3 ' + a + '). Isi semula di bahagian A.');
  });
  ['B3', 'B4', 'B6', 'F3', 'F4', 'F6'].forEach(function (a) {
    if (amaunTeks(selNilai(s4, a))) nota.push('Ada amaun hotel/lojing dalam fail (MUKA SURAT 4 ' + a + '). Isi semula di bahagian B.');
  });
  var awamBaris = { 10: 'teksi', 11: 'bas', 12: 'keretapi', 13: 'feri', 14: 'lain' };
  var awam = {};
  JENIS_AWAM.forEach(function (j) { awam[j.kod] = { rm: 0, resit: '' }; });
  Object.keys(awamBaris).forEach(function (r) {
    var v = amaunTeks(selNilai(s3, 'L' + r)) || amaunTeks(selTeks(s3, 'K' + r).replace(/^RM\s*$/, ''));
    if (v) awam[awamBaris[r]].rm = v;
  });
  var parkir = amaunTeks(selTeks(s5, 'B8')), tol = amaunTeks(selTeks(s5, 'B9'));
  [3, 4, 5, 6, 7, 10, 11].forEach(function (r) {
    var v = amaunTeks(selTeks(s5, 'B' + r));
    if (v) nota.push('"' + selTeks(s5, 'A' + r).split('[')[0].trim() + '" RM' + v.toFixed(2) + ' tidak disokong sistem dan tidak diimport.');
  });

  var data = {
    bulan: bulanInfo.bulan, pegawai: peg, perjalanan: perjalanan,
    makan: { sarapan: 0, tengahari: 0, malam: 0, hari_makan: 0, hari_harian: 0 },
    lojing: { malam: 0, senarai: [] }, bsp: [], awam: awam,
    tol: { rm: tol, rujukan: '' }, parkir: { rm: parkir, rujukan: '' },
    pengakuan: { tanpa_resit: 0, resit_bukan_nama: 0, tarikh: '' }, pendahuluan: 0
  };
  semakBulan(data, bulanInfo, nota);
  return { format: 'Borang 2024 (Lampiran C)', data: data, nota: nota, jumlahFail: amaunTeks(selTeks(s5, 'B13')), alamatPejabat: selTeks(s1, 'C17') };
}

function importBorang(buku) {
  if (buku['Muka 1'] && buku['Muka 2']) return importFormat2026(buku);
  if (buku['MUKA SURAT 1'] && buku['MUKA SURAT 2']) return importFormat2024(buku);
  throw new Error('Format fail tidak dikenali. Hanya borang TNT WP1.4 (helaian "Muka 1"…) atau borang 2024 ("MUKA SURAT 1"…) disokong.');
}
