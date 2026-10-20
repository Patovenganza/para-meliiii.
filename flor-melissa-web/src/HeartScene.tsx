import { useEffect, useRef } from 'react'

type Props = { onElapsed?: (seconds: number) => void; resetKey?: number }
type RGB = [number, number, number]
type Point = { x: number; y: number; z: number; r: number; g: number; b: number }
type Petal = { phi: number; L: number; Wm: number; ac: number; a0: number; curl: number; pu: number[]; pv: number[]; prof: number[]; base: RGB[] }
type Leaf = { s0: number; L: number; side: number; u: number[]; v: number[]; prof: number[]; col: RGB[] }
type Stamen = { phi: number; an: [number, number][] }

const W = 720, H = 1280, BG = '#04020a', T_STEM = 4, T_B0 = 5, T_B1 = 15
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const smooth = (v: number) => { const x = clamp(v); return x * x * (3 - 2 * x) }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const rgb = (a: number, b: number, c: number): RGB => [a, b, c]

// Seeded random generator: the particle layout stays stable between frames.
function makeRng(seed = 11) {
  let state = seed >>> 0
  return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296 }
}
function midrib(L: number, a0: number, curl: number, K = 40) {
  const us: number[] = [0], r: number[] = [0], h: number[] = [0]
  let rr = 0, hh = 0
  for (let i = 1; i <= K; i++) {
    const u = i / K, angle = a0 + curl * Math.pow(u, 1.6), ds = L / K
    rr += Math.sin(angle) * ds; hh += Math.cos(angle) * ds
    us.push(u); r.push(rr); h.push(hh)
  }
  return { us, r, h }
}
function interp(u: number, xs: number[], ys: number[]) {
  let i = 1
  while (i < xs.length - 1 && xs[i] < u) i++
  const t = (u - xs[i - 1]) / (xs[i] - xs[i - 1] || 1)
  return lerp(ys[i - 1], ys[i], clamp(t))
}

