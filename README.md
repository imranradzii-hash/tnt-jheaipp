# Borang Tuntutan Perjalanan (TNT) WP1.4 — JHEAIPP

Web app (Google Apps Script + Google Sheets) untuk warga JHEAIPP mengisi **Borang Tuntutan Elaun Perjalanan
Dalam Negeri WP1.4 (Lampiran D)** secara online, simpan dalam database, dan cetak PDF **sebiji borang asal**
(7 muka, satu muka satu halaman A4).

## Cara ia berfungsi

| Bahagian | Ringkasan |
|---|---|
| Daftar | Hanya emel `@penang.gov.my` (boleh ubah di Admin > Tetapan). Kod 6 digit dihantar ke emel untuk sahkan pemilikan. |
| Log masuk | Emel + kata laluan (SHA-256 berulang, salt unik setiap pengguna). Sesi 6 jam. Lupa kata laluan melalui kod emel. |
| Profil | Isi sekali: nama, IC, jawatan, gred, bank, gaji, kenderaan, alamat. Disalin ke setiap tuntutan baharu. |
| Tuntutan | Satu tuntutan sebulan. Isi perjalanan (Muka 2), makan/harian, hotel/lojing, tambang awam, tol, parkir. Jumlah dikira terus di skrin. Boleh salin perjalanan rutin daripada bulan lain. |
| Cetak | Sistem salin Google Sheet templat (ditukar daripada xlsx asal), tulis nilai ke sel, export PDF, kemudian buang salinan. |
| Admin | Kadar ikut **tarikh kuat kuasa**, kumpulan gred, alamat pejabat, domain emel, pengguna (aktif/admin), semua tuntutan, log audit. |

### Pekeliling baharu (contoh: mileage kereta naik ke RM1.00)

Admin > Kadar > **Pekeliling baharu: tambah kadar** → pilih *Kereta: kadar peringkat pertama*, nilai `1.00`,
tarikh kuat kuasa `01/01/2027`, rujukan pekeliling. Kadar lama **tidak dipadam**: tuntutan bulan sebelum
tarikh itu (walaupun dicetak semula kemudian) kekal guna kadar lama. Kadar dipilih ikut **1hb bulan tuntutan**.

Kadar yang boleh diubah: had km peringkat pertama (500), kadar kereta/motosikal dua peringkat, elaun makan,
elaun harian dan elaun lojing ikut kumpulan gred.

### Bahagian borang yang diisi

Ikut keputusan skop: bahagian biasa diisi penuh (maklumat pegawai, kenyataan tuntutan, elaun makan/harian dan
lojing Semenanjung, BSP hotel, mileage kereta/motosikal, tambang awam, tol, parkir, pengakuan, pendahuluan).
Bahagian Sabah/Sarawak, motobot/basikal, pemandu dan elaun gantian tetap **tetap dicetak** tetapi kosong
(boleh diisi tangan).

### Pembetulan formula templat asal

Templat `TNT JAN 2026 -KOSONG.xlsx` ada dua formula yang tertinggal item. Sistem kira sendiri dan tulis nilai:

1. **Jumlah Belanja Pelbagai** (Muka 6 L8) hanya jumlahkan Muka 5. **Tol tidak dikira.**
2. **Jumlah B - Kemudahan Penginapan** (Muka 4 J12) hanya ambil elaun lojing. **Bayaran sewa hotel (BSP) tidak dikira.**

Alamat pejabat dalam templat (PDT Seberang Perai Tengah) diganti dengan `ALAMAT_PEJABAT` dalam Tetapan.

## Pasang (sekali sahaja)

1. Cipta Google Sheet baharu dalam Drive akaun admin (cth `SISTEM TNT JHEAIPP`). **Jangan kongsi** Sheet ini
   dan jangan guna *Publish to web*.
2. Sheet → **Extensions → Apps Script**. Tampal:
   - `dist/Kod.gs` ke `Code.gs`
   - Fail HTML baharu bernama `Index`, tampal `dist/Index.html`
   - **Project Settings → Show "appsscript.json"**, tampal `dist/appsscript.json`
3. **Services (+) → Drive API** (v3), jika belum aktif selepas tampal manifest.
4. Pilih fungsi `setupSistem` → **Run** → beri kebenaran. Emel anda jadi admin awal.
5. Pilih `sediakanTemplat` → **Run**. Ini tukar `TNT JAN 2026 -KOSONG.xlsx` (folder Drive *TNT 2026*) kepada
   Google Sheet templat dan simpan ID dalam Tetapan. Jika guna fail lain, ubah `TEMPLAT_XLSX_ID` dalam `Setup.js`.
6. Pilih `ujiCetak` → **Run** → buka PDF ujian dalam My Drive dan semak susun atur.
7. **Deploy → New deployment → Web app**: *Execute as: Me*, *Who has access: Anyone with Google account*
   (atau *Anyone within penang.gov.my* untuk lapisan keselamatan tambahan jika semua staf ada akaun Workspace).
8. Buka URL web app → **Daftar akaun** dengan emel admin anda.
9. Admin > **Tetapan**: isi `ALAMAT_PEJABAT`. Admin > **Kumpulan gred** dan **Kadar**: isi elaun makan, harian
   dan lojing ikut pekeliling semasa. Sahkan juga kadar mileage (diambil daripada templat: 0.90/0.80 kereta,
   0.60/0.50 motosikal).

### Naik taraf

Tampal semula `dist/Kod.gs` dan `dist/Index.html`, run `setupSistem` (tambah tab/tetapan baharu tanpa ubah data),
kemudian **Deploy → Manage deployments → ✏️ → New version**.

## Pembangunan

```bash
npm test            # bina dist/ + ujian kiraan, aliran auth/tuntutan/admin/cetak (mock Apps Script)
npm run pratonton   # isi templat xlsx asal dengan data contoh → pratonton.xlsx (buka/render dengan LibreOffice)
node tests/pratonton-ui.js   # UI di http://localhost:8787 dengan backend mock
```

`docs/contoh-cetakan-pratonton.pdf` ialah contoh cetakan dengan data rekaan (render LibreOffice; output sebenar
datang daripada export Google Sheets).

Struktur `apps-script/`: `Config` (tab, kod kadar), `Util`, `Kiraan` (kiraan + kadar ikut tarikh, tulen),
`PetaBorang` (peta sel templat, tulen), `Data`, `Auth`, `Api`, `Admin`, `Cetak`, `Setup`, `Index.html`.

## Keselamatan & PDPA

- Tiada *Publish to web*; semua baca/tulis melalui Apps Script dengan token sesi disemak setiap panggilan.
- Peranan disemak di server: pengguna hanya nampak tuntutan sendiri; admin sahaja ubah kadar/tetapan/pengguna.
- Kata laluan di-hash dengan salt per pengguna; had cubaan log masuk 8 kali/5 minit; kod emel 5 cubaan.
- Input disanitasi (`= + - @`) sebelum ditulis ke Sheet; paparan guna `textContent` (tiada `innerHTML` data).
- Salinan templat semasa cetak dibuang serta-merta.
- Notis privasi dipapar di halaman log masuk dan setiap skrin. Tetapan `TEMPOH_SIMPAN_BULAN` (24) ialah rujukan polisi; pemadaman automatik belum dibina, jadi tuntutan lama dipadam secara manual.
