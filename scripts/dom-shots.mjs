// Real screenshots of DOM screens (menus, HUD, banners) for visual passes: the canvas-only F.shot
// misses them. Start headless Chrome first:
//   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9333 --user-data-dir=/tmp/feetza-chrome about:blank &
// then, with the dev server on :5180:
//   node scripts/dom-shots.mjs "http://localhost:5180/?dev" steps.json [initialWaitMs]
// steps: [{ "js": "async code run in the page (F.* is available)", "out": "/abs/file.png", "wait": 600 }]
// Each step runs in the same page, then a 1600x900 screenshot is saved and F.layout() is printed.
// ?dev&show=welcome opens the welcome card straight away.
const [url, stepsFile, waitMs = '9000'] = process.argv.slice(2);
const fs = await import('node:fs');
const steps = JSON.parse(fs.readFileSync(stepsFile, 'utf8'));
const tab = await (await fetch('http://127.0.0.1:9333/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
await new Promise((r) => (ws.onopen = r));
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.enable');
await send('Page.navigate', { url });
await new Promise((r) => setTimeout(r, Number(waitMs)));
for (const s of steps) {
  const res = await send('Runtime.evaluate', { expression: `(async()=>{${s.js}})()`, awaitPromise: true, returnByValue: true });
  await new Promise((r) => setTimeout(r, s.wait ?? 700));
  const audit = await send('Runtime.evaluate', { expression: 'JSON.stringify(F.layout().map(i=>i.text.slice(0,40)+" · "+i.issue))', awaitPromise: true, returnByValue: true });
  const c = await send('Runtime.evaluate', { expression: 'Promise.resolve(F.contrast()).then(r=>JSON.stringify(r.map(i=>i.text.slice(0,30)+" "+i.ratio)))', awaitPromise: true, returnByValue: true });
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(s.out, Buffer.from(shot.result.data, 'base64'));
  const ret = res.result?.result?.value;
  console.log(s.out.split('/').pop(), ret !== undefined ? 'returned ' + JSON.stringify(ret) : '', res.result?.exceptionDetails ? 'ERR ' + res.result.exceptionDetails.exception?.description?.slice(0, 120) : '', 'layout', audit.result?.result?.value, 'contrast', c.result?.result?.value);
}
await fetch(`http://127.0.0.1:9333/json/close/${tab.id}`);
ws.close();
