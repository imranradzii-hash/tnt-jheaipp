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
    pendahuluan: amaun(d.pendahuluan),
    kadar_manual: KOD_KADAR_MANUAL.reduce(function (o, kod) { o[kod] = amaun((d.kadar_manual || {})[kod]); return o; }, {})
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

  // Kadar diisi manual oleh pemohon mengatasi kadar admin
  k.manual = [];
  var manual = data.kadar_manual || {};
  KOD_KADAR_MANUAL.forEach(function (kod) {
    if (manual[kod] > 0) {
      if (v[kod] && v[kod] !== manual[kod]) {
        amaran.push(KOD_KADAR[kod].label + ' diisi manual RM' + manual[kod].toFixed(2) + ', berbeza dengan kadar admin RM' + v[kod].toFixed(2) + '.');
      } else if (!v[kod]) {
        amaran.push(KOD_KADAR[kod].label + ' diisi manual RM' + manual[kod].toFixed(2) + ' (tiada kadar admin). Pastikan ikut pekeliling.');
      }
      v[kod] = manual[kod];
      k.rujukan[kod] = 'Diisi manual oleh pemohon';
      k.manual.push(kod);
    }
  });

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
  if (!k.kumpulan && ((gunaMakan && !em) || (m.hari_harian > 0 && !eh) || (lj.malam > 0 && !lj.kadar))) {
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
