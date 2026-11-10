// Testes de UI mobile: overflow horizontal em varias larguras + gaveta do menu.
//
// Requer Google Chrome instalado. Uso:
//   npm run test:ui:mobile
//   SITE=http://localhost:4173 npm run test:ui:mobile
//   SHOTS=1 npm run test:ui:mobile     # salva prints em tests/screenshots/
//
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const PORT = 9337
const SITE = process.env.SITE || 'https://quiosquedococo.vercel.app'
const WIDTHS = [320, 360, 390, 414, 768]
const ROUTES = ['/pdv', '/orders', '/shifts', '/products', '/stock', '/reports']
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
const SHOTS = process.env.SHOTS === '1'
const SHOT_DIR = path.join(__dirname, 'screenshots')

const chrome = spawn('google-chrome', [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=/tmp/opencode/chrome-ui-mobile', '--no-first-run',
  '--no-default-browser-check', '--disable-gpu', 'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function version() {
  for (let i = 0; i < 60; i++) {
    try { return await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json() } catch { await sleep(250) }
  }
  throw new Error('chrome nao subiu')
}

function client(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let id = 0
  const pending = new Map()
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id)
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
    }
  }
  const ready = new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  return {
    send: (method, params = {}) => new Promise((resolve, reject) => {
      const myId = ++id; pending.set(myId, { resolve, reject })
      ws.send(JSON.stringify({ id: myId, method, params }))
    }),
    ready,
    close: () => ws.close(),
  }
}

const shot = async (c, name) => {
  if (!SHOTS) return
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  const { data } = await c.send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(path.join(SHOT_DIR, `${name}.png`), Buffer.from(data, 'base64'))
  console.log('  print  tests/screenshots/' + name + '.png')
}

const evaluate = async (c, expression) => {
  const r = await c.send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || '').slice(0, 200))
  return r.result.value
}

const MEASURE = `(() => {
  const doc = document.documentElement;
  const vw = window.innerWidth;
  const device = window.screen.width || vw;
  return {
    vw,
    device,
    scrollWidth: Math.max(doc.scrollWidth, document.body.scrollWidth),
    overflow: Math.max(doc.scrollWidth, vw) - device,
  };
})()`

let failures = 0
const fail = (msg) => { failures += 1; console.log('  FALHOU ' + msg) }
const ok = (msg) => console.log('  OK     ' + msg)

;(async () => {
  await version()
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json()
  const c = client(target.webSocketDebuggerUrl)
  await c.ready
  await c.send('Page.enable'); await c.send('Runtime.enable')
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await c.send('Emulation.setUserAgentOverride', { userAgent: UA })

  const setWidth = async (w, h = 844) => {
    await c.send('Emulation.setDeviceMetricsOverride', {
      width: w, height: h, deviceScaleFactor: 3, mobile: true, screenWidth: w, screenHeight: h,
    })
  }

  // ---- 1. login ----
  await setWidth(390)
  await c.send('Page.navigate', { url: SITE + '/login' })
  await sleep(4500)
  console.log('\n[login]')
  const login = await evaluate(c, `(async () => {
    const set = (el, v) => { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })) }
    const inputs = [...document.querySelectorAll('input')]
    if (inputs.length < 2) return { erro: 'inputs nao encontrados' }
    set(inputs[0], 'admin'); set(inputs[1], 'admin123')
    await new Promise(r => setTimeout(r, 300))
    const btn = document.querySelector('button[type=submit]') || [...document.querySelectorAll('button')].find(b => /entrar|login/i.test(b.innerText))
    btn.click()
    await new Promise(r => setTimeout(r, 4000))
    return { path: location.pathname, overflow: document.documentElement.scrollWidth - window.screen.width }
  })()`)
  login.path === '/pdv' ? ok('login -> /pdv') : fail('login -> ' + JSON.stringify(login))
  await shot(c, '01-pdv')

  // ---- 2. gaveta do menu ----
  console.log('\n[menu mobile]')
  const drawer = await evaluate(c, `(async () => {
    const sidebar = document.querySelector('.sidebar')
    const toggle = document.querySelector('.menu-toggle')
    if (!sidebar || !toggle) return { erro: 'sem sidebar/menu-toggle' }
    const box = () => sidebar.getBoundingClientRect()
    const out = { fechado: box().right <= 1, backdropInicial: !!document.querySelector('.sidebar-backdrop') }
    toggle.click()
    await new Promise(r => setTimeout(r, 600))
    out.aberto = box().left >= -1 && box().right > 100
    out.backdropAberto = !!document.querySelector('.sidebar-backdrop')
    const link = [...document.querySelectorAll('.sidebar-link')].find(a => a.textContent.includes('Produtos'))
    link.click()
    await new Promise(r => setTimeout(r, 1500))
    out.aposNavegar = location.pathname
    out.fechouAoNavegar = box().right <= 1
    out.backdropFinal = !!document.querySelector('.sidebar-backdrop')
    return out
  })()`)
  if (drawer.erro) fail(drawer.erro)
  else {
    drawer.fechado ? ok('gaveta comeca fechada') : fail('gaveta visivel no load')
    drawer.aberto && drawer.backdropAberto ? ok('abre com backdrop') : fail('nao abre: ' + JSON.stringify(drawer))
    await shot(c, '02-menu-aberto')
    drawer.aposNavegar === '/products' && drawer.fechouAoNavegar && !drawer.backdropFinal
      ? ok('navega e fecha a gaveta')
      : fail('navegacao/gaveta: ' + JSON.stringify(drawer))
  }

  // ---- 3. overflow em varias larguras ----
  for (const w of WIDTHS) {
    await setWidth(w)
    console.log(`\n[overflow ${w}px]`)
    for (const route of ROUTES) {
      await c.send('Page.navigate', { url: SITE + route })
      await sleep(3200)
      const m = await evaluate(c, MEASURE)
      m.overflow > 1
        ? fail(`${route} overflow=${m.overflow}px (vw=${m.vw})`)
        : ok(`${route} sem overflow`)
      if (w === 390) await shot(c, '10-' + route.replace('/', ''))
    }
  }

  // ---- 4. area de toque minima nos botoes do menu ----
  await setWidth(390)
  await c.send('Page.navigate', { url: SITE + '/pdv' })
  await sleep(3000)
  console.log('\n[areas de toque]')
  const taps = await evaluate(c, `(async () => {
    document.querySelector('.menu-toggle').click()
    await new Promise(r => setTimeout(r, 500))
    const links = [...document.querySelectorAll('.sidebar-link')]
    const pequenos = links.filter(a => a.getBoundingClientRect().height < 40).map(a => a.textContent.trim())
    return { total: links.length, pequenos }
  })()`)
  taps.pequenos.length === 0
    ? ok(`${taps.total} links do menu com altura >= 40px`)
    : fail('links pequenos: ' + taps.pequenos.join(', '))

  console.log('\n=== RESUMO ===')
  console.log(failures ? `${failures} falha(s)` : 'todos os testes passaram')
  c.close(); chrome.kill(); process.exit(failures ? 1 : 0)
})().catch((e) => { console.error('FALHOU:', e.message); chrome.kill(); process.exit(2) })