export default function HeartScene({ onElapsed, resetKey = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { alpha: false })
    if (!canvas || !ctx) return
    const glowCanvas = document.createElement('canvas'); glowCanvas.width = W / 10; glowCanvas.height = H / 10
    const glowCtx = glowCanvas.getContext('2d')
    const layer = document.createElement('canvas'); layer.width = W; layer.height = H
    const g = layer.getContext('2d', { alpha: false })
    if (!glowCtx || !g) return
    let raf = 0, start = performance.now(), lastReported = -1
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rng = makeRng(11)
    const rand = () => rng()
    const gx = W / 2, gy = H * .82, HS = 380

    const petals: Petal[] = []
    for (let k = 0; k < 6; k++) {
      const outer = k % 2 === 0, pu: number[] = [], pv: number[] = [], prof: number[] = [], base: RGB[] = []
      for (let i = 0; i < 2300; i++) {
        const u = Math.pow(rand(), .85), v = rand() * 2 - 1
        pu.push(u); pv.push(v); prof.push(Math.pow(Math.sin(Math.PI * Math.pow(u, .7)), .9))
        let c: RGB = [interp(u, [0, .35, .7, 1], [105, 170, 220, 255]), interp(u, [0, .35, .7, 1], [3, 8, 28, 95]), interp(u, [0, .35, .7, 1], [28, 42, 65, 125])]
        if (Math.abs(v) < .07 && u < .55) c = [255, 145, 165]
        else if (rand() < .1 && u < .6 && Math.abs(v) < .75) c = [75, 2, 24]
        const factor = .82 + .35 * rand(); base.push([c[0] * factor, c[1] * factor, c[2] * factor])
      }
      petals.push({ phi: (k * 60 + 8) * Math.PI / 180, L: outer ? 300 : 280, Wm: outer ? 64 : 72, ac: outer ? .1 : .05, a0: outer ? 1.05 : .82, curl: outer ? .95 : .75, pu, pv, prof, base })
    }
    const NS = 3200, stS: number[] = [], stDx: number[] = [], stCol: RGB[] = []
    // Approximate normal distribution with the sum of uniform values.
    const normal = () => (rand() + rand() + rand() + rand() + rand() + rand() - 3) * 1.414
    for (let i = 0; i < NS; i++) { const s = rand(); stS.push(s); stDx.push(normal() * 3.2 * (1 - .5 * s)); const f = .8 + .4 * rand(); stCol.push([lerp(40, 120, s) * f, lerp(150, 215, s) * f, lerp(95, 120, s) * f]) }
    const leaves: Leaf[] = []
    for (const [s0, L, side] of [[.10, 190, 1], [.24, 175, -1], [.40, 150, 1], [.56, 120, -1]] as number[][]) {
      const u: number[] = [], v: number[] = [], prof: number[] = [], col: RGB[] = []
      for (let i = 0; i < 900; i++) { const uu = Math.pow(rand(), .9), vv = rand() * 2 - 1; u.push(uu); v.push(vv); prof.push(Math.pow(Math.sin(Math.PI * Math.pow(uu, .8)), .8)); let c: RGB = [lerp(40, 140, uu), lerp(160, 235, uu), lerp(100, 140, uu)]; if (Math.abs(vv) < .08) c = [190, 240, 170]; const f = .8 + .4 * rand(); col.push([c[0] * f, c[1] * f, c[2] * f]) }
      leaves.push({ s0, L, side, u, v, prof, col })
    }
    const NG = 5000, soilX: number[] = [], soilY: number[] = [], soilC: RGB[] = []
    for (let i = 0; i < NG; i++) { const dx = (rand() * 680 - 340), mound = (1 - (dx / 340) ** 2) * 55; soilX.push(dx + gx); soilY.push(gy - mound * Math.sqrt(rand()) + normal() * 1.5); soilC.push([lerp(70, 140, rand()), lerp(55, 100, rand()), lerp(80, 120, rand())]) }
    const ND = 450, dxs: number[] = [], dys: number[] = [], dSpeed: number[] = [], dPhase: number[] = [], dF: number[] = []
    for (let i = 0; i < ND; i++) { dxs.push(rand() * W); dys.push(rand() * H); dSpeed.push(6 + rand() * 16); dPhase.push(rand() * Math.PI * 2); dF.push(1 + rand() * 3) }
    const ringAngles = Array.from({ length: 1100 }, rand).map(v => v * Math.PI * 2)
    const circleAngles = Array.from({ length: 6 }, () => Array.from({ length: 260 }, rand).map(v => v * Math.PI * 2))
    const NF = 140, fOff: number[] = [], fPh: number[] = [], fDr: number[] = [], fSp: number[] = []
    for (let i = 0; i < NF; i++) { fOff.push(rand()); fPh.push(rand() * Math.PI * 2); fDr.push((rand() * 160 - 80)); fSp.push(.05 + rand() * .07) }
    const stamens: Stamen[] = Array.from({ length: 6 }, (_, k) => ({ phi: (k * 60 + 38) * Math.PI / 180, an: Array.from({ length: 35 }, () => [normal(), normal()] as [number, number]) }))

    const stemX = (s: number, t: number) => gx + 30 * Math.sin(2.2 * s) + 10 * Math.sin(.9 * t) * s * s
    const stemY = (s: number) => gy - s * HS
    const resize = () => { const rect = canvas.getBoundingClientRect(); canvas.width = Math.max(1, Math.round(rect.width * dpr)); canvas.height = Math.max(1, Math.round(rect.height * dpr)); ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0) }
    resize(); const observer = new ResizeObserver(resize); observer.observe(canvas)

    const draw = (now: number) => {
      const t = (now - start) / 1000
      if (Math.floor(t) !== lastReported) { lastReported = Math.floor(t); onElapsed?.(t) }
      const points: Point[] = []
      const add = (x: number, y: number, z: number, c: RGB) => { if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y, z, r: c[0], g: c[1], b: c[2] }) }
      const st = smooth(t / T_STEM), e = smooth((t - T_B0) / (T_B1 - T_B0)), rev = smooth((t - T_STEM + .3) / 1.6)
      const hx = stemX(1, t), hy = stemY(1)
      for (let i = 0; i < ND; i++) { const tw = .35 + .65 * (Math.sin(t * dF[i] + dPhase[i]) > .2 ? 1 : 0), yy = ((dys[i] - t * dSpeed[i]) % H + H) % H; add(dxs[i], yy, -1000, [255 * tw * .55, 200 * tw * .55, 235 * tw * .55]) }
      const ha = smooth((t - T_B0 + 1.5) / 4) * .9
      if (ha > .01) { const cx0 = hx, cy0 = hy - 90, R = 300, rot = t * .12; for (const a0 of ringAngles) { const a = a0 + rot; add(cx0 + R * Math.cos(a), cy0 + R * Math.sin(a), -900, [255 * ha * .7, 190 * ha * .7, 225 * ha * .7]) } circleAngles.forEach((arr, k) => { const ca = rot * 1.3 + k * Math.PI / 3, ox = cx0 + R * Math.cos(ca), oy = cy0 + R * Math.sin(ca); for (const a0 of arr) { const a = a0 + rot; add(ox + R * .5 * Math.cos(a), oy + R * .5 * Math.sin(a), -900, [255 * ha * .45, 170 * ha * .45, 215 * ha * .45]) } }) }
      for (let i = 0; i < NG; i++) add(soilX[i], soilY[i], -500, soilC[i].map(v => v * .8) as RGB)
      for (let i = 0; i < NS; i++) if (stS[i] <= st) add(stemX(stS[i], t) + stDx[i], stemY(stS[i]), -100, stCol[i])
      for (const lf of leaves) { const lg = clamp((st - lf.s0) * 2.5); if (lg <= .01) continue; const L = lf.L * lg, line = midrib(L, .85, 1.1), bx = stemX(lf.s0, t), by = stemY(lf.s0), sway = Math.sin(t * 1.2 + lf.s0 * 5) * .03; for (let i = 0; i < lf.u.length; i++) { const u = lf.u[i], v = lf.v[i], rr = interp(u, line.us, line.r), hh = interp(u, line.us, line.h), wid = 15 * lf.prof[i] * lg; add(bx + lf.side * (rr + v * wid * .35) + sway * hh * lf.side, by - hh + v * wid, -90, lf.col[i]) } }
      if (rev > .01) {
        const psi = .25 + t * .22, cp = Math.cos(psi), sp = Math.sin(psi), tilt = .35, swayT = Math.sin(t * .8) * .02
        for (const p of petals) { const Ls = p.L * (.45 + .55 * e) * (.35 + .65 * rev), a0 = lerp(p.ac, p.a0, e), curl = (.12 + .88 * e) * p.curl, line = midrib(Ls, a0, curl); for (let i = 0; i < p.pu.length; i++) { const u = p.pu[i], v = p.pv[i]; if (u > rev) continue; const rr = interp(u, line.us, line.r), hh = interp(u, line.us, line.h), wid = p.Wm * (.55 + .45 * e) * p.prof[i] * (.35 + .65 * rev), ph = p.phi; const X = rr * Math.cos(ph) - v * wid * Math.sin(ph), Z = rr * Math.sin(ph) + v * wid * Math.cos(ph), Y = hh + v * v * wid * (.30 * (1 - e) - .25 * e), Xp = X * cp + Z * sp, Zp = -X * sp + Z * cp, sy = Y * Math.cos(tilt) - Zp * Math.sin(tilt), shade = .55 + .45 * clamp(Zp / p.L * .8 + .5); let c = p.base[i]; const tint = clamp(u * 1.3) * .6 * (1 - e); c = [c[0] * (1 - tint) + 135 * tint, c[1] * (1 - tint) + 205 * tint, c[2] * (1 - tint) + 125 * tint]; add(hx + Xp + swayT * sy, hy - sy, Zp, c.map(vv => vv * shade) as RGB) } }
        if (e > .28) { const sr = smooth((e - .28) / .4); for (const sd of stamens) { const Ls = 215 * (.4 + .6 * e) * sr, line = midrib(Ls, lerp(.15, .62, e), .55 * e); for (let i = 0; i < 45; i++) { const u = rand(), rr = interp(u, line.us, line.r), hh = interp(u, line.us, line.h), ph = sd.phi, X = rr * Math.cos(ph), Z = rr * Math.sin(ph), Xp = X * cp + Z * sp, Zp = -X * sp + Z * cp, sy = hh * Math.cos(tilt) - Zp * Math.sin(tilt); add(hx + Xp, hy - sy, Zp + 5, [245, 225, 165]) } const tx = line.r[line.r.length - 1] * Math.cos(sd.phi), tz = line.r[line.r.length - 1] * Math.sin(sd.phi), ty = line.h[line.h.length - 1], txp = tx * cp + tz * sp, tzp = -tx * sp + tz * cp, tsy = ty * Math.cos(tilt) - tzp * Math.sin(tilt); for (const an of sd.an) add(hx + txp + an[0] * 5 * 1.6, hy - tsy + an[1] * 5 * .7, tzp + 6, [255, 150, 40]) } }
      }
      if (e > .6) { const fa = smooth((e - .6) / .4); for (let i = 0; i < NF; i++) { const q = (t * fSp[i] + fOff[i]) % 1, fx = hx + fDr[i] * q + Math.sin(q * 7 + fPh[i]) * 25, fy = (hy - 110) + q * (gy - hy + 90), fade = (1 - q) * fa, warm = fPh[i] > 3.1; add(fx, fy, 300, warm ? [255 * fade, 190 * fade, 80 * fade] : [255 * fade, 150 * fade, 205 * fade]) } }
      points.sort((a, b) => a.z - b.z)
      g.fillStyle = BG; g.fillRect(0, 0, W, H)
      for (const p of points) { if (p.x < 0 || p.x >= W - 2 || p.y < 0 || p.y >= H - 2) continue; g.fillStyle = `rgb(${Math.round(clamp(p.r, 0, 255))},${Math.round(clamp(p.g, 0, 255))},${Math.round(clamp(p.b, 0, 255))})`; g.fillRect(p.x | 0, p.y | 0, 2, 2) }
      // The original Python glow is made by shrinking the whole image, then adding it back.
      glowCtx.clearRect(0, 0, glowCanvas.width, glowCanvas.height); glowCtx.drawImage(layer, 0, 0, glowCanvas.width, glowCanvas.height)
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = .42; g.drawImage(glowCanvas, 0, 0, W, H); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'
      // El mensaje se dibuja como texto HTML encima de la flor para poder colocarlo arriba y hacerlo adaptable.
      ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0); ctx.clearRect(0, 0, W, H); ctx.drawImage(layer, 0, 0)
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); observer.disconnect() }
  }, [onElapsed, resetKey])
  return <canvas ref={canvasRef} className="flower-canvas" aria-label="Flor de seis pétalos que crece y se abre mediante partículas" />
}
