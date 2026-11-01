// Cetak peta sel (JSON) bagi data contoh: node tools/peta-json.js > peta.json
const { muat, TULEN } = require('../tests/muat');
const { KADAR, KUMPULAN, DATA } = require('../tests/contoh');
const g = muat(TULEN);
const d = g.bersihkanData(DATA);
const h = g.kiraTuntutan(d, { kadar: KADAR, kumpulan: KUMPULAN });
const p = g.petaBorang(d, h, { ALAMAT_PEJABAT: 'JABATAN HAL EHWAL AGAMA ISLAM NEGERI PULAU PINANG (CONTOH ALAMAT)' });
process.stdout.write(JSON.stringify(p));
