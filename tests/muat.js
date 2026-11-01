// Muatkan fail Apps Script ke dalam satu konteks VM (skop global dikongsi, seperti Apps Script).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function muat(fail, tambahan) {
  const ctx = vm.createContext(Object.assign({ console }, tambahan || {}));
  for (const f of fail) {
    const kod = fs.readFileSync(path.join(__dirname, '..', 'apps-script', f), 'utf8');
    vm.runInContext(kod, ctx, { filename: f });
  }
  return ctx;
}

const TULEN = ['Config.js', 'Util.js', 'Kiraan.js', 'PetaBorang.js'];

module.exports = { muat, TULEN };
