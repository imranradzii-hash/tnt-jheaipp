// Gabungkan apps-script/*.js menjadi dist/Kod.gs, dan suntik kod kiraan ke dalam dist/Index.html
// (kiraan langsung di skrin guna fungsi yang sama dengan server). Guna: npm run bina
const fs = require('fs');
const path = require('path');

const SUSUNAN = ['Config.js', 'Util.js', 'Kiraan.js', 'PetaBorang.js', 'Data.js', 'Auth.js', 'Api.js', 'Admin.js', 'Cetak.js', 'Web.js', 'Setup.js'];
const KLIEN = ['Config.js', 'Util.js', 'Kiraan.js', 'ImportBorang.js'];
// Fail yang hanya dijalankan di pelayar (tidak masuk Kod.gs)
const KLIEN_SAHAJA = ['ImportBorang.js'];
const src = path.join(__dirname, '..', 'apps-script');
const dist = path.join(__dirname, '..', 'dist');

const ada = fs.readdirSync(src).filter((f) => f.endsWith('.js')).sort();
const tertinggal = ada.filter((f) => !SUSUNAN.includes(f) && !KLIEN_SAHAJA.includes(f));
if (tertinggal.length) throw new Error('Fail belum disenaraikan dalam SUSUNAN: ' + tertinggal.join(', '));

fs.mkdirSync(dist, { recursive: true });
const baca = (f) => fs.readFileSync(path.join(src, f), 'utf8');
const kod = ['/**',
  ' * Sistem Tuntutan Perjalanan (TNT) WP1.4 - JHEAIPP',
  ' * FAIL DIJANA (npm run bina) daripada folder apps-script/. Jangan sunting terus;',
  ' * ubah fail sumber dan jana semula.',
  ' */', '']
  .concat(SUSUNAN.map((f) => '// ==================== ' + f + ' ====================\n' + baca(f)))
  .join('\n');
fs.writeFileSync(path.join(dist, 'Kod.gs'), kod);

const html = baca('Index.html');
const PENANDA = '/*@@KOD_KIRAAN@@*/';
if (!html.includes(PENANDA)) throw new Error('Index.html tiada penanda ' + PENANDA);
const kodKlien = KLIEN.map((f) => '// ---- ' + f + '\n' + baca(f)).join('\n');
const htmlPenuh = html.replace(PENANDA, () => kodKlien);
if (!htmlPenuh.includes("'@@API_URL@@'")) throw new Error('Index.html tiada penanda @@API_URL@@');
// Versi Apps Script: guna google.script.run
fs.writeFileSync(path.join(dist, 'Index.html'), htmlPenuh.replace("'@@API_URL@@'", "''"));

// Versi hos luar (Netlify): panggil web app Apps Script melalui fetch. URL daripada env APPS_SCRIPT_URL.
const url = (process.env.APPS_SCRIPT_URL || '').trim();
if (url && !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) {
  throw new Error('APPS_SCRIPT_URL tidak sah. Contoh: https://script.google.com/macros/s/AKfy.../exec');
}
const web = path.join(__dirname, '..', 'web');
fs.mkdirSync(web, { recursive: true });
fs.writeFileSync(path.join(web, 'index.html'), htmlPenuh.replace("'@@API_URL@@'", JSON.stringify(url).replace(/"/g, "'")));
if (!url) console.log('AMARAN: APPS_SCRIPT_URL kosong; web/index.html belum boleh berhubung dengan pelayan.');
fs.copyFileSync(path.join(src, 'appsscript.json'), path.join(dist, 'appsscript.json'));
console.log('dist/Kod.gs (' + Math.round(kod.length / 1024) + ' KB), dist/Index.html, dist/appsscript.json');
