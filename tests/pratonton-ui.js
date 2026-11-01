// Pelayan pratonton UI: dist/Index.html + google.script.run palsu yang memanggil backend mock (Node).
// Guna: npm run bina && node tests/pratonton-ui.js  → http://localhost:8787
const http = require('http');
const fs = require('fs');
const path = require('path');
const { binaGas } = require('./mock-gas');

const g = binaGas();
g.sediakan();
g.ctx.apiAdminSimpanTetapan; // eslint
const STUB = `<script>
window.google = { script: { run: (function mk(ok, ko) {
  return new Proxy({}, { get(_, fn) {
    if (fn === 'withSuccessHandler') return (f) => mk(f, ko);
    if (fn === 'withFailureHandler') return (f) => mk(ok, f);
    return (...args) => fetch('/api', { method: 'POST', body: JSON.stringify({ fn, args }) }).then((r) => r.json())
      .then((r) => r.ralat ? ko && ko(new Error(r.ralat)) : ok && ok(r.hasil));
  } });
})() } };
</script>`;
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') {
    let b = '';
    req.on('data', (c) => { b += c; });
    req.on('end', () => {
      const { fn, args } = JSON.parse(b);
      let out;
      try {
        if (!/^api/.test(fn)) throw new Error('bukan api');
        out = { hasil: JSON.parse(JSON.stringify(g.ctx[fn](...args) ?? null)) };
      } catch (e) { out = { ralat: e.message }; }
      res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(out));
    });
    return;
  }
  if (req.url === '/peti') { res.end(JSON.stringify(g.state.peti)); return; }
  const html = fs.readFileSync(path.join(__dirname, '..', 'dist', 'Index.html'), 'utf8').replace('<head>', '<head>' + STUB);
  res.setHeader('content-type', 'text/html; charset=utf-8'); res.end(html);
});
server.listen(Number(process.env.PORT || 8787), () => console.log('http://localhost:' + (process.env.PORT || 8787)));
module.exports = { g };
