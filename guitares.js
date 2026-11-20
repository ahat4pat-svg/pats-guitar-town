import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const V3 = THREE.Vector3, PI = Math.PI;
const lisseur = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function alea(graine) { let s = graine; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function lisse(pts, n = 140) {
  const N = pts.length, coins = []; pts.forEach((p, i) => { if (p[2]) coins.push(i); });
  const v = (i) => new V3(pts[i][0], pts[i][1], 0);
  let P = [];
  if (!coins.length) {
    P = new THREE.CatmullRomCurve3(pts.map((_, i) => v(i)), true, 'centripetal').getSpacedPoints(n).slice(0, n).map((q) => [q.x, q.y]);
  } else {
    const runs = []; let total = 0;
    for (let k = 0; k < coins.length; k++) {
      const a = coins[k], b = coins[(k + 1) % coins.length], idx = [a]; let i = a;
      do { i = (i + 1) % N; idx.push(i); } while (i !== b);
      const c = idx.length === 2 ? new THREE.LineCurve3(v(idx[0]), v(idx[1])) : new THREE.CatmullRomCurve3(idx.map(v), false, 'centripetal');
      const L = c.getLength(); runs.push([c, L]); total += L;
    }
    for (const [c, L] of runs) { const m = Math.max(1, Math.round(n * L / total)); P.push(...c.getSpacedPoints(m).slice(0, m).map((q) => [q.x, q.y])); }
  }
  let A = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; A += a[0] * b[1] - b[0] * a[1]; }
  if (A < 0) P.reverse();
  return P;
}
const miroir = (demi) => [...demi, ...demi.slice(1, -1).reverse().map((p) => [-p[0], p[1], p[2]])];
function decale(P, k) {
  if (!k) return P.map((p) => [p[0], p[1]]);
  const n = P.length;
  return P.map((p, i) => { const a = P[(i - 1 + n) % n], b = P[(i + 1) % n]; const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1; return [p[0] - ty / l * k, p[1] + tx / l * k]; });
}
function distBord(P) {
  const n = P.length;
  return (x, y) => { let m = 1e9; for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; const dx = b[0] - a[0], dy = b[1] - a[1]; let t = ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1); t = t < 0 ? 0 : t > 1 ? 1 : t; const d = Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy); if (d < m) m = d; } return m; };
}
function boite2(P) { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (const p of P) { a = Math.min(a, p[0]); b = Math.max(b, p[0]); c = Math.min(c, p[1]); d = Math.max(d, p[1]); } return { x0: a, x1: b, y0: c, y1: d, w: b - a, h: d - c }; }
const forme = (P) => new THREE.Shape(P.map((p) => new THREE.Vector2(p[0], p[1])));
function rr(w, h, r) { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; r = Math.min(r, w / 2, h / 2); s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -PI / 2, 0); s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, PI / 2); s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, PI / 2, PI); s.lineTo(x, y + r); s.absarc(x + r, y + r, r, PI, PI * 1.5); return s; }
function ext(s, ep, biseau = 0, seg = 6) {
  const g = new THREE.ExtrudeGeometry(s, { depth: ep - 2 * biseau, bevelEnabled: biseau > 0, bevelSize: biseau, bevelThickness: biseau, bevelOffset: -biseau, bevelSegments: 2, curveSegments: seg });
  if (biseau) g.translate(0, 0, biseau); return g;
}
function faireCorps(P, o) {
  const n = P.length, dE = distBord(P), bb = boite2(P);
  const cx = o.centre ? o.centre[0] : (bb.x0 + bb.x1) / 2, cy = o.centre ? o.centre[1] : (bb.y0 + bb.y1) / 2;
  const zH = (x, y) => o.ep / 2 + (o.H ? o.H(x, y, dE(x, y)) : 0), zB = (x, y) => -o.ep / 2 + (o.B ? o.B(x, y, dE(x, y)) : 0);
  const rH = o.rH ?? 3, rB = o.rB ?? 3, fr = [0.002, 0.22, 0.45, 0.68, 0.87];
  const A = [];
  const an = (Q, zf, m) => A.push({ p: Q.map((q) => [q[0], q[1], zf(q[0], q[1])]), m });
  const vers = (Q, f) => Q.map((q) => [cx + (q[0] - cx) * f, cy + (q[1] - cy) * f]);
  const kB = [...new Set([...(o.insB || []), rB])].sort((a, b) => b - a), kH = [...new Set([...(o.insH || []), rH])].sort((a, b) => a - b);
  const fondB = decale(P, kB[0]), fondH = decale(P, kH[kH.length - 1]);
  const mF = 2, mD = 1, mT = 0;
  for (const f of fr) an(vers(fondB, f), zB, mD);
  for (const k of kB) an(decale(P, k), zB, k === rB && o.filetB ? mF : mD);
  for (const t of [30, 60]) { const a = t * PI / 180; an(decale(P, rB * (1 - Math.sin(a))), (x, y) => zB(x, y) + rB * (1 - Math.cos(a)), o.filetB ? mF : mD); }
  an(P, (x, y) => zB(x, y) + rB, o.filetB ? mF : mD);
  if (o.filetB) an(P, (x, y) => zB(x, y) + rB + o.filetB, mD);
  if (o.filetH) an(P, (x, y) => zH(x, y) - rH - o.filetH, mF);
  an(P, (x, y) => zH(x, y) - rH, o.filetH ? mF : mT);
  for (const t of [30, 60]) { const a = t * PI / 180; an(decale(P, rH * (1 - Math.cos(a))), (x, y) => zH(x, y) - rH + rH * Math.sin(a), o.filetH ? mF : mT); }
  for (const k of kH) an(decale(P, k), zH, mT);
  for (const f of [...fr].reverse()) an(vers(fondH, f), zH, mT);
  const pos = [], uv = [];
  for (const r of A) for (const q of r.p) { pos.push(q[0], q[1], q[2]); uv.push((q[0] - bb.x0) / bb.w, (q[1] - bb.y0) / bb.h); }
  const g = new THREE.BufferGeometry(); const ind = []; let debut = 0, mat = A[0].m;
  for (let i = 0; i < A.length - 1; i++) {
    if (A[i].m !== mat) { g.addGroup(debut, ind.length - debut, mat); debut = ind.length; mat = A[i].m; }
    for (let j = 0; j < n; j++) { const a = i * n + j, b = i * n + (j + 1) % n, c = (i + 1) * n + j, d = (i + 1) * n + (j + 1) % n; ind.push(a, b, d, a, d, c); }
  }
  g.addGroup(debut, ind.length - debut, mat);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(ind); g.computeVertexNormals();
  return { geo: g, zH, zB, bb, dE };
}
function toile(P, bb, dessin, L = 512) {
  const c = document.createElement('canvas'); c.width = L; c.height = Math.round(L * bb.h / bb.w); const g = c.getContext('2d');
  const X = (x) => (x - bb.x0) / bb.w * c.width, Y = (y) => (1 - (y - bb.y0) / bb.h) * c.height, E = c.width / bb.w;
  const chemin = (Q = P) => { g.beginPath(); Q.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])))); g.closePath(); };
  dessin(g, { X, Y, E, chemin, c });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function veines(g, c, force = 0.07, graine = 7, pas = 5) {
  const r = alea(graine); g.save(); g.lineWidth = 1;
  for (let x = 0; x < c.width; x += pas * (0.5 + r())) { g.strokeStyle = `rgba(40,20,8,${force * (0.4 + r())})`; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 4 * (r() - 0.5), c.height * 0.3, x + 6 * (r() - 0.5), c.height * 0.7, x + 3 * (r() - 0.5), c.height); g.stroke(); }
  g.restore();
}
function ondes(g, c, force = 0.06, graine = 3) {
  const r = alea(graine); g.save();
  for (let y = 0; y < c.height; y += 5 + 9 * r()) { g.fillStyle = `rgba(30,12,4,${force * (0.4 + r())})`; g.fillRect(0, y, c.width, 2 + 5 * r()); }
  g.restore();
}
function texDegrade(P, bb, f) {
  return toile(P, bb, (g, { E, chemin, c }) => {
    g.fillStyle = f.bord; g.fillRect(0, 0, c.width, c.height);
    g.save(); chemin(); g.clip();
    g.fillStyle = f.centre; g.fillRect(0, 0, c.width, c.height);
    if (f.veines) veines(g, c, f.veines); if (f.ondes) ondes(g, c, f.ondes);
    if (f.milieu) { g.filter = `blur(${(f.flou || 26) * E}px)`; g.strokeStyle = f.milieu; g.lineWidth = (f.large || 95) * E; chemin(); g.stroke(); }
    g.filter = `blur(${(f.flouBord || 13) * E}px)`; g.strokeStyle = f.bord; g.lineWidth = (f.largeBord || 42) * E; chemin(); g.stroke(); g.filter = 'none';
    if (f.apres) f.apres(g, { E, c });
    g.restore();
  });
}
function texUni(P, bb, couleur, o = {}) {
  return toile(P, bb, (g, { c, ...r }) => { g.fillStyle = couleur; g.fillRect(0, 0, c.width, c.height); if (o.veines) veines(g, c, o.veines, o.graine); if (o.ondes) ondes(g, c, o.ondes); if (o.apres) { g.save(); o.apres(g, { c, ...r }); g.restore(); } }, o.L || 256);
}
function texEcaille() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), r = alea(11);
  g.fillStyle = '#3a1408'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) { g.fillStyle = [`rgba(176,84,22,${0.25 + r() * 0.4})`, `rgba(20,6,3,${0.3 + r() * 0.4})`, `rgba(214,128,40,${0.15 + r() * 0.3})`][i % 3]; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 22, 4 + r() * 12, r() * PI, 0, PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.008, 0.008); return t;
}
const vernis = (o) => new THREE.MeshPhysicalMaterial({ roughness: 0.3, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.16, ...o });
const mat = (color, roughness = 0.5, metalness = 0, o = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...o });
let COMMUN = null;
function commun() {
  if (COMMUN) return COMMUN;
  const ecaille = texEcaille();
  return (COMMUN = {
    chrome: mat(0xd9dde2, 0.2, 0.62), nickel: mat(0xcfcbc0, 0.3, 0.55), dore: mat(0xd2a84a, 0.28, 0.6), laiton: mat(0xb88a3a, 0.4, 0.55), acier: mat(0xbfc4ca, 0.35, 0.6),
    noir: mat(0x131315, 0.42), noirMat: mat(0x0c0c0d, 0.7), noirTete: mat(0x030304, 0.3, 0, { envMapIntensity: 0.22 }), blanc: mat(0xf1eee4, 0.42), creme: mat(0xe8d9b0, 0.45), parchemin: mat(0xdcd3bd, 0.5), menthe: mat(0xcfe0cf, 0.45),
    palissandre: mat(0x2b1a12, 0.62), ebene: mat(0x151110, 0.55), erable: vernis({ color: 0xc99548, roughness: 0.36, clearcoat: 0.4 }), acajou: vernis({ color: 0x4a2414, roughness: 0.4, clearcoat: 0.35 }),
    nacre: mat(0xe9e4d6, 0.3, 0.1), frette: mat(0xc8c8c0, 0.3, 0.6), os: mat(0xefe7d2, 0.5), ecaille: vernis({ map: ecaille, roughness: 0.25 }), tulipe: mat(0xcdd3b0, 0.4), trou: new THREE.MeshBasicMaterial({ color: 0x050403 }),
    corde: mat(0xc9c9c4, 0.35, 0.7), cordeBronze: mat(0xb08d55, 0.4, 0.65),
  });
}
function etabli() {
  const lots = new Map(); let base = new THREE.Matrix4();
  const aj = (geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const M = new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(sx, sy, sz));
    const g = geo.index ? geo.toNonIndexed() : geo.clone(); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(base.clone().multiply(M)); if (!lots.has(m)) lots.set(m, []); lots.get(m).push(g); geo.dispose();
  };
  const cyl = (r, h, m, x, y, z, seg = 12, r2 = r) => aj(new THREE.CylinderGeometry(r2, r, h, seg), m, x, y, z + h / 2, PI / 2);
  const boite = (w, h, d, m, x, y, z, rz = 0) => aj(new THREE.BoxGeometry(w, h, d), m, x, y, z + d / 2, 0, 0, rz);
  const plaque = (s, ep, m, x, y, z, rz = 0, biseau = 0) => aj(ext(s, ep, biseau), m, x, y, z, 0, 0, rz);
  const disque = (r, m, x, y, z, seg = 14) => aj(new THREE.CircleGeometry(r, seg), m, x, y, z);
  const tige = (a, b, r, m, seg = 5) => { const A = new V3(...a), B = new V3(...b), d = B.clone().sub(A), L = d.length(); const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.normalize()); const e = new THREE.Euler().setFromQuaternion(q); const c = A.add(B).multiplyScalar(0.5); aj(new THREE.CylinderGeometry(r, r, L, seg, 1, true), m, c.x, c.y, c.z, e.x, e.y, e.z); };
  const repere = (M) => { base = M || new THREE.Matrix4(); };
  const finir = (grp) => { let tri = 0; for (const [m, L] of lots) { const g = mergeGeometries(L, false); const me = new THREE.Mesh(g, m); me.castShadow = true; grp.add(me); tri += g.attributes.position.count / 3; L.forEach((x) => x.dispose()); } return tri; };
  return { aj, cyl, boite, plaque, disque, tige, repere, finir };
}
function vis(E, C, pts, z, r = 1.9) { for (const [x, y] of pts) E.cyl(r, 0.5, C.acier, x, y, z, 6); }
function simple(E, C, x, y, z, rz, capot, plots = true) {
  E.plaque(rr(71, 18.5, 9), 7, capot, x, y, z, rz, 1.2);
  if (plots) for (let i = 0; i < 6; i++) { const u = -26 + i * 10.4; E.cyl(2.3, 0.6, C.acier, x + u * Math.cos(rz), y + u * Math.sin(rz), z + 7, 8); }
}
function double(E, C, x, y, z, cadre, capot = C.nickel) {
  const s = rr(90, 46, 4); const t = new THREE.Path(); t.absellipse(0, 0, 0.1, 0.1, 0, PI * 2); s.holes = [];
  E.plaque(s, 5, cadre, x, y, z, 0, 0.8); E.plaque(rr(70, 38.5, 5), 9.5, capot, x, y, z, 0, 1.5);
  for (let i = 0; i < 6; i++) E.cyl(2.2, 0.5, C.acier, x - 26 + i * 10.4, y + 9.5, z + 9.5, 8);
  for (const sx of [-40.5, 40.5]) E.cyl(1.5, 0.6, C.acier, x + sx, y, z + 5, 6);
}
function tom(E, C, y, z, ecart = 51.5, metal) {
  E.aj(new THREE.BoxGeometry(84, 11.5, 7), metal, 0, y + 0.8, z + 6, 0, 0, -0.035);
  for (let i = 0; i < 6; i++) E.boite(5, 7, 2.6, metal, -ecart / 2 + i * ecart / 5, y + 0.8 + (i - 2.5) * 0.35, z + 9.5);
  for (const sx of [-37, 37]) { E.cyl(5.2, 2.5, metal, sx, y + 0.8 - sx * 0.035, z + 0.2, 12); E.cyl(2.6, 11, metal, sx, y + 0.8 - sx * 0.035, z, 8); }
}
function stopbar(E, C, y, z, metal) {
  E.aj(new THREE.CylinderGeometry(6.2, 6.2, 101, 12), metal, 0, y, z + 7.5, 0, 0, PI / 2, 1, 1, 0.82);
  for (const sx of [-41, 41]) { E.cyl(6.6, 4, metal, sx, y, z + 8.5, 12); E.cyl(3, 9, metal, sx, y, z, 8); }
}
function hautDeForme(E, C, x, y, z, m, jupe = C.noir) { E.cyl(13.2, 4.5, m, x, y, z, 16, 12.2); E.cyl(9.6, 8.5, m, x, y, z + 4.5, 16, 9); E.cyl(13.5, 0.5, jupe, x, y, z - 0.2, 16); }
function inverseur(E, C, x, y, z, rondelle, bout = C.creme, inclin = 0.5) {
  if (rondelle) E.cyl(17, 0.9, rondelle, x, y, z, 20);
  E.cyl(6.2, 2.4, C.nickel, x, y, z + 0.9, 10); E.tige([x, y, z + 3], [x, y + 6 * inclin, z + 13], 1.6, C.nickel, 6); E.aj(new THREE.SphereGeometry(3.3, 8, 6), bout, x, y + 7.5 * inclin, z + 15.5, 0, 0, 0, 1, 1, 1.5);
}
function prise(E, C, x, y, z) { E.cyl(8.5, 1.4, C.nickel, x, y, z, 6); E.cyl(5, 2.6, C.nickel, x, y, z + 1.4, 10); E.disque(3.1, C.trou, x, y, z + 4.05, 10); }
function attache(E, C, a, dir) { const [x, y, z] = a; const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), new V3(...dir).normalize()); const e = new THREE.Euler().setFromQuaternion(q); const d = new V3(...dir).normalize();
  E.aj(new THREE.CylinderGeometry(3.2, 4.4, 7, 10), C.nickel, x + d.x * 3.5, y + d.y * 3.5, z + d.z * 3.5, e.x, e.y, e.z); E.aj(new THREE.CylinderGeometry(6.2, 5, 3.2, 12), C.nickel, x + d.x * 8.6, y + d.y * 8.6, z + d.z * 8.6, e.x, e.y, e.z); }
function p90(E, C, x, y, z, capot = C.noir) {
  E.plaque(rr(86, 35, 8), 7.5, capot, x, y, z, 0, 1.5); for (let i = 0; i < 6; i++) E.cyl(2.3, 0.6, C.acier, x - 26 + i * 10.4, y, z + 7.5, 8);
  for (const sx of [-15.6, 15.6]) E.cyl(1.7, 0.5, C.acier, x + sx, y, z + 7.5, 6);
}
function miniDouble(E, C, x, y, z) {
  E.plaque(rr(88, 42, 4), 4.5, C.noirMat, x, y, z, 0, 0.8); E.plaque(rr(67, 28, 5), 9, C.chrome, x, y, z, 0, 1.5);
  for (let i = 0; i < 6; i++) E.cyl(2, 0.5, C.acier, x - 26 + i * 10.4, y + 5.5, z + 9, 8); for (const sx of [-39, 39]) E.cyl(1.5, 0.6, C.acier, x + sx, y, z + 4.5, 6);
}
function boutonMetal(E, C, x, y, z, m) { E.cyl(9.6, 12.5, m, x, y, z, 18, 8.8); E.cyl(8.6, 0.6, m, x, y, z + 12.5, 18); }
function vibratoArceau(E, C, y0, z, long) {
  E.plaque(forme(lisse(miroir([[0, -long], [18, -long + 3], [27, -long + 18], [31, -58], [37, -30], [34, -16], [0, -13]]), 50)), 3, C.chrome, 0, y0, z, 0, 0.8);
  E.aj(new THREE.CylinderGeometry(4.5, 4.5, 78, 10), C.chrome, 0, y0, z + 10, 0, 0, PI / 2); for (const s of [-1, 1]) E.boite(8, 16, 13, C.chrome, s * 41, y0 - 2, z);
  E.aj(new THREE.CylinderGeometry(7, 7, 66, 12), C.chrome, 0, y0 - 34, z + 11, 0, 0, PI / 2); E.cyl(11, 14, C.chrome, 30, y0 - 34, z + 3, 14);
  E.tige([30, y0 - 34, z + 17], [42, y0 - 20, z + 23], 3, C.chrome, 6); E.tige([42, y0 - 20, z + 23], [92, y0 + 58, z + 25], 3, C.chrome, 6); E.aj(new THREE.BoxGeometry(11, 44, 3.5), C.chrome, 99, y0 + 72, z + 25, 0, 0, -0.52);
}
function filtertron(E, C, x, y, z) {
  E.plaque(rr(92, 46, 4), 4, C.acier, x, y, z, 0, 0.8); E.plaque(rr(72, 36, 5), 8.5, C.chrome, x, y, z, 0, 1.5); E.boite(60, 3.2, 0.5, C.noirMat, x, y, z + 8.5);
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) E.cyl(2.2, 0.6, C.acier, x - 26 + i * 10.4, y + s * 9.5, z + 8.5, 8);
}
let CARBONE = null;
function carbone() {
  if (CARBONE) return CARBONE;
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); g.fillStyle = '#0b0b0d'; g.fillRect(0, 0, 32, 32);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const v = (i + j) % 2; const d = g.createLinearGradient(i * 8, j * 8, i * 8 + (v ? 8 : 0), j * 8 + (v ? 0 : 8)); d.addColorStop(0, '#16161a'); d.addColorStop(0.5, '#3c3d44'); d.addColorStop(1, '#131316'); g.fillStyle = d; g.fillRect(i * 8 + 0.5, j * 8 + 0.5, 7, 7); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.085, 0.085); t.anisotropy = 4;
  return (CARBONE = new THREE.MeshStandardMaterial({ map: t, roughness: 0.42, metalness: 0, envMapIntensity: 0.35 }));
}
function rayures(g, c, graine, teintes, nb, large) {
  const r = alea(graine); g.save(); g.lineCap = 'round';
  for (let i = 0; i < nb; i++) { const x = r() * c.width; g.strokeStyle = teintes[i % teintes.length]; g.globalAlpha = 0.25 + r() * 0.6; g.lineWidth = 0.6 + r() * r() * large;
    g.beginPath(); g.moveTo(x, -5); g.bezierCurveTo(x + 26 * (r() - 0.5), c.height * 0.3, x + 34 * (r() - 0.5), c.height * 0.65, x + 22 * (r() - 0.5), c.height + 5); g.stroke(); }
  g.restore();
}
const TETES = {
  strat: [[21, 0, 'c'], [22.4, 5], [23, 10], [24.1, 15], [26.2, 20], [29.7, 25.1], [34.6, 30.1], [40.8, 35.1], [46.1, 40.1], [47.9, 45.1], [47.5, 50.1], [46.9, 55.1], [46.2, 60.1], [45.4, 65.1], [44.6, 70.1], [43.4, 75.2], [42.2, 80.2], [41, 85.2], [39.8, 90.2], [38.7, 95.2], [37.7, 100.2], [36.7, 105.2], [35.9, 110.2], [35.7, 115.2], [37.7, 120.3], [43.1, 125.3], [49.1, 130.3], [53.1, 135.3], [55.4, 140.3], [56.3, 145.3], [56.2, 150.3], [54.9, 155.3], [53.2, 160.3], [51.5, 165.4], [48.7, 170.4], [45.1, 175.4], [26.6, 179.8], [8.1, 165.4], [6.5, 160.3], [5, 155.3], [3.4, 150.3], [1.9, 145.3], [0.4, 140.3], [-1.2, 135.3], [-2.7, 130.3], [-4.2, 125.3], [-5.8, 120.3], [-7.3, 115.2], [-8.9, 110.2], [-10.4, 105.2], [-11.9, 100.2], [-13.5, 95.2], [-15, 90.2], [-16.6, 85.2], [-18.1, 80.2], [-19.6, 75.2], [-21.2, 70.1], [-22.7, 65.1], [-24.3, 60.1], [-25.8, 55.1], [-27.3, 50.1], [-28.9, 45.1], [-30.4, 40.1], [-32.3, 35.1], [-33.1, 30.1], [-33.9, 25.1], [-33.8, 20], [-31.4, 15], [-27.3, 10], [-23.3, 5], [-21, 0, 'c']],
  tele: [[21, 0, 'c'], [22.8, 5], [22.9, 10.1], [23.1, 15.1], [23.4, 20.1], [23.8, 25.1], [24.5, 30.2], [25.4, 35.2], [26.4, 40.2], [27.6, 45.2], [29.4, 50.3], [31.4, 55.3], [33.6, 60.3], [35.8, 65.3], [37.4, 70.4], [38.7, 75.4], [39.6, 80.4], [40.2, 85.4], [40.5, 90.5], [40.4, 95.5], [39.8, 100.5], [38.8, 105.6], [37.1, 110.6], [35.2, 115.6], [33.7, 120.6], [33.5, 125.7], [35.3, 130.7], [38.5, 135.7], [41.4, 140.7], [44.5, 150], [44.5, 158], [41.5, 166], [34, 172], [23, 174.5], [12, 172], [6, 166], [5, 158], [2.6, 145.8], [1, 140.7], [-0.5, 135.7], [-2.1, 130.7], [-3.7, 125.7], [-5.3, 120.6], [-6.9, 115.6], [-8.4, 110.6], [-10, 105.6], [-11.6, 100.5], [-13.2, 95.5], [-14.8, 90.5], [-16.4, 85.4], [-17.9, 80.4], [-19.5, 75.4], [-21.1, 70.4], [-22.7, 65.3], [-24.3, 60.3], [-25.8, 55.3], [-27.4, 50.3], [-29, 45.2], [-30.6, 40.2], [-32.2, 35.2], [-33.3, 30.2], [-34.2, 25.1], [-34.6, 20.1], [-33.2, 15.1], [-29.3, 10.1], [-24, 5], [-21, 0, 'c']],
  jaguar: [[21, 0, 'c'], [23.7, 5.1], [24.4, 10.2], [25.8, 15.3], [28.4, 20.3], [32.4, 25.4], [38.9, 30.5], [49.9, 35.6], [60.7, 40.7], [64.7, 45.8], [64.6, 50.9], [64, 55.9], [62.9, 61], [61.5, 66.1], [60, 71.2], [58.4, 76.3], [56.8, 81.4], [55.1, 86.5], [53.3, 91.5], [51.5, 96.6], [49.8, 101.7], [48.2, 106.8], [46.6, 111.9], [45.1, 117], [43.7, 122.1], [42.7, 127.1], [43.7, 132.2], [48.3, 137.3], [55, 142.4], [60, 147.5], [63.1, 152.6], [64.8, 157.7], [65.4, 162.7], [65.1, 167.8], [64.2, 172.9], [62.5, 178], [59.4, 183.1], [55.3, 188.2], [51, 193.3], [29.1, 198.6], [7.2, 183.1], [5.9, 178], [4.6, 172.9], [3.2, 167.8], [1.9, 162.7], [0.5, 157.7], [-0.8, 152.6], [-2.2, 147.5], [-3.5, 142.4], [-4.8, 137.3], [-6.2, 132.2], [-7.5, 127.1], [-8.9, 122.1], [-10.2, 117], [-11.5, 111.9], [-12.9, 106.8], [-14.2, 101.7], [-15.6, 96.6], [-16.9, 91.5], [-18.2, 86.5], [-19.6, 81.4], [-20.9, 76.3], [-22.3, 71.2], [-23.6, 66.1], [-25, 61], [-26.3, 55.9], [-27.6, 50.9], [-29, 45.8], [-30.3, 40.7], [-32.6, 35.6], [-33.4, 30.5], [-34.2, 25.4], [-34.3, 20.3], [-32.5, 15.3], [-29, 10.2], [-25.3, 5.1], [-21, 0, 'c']],
  gibson: [[21.5, 0, 'c'], [21.9, 5], [23.3, 10], [25.1, 15.1], [27.4, 20.2], [30.1, 25.2], [33.3, 30.3], [33, 35.4], [32.7, 40.4], [32.4, 45.4], [32.3, 50.5], [32.1, 55.6], [32, 60.6], [31.9, 65.7], [31.9, 70.7], [31.9, 75.8], [31.9, 80.9], [31.9, 85.9], [32, 91], [32.1, 96], [32.4, 101.1], [32.7, 106.2], [33, 111.2], [33.4, 116.3], [33.8, 121.3], [34.4, 126.4], [34.9, 131.4], [35.5, 136.5], [36.3, 141.6], [37, 146.6], [37.8, 151.7], [38.8, 156.7], [39.8, 161.8], [40.6, 165.8, 'c'], [38, 165.9], [34.1, 165.9], [30.2, 166.2], [26.3, 166.9], [22.5, 168.1], [18.6, 169.8], [14.7, 172.1], [10.9, 173.9], [7, 174.6], [3.1, 174.1], [-0.8, 173], [-4.6, 174.5], [-8.5, 174.6], [-12.4, 173.4], [-16.2, 170.9], [-20.1, 169], [-24, 167.6], [-27.9, 166.7], [-31.7, 166.3], [-35.6, 166.2], [-39.5, 166.3], [-40.4, 165.8, 'c'], [-39.9, 161.8], [-39.2, 156.7], [-38.5, 151.7], [-38, 146.6], [-37.4, 141.6], [-36.8, 136.5], [-36.3, 131.4], [-35.7, 126.4], [-35.3, 121.3], [-34.9, 116.3], [-34.5, 111.2], [-34.2, 106.2], [-33.8, 101.1], [-33.5, 96], [-33.4, 91], [-33.1, 85.9], [-33, 80.9], [-32.8, 75.8], [-32.8, 70.7], [-32.8, 65.7], [-32.8, 60.6], [-33, 55.6], [-33.3, 50.5], [-33.4, 45.4], [-33.8, 40.4], [-34.2, 35.4], [-33.8, 30.3], [-30.2, 25.2], [-27.4, 20.2], [-25.2, 15.1], [-23.4, 10], [-22.2, 5], [-21.5, 0, 'c']],
  demers: [[21.5, 0, 'c'], [21.8, 8], [22.6, 18], [24.6, 28], [27.6, 37], [30.6, 44, 'c'], [29.2, 48], [29.4, 62], [30.3, 90], [31.4, 120], [32.4, 148], [33.6, 166, 'c'], [28, 168.5], [22, 168], [17.5, 170.5], [13, 174.5], [7.5, 178.2], [0, 180], [-7.5, 178.2], [-13, 174.5], [-17.5, 170.5], [-22, 168], [-28, 168.5], [-33.6, 166, 'c'], [-32.4, 148], [-31.4, 120], [-30.3, 90], [-29.4, 62], [-29.2, 48], [-30.6, 44, 'c'], [-27.6, 37], [-24.6, 28], [-22.6, 18], [-21.8, 8], [-21.5, 0, 'c']],
};
function faireManche(E, C, o) {
  const { yN, diap, nF, wN, w12, zF } = o, yF = (k) => yN - diap * (1 - Math.pow(2, -k / 12)), yFin = yF(nF) - 8;
  const w = (y) => wN + (w12 - wN) * (yN - y) / (diap / 2), mT = o.touche, epT = 5;
  const trap = (y0, y1, d = 0) => { const s = new THREE.Shape(); s.moveTo(-w(y0) / 2 - d, y0); s.lineTo(w(y0) / 2 + d, y0); s.lineTo(w(y1) / 2 + d, y1); s.lineTo(-w(y1) / 2 - d, y1); s.closePath(); return s; };
  const N = new THREE.Matrix4(); if (o.pente) { const [py, pz] = o.pivot; N.makeTranslation(0, py, pz).multiply(new THREE.Matrix4().makeRotationX(-o.pente * PI / 180)).multiply(new THREE.Matrix4().makeTranslation(0, -py, -pz)); }
  const dx = o.dx || 0; if (dx) N.premultiply(new THREE.Matrix4().makeTranslation(dx, 0, 0));
  E.repere(N);
  if (o.filet) { E.plaque(trap(yFin - 1.2, yN, 1.3), epT - 0.4, C.creme, 0, 0, zF - epT); }
  E.plaque(trap(yFin, yN), epT, mT, 0, 0, zF - epT + 0.01);
  for (let k = 1; k <= nF; k++) { if (o.fretsPlates) E.aj(new THREE.PlaneGeometry(w(yF(k)) - 0.4, 1.3), C.nacre, 0, yF(k), zF + 0.05); else E.boite(w(yF(k)) - 0.4, 2.3, 1.1, C.frette, 0, yF(k), zF); }
  E.boite(wN + (o.filet ? 2 : 0), 4.6, o.hSillet || 6.2, C.os, 0, yN + 2.3, zF - 4.6);
  const zR = zF + 0.06, entre = (k) => (yF(k - 1) + yF(k)) / 2, mR = o.matRepere || C.nacre;
  for (const k of o.cases) {
    const y = entre(k), l = w(y);
    if (o.reperes === 'bord') { const r = 2.1, xb = -l / 2 + 5.2; E.disque(r, mR, xb, y, zR, 10); if (k === 12 || k === 24) E.disque(r, mR, xb + 6.4, y, zR, 10); }
    else if (o.reperes === 'points') { if (k === 12 || k === 24) { E.disque(3.1, mR, -l * 0.19, y, zR); E.disque(3.1, mR, l * 0.19, y, zR); } else E.disque(3.1, mR, 0, y, zR); }
    else if (o.reperes === 'trapezes') { const h = Math.min(20, (yF(k - 1) - yF(k)) * 0.62), a = l * 0.36, b = a * 0.86, s = new THREE.Shape(); s.moveTo(-a, -h / 2); s.lineTo(a, -h / 2); s.lineTo(b, h / 2); s.lineTo(-b, h / 2); s.closePath(); E.aj(new THREE.ShapeGeometry(s), mR, 0, y, zR); }
    else if (o.reperes === 'blocs') { const h = (yF(k - 1) - yF(k)) * 0.6; E.aj(new THREE.PlaneGeometry(l * 0.74, h), mR, 0, y, zR); }
    else if (o.reperes === 'couronnes') { const h = Math.min(17, (yF(k - 1) - yF(k)) * 0.6), a = l * 0.33, s = new THREE.Shape(); s.moveTo(-a * 0.8, -h / 2); s.lineTo(a * 0.8, -h / 2); s.lineTo(a, h * 0.2); s.lineTo(a * 0.55, 0); s.lineTo(a * 0.3, h / 2); s.lineTo(0, h * 0.05); s.lineTo(-a * 0.3, h / 2); s.lineTo(-a * 0.55, 0); s.lineTo(-a, h * 0.2); s.closePath(); E.aj(new THREE.ShapeGeometry(s), mR, 0, y, zR); }
  }
  if (!o.sansDos) { const st = [], yT = o.yTalon, pT = o.profTalon ?? 22, lT = o.longTalon ?? 40;
    const prof = (y) => { const b = 15.5 + 2.5 * (yN - y) / (yN - yT); return y >= yT + lT ? b : b + (pT - b) * lisseur(yT + lT, yT, y); };
    for (const y of [yN, yN - (yN - yT - lT) * 0.33, yN - (yN - yT - lT) * 0.66, yT + lT, yT + lT * 0.66, yT + lT * 0.33, yT, yFin + 2]) st.push(y);
    const pos = [], ind = [], S = 9;
    st.forEach((y) => { for (let j = 0; j <= S; j++) { const a = PI * j / S; pos.push(-(w(y) / 2 + (o.filet ? 1.2 : 0)) * Math.cos(a), y, zF - epT - prof(y) * Math.pow(Math.sin(a), 0.75)); } });
    for (let i = 0; i < st.length - 1; i++) for (let j = 0; j < S; j++) { const a = i * (S + 1) + j, b = a + 1, c = a + S + 1, d = c + 1; ind.push(a, b, d, a, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(ind); g.computeVertexNormals(); E.aj(g, o.matManche); }
  const eT = o.echTete || 1, T = lisse(TETES[o.tete].map((q) => [q[0] * eT, q[1] * eT * (o.echTeteY || 1), q[2]]), 170), tb = boite2(T), epTe = o.gibson ? 15 : 14;
  const demi = (y, cote) => { let m = 0; for (const q of T) if (Math.abs(q[1] - y) < 5 && q[0] * cote > m) m = q[0] * cote; return m || 30; };
  const M = new THREE.Matrix4().makeTranslation(0, yN + 2.5, zF - epT - (o.gibson ? 0 : 0.5)); if (o.gibson) M.multiply(new THREE.Matrix4().makeRotationX(-o.angle * PI / 180));
  const MT = N.clone().multiply(M); E.repere(MT);
  E.plaque(forme(T), epTe, o.matManche, 0, 0, -epTe, 0, 1.2);
  if (o.matFace) E.aj(new THREE.ShapeGeometry(forme(decale(T, o.filetTete ? 2.2 : 0.6))), o.matFace, 0, 0, 0.08);
  if (o.filetTete) E.aj(new THREE.ShapeGeometry(forme(decale(T, 0.5))), C.creme, 0, 0, 0.04);
  const postes = [], metal = o.metal || C.nickel;
  if (o.gibson) {
    const FP = o.fracPostes || [0.326, 0.566, 0.8]; FP.forEach((fr, i) => { const y = fr * tb.y1; for (const s2 of [-1, 1]) { const x = s2 * ((o.xPostes ?? 24.5) + i * (o.xPostes ? 0.5 : 1)) * eT, bord = demi(y, s2); postes[s2 < 0 ? i : 2 * FP.length - 1 - i] = [x, y];
      E.cyl(5, 1.4, metal, x, y, 0, 10); E.cyl(3, 9.5, metal, x, y, 0, 8);
      E.boite(13, 22, 8.5, metal, x, y, -epTe - 8.5); E.tige([x + s2 * 4, y, -epTe - 4.5], [s2 * (bord + 9), y, -epTe - 4.5], 1.7, metal, 6);
      if (o.boutons === 'noir') E.aj(new THREE.SphereGeometry(7, 8, 6), C.noir, s2 * (bord + 14), y, -epTe - 4.5, 0, 0, 0, 0.72, 1.05, 0.42);
      else if (o.boutons === 'tulipe') E.aj(new THREE.SphereGeometry(7, 8, 6), C.tulipe, s2 * (bord + 14), y, -epTe - 4.5, 0, 0, 0, 0.75, 1, 0.5);
      else if (o.boutons === 'nacre') E.aj(new THREE.SphereGeometry(7, 8, 6), C.nacre, s2 * (bord + 14), y, -epTe - 4.5, 0, 0, 0, 0.8, 1.05, 0.45);
      else E.aj(new THREE.SphereGeometry(7, 8, 6), metal, s2 * (bord + 14), y, -epTe - 4.5, 0, 0, 0, 0.72, 1.05, 0.42); } });
    if (o.cloche !== false) { const cl = [[-15, 7, 'c'], [15, 7, 'c'], [14, 14], [9.5, 30], [6.5, 43], [3.5, 50.5], [0, 53], [-3.5, 50.5], [-6.5, 43], [-9.5, 30], [-14, 14]].map((q) => [q[0] * eT, q[1] * eT, q[2]]);
      E.plaque(forme(lisse(cl, 40)), 1.2, C.creme, 0, 0, 0.1); E.plaque(forme(decale(lisse(cl, 40), 1.1)), 1.5, C.noirTete, 0, 0, 0.1); vis(E, C, [[0, 11 * eT], [0, 48 * eT]], 1.6, 1.5); }
    if (o.couronne) { const h = 26, a = 13, sh = new THREE.Shape(); sh.moveTo(-a * 0.7, -h / 2); sh.lineTo(a * 0.7, -h / 2); sh.lineTo(a, h * 0.15); sh.lineTo(a * 0.5, -h * 0.05); sh.lineTo(a * 0.32, h * 0.32); sh.lineTo(0, h / 2); sh.lineTo(-a * 0.32, h * 0.32); sh.lineTo(-a * 0.5, -h * 0.05); sh.lineTo(-a, h * 0.15); sh.closePath(); E.aj(new THREE.ShapeGeometry(sh), C.nacre, 0, tb.y1 * 0.6, 0.14); }
  } else {
    const PF = o.postes, an = Math.atan2(PF[5][0] - PF[0][0], PF[5][1] - PF[0][1]), nx = -Math.cos(an), ny = Math.sin(an);
    PF.forEach(([x, y], i) => { postes[i] = [x, y];
      E.cyl(4.8, 1.3, metal, x, y, 0, 10); E.cyl(3, 9, metal, x, y, 0, 8); E.cyl(1.1, 0.4, C.noirMat, x, y, 9, 6);
      E.boite(13, 23.8, 9, metal, x - nx * 1.5, y - ny * 1.5, -epTe - 9, -an); E.tige([x + nx * 6, y + ny * 6, -epTe - 4.5], [x + nx * 25, y + ny * 25, -epTe - 4.5], 1.7, metal, 6);
      E.aj(new THREE.SphereGeometry(7, 8, 6), metal, x + nx * 31, y + ny * 31, -epTe - 4.5, 0, 0, -an, 0.7, 1.05, 0.42); });
    if (o.guides) for (const [gx, gy, type] of o.guides) { if (type === 'ailette') { E.boite(11, 4.2, 1.6, metal, gx, gy, 1.6, -an); E.cyl(2.2, 3, metal, gx, gy, 0, 8); } else { E.cyl(4.4, 2.4, metal, gx, gy, 0, 12); E.cyl(1.6, 0.6, C.acier, gx, gy, 2.4, 6); } }
  }
  const zNut = o.zNut ?? 1.7, rC = [0.62, 0.52, 0.42, 0.3, 0.24, 0.2], mC = o.matCordes || C.corde, monde = (p) => new V3(...p).applyMatrix4(MT).toArray();
  E.repere();
  for (let j = 0; j < (o.douze ? 12 : 6); j++) {
    const i = o.douze ? j >> 1 : j, d2 = o.douze ? (j % 2 ? 1.3 : -1.3) : 0, rc = (o.douze && j % 2 ? rC[Math.min(5, i + 2)] : rC[i]) + 0.12;
    const xn = (-0.5 + i / 5) * (wN - 7.5) + d2, xs = (-0.5 + i / 5) * o.ecart + d2, ys = o.yS + (o.comp ? o.comp[i] : 0);
    const sil = [xs + dx, ys, o.zS], nut = new V3(xn, yN + 1.5, zF + zNut).applyMatrix4(N).toArray();
    if (o.arriere) E.tige(o.arriere(i, xs), sil, rc, i < (o.filees ?? 3) ? mC : C.corde);
    E.tige(sil, nut, rc, i < (o.filees ?? 3) ? mC : C.corde);
    E.tige(nut, monde([postes[j][0], postes[j][1], o.gibson ? 6 : 5]), rc, i < (o.filees ?? 3) ? mC : C.corde);
  }
  return { yF, yFin, w };
}
const FINIS = {
  strat: [
    { nom: 'Sunburst trois tons', degrade: { centre: '#e8a33a', milieu: '#b02a18', bord: '#0e0807', veines: 0.05, large: 78, flou: 20, largeBord: 30, flouBord: 8 }, garde: 'blanc' },
    { nom: 'Olympic White', uni: '#ece6d2', garde: 'menthe' },
    { nom: 'Fiesta Red', uni: '#d2432c', garde: 'blanc' },
    { nom: 'Lake Placid Blue', uni: '#2f5f96', metal: 0.35, garde: 'blanc' },
    { nom: 'Noir', uni: '#101012', garde: 'blanc' }],
  tele: [
    { nom: 'Butterscotch Blonde', uni: '#d9a548', veines: 0.09, garde: 'noir' },
    { nom: 'Blonde', uni: '#e6d6a6', veines: 0.07, garde: 'blanc' },
    { nom: 'Sunburst trois tons', degrade: { centre: '#e8a33a', milieu: '#b02a18', bord: '#0e0807', veines: 0.05, large: 78, flou: 20, largeBord: 30, flouBord: 8 }, garde: 'blanc' },
    { nom: 'Lake Placid Blue', uni: '#2f5f96', metal: 0.35, garde: 'blanc' },
    { nom: 'Noir', uni: '#101012', garde: 'blanc' }],
  jaguar: [
    { nom: 'Sunburst trois tons', degrade: { centre: '#e8a33a', milieu: '#b02a18', bord: '#0e0807', veines: 0.05, large: 78, flou: 20, largeBord: 30, flouBord: 8 }, garde: 'ecaille' },
    { nom: 'Olympic White', uni: '#ece6d2', garde: 'ecaille' },
    { nom: 'Candy Apple Red', uni: '#9c1218', metal: 0.4, garde: 'blanc' },
    { nom: 'Lake Placid Blue', uni: '#2f5f96', metal: 0.35, garde: 'blanc' },
    { nom: 'Noir', uni: '#101012', garde: 'ecaille' }],
  lespaul: [
    { nom: 'Heritage Cherry Sunburst', degrade: { centre: '#e8a83c', milieu: '#c0391c', bord: '#7a1410', ondes: 0.07, large: 80, largeBord: 30 }, dos: '#6a1c12' },
    { nom: 'Goldtop', uni: '#c9a24e', metal: 0.45, dos: '#4a2616' },
    { nom: 'Tobacco Burst', degrade: { centre: '#d99a3a', milieu: '#6a3414', bord: '#1c0e08', ondes: 0.07, large: 80, largeBord: 34 }, dos: '#3a1c10' },
    { nom: 'Ebony', uni: '#0e0e10', dos: '#0e0e10' }],
  lpjunior: [
    { nom: 'Vintage Sunburst', degrade: { centre: '#e6ab3c', milieu: '#7a3c14', bord: '#140b07', veines: 0.08, large: 92, largeBord: 40 }, dos: '#3a1c10' },
    { nom: 'TV Yellow', uni: '#d8c26a', veines: 0.12, dos: '#d8c26a' }],
  es335: [
    { nom: 'Sixties Cherry', uni: '#8f1218', veines: 0.12 },
    { nom: 'Vintage Sunburst', degrade: { centre: '#e0a03c', milieu: '#7a3a14', bord: '#1a0c06', veines: 0.06, large: 120, largeBord: 50 } },
    { nom: 'Vintage Natural', uni: '#d9aa5c', veines: 0.1 },
    { nom: 'Vintage Ebony', uni: '#0e0e10' }],
  sg: [
    { nom: 'Heritage Cherry', uni: '#7c1216', veines: 0.14 },
    { nom: 'Ebony', uni: '#0e0e10' },
    { nom: 'Blanc classique', uni: '#ebe5d3' },
    { nom: 'Pelham Blue', uni: '#3f79a8', metal: 0.4 },
    { nom: 'Cerise usée', uni: '#74291b', veines: 0.2, usure: true }],
  eds1275: [{ nom: 'Heritage Cherry', uni: '#7c1216', veines: 0.14 }],
  g6120: [
    { nom: 'Orange', uni: '#d45f18', dos: '#a94a12' },
    { nom: 'Noir', uni: '#101012', dos: '#101012' }],
  billybo: [
    { nom: 'Rouge', uni: '#c4181c' },
    { nom: 'Noir', uni: '#101012' }],
  sj200: [
    { nom: 'Antique Natural', uni: '#d9a352', veines: 0.12, dos: '#b06f2a' },
    { nom: 'Vintage Sunburst', degrade: { centre: '#e0a542', milieu: '#8a4216', bord: '#1e0e06', veines: 0.08, large: 150, largeBord: 60, flou: 40, flouBord: 22 }, dos: '#7a3c16' },
    { nom: 'Ebony', uni: '#0e0e10', dos: '#0e0e10' }],
  voodoo: [
    { nom: 'Cocobolo', uni: '#63200f', bois: 'cocobolo', dos: '#b8732c', version: 'creuse' },
    { nom: 'Naturel', uni: '#e3bd7c', bois: 'epinette', dos: '#d8922c', version: 'archtop' },
    { nom: 'Orange', uni: '#d24f16', bois: 'flamme', dos: '#0e0e10', version: 'creuse', filet: 'creme', manche: '#0e0e10', tete: 'carbone', boutons: 'nacre', reperes: 'points' }],
  revolver: [{ nom: 'Naturel veiné', uni: '#cdb48c', bois: 'veine', dos: '#a8622a' }],
  mini000: [{ nom: 'Naturel', uni: '#dcae62', bois: 'epinette', dos: '#3b2014' }],
  scarecrow: [{ nom: 'Érable naturel', uni: '#dcc49a', bois: 'erable', dos: '#b06a2a' }],
  scarecrowA: [{ nom: 'Épinette naturelle', uni: '#e2c890', bois: 'epinette', dos: '#8a4a22' }],
};
export const GUITARES = [
  { id: 'strat', marque: 'Fender', modele: 'Stratocaster', note: 'début des années 60, touche palissandre' },
  { id: 'tele', marque: 'Fender', modele: 'Telecaster', note: 'années 50, touche érable' },
  { id: 'jaguar', marque: 'Fender', modele: 'Jaguar', note: '1962, diapason court' },
  { id: 'lespaul', marque: 'Gibson', modele: 'Les Paul Standard', note: 'fin des années 50' },
  { id: 'lpjunior', marque: 'Gibson', modele: 'Les Paul Junior', note: 'corps plat, un seul micro' },
  { id: 'es335', marque: 'Gibson', modele: 'ES-335', note: 'repères en points' },
  { id: 'sg', marque: 'Gibson', modele: 'SG Standard', note: '1961' },
  { id: 'eds1275', marque: 'Gibson', modele: 'EDS-1275', note: 'deux manches : douze cordes en haut, six en bas' },
  { id: 'sj200', marque: 'Gibson', modele: 'SJ-200', note: 'acoustique jumbo' },
  { id: 'g6120', marque: 'Gretsch', modele: '6120', note: 'caisse creuse, vibrato' },
  { id: 'billybo', marque: 'Gretsch', modele: 'Jupiter Thunderbird', note: 'corps en fusée, deux micros' },
  { id: 'voodoo', marque: 'Demers', modele: 'Voodoo', note: 'corps creux, un pan coupé' },
  { id: 'revolver', marque: 'Demers', modele: 'Revolver', note: 'deux micros doubles, vibrato' },
  { id: 'mini000', marque: 'Demers', modele: 'Mini-jumbo 000', note: 'acoustique, d’après la L13' },
  { id: 'scarecrow', marque: 'Demers', modele: 'Scarecrow', note: 'lap steel creuse, deux P90' },
  { id: 'scarecrowA', marque: 'Demers', modele: 'Scarecrow acoustique', note: 'lap steel creuse, table d’épinette' },
].map((g) => ({ ...g, couleurs: FINIS[g.id].map((f) => f.nom), pastilles: FINIS[g.id].map((f) => f.uni || f.degrade.centre) }));
const CONTOUR_DE = { scarecrowA: 'scarecrow', lpjunior: 'lespaul' };
function matTable(P, bb, f, o = {}) {
  const map = f.degrade ? texDegrade(P, bb, { ...f.degrade, apres: o.apres }) : (f.veines || o.apres) ? texUni(P, bb, f.uni, { veines: f.veines, apres: o.apres, L: o.apres ? 512 : 256 }) : null;
  return vernis({ color: map ? 0xffffff : new THREE.Color(f.uni), map, metalness: f.metal || 0, roughness: f.metal ? 0.34 : 0.3 });
}
const CONTOURS = {
  strat: [[4, -239], [36, -237], [70, -230], [113, -215], [134, -201], [145, -186], [153, -172], [158, -158], [161, -144], [161.5, -130], [161, -115], [159, -101], [157, -87], [152, -73], [146, -59], [141, -44], [133, -30], [126, -16], [121, -2], [115, 12], [113.5, 27], [115, 41], [118, 55], [124, 69], [129, 83], [133, 97], [136, 112], [137, 126], [135.5, 140], [131, 154], [126, 165], [117, 171], [109, 167], [102, 158], [97, 150], [93.5, 140], [88, 125], [76, 113], [62, 106], [44, 104], [28, 110, 'c'], [-28, 152, 'c'], [-42, 150], [-56, 154], [-72, 163], [-81, 170], [-89, 183], [-93, 197], [-95, 211], [-96.5, 225], [-99, 238], [-103, 244], [-109, 241], [-122, 225], [-133, 211], [-137, 197], [-139.5, 183], [-141, 168], [-139, 154], [-136.5, 140], [-133, 126], [-129, 112], [-125, 97], [-120, 83], [-116.5, 69], [-114, 55], [-113, 41], [-114.5, 27], [-118, 12], [-122, -2], [-128.5, -16], [-135, -30], [-141, -44], [-147, -59], [-152, -73], [-156.5, -87], [-159, -101], [-161, -115], [-161.5, -130], [-162, -144], [-158, -158], [-152.5, -172], [-143, -186], [-127, -201], [-104, -215], [-62, -230], [-28, -237]],
  tele: [[0, -206], [50, -204], [88, -199], [125, -183], [141, -167], [152, -151], [159, -135], [162, -118], [162, -102], [159, -86], [157, -70], [152, -53], [145, -37], [137, -21], [129, -5], [121, 11], [116, 28], [114, 44], [115, 60], [120, 76], [127, 93], [133, 109], [136, 125], [138, 141], [137, 157], [131, 174], [120, 188], [108, 196], [98, 194], [90, 178], [84, 160], [75, 143], [60, 130], [44, 123], [29, 124, 'c'], [-29, 186, 'c'], [-44, 193], [-64, 202], [-82, 208], [-98, 206], [-126, 190], [-139, 174], [-144, 157], [-145, 141], [-143, 125], [-138, 109], [-132, 93], [-126, 76], [-120, 60], [-117, 44], [-119, 28], [-125, 11], [-132, -5], [-139, -21], [-146, -37], [-153, -53], [-158, -70], [-161, -86], [-162, -102], [-161, -118], [-157, -135], [-151, -151], [-141, -167], [-123, -183], [-86, -199], [-48, -204]],
  jaguar: [[45, -245], [95, -241], [124, -234], [153, -218], [166, -202], [174, -186], [177, -170], [177, -154], [173, -138], [168, -122], [160, -106], [150, -90], [138, -74], [130, -57], [123, -41], [120, -25], [123, -9], [128, 7], [134, 23], [139, 39], [142, 55], [145, 71], [144, 87], [141, 104], [137, 118], [128, 130], [112, 134], [90, 133], [72, 130], [58, 124], [44, 119], [30, 120, 'c'], [-30, 154, 'c'], [-44, 160], [-58, 170], [-81, 188], [-95, 204], [-110, 221], [-122, 237], [-130, 246], [-137, 241], [-141, 230], [-148, 216], [-150, 200], [-150, 184], [-149, 168], [-144, 152], [-140, 136], [-134, 120], [-128, 104], [-124, 87], [-121, 71], [-120, 55], [-122, 39], [-127, 23], [-134, 7], [-141, -9], [-150, -25], [-160, -41], [-167, -57], [-173, -74], [-176, -90], [-177, -106], [-175, -122], [-172, -138], [-165, -154], [-155, -170], [-142, -186], [-123, -202], [-93, -218], [-33, -236]],
  lespaul: [[0, -232], [70, -228], [124, -206], [157, -158], [166, -102], [157, -48], [130, -8], [106, 22], [95, 50], [96, 78], [107, 104], [119, 134], [125, 160], [123, 180], [116, 194], [110, 201, 'c'], [101, 191], [92, 176], [83, 154], [71, 134], [55, 124], [38, 123], [22, 127, 'c'], [-22, 189, 'c'], [-40, 198], [-65, 205], [-92, 200], [-110, 180], [-117, 150], [-112, 116], [-100, 80], [-94, 50], [-104, 22], [-129, -6], [-157, -48], [-166, -102], [-157, -158], [-124, -206], [-70, -228]],
  es335: miroir([[0, -245], [78, -238], [141, -212], [182, -169], [202, -121], [204, -73], [193, -29], [170, 12], [146, 47], [130, 79], [126, 97], [127, 116], [133, 142], [139, 171], [136, 201], [122, 227], [104, 242], [82, 244], [66, 233], [57, 213], [52, 193], [48, 178], [42, 172], [35, 180], [30, 198], [27.5, 222, 'c'], [0, 222]]),
  sg: [[0, -212], [45, -210], [84, -198], [118, -180], [138, -164], [151, -148], [159.5, -132], [164, -117], [167, -102], [168.5, -86], [166.5, -71], [163.5, -56], [158.5, -41], [152, -25], [142.5, -10], [131.5, 5], [122, 20], [116, 37], [114, 52], [115, 66], [122, 80], [127, 94], [132, 108], [133.5, 122], [131.5, 136], [130, 150], [128, 164], [125, 178], [122, 192], [116, 206], [106, 217], [100, 220], [97, 214], [92, 198], [84, 178], [72, 160], [56, 150], [40, 151], [27, 158, 'c'], [-27, 162, 'c'], [-40, 154], [-58, 154], [-74, 164], [-86, 182], [-94, 204], [-100, 224], [-104, 234], [-110, 228], [-118, 212], [-123, 196], [-125, 178], [-128, 164], [-130, 150], [-131.5, 136], [-133.5, 122], [-132, 108], [-127, 94], [-122, 80], [-115, 66], [-114, 52], [-116, 37], [-122, 20], [-131.5, 5], [-142.5, -10], [-152, -25], [-158.5, -41], [-163.5, -56], [-166.5, -71], [-168.5, -86], [-167, -102], [-164, -117], [-159.5, -132], [-151, -148], [-138, -164], [-118, -180], [-84, -198], [-45, -210]],
  voodoo: [[-29, 213, 'c'], [-46, 213], [-66, 213], [-85, 212], [-104, 206], [-121, 195], [-133, 180], [-137, 161], [-135, 142], [-126, 124], [-115, 108], [-105, 91], [-101, 72], [-106, 53], [-119, 39], [-133, 25], [-145, 10], [-156, -6], [-165, -24], [-169, -43], [-170, -63], [-168, -82], [-163, -101], [-155, -119], [-144, -135], [-130, -150], [-116, -163], [-100, -174], [-82, -184], [-64, -192], [-46, -199], [-26, -204], [-7, -207], [12, -209], [29, -210], [48, -210], [68, -209], [87, -206], [106, -201], [123, -194], [139, -182], [152, -167], [161, -150], [167, -131], [170, -112], [169, -92], [166, -73], [161, -54], [153, -36], [145, -18], [133, -2], [121, 13], [109, 29], [100, 46], [98, 65], [105, 84], [114, 101], [122, 119], [125, 138], [122, 158], [108, 171], [93, 162], [82, 146], [64, 138], [46, 143], [29, 148, 'c']],
  revolver: [[-29, 197, 'c'], [-46, 197], [-65, 203], [-84, 210], [-103, 212], [-122, 209], [-139, 199], [-142, 180], [-140, 160], [-132, 143], [-120, 127], [-109, 110], [-102, 92], [-97, 73], [-99, 54], [-108, 36], [-119, 20], [-130, 4], [-141, -12], [-148, -30], [-154, -49], [-158, -68], [-159, -88], [-159, -106], [-156, -125], [-148, -140], [-134, -153], [-118, -164], [-102, -175], [-85, -185], [-67, -193], [-48, -199], [-29, -203], [-9, -206], [10, -208], [30, -211], [49, -211], [69, -210], [88, -206], [106, -199], [124, -191], [140, -180], [152, -165], [160, -148], [162, -128], [158, -110], [155, -91], [152, -71], [148, -52], [143, -33], [134, -15], [125, 2], [116, 19], [108, 37], [104, 56], [107, 76], [113, 95], [117, 114], [120, 133], [118, 153], [105, 166], [94, 150], [83, 133], [65, 128], [45, 131], [29, 134, 'c']],
  mini000: miroir([[0, -248], [114, -231], [142, -215], [160, -197], [172, -181], [181, -165], [188, -148], [191, -132], [193, -115], [192, -98], [190, -82], [186, -65], [180, -49], [172, -33], [160, -15], [147, 1], [133, 18], [122, 34], [118, 50], [123, 67], [130, 84], [137, 100], [142, 117], [145, 133], [145, 150], [142, 167], [136, 183], [125, 200], [106, 216], [29, 233, 'c'], [0, 233]]),
  scarecrow: miroir([[0, -228], [83, -213], [116, -198], [140, -182], [156, -167], [160, -151], [157, -136], [154, -120], [147, -105], [133, -89], [124, -75], [118, -60], [109, -44], [102, -29], [101, -13], [99, 2], [97, 18], [98, 32], [103, 48], [108, 63], [115, 78], [124, 94], [132, 109], [135, 125], [134, 140], [126, 156], [109, 170], [81, 186], [60, 201], [45, 214], [36, 232], [31.5, 262], [29.5, 330], [28.5, 430], [27.5, 517, 'c'], [0, 517]]),
  eds1275: miroir([[0, -205], [70, -203], [140, -190], [190, -160], [214, -115], [219, -70], [210, -25], [192, 10], [176, 40], [168, 70], [172, 100], [180, 130], [182, 160], [176, 190], [166, 210], [156, 217], [148, 206], [141, 182], [129, 162], [114, 152], [103, 150, 'c'], [47, 150, 'c'], [32, 140], [14, 129], [0, 126]]),
  g6120: [[-28, 222, 'c'], [-60, 224], [-100, 215], [-135, 190], [-150, 155], [-148, 120], [-135, 85], [-126, 55], [-130, 20], [-150, -20], [-180, -70], [-200, -120], [-203, -170], [-190, -215], [-160, -255], [-110, -285], [-50, -298], [0, -300], [50, -298], [110, -285], [160, -255], [190, -215], [203, -170], [200, -120], [180, -70], [150, -20], [130, 20], [126, 55], [135, 85], [146, 115], [151, 140], [149, 160], [139, 172], [122, 170], [105, 155], [88, 135], [70, 120], [50, 112], [28, 112, 'c']],
  billybo: [[31, 195, 'c'], [51, 178], [89, 144], [121, 110], [118, 68], [127, 21], [149, -47], [168, -115], [175, -157], [170, -177], [136, -176], [93, -166], [76, -156], [59, -159], [49, -173], [38, -179], [-17, -193], [-76, -221], [-127, -251], [-149, -258, 'c'], [-153, -217], [-148, -149], [-132, -64], [-124, 4], [-140, 72], [-150, 140], [-144, 208], [-119, 264, 'c'], [-76, 244], [-47, 225], [-31, 222, 'c']],
  sj200: miroir([[0, -267], [90, -262], [164, -236], [204, -187], [216, -126], [206, -66], [176, -16], [147, 20], [133, 55], [133, 90], [145, 125], [156, 160], [158, 195], [147, 230], [119, 255], [70, 265], [0, 266]]),
};
function faire(id, f) {
  const C = commun(), E = etabli(), grp = new THREE.Group();
  const P = lisse(CONTOURS[CONTOUR_DE[id] || id], id.startsWith('scarecrow') ? 210 : 150), bb = boite2(P);
  const corps = (o, mats) => { const r = faireCorps(P, o); const m = new THREE.Mesh(r.geo, mats); m.castShadow = true; grp.add(m); return r; };
  const garde = (nom) => ({ blanc: C.blanc, menthe: C.menthe, noir: C.noir, ecaille: C.ecaille, creme: C.creme })[nom];
  const fender = id === 'strat' || id === 'tele' || id === 'jaguar';
  let tri = 0;
  if (id === 'strat') {
    const ep = 44.5, yS = -70, yN = yS + 648, tb = ep / 2;
    const H = (x, y) => -Math.min(15, Math.max(0, (-x * 0.82 - y * 0.57) - 150) * 0.42);
    const B = (x, y) => 17 * lisseur(52, 0, Math.hypot((x + 138) / 1.0, (y - 45) / 1.9));
    const mt = matTable(P, bb, f);
    const r = corps({ ep, rH: 8, rB: 8, H, B, insH: [9, 17], insB: [9, 17], centre: [0, -40] }, [mt, mt, mt]); tri += r.geo.index.count / 3;
    const g = garde(f.garde), zG = tb + 0.2, zP = zG + 2.2, capot = f.garde === 'menthe' ? C.creme : C.blanc;
    E.plaque(forme(lisse([[28, 106, 'c'], [42, 96], [60, 94], [80, 100], [96, 120], [104, 144], [112, 158], [121, 151], [126, 126], [118, 88], [106, 52], [104, 26], [108, 0], [120, -30], [134, -62], [143, -90], [142, -112], [132, -134], [112, -144], [80, -128], [54, -106], [44, -92], [43, -74, 'c'], [43, -54, 'c'], [-43, -54, 'c'], [-46, -70], [-60, -68], [-76, -46], [-83, -10], [-84, 32], [-80, 73], [-72, 112], [-62, 128], [-52, 136], [-40, 136], [-28, 140, 'c'], [-28, 106, 'c']], 130)), 2.2, g, 0, 0, zG, 0, 0.5);
    vis(E, C, [[-36, 130], [-74, 100], [-80, 20], [-64, -60], [52, -100], [106, -136], [136, -86], [104, -2], [101, 56], [116, 146], [40, 98]], zP);
    simple(E, C, 0, 91, zP, 0, capot); simple(E, C, 0, 28, zP, 0, capot); simple(E, C, 0, -30, zP, -0.17, capot);
    for (const [x, y] of [[52, -52], [90, -75], [124, -106]]) { E.cyl(12.6, 11, capot, x, y, zP, 16, 10.2); E.cyl(13.4, 2, capot, x, y, zP, 16); }
    E.plaque(rr(27, 3.2, 1.5), 0.6, C.noirMat, 91, -23, zP, -0.82); E.tige([91, -23, zP], [88.5, -20.5, zP + 9], 1.2, C.nickel, 5); E.aj(new THREE.BoxGeometry(4.2, 7.5, 6), capot, 88, -20, zP + 11, 0, 0, -0.82);
    E.plaque(rr(27, 62, 13), 2.4, C.chrome, 93, -164, tb + 0.1, 0.88, 0.8); E.disque(5.5, C.trou, 93, -164, tb + 2.6); vis(E, C, [[74, -148], [112, -180]], tb + 2.5, 1.6);
    E.boite(84, 40, 2.6, C.chrome, 0, yS - 12, tb + 0.2); for (let i = 0; i < 6; i++) { E.boite(9.6, 19, 5.2, C.chrome, -26.2 + i * 10.48, yS - 3, tb + 2.8); E.cyl(1.6, 1, C.acier, -26.2 + i * 10.48, yS - 22, tb + 2.8, 6); }
    vis(E, C, [-26.2, -15.7, -5.2, 5.2, 15.7, 26.2].map((x) => [x, yS + 5]), tb + 2.8, 1.7);
    E.tige([36, yS - 22, tb + 4], [40, yS - 26, tb + 19], 2.3, C.chrome, 6); E.tige([40, yS - 26, tb + 19], [138, yS - 58, tb + 24], 2.3, C.chrome, 6); E.aj(new THREE.CylinderGeometry(4, 3.4, 22, 8), C.blanc, 147, yS - 61, tb + 24.3, 0, 0, 1.26);
    { const sh = rr(96, 150, 9); for (let i = 0; i < 6; i++) { const t = new THREE.Path(); t.absellipse(-26 + i * 10.4, -58, 3.2, 5, 0, PI * 2); sh.holes.push(t); } E.aj(ext(sh, 1.8), C.blanc, 0, yS + 48, -tb - 0.2, 0, PI, 0); }
    E.aj(ext(rr(51, 64, 5), 2, 0.6), C.chrome, 0, 138, -tb - 0.2, 0, PI, 0); for (const [x, y] of [[-17, 115], [17, 115], [-17, 161], [17, 161]]) E.cyl(3.4, 1, C.acier, x, y, -tb - 3.2, 8);
    faireManche(E, C, { yN, diap: 648, nF: 21, wN: 42, w12: 51.5, zF: tb + 8.5, touche: C.palissandre, reperes: 'points', cases: [3, 5, 7, 9, 12, 15, 17, 19, 21], matRepere: C.creme, yTalon: 152, profTalon: 18, longTalon: 10,
      matManche: C.erable, tete: 'strat', metal: C.nickel, postes: [[-20, 37], [-14, 60], [-7, 83], [0, 107], [6, 130], [13, 152]], guides: [[13, 82, 'ailette']], yS, zS: tb + 12, ecart: 52.4, comp: [-3, -2.4, -1.2, -2.4, -1.2, 0], arriere: (i, xs) => [xs, yS - 12, tb + 5] });
    attache(E, C, [6, -240, 0], [0, -1, 0]); attache(E, C, [-103, 244, 0], [-0.15, 1, 0]);
  }
  if (id === 'tele') {
    const ep = 44.5, yS = -68, yN = yS + 648, tb = ep / 2, mt = matTable(P, bb, f);
    const r = corps({ ep, rH: 3.2, rB: 3.2 }, [mt, mt, mt]); tri += r.geo.index.count / 3;
    const g = garde(f.garde), zG = tb + 0.2, zP = zG + 2;
    E.plaque(forme(lisse([[29, 112, 'c'], [50, 115], [62, 119], [74, 131], [84, 150], [92, 170], [102, 185], [114, 187], [124, 177], [128, 158], [129, 124], [118, 84], [110, 40], [111, 16], [120, -6, 'c'], [42, -6, 'c'], [42, 3, 'c'], [-40, 3, 'c'], [-40, -6, 'c'], [-78, -6, 'c'], [-82, 21], [-83, 62], [-78, 103], [-65, 136], [-50, 158], [-40, 168], [-29, 170, 'c'], [-29, 112, 'c']], 110)), 2, g, 0, 0, zG, 0, 0.4);
    vis(E, C, [[-72, 0], [-77, 100], [-36, 162], [114, 0], [118, 176]], zP);
    E.plaque(rr(70, 17, 8.5), 7.5, C.chrome, 0, 93, zP, 0, 1.5); vis(E, C, [[-40, 93], [40, 93]], zP, 1.6);
    { E.plaque(rr(80, 90, 3), 1.6, C.chrome, 0, yS + 26, tb + 0.1);
      for (const sx of [-39.2, 39.2]) E.boite(1.6, 46, 9, C.chrome, sx, yS + 4, tb + 1.6); E.boite(80, 1.6, 9, C.chrome, 0, yS - 18.2, tb + 1.6);
      E.plaque(rr(72, 20, 10), 6.5, C.noir, 0, yS + 49, tb + 1.7, -0.26, 1); for (let i = 0; i < 6; i++) { const u = -26.5 + i * 10.6; E.cyl(2.4, 0.6, C.acier, u * Math.cos(-0.26), yS + 49 + u * Math.sin(-0.26), tb + 8.2, 8); }
      for (const [sx, a] of [[-21.5, -0.05], [0, -0.04], [21.5, -0.03]]) { E.aj(new THREE.CylinderGeometry(4, 4, 20.5, 10), C.laiton, sx, yS, tb + 7.5, 0, 0, PI / 2 + a); E.tige([sx - 5, yS - 3, tb + 7.5], [sx - 5, yS - 17, tb + 7.5], 1.2, C.acier, 5); E.tige([sx + 5, yS - 3, tb + 7.5], [sx + 5, yS - 17, tb + 7.5], 1.2, C.acier, 5); }
      vis(E, C, [[-30, yS + 66], [30, yS + 66], [-30, yS + 30], [30, yS + 30]], tb + 1.7, 1.8); }
    E.plaque(rr(32, 154, 9), 1.8, C.chrome, 92, -73, tb + 0.1, 0, 0.6); vis(E, C, [[92, -3], [92, -143]], tb + 1.9, 2);
    for (const y of [-68, -124]) { E.cyl(9.6, 14, C.nickel, 92, y, tb + 1.9, 18); E.cyl(9.2, 0.6, C.chrome, 92, y, tb + 15.9, 18); for (let k = 0; k < 12; k++) { const a = k * PI / 6; E.boite(1, 1.4, 11, C.acier, 92 + 9.7 * Math.cos(a), y + 9.7 * Math.sin(a), tb + 4.4, a); } }
    E.plaque(rr(3, 28, 1.5), 0.5, C.noirMat, 92, -30, tb + 1.9); E.tige([92, -30, tb + 2], [92, -22, tb + 11], 1.3, C.nickel, 5); E.cyl(3.6, 7, C.noir, 92, -21, tb + 9, 8, 2.6);
    E.aj(new THREE.CylinderGeometry(9.5, 9.5, 3, 14), C.chrome, 162.5, -106, 0, 0, 0, PI / 2); E.aj(new THREE.CylinderGeometry(4.6, 4.6, 3.4, 10), C.trou, 162.6, -106, 0, 0, 0, PI / 2);
    E.aj(ext(rr(51, 64, 5), 2, 0.6), C.chrome, 0, 152, -tb - 0.2, 0, PI, 0); for (const [x, y] of [[-17, 129], [17, 129], [-17, 175], [17, 175]]) E.cyl(3.4, 1, C.acier, x, y, -tb - 3.2, 8);
    for (let i = 0; i < 6; i++) { E.cyl(4, 1.2, C.chrome, -27 + i * 10.8, yS - 14, -tb - 1.3, 10); }
    faireManche(E, C, { yN, diap: 648, nF: 21, wN: 42, w12: 51.5, zF: tb + 8.5, touche: C.erable, reperes: 'points', cases: [3, 5, 7, 9, 12, 15, 17, 19, 21], matRepere: C.noir, yTalon: 186, profTalon: 18, longTalon: 10,
      matManche: C.erable, tete: 'tele', metal: C.nickel, postes: [[-20, 38], [-13, 61], [-6, 85], [1, 108], [8, 132], [15, 155]], guides: [[15, 96, 'rond']], yS, zS: tb + 12, ecart: 54, comp: [-1.5, -0.5, -1.2, -0.4, -1, 0], arriere: (i, xs) => [xs, yS - 16, tb + 3] });
    attache(E, C, [0, -206, 0], [0, -1, 0]); attache(E, C, [-84, 208, 0], [-0.05, 1, 0]);
  }
  if (id === 'jaguar') {
    const ep = 41.5, yS = -56, yN = yS + 610, tb = ep / 2;
    const H = (x, y) => -Math.min(13, Math.max(0, (-x * 0.86 - y * 0.5) - 162) * 0.4), B = (x, y) => 15 * lisseur(52, 0, Math.hypot((x + 138) / 1.0, (y - 60) / 2));
    const mt = matTable(P, bb, f), r = corps({ ep, rH: 8, rB: 8, H, B, insH: [9, 17], insB: [9, 17], centre: [0, -50] }, [mt, mt, mt]); tri += r.geo.index.count / 3;
    const g = garde(f.garde), zG = tb + 0.2, zP = zG + 2.2, zC = tb + 2.1;
    E.plaque(forme(lisse([[30, 104, 'c'], [30, 114, 'c'], [50, 114], [71, 123], [104, 123], [124, 112], [132, 90], [127, 49], [120, 20], [110, -15], [106, -37], [92, -44, 'c'], [60, -44, 'c'], [57, -52], [30, -62], [-35, -66], [-50, -56], [-55, -25], [-58, 25], [-64, 45, 'c'], [-53, 64, 'c'], [-50, 98], [-50, 142, 'c'], [-38, 148], [-30, 150, 'c'], [-30, 104, 'c']], 130)), 2.2, g, 0, 0, zG, 0, 0.5);
    vis(E, C, [[40, 110], [118, 108], [124, 40], [104, -30], [40, -58], [-40, -60], [-54, -20], [-45, 110], [66, 40], [-46, 40]], zP);
    for (const y of [81, -20]) { E.plaque(rr(71, 18.5, 9), 7.5, C.blanc, 0, y, zP, 0, 1.2); for (let i = 0; i < 6; i++) E.cyl(2.3, 0.6, C.acier, -26 + i * 10.4, y, zP + 7.5, 8);
      for (const s2 of [-1, 1]) { E.boite(76, 2, 6.5, C.chrome, 0, y + s2 * 10.6, zP); for (let i = 0; i < 8; i++) E.boite(4.2, 3.6, 5.4, C.chrome, -31.5 + i * 9, y + s2 * 12.6, zP); } vis(E, C, [[-42, y], [42, y]], zP, 1.6); }
    E.plaque(forme(lisse([[82, 92], [94, 96], [112, 94], [120, 84], [120, 42], [112, 32], [94, 30], [82, 36], [78, 48], [78, 80]], 50)), 1.8, C.chrome, 0, 0, zP, 0, 0.5);
    for (const y of [76, 61, 47]) { E.boite(6, 11, 1.4, C.noirMat, 100, y, zP + 1.8); E.boite(5, 5, 4, C.noir, 100, y + 2.5, zP + 1.9); }
    vis(E, C, [[86, 89], [114, 87], [114, 38], [86, 37]], zP + 1.8, 1.6);
    E.plaque(forme(lisse([[-108, 167], [-106, 179], [-81, 162], [-50, 142, 'c'], [-50, 98], [-53, 64, 'c'], [-64, 45, 'c'], [-81, 69], [-92, 98], [-103, 137]], 60)), 2, C.chrome, 0, 0, tb + 0.1, 0, 0.5);
    E.boite(6, 12, 1.4, C.noirMat, -87, 150, zC, 0.6); E.boite(5, 5, 4, C.noir, -88.5, 152, zC + 0.1, 0.6);
    for (const [x, y] of [[-76, 116], [-73, 80]]) { E.boite(5, 15, 1.2, C.noirMat, x, y, zC); E.aj(new THREE.CylinderGeometry(6.6, 6.6, 3.2, 14), C.noir, x, y, zC + 0.6, 0, 0, PI / 2); }
    vis(E, C, [[-102, 168], [-56, 138], [-64, 52], [-96, 110]], zC, 1.6);
    E.plaque(forme(lisse([[60, -44, 'c'], [92, -44, 'c'], [127, -78], [156, -122], [152, -147], [127, -142], [92, -108], [64, -69]], 60)), 2, C.chrome, 0, 0, tb + 0.1, 0, 0.5);
    for (const [x, y] of [[97, -76], [120, -100]]) { E.cyl(12.6, 11, C.noir, x, y, zC, 16, 10.2); E.cyl(13.4, 2, C.noir, x, y, zC, 16); }
    prise(E, C, 138, -126, zC); vis(E, C, [[68, -50], [146, -140], [84, -92], [124, -86]], zC, 1.6);
    E.aj(new THREE.BoxGeometry(80, 13, 5), C.chrome, 0, yS, tb + 6.5); for (let i = 0; i < 6; i++) E.aj(new THREE.CylinderGeometry(3.2, 3.2, 11, 8), C.chrome, -26 + i * 10.4, yS, tb + 10.5); for (const sx of [-36, 36]) E.cyl(6, 6.5, C.chrome, sx, yS, tb, 12);
    E.plaque(forme(lisse([[-47, -118], [-38, -104], [-16, -99], [16, -99], [38, -104], [47, -118], [46, -168], [40, -182], [24, -186], [-24, -186], [-40, -182], [-46, -168]], 70)), 2.4, C.chrome, 0, 0, tb + 0.1, 0, 0.7);
    E.boite(66, 9, 5, C.chrome, 0, -174, tb + 2.5); E.boite(34, 26, 2.2, C.nickel, 0, -148, tb + 2.5); E.cyl(4.2, 3.4, C.acier, -22, -128, tb + 2.5, 10);
    vis(E, C, [[-38, -112], [38, -112], [-40, -146], [40, -146], [-34, -178], [34, -178]], tb + 2.5, 1.8);
    E.tige([24, -128, tb + 3], [28, -124, tb + 18], 2.3, C.chrome, 6); E.tige([28, -124, tb + 18], [88, 18, tb + 22], 2.3, C.chrome, 6); E.aj(new THREE.CylinderGeometry(4, 3.4, 22, 8), C.blanc, 91, 27, tb + 22.3, 0, 0, -0.4);
    E.aj(ext(rr(51, 64, 5), 2, 0.6), C.chrome, 0, 130, -tb - 0.2, 0, PI, 0); for (const [x, y] of [[-17, 107], [17, 107], [-17, 153], [17, 153]]) E.cyl(3.4, 1, C.acier, x, y, -tb - 3.2, 8);
    faireManche(E, C, { yN, diap: 610, nF: 22, wN: 41.5, w12: 51, zF: tb + 8.5, touche: C.palissandre, reperes: 'points', cases: [3, 5, 7, 9, 12, 15, 17, 19, 21], matRepere: C.creme, yTalon: 154, profTalon: 18, longTalon: 10,
      matManche: C.erable, tete: 'jaguar', metal: C.nickel, postes: [[-20, 38], [-12, 63], [-6, 87], [0, 110], [5, 134], [10, 157]], guides: [[13, 63, 'ailette']],
      matFace: f.uni ? vernis({ color: new THREE.Color(f.uni), metalness: f.metal || 0 }) : null, yS, zS: tb + 14, ecart: 52, arriere: (i, xs) => [xs * 0.92, -174, tb + 7] });
    attache(E, C, [45, -245, 0], [0.1, -1, 0]); attache(E, C, [-130, 246, 0], [-0.15, 1, 0]);
  }
  if (id === 'lespaul' || id === 'es335' || id === 'sg') {
    const lp = id === 'lespaul', es = id === 'es335', sg = id === 'sg';
    const ep = lp ? 50 : es ? 42 : 35, tb = ep / 2, yS = lp ? -60 : es ? 14 : -12, yN = yS + 628;
    const bombe = lp ? 9 : es ? 11 : 0;
    const H = lp ? (x, y, d) => 9 * lisseur(4, 62, d) : es ? (x, y, d) => 11 * lisseur(2, 105, d) : (x, y, d) => -6.5 * Math.max(0, 1 - d / 12);
    const B = es ? (x, y, d) => -8 * lisseur(2, 105, d) : sg ? (x, y, d) => 4.5 * Math.max(0, 1 - d / 11) : null;
    const ouies = es ? (g, { E: e, c }) => { const X = (x) => (x - bb.x0) * e, Y = (y) => c.height - (y - bb.y0) * e; g.fillStyle = '#060403'; g.strokeStyle = '#060403'; g.lineCap = 'round';
      for (const s of [-1, 1]) { g.lineWidth = 7.5 * e; g.beginPath(); g.moveTo(X(s * 104), Y(58)); g.bezierCurveTo(X(s * 92), Y(30), X(s * 150), Y(-36), X(s * 138), Y(-66)); g.stroke();
        g.beginPath(); g.arc(X(s * 110), Y(57), 7 * e, 0, PI * 2); g.fill(); g.beginPath(); g.arc(X(s * 132), Y(-65), 8.5 * e, 0, PI * 2); g.fill();
        g.lineWidth = 3 * e; g.beginPath(); g.moveTo(X(s * 108), Y(-4)); g.lineTo(X(s * 132), Y(2)); g.stroke(); } } : null;
    const usure = f.usure ? (g, { X, Y, E: e }) => { const r = alea(29); g.filter = `blur(${13 * e}px)`;
      for (const [x, y, rx, ry, col] of [[-128, -112, 30, 52, 'rgba(190,128,84,.42)'], [80, -170, 50, 18, 'rgba(190,128,84,.3)'], [-104, 70, 20, 44, 'rgba(150,84,52,.4)'], [112, -30, 34, 42, 'rgba(38,12,8,.36)'], [0, -200, 90, 10, 'rgba(190,128,84,.4)'], [-20, 40, 30, 60, 'rgba(38,12,8,.28)'], [40, 90, 60, 40, 'rgba(38,12,8,.22)']]) { g.fillStyle = col; g.beginPath(); g.ellipse(X(x), Y(y), rx * e, ry * e, 0, 0, PI * 2); g.fill(); }
      g.filter = 'none'; for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(232,196,156,${0.1 + r() * 0.28})`; g.lineWidth = (0.5 + r()) * e; const x = -160 + r() * 320, y = -205 + r() * 410; g.beginPath(); g.moveTo(X(x), Y(y)); g.lineTo(X(x + (r() - 0.5) * 34), Y(y + (r() - 0.5) * 34)); g.stroke(); } } : null;
    const mt = matTable(P, bb, f, { apres: ouies || usure });
    const md = lp ? vernis({ color: new THREE.Color(f.dos), map: f.dos === '#0e0e10' ? null : texUni(P, bb, '#ffffff', { veines: 0.16 }), roughness: 0.36 }) : es ? matTable(P, bb, f) : mt;
    const r = corps(lp ? { ep, rH: 2, rB: 4, H, insH: [10, 24], filetH: 4.5 } : es ? { ep, rH: 2, rB: 2, H, B, insH: [12, 30], insB: [12, 30], filetH: 4, filetB: 3 } : { ep, rH: 1.5, rB: 1.5, H, B, insH: [6, 12], insB: [5.5, 11], centre: [0, -40] }, [mt, md, C.creme]);
    tri += r.geo.index.count / 3;
    const z = r.zH, metal = C.nickel, yM = lp ? 82 : es ? 154 : 124, yC = yS + (sg ? 44 : 43), cadre = lp ? C.creme : C.noir;
    const yFin = yN - 628 * (1 - Math.pow(2, -22 / 12)) - 8, pente = sg ? 0 : 4;
    const zF = sg ? tb + 5.5 : z(0, yFin) + 5.4, zCorde = sg ? z(0, yS) + 13 : zF + (yFin - yS) * Math.tan(pente * PI / 180) + 3.2;
    double(E, C, 0, yM, z(0, yM) - 1 + (sg ? 0 : 2), cadre, metal); double(E, C, 0, yC, z(0, yC) - 1 + (sg ? 0 : 2.5), cadre, metal);
    tom(E, C, yS, sg ? z(0, yS) : zCorde - 12.8, 51.5, metal); stopbar(E, C, yS - 41, z(0, yS - 41), metal);
    if (lp) {
      E.plaque(forme(lisse([[48, -42, 'c'], [70, -39], [92, -10], [98, 25], [94, 60], [96, 90], [92, 107], [80, 117], [62, 115], [48, 111, 'c']], 60)), 2, C.creme, 0, 0, tb + bombe + 3, 0, 0.5);
      for (const [x, y] of [[66, -104], [106, -84], [84, -152], [124, -130]]) hautDeForme(E, C, x, y, z(x, y), C.dore);
      inverseur(E, C, -84, 142, z(-84, 142), C.creme);
      E.boite(2, 34, 34, C.creme, 153.5, -168, -17, -0.52);
      E.aj(ext(forme(lisse([[52, -84], [96, -70], [134, -92], [140, -134], [112, -166], [72, -160], [46, -124]], 40)), 1.6), C.noir, 0, 0, -tb - 0.1, 0, PI, 0, -1, 1, 1); E.aj(new THREE.CircleGeometry(26, 20), C.noir, -84, 142, -tb - 1.2, 0, PI, 0);
      attache(E, C, [0, -232, 0], [0, -1, 0]); attache(E, C, [-66, 205.5, 0], [-0.05, 1, 0]);
    } else if (es) {
      E.plaque(forme(lisse([[47, 24, 'c'], [60, 27], [80, 40], [98, 62], [113, 88, 'c'], [102, 116], [86, 142], [66, 160], [47, 170, 'c']], 60)), 2, C.noir, 0, 0, tb + bombe + 3, 0, 0.5);
      for (const [x, y] of [[139, -27], [93, -64], [159, -92], [111, -127]]) hautDeForme(E, C, x, y, z(x, y), C.noir, C.nickel);
      inverseur(E, C, 84, -18, z(84, -18), null); prise(E, C, 64, -183, z(64, -183));
      attache(E, C, [0, -245, 0], [0, -1, 0]); attache(E, C, [0, 214, -tb - 8], [0, 0.2, -1]);
    } else {
      E.plaque(forme(lisse([[47, -8, 'c'], [62, -16], [82, -20], [98, -8], [108, 20], [110, 60], [113, 100], [108, 128], [98, 150], [92, 158], [80, 150], [60, 143], [47, 142, 'c']], 70)), 2, C.noir, 0, 0, tb + 0.2, 0, 0.5);
      vis(E, C, [[54, 134], [92, 148], [106, 60], [90, -12], [54, -6]], tb + 2.2, 1.6);
      for (const [x, y] of [[98, -106], [137, -106], [83, -148], [125, -148]]) hautDeForme(E, C, x, y, z(x, y), C.noir, C.nickel);
      inverseur(E, C, 116, -48, z(116, -48), null); prise(E, C, 78, -176, z(78, -176));
      E.aj(ext(forme(lisse([[60, -80], [110, -74], [146, -96], [148, -140], [118, -168], [72, -166], [52, -120]], 40)), 1.6), C.noir, 0, 0, -tb - 0.1, 0, PI, 0, -1, 1, 1);
      attache(E, C, [0, -212, 0], [0, -1, 0]); attache(E, C, [0, 154, -tb - 6], [0, 0.2, -1]);
    }
    faireManche(E, C, { yN, diap: 628, nF: 22, wN: 43, w12: 52.5, zF, touche: C.palissandre, reperes: es ? 'points' : 'trapezes', cases: es ? [3, 5, 7, 9, 12, 15, 17, 19, 21] : [3, 5, 7, 9, 12, 15, 17, 19, 21], filet: true,
      pente, pivot: [yFin, zF], yTalon: lp ? 189 : es ? 222 : 160, profTalon: lp ? 62 : es ? 52 : 34, longTalon: lp ? 52 : es ? 46 : 46, matManche: sg ? vernis({ color: new THREE.Color(f.uni), roughness: 0.36, clearcoat: 0.4 }) : lp ? vernis({ color: new THREE.Color(f.dos), roughness: 0.36, clearcoat: 0.4 }) : vernis({ color: new THREE.Color(f.uni || '#3a1c10'), roughness: 0.36, clearcoat: 0.4 }),
      tete: 'gibson', gibson: true, angle: 17, matFace: C.noirTete, couronne: !lp, boutons: 'tulipe', metal, yS, zS: zCorde, ecart: 51.5, arriere: (i, xs) => [xs, yS - 41, z(0, yS - 41) + 12.5] });
  }
  if (id === 'sj200') {
    const ep = 116, tb = ep / 2, yN = 266 + 648 * (1 - Math.pow(2, -14 / 12)), yS = yN - 648;
    const rosace = (g, { E: e, c }) => { const X = (x) => (x - bb.x0) * e, Y = (y) => c.height - (y - bb.y0) * e; g.strokeStyle = '#1a0e06'; for (const [rr2, lw] of [[58, 1.4], [61.5, 2.6], [66, 1.2], [72, 0.9]]) { g.lineWidth = lw * e; g.beginPath(); g.arc(X(0), Y(114), rr2 * e, 0, PI * 2); g.stroke(); }
      g.strokeStyle = '#e8d9b0'; g.lineWidth = 1.1 * e; g.beginPath(); g.arc(X(0), Y(114), 63.6 * e, 0, PI * 2); g.stroke(); };
    const mt = matTable(P, bb, { ...f, veines: f.veines || 0 }, { apres: rosace });
    const md = vernis({ color: new THREE.Color(f.dos), map: f.dos === '#0e0e10' ? null : texUni(P, bb, '#ffffff', { ondes: 0.11, veines: 0.05 }), roughness: 0.34 });
    const r = corps({ ep, rH: 2.2, rB: 2.2, filetH: 5, filetB: 4, H: (x, y, d) => 2.5 * lisseur(0, 150, d), B: (x, y, d) => -5 * lisseur(0, 160, d) }, [mt, md, C.creme]); tri += r.geo.index.count / 3;
    const z = r.zH;
    E.disque(51, C.trou, 0, 114, z(0, 114) + 0.05, 28);
    { const G = lisse([[50, -6, 'c'], [72, 0], [98, 26], [113, 66], [118, 110], [106, 148], [74, 169], [36, 171, 'c'], [30, 164], [50.5, 143], [58.5, 114], [50.5, 85], [30, 64], [23, 40], [29, 12]], 70);
      E.plaque(forme(G), 1.6, C.ecaille, 0, 0, z(80, 80) - 0.4, 0, 0.3); const L = decale(G, 5), zl = z(80, 80) + 1.25; for (let i = 0; i < L.length; i++) { const a = L[i], b = L[(i + 1) % L.length]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 30) E.tige([a[0], a[1], zl], [b[0], b[1], zl], 0.5, C.creme, 3); } }
    { const d = [[0, -15], [40, -15], [55, -19], [70, -29], [84, -36], [95, -33], [98, -24], [92, -12], [84, -6], [80, 0, 'c'], [84, 6], [92, 13], [98, 24], [95, 32], [84, 34], [70, 27], [55, 18], [40, 14], [0, 14]];
      const zb = z(0, yS - 4); E.plaque(forme(lisse(miroir(d), 80)), 8.5, C.palissandre, 0, yS - 4, zb, 0, 1);
      E.boite(76, 3, 3, C.os, 0, yS, zb + 8.5); for (let i = 0; i < 6; i++) { E.cyl(2.7, 2.2, C.os, -27.5 + i * 11, yS - 12 + Math.abs(i - 2.5) * 0.8, zb + 8.5, 8); E.disque(1, C.noir, -27.5 + i * 11, yS - 12 + Math.abs(i - 2.5) * 0.8, zb + 10.75, 6); }
      for (const [x, y] of [[-84, 22], [84, 22], [-84, -24], [84, -24]]) E.aj(new THREE.PlaneGeometry(8, 5), C.nacre, x, yS - 4 + y, zb + 8.56); }
    const zF = tb + 2.5 + 6;
    faireManche(E, C, { yN, diap: 648, nF: 20, wN: 43.8, w12: 54, zF, touche: C.palissandre, reperes: 'couronnes', cases: [1, 3, 5, 7, 9, 12, 15, 17], filet: true, yTalon: 266, profTalon: 96, longTalon: 34,
      matManche: vernis({ color: new THREE.Color(f.dos === '#0e0e10' ? '#0e0e10' : '#9a5a26'), roughness: 0.36, clearcoat: 0.4 }), tete: 'gibson', gibson: true, angle: 17, matFace: C.noirTete, filetTete: true, echTete: 1.06, couronne: true, boutons: 'metal', metal: C.dore,
      yS, zS: z(0, yS) + 12.2, ecart: 55, filees: 4, matCordes: C.cordeBronze, arriere: (i, xs) => [-27.5 + i * 11, yS - 12, z(0, yS - 12) + 9] });
    attache(E, C, [0, -267, 0], [0, -1, 0]);
  }
  const bois = (nom, trous) => (g, k) => {
    const c = k.c;
    if (nom === 'cocobolo') { rayures(g, c, 5, ['#1c0704', '#2c0d06', '#96401a', '#3a1108', '#150503'], 170, 10); }
    if (nom === 'veine') { rayures(g, c, 9, ['#3a2616', '#5a3c22', '#2a1a10', '#8a6a44'], 120, 11); }
    if (nom === 'erable') { ondes(g, c, 0.07, 4); veines(g, c, 0.04, 3); }
    if (nom === 'epinette') { veines(g, c, 0.1, 6, 3); }
    if (nom === 'flamme') { ondes(g, c, 0.26, 4); ondes(g, c, 0.16, 9); const r = alea(8); g.save(); for (let y = 0; y < c.height; y += 9 + 12 * r()) { g.fillStyle = `rgba(255,190,110,${0.1 + 0.14 * r()})`; g.fillRect(0, y, c.width, 3 + 5 * r()); } g.restore(); veines(g, c, 0.03, 3); }
    if (trous) trous(g, k);
  };
  const tableDemers = (trous) => vernis({ color: 0xffffff, map: texUni(P, bb, f.uni, { apres: bois(f.bois, trous), L: 512 }), roughness: 0.3 });
  const dosDemers = (o = {}) => vernis({ color: new THREE.Color(f.dos), map: texUni(P, bb, '#ffffff', { veines: o.veines ?? 0.14, ondes: o.ondes }), roughness: 0.36 });
  const mancheDemers = (c) => vernis({ color: new THREE.Color(c), roughness: 0.36, clearcoat: 0.4 });
  const teteDemers = { tete: 'demers', gibson: true, angle: 14, matFace: C.noirTete, cloche: false, fracPostes: [0.3, 0.53, 0.75], xPostes: 20.5 };
  const ouiesF = (xh, yh, xb, yb) => (g, { X, Y, E: e }) => { g.fillStyle = '#060403'; g.strokeStyle = '#060403'; g.lineCap = 'round';
    for (const s of [-1, 1]) { g.lineWidth = 7 * e; g.beginPath(); g.moveTo(X(s * xh), Y(yh)); g.bezierCurveTo(X(s * (xh - 10)), Y(yh - 34), X(s * (xb + 14)), Y(yb + 36), X(s * xb), Y(yb)); g.stroke();
      g.beginPath(); g.arc(X(s * (xh + 6)), Y(yh - 2), 6.5 * e, 0, PI * 2); g.fill(); g.beginPath(); g.arc(X(s * (xb - 7)), Y(yb + 1), 8.5 * e, 0, PI * 2); g.fill();
      g.lineWidth = 2.6 * e; const xm = (xh + xb) / 2, ym = (yh + yb) / 2; g.beginPath(); g.moveTo(X(s * (xm - 11)), Y(ym + 2)); g.lineTo(X(s * (xm + 11)), Y(ym - 3)); g.stroke(); } };
  if (id === 'voodoo') {
    const arch = f.version === 'archtop', ep = arch ? 60 : 54, tb = ep / 2, yS = -38, yN = yS + 635;
    const H = (x, y, d) => (arch ? 12 : 9) * lisseur(3, 88, d), B = (x, y, d) => -(arch ? 9 : 5) * lisseur(2, 88, d);
    const mt = tableDemers(ouiesF(70, 44, 131, -64)), md = dosDemers(arch ? { ondes: 0.12, veines: 0.05 } : {});
    const r = corps({ ep, rH: 2.2, rB: 2.2, H, B, insH: [12, 30], insB: [12, 30], filetH: 3, filetB: arch ? 3 : 0 }, [mt, md, f.filet === 'creme' ? C.creme : C.noir]); tri += r.geo.index.count / 3;
    const z = r.zH, pente = 3, yFin = yN - 635 * (1 - Math.pow(2, -22 / 12)) - 8, zF = z(0, yFin) + 5.4, zCorde = zF + (yFin - yS) * Math.tan(pente * PI / 180) + 3.2;
    let arriere;
    if (!arch) {
      miniDouble(E, C, 0, 107, z(0, 107) + 1.5); miniDouble(E, C, 0, 2, z(0, 2) + 1.5);
      tom(E, C, yS, zCorde - 12.8, 51.5, C.chrome); vibratoArceau(E, C, yS - 52, z(0, yS - 90) - 1, 113);
      boutonMetal(E, C, -106, 150, z(-106, 150), C.chrome); boutonMetal(E, C, 116, -106, z(116, -106), C.chrome); boutonMetal(E, C, 90, -140, z(90, -140), C.chrome);
      inverseur(E, C, 106, 146, z(106, 146), null, C.creme);
      arriere = (i, xs) => [xs * 0.85, yS - 86, z(0, yS - 90) + 12];
    } else {
      p90(E, C, 0, 107, z(0, 107) + 1);
      E.boite(92, 9, zCorde - z(0, yS) - 1, C.ebene, 0, yS, z(0, yS) - 1); for (const sx of [-34, 34]) E.cyl(7, 3, C.ebene, sx, yS, z(sx, yS) - 1, 12);
      E.plaque(forme(lisse([[-31, 0, 'c'], [31, 0, 'c'], [26, -14], [17, -52], [13, -98, 'c'], [-13, -98, 'c'], [-17, -52], [-26, -14]], 50)), 7, C.ebene, 0, yS - 62, z(0, yS - 70) + 3, 0, 1.2);
      E.boite(26, 16, 14, C.ebene, 0, yS - 168, z(0, yS - 160) - 6);
      for (const [x, y] of [[116, -106], [90, -140]]) { E.cyl(10, 13, C.ebene, x, y, z(x, y), 16, 8.6); }
      arriere = (i, xs) => [xs * 0.9, yS - 66, z(0, yS - 70) + 11];
    }
    E.aj(new THREE.CylinderGeometry(9.5, 9.5, 3, 14), C.chrome, 170.5, -112, 0, 0, 0, PI / 2);
    E.aj(ext(rr(46, 96, 22), 1.6), C.noirMat, 104, -118, -tb - (arch ? 9 : 5) * 0.7, 0, PI, 0.25);
    faireManche(E, C, { yN, diap: 635, nF: 22, wN: 42.9, w12: 52.5, zF, touche: C.ebene, reperes: f.reperes || 'bord', cases: [3, 5, 7, 9, 12, 15, 17, 19, 21], pente, pivot: [yFin, zF], yTalon: 208, profTalon: arch ? 66 : 60, longTalon: 46,
      matManche: mancheDemers(f.manche || (arch ? '#d8962e' : '#b8702a')), ...teteDemers, ...(f.tete === 'carbone' ? { matFace: carbone() } : {}), filetTete: true, boutons: f.boutons || (arch ? 'noir' : 'metal'), metal: arch ? C.nickel : C.chrome, yS, zS: zCorde, ecart: 51.5, arriere });
    attache(E, C, [20, -210, 0], [0.05, -1, 0]); attache(E, C, [-104, 206, 0], [-0.3, 1, 0]);
  }
  if (id === 'revolver') {
    const ep = 47.6, tb = ep / 2, yS = -47, yN = yS + 635, mt = tableDemers(null), md = dosDemers();
    const r = corps({ ep, rH: 2.5, rB: 5, filetH: 4.5 }, [mt, md, C.blanc]); tri += r.geo.index.count / 3;
    const pente = 3, yFin = yN - 635 * (1 - Math.pow(2, -22 / 12)) - 8, zF = tb + 5.4, zCorde = zF + (yFin - yS) * Math.tan(pente * PI / 180) + 3.2;
    double(E, C, 0, 96, tb + 1, C.noirMat, C.chrome); double(E, C, 0, 0, tb + 1.5, C.noirMat, C.chrome);
    tom(E, C, yS, zCorde - 12.8, 51.5, C.chrome); vibratoArceau(E, C, yS - 40, tb + 0.1, 96);
    boutonMetal(E, C, 80, -45, tb, C.chrome); boutonMetal(E, C, 94, -112, tb, C.chrome); inverseur(E, C, -112, 168, tb, null, C.creme);
    E.aj(new THREE.CylinderGeometry(9.5, 9.5, 3, 14), C.chrome, 163.5, -138, 0, 0, 0, PI / 2);
    E.aj(ext(rr(44, 92, 21), 1.6), C.noirMat, 92, -84, -tb - 0.1, 0, PI, 0.18); E.aj(new THREE.CircleGeometry(27, 22), C.noirMat, -112, 168, -tb - 0.3, 0, PI, 0);
    faireManche(E, C, { yN, diap: 635, nF: 22, wN: 42.9, w12: 52.5, zF, touche: C.ebene, reperes: 'bord', cases: [3, 5, 7, 9, 12, 15, 17, 19, 21], filet: true, pente, pivot: [yFin, zF], yTalon: 196, profTalon: 44, longTalon: 46,
      matManche: mancheDemers('#b06a2a'), ...teteDemers, filetTete: true, boutons: 'metal', metal: C.chrome, yS, zS: zCorde, ecart: 51.5, arriere: (i, xs) => [xs * 0.85, yS - 74, tb + 12] });
    attache(E, C, [30, -212, 0], [0.05, -1, 0]); attache(E, C, [-101, 212, 0], [-0.2, 1, 0]);
  }
  if (id === 'mini000') {
    const ep = 102, tb = ep / 2, yN = 233 + 635 * (1 - Math.pow(2, -14 / 12)), yS = yN - 635;
    const rosace = (g, { X, Y, E: e }) => { g.strokeStyle = '#2a1a0e'; for (const [rr2, lw] of [[57, 1.2], [61, 3.2], [66.5, 1.2], [71, 0.8]]) { g.lineWidth = lw * e; g.beginPath(); g.arc(X(0), Y(85), rr2 * e, 0, PI * 2); g.stroke(); }
      g.strokeStyle = '#e9e2cf'; g.lineWidth = 1.2 * e; g.beginPath(); g.arc(X(0), Y(85), 63.4 * e, 0, PI * 2); g.stroke(); };
    const mt = tableDemers(rosace), md = dosDemers({ veines: 0.3 });
    const r = corps({ ep, rH: 2.2, rB: 2.2, filetH: 5, filetB: 4, H: (x, y, d) => 2.5 * lisseur(0, 140, d), B: (x, y, d) => -5 * lisseur(0, 150, d) }, [mt, md, C.blanc]); tri += r.geo.index.count / 3;
    const z = r.zH; E.disque(50, C.trou, 0, 85, z(0, 85) + 0.05, 28);
    { const zb = z(0, yS - 3); E.plaque(forme(lisse(miroir([[0, -17], [20, -19], [38, -15], [56, -20], [78, -27], [85, -24, 'c'], [80, -10], [68, 1], [50, 8], [34, 10], [30, 14], [0, 14]]), 80)), 8.5, C.ebene, 0, yS - 3, zb, 0, 1);
      E.boite(74, 3, 3, C.os, 0, yS, zb + 8.5); for (let i = 0; i < 6; i++) { E.cyl(2.7, 2.2, C.ebene, -27.5 + i * 11, yS - 11 + Math.abs(i - 2.5) * 0.8, zb + 8.5, 8); E.disque(1, C.nacre, -27.5 + i * 11, yS - 11 + Math.abs(i - 2.5) * 0.8, zb + 10.75, 6); } }
    faireManche(E, C, { yN, diap: 635, nF: 20, wN: 43.7, w12: 54, zF: tb + 2.5 + 6, touche: C.ebene, reperes: 'bord', cases: [3, 5, 7, 9, 12, 15, 17], filet: true, yTalon: 233, profTalon: 84, longTalon: 32,
      matManche: mancheDemers('#cfa458'), ...teteDemers, filetTete: true, boutons: 'metal', metal: C.dore, yS, zS: z(0, yS) + 12.2, ecart: 55, filees: 4, matCordes: C.cordeBronze, arriere: (i, xs) => [-27.5 + i * 11, yS - 11, z(0, yS - 11) + 9] });
    attache(E, C, [0, -248, 0], [0, -1, 0]);
  }
  if (id === 'scarecrow' || id === 'scarecrowA') {
    const ac = id === 'scarecrowA', ep = ac ? 51 : 48, tb = ep / 2, yS = -118, yN = yS + 635;
    const croissants = (g, { X, Y }) => { g.fillStyle = '#070504'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(X(s * 62), Y(186)); g.bezierCurveTo(X(s * 112), Y(182), X(s * 130), Y(122), X(s * 92), Y(86)); g.bezierCurveTo(X(s * 101), Y(118), X(s * 90), Y(158), X(s * 62), Y(186)); g.fill(); } };
    const mt = tableDemers(croissants), md = dosDemers();
    const r = corps({ ep, rH: 3, rB: 6, B: (x, y) => 14 * lisseur(225, 330, y), centre: [0, -20], ...(ac ? { filetH: 3 } : {}) }, [mt, md, C.noir]); tri += r.geo.index.count / 3;
    let zS, arriere;
    if (!ac) {
      p90(E, C, 0, 54, tb); p90(E, C, 0, -67, tb);
      tom(E, C, yS, tb + 4.5, 57, C.chrome); stopbar(E, C, yS - 40, tb, C.chrome); zS = tb + 16.8; arriere = (i, xs) => [xs, yS - 40, tb + 12.5];
      boutonMetal(E, C, 78, -13, tb, C.chrome); boutonMetal(E, C, 107, -61, tb, C.chrome); boutonMetal(E, C, 124, -108, tb, C.chrome); inverseur(E, C, 86, -116, tb, null, C.creme, 0.4);
      E.aj(new THREE.CylinderGeometry(9, 9, 3, 14), C.chrome, 151, -166, 0, 0, 0, PI / 2 - 0.5);
      E.aj(ext(rr(40, 86, 19), 1.6), C.noirMat, 100, -96, -tb - 0.1, 0, PI, 0.3);
    } else {
      E.plaque(forme(lisse(miroir([[0, -13], [30, -13], [48, -11], [60, -5], [64, 2, 'c'], [56, 8], [40, 11], [20, 12.5], [0, 13]]), 60)), 8, C.ebene, 0, yS - 2, tb, 0, 1);
      E.boite(76, 3, 4.5, C.os, 0, yS, tb + 8); for (let i = 0; i < 6; i++) { E.cyl(2.7, 2.2, C.ebene, -28.5 + i * 11.4, yS - 9, tb + 8, 8); E.disque(1, C.nacre, -28.5 + i * 11.4, yS - 9, tb + 10.25, 6); }
      zS = tb + 12.6; arriere = (i, xs) => [-28.5 + i * 11.4, yS - 9, tb + 9];
    }
    faireManche(E, C, { yN, diap: 635, nF: 21, wN: 50.8, w12: 56.5, zF: tb + 5.2, touche: C.ebene, fretsPlates: true, reperes: 'points', cases: [3, 5, 7, 9, 12, 15, 17, 19, 21], sansDos: true, hSillet: 13, zNut: 8.6,
      matManche: mancheDemers(f.dos), ...teteDemers, echTete: 1.18, angle: 12, boutons: ac ? 'metal' : 'noir', metal: ac ? C.dore : C.chrome, yS, zS, ecart: 57, filees: ac ? 4 : 3, matCordes: ac ? C.cordeBronze : null, arriere });
    attache(E, C, [0, -228, 0], [0, -1, 0]);
  }
  if (id === 'lpjunior') {
    const ep = 44.5, tb = ep / 2, yS = -60, yN = yS + 628, mt = matTable(P, bb, f), md = vernis({ color: new THREE.Color(f.dos), map: texUni(P, bb, '#ffffff', { veines: 0.16 }), roughness: 0.36 });
    const r = corps({ ep, rH: 3.5, rB: 3.5 }, [mt, md, md]); tri += r.geo.index.count / 3;
    const zF = tb + 5.5, zCorde = tb + 13, metal = C.nickel;
    E.plaque(forme(lisse([[24, 122, 'c'], [48, 116], [66, 118], [80, 132], [92, 156], [102, 178], [110, 176], [112, 150], [104, 104], [97, 60], [98, 20], [104, -20], [96, -44], [70, -52], [44, -44], [26, -30], [24, -10, 'c']], 80)), 2, C.noir, 0, 0, tb + 0.2, 0, 0.5);
    vis(E, C, [[32, 114], [104, 166], [100, 10], [60, -46], [30, -16]], tb + 2.2, 1.6);
    E.plaque(rr(118, 30, 7), 4, C.noir, 0, yS + 40, tb + 2.2, 0, 1); p90(E, C, 0, yS + 40, tb + 2.2); vis(E, C, [[-51, yS + 40], [51, yS + 40]], tb + 6.2, 2);
    stopbar(E, C, yS, tb, metal);
    for (const [x, y] of [[92, -118], [128, -84]]) hautDeForme(E, C, x, y, tb, C.noir, C.nickel);
    E.aj(new THREE.CylinderGeometry(9.5, 9.5, 3, 14), C.nickel, 150.5, -176, 0, 0, 0, PI / 2 - 0.55);
    E.aj(ext(forme(lisse([[62, -80], [100, -66], [140, -86], [146, -128], [118, -150], [78, -146], [54, -112]], 40)), 1.6), C.noir, 0, 0, -tb - 0.1, 0, PI, 0, -1, 1, 1);
    attache(E, C, [0, -232, 0], [0, -1, 0]); attache(E, C, [-66, 205.5, 0], [-0.05, 1, 0]);
    faireManche(E, C, { yN, diap: 628, nF: 22, wN: 43, w12: 52.5, zF, touche: C.palissandre, reperes: 'points', cases: [3, 5, 7, 9, 12, 15, 17, 19, 21], yTalon: 189, profTalon: 40, longTalon: 46,
      matManche: vernis({ color: new THREE.Color(f.dos), roughness: 0.36, clearcoat: 0.4 }), tete: 'gibson', gibson: true, angle: 17, matFace: C.noirTete, boutons: 'tulipe', metal, yS, zS: zCorde, ecart: 51.5, arriere: (i, xs) => [xs, yS - 5, tb + 9] });
  }
  if (id === 'eds1275') {
    const ep = 38, tb = ep / 2, yS = -40, yN = yS + 628, ecartM = 75, metal = C.nickel;
    const H = (x, y, d) => -6.5 * Math.max(0, 1 - d / 12), B = (x, y, d) => 4.5 * Math.max(0, 1 - d / 11);
    const mt = matTable(P, bb, f), r = corps({ ep, rH: 1.5, rB: 1.5, H, B, insH: [6, 12], insB: [5.5, 11], centre: [0, -40] }, [mt, mt, C.creme]); tri += r.geo.index.count / 3;
    const z = r.zH, zF = tb + 5.5, zCorde = tb + 13, mM = vernis({ color: new THREE.Color(f.uni), roughness: 0.36, clearcoat: 0.4 });
    E.plaque(forme(lisse([[-45, 148, 'c'], [45, 148, 'c'], [45, 60], [41, -20], [32, -70], [0, -86], [-32, -70], [-41, -20], [-45, 60]], 60)), 2, C.noir, 0, 0, tb + 0.2, 0, 0.5);
    vis(E, C, [[-38, 140], [38, 140], [-34, -50], [34, -50], [0, 40]], tb + 2.2, 1.6);
    for (const s of [-1, 1]) { E.repere(new THREE.Matrix4().makeTranslation(s * ecartM, 0, 0));
      double(E, C, 0, 116, tb - 1, C.noir, metal); double(E, C, 0, yS + 44, tb - 1, C.noir, metal); tom(E, C, yS, tb, s < 0 ? 54 : 51.5, metal);
      if (s > 0) stopbar(E, C, yS - 41, tb, metal); else { E.boite(92, 30, 9, metal, 0, yS - 52, tb); for (let i = 0; i < 12; i++) E.cyl(1.6, 0.8, C.acier, -40 + i * 7.3, yS - 58, tb + 9, 6); }
      E.repere(); }
    for (const [x, y] of [[150, -104], [186, -82], [142, -150], [180, -130]]) hautDeForme(E, C, x, y, z(x, y), C.noir, C.nickel);
    inverseur(E, C, 0, -40, tb + 2.2, null); inverseur(E, C, 0, 90, tb + 2.2, null); prise(E, C, 110, -178, z(110, -178));
    attache(E, C, [0, -205, 0], [0, -1, 0]); attache(E, C, [-156, 217, 0], [-0.1, 1, 0]);
    const commun2 = { yN, diap: 628, nF: 20, zF, touche: C.palissandre, reperes: 'trapezes', cases: [1, 3, 5, 7, 9, 12, 15, 17, 19], filet: true, yTalon: 150, profTalon: 32, longTalon: 40, matManche: mM, tete: 'gibson', gibson: true, angle: 17, matFace: C.noirTete, boutons: 'tulipe', metal, yS, zS: zCorde };
    faireManche(E, C, { ...commun2, dx: -ecartM, douze: true, wN: 46.5, w12: 56, ecart: 54, echTeteY: 1.42, fracPostes: [0.22, 0.35, 0.48, 0.61, 0.74, 0.87], xPostes: 25, cloche: false, arriere: (i, xs) => [xs - ecartM, yS - 52, tb + 9] });
    faireManche(E, C, { ...commun2, dx: ecartM, wN: 43, w12: 52.5, ecart: 51.5, arriere: (i, xs) => [xs + ecartM, yS - 41, tb + 12.5] });
  }
  if (id === 'g6120') {
    const ep = 68, tb = ep / 2, yS = -56, yN = yS + 625, metal = C.chrome;
    const H = (x, y, d) => 11 * lisseur(2, 100, d), B = (x, y, d) => -8 * lisseur(2, 100, d);
    const mt = vernis({ color: 0xffffff, map: texUni(P, bb, f.uni, { apres: (g, k) => { veines(g, k.c, 0.08, 5, 4); ouiesF(92, 24, 138, -108)(g, k); }, L: 512 }), roughness: 0.3 });
    const md = vernis({ color: new THREE.Color(f.dos), map: f.dos === '#101012' ? null : texUni(P, bb, '#ffffff', { veines: 0.12, ondes: 0.06 }), roughness: 0.34 });
    const r = corps({ ep, rH: 2.2, rB: 2.2, H, B, insH: [12, 30], insB: [12, 30], filetH: 4, filetB: 3 }, [mt, md, C.creme]); tri += r.geo.index.count / 3;
    const z = r.zH, pente = 3, yFin = yN - 625 * (1 - Math.pow(2, -22 / 12)) - 8, zF = z(0, yFin) + 5.4, zCorde = zF + (yFin - yS) * Math.tan(pente * PI / 180) + 3.2;
    filtertron(E, C, 0, yFin - 34, z(0, yFin - 34) + 1.5); filtertron(E, C, 0, yS + 48, z(0, yS + 48) + 2);
    { const zb = z(0, yS) - 1, h = Math.max(4, zCorde - zb - 7); E.plaque(forme(lisse(miroir([[0, -8], [40, -8], [62, -5], [70, 0, 'c'], [62, 5], [40, 8], [0, 8]]), 50)), h, C.ebene, 0, yS, zb, 0, 1); E.aj(new THREE.CylinderGeometry(4.2, 4.2, 76, 10), metal, 0, yS, zCorde - 4.4, 0, 0, PI / 2); for (const sx of [-40, 40]) E.cyl(5.5, 3.2, metal, sx, yS, zb + h - 1, 12); }
    const yV = yS - 96; vibratoArceau(E, C, yV, z(0, yV - 70) - 1, 144);
    E.plaque(forme(lisse([[47, 72, 'c'], [66, 76], [92, 62], [112, 30], [118, -10], [108, -44], [86, -58], [60, -50], [47, -34, 'c']], 60)), 2, C.dore, 0, 0, z(86, 0) + 3, 0, 0.5);
    for (const [x, y] of [[146, -168], [168, -122], [112, -212]]) boutonMetal(E, C, x, y, z(x, y), metal); boutonMetal(E, C, 124, 142, z(124, 142), metal);
    inverseur(E, C, -116, 158, z(-116, 158), null, C.creme); E.aj(new THREE.CylinderGeometry(9.5, 9.5, 3, 14), metal, 203.5, -160, 0, 0, 0, PI / 2);
    attache(E, C, [0, -300, 0], [0, -1, 0]); attache(E, C, [-104, 214, 0], [-0.3, 1, 0]);
    faireManche(E, C, { yN, diap: 625, nF: 22, wN: 42.9, w12: 52.5, zF, touche: C.ebene, reperes: 'blocs', cases: [1, 3, 5, 7, 9, 12, 15, 17], filet: true, pente, pivot: [yFin, zF], yTalon: 222, profTalon: 70, longTalon: 46,
      matManche: vernis({ color: new THREE.Color(f.dos), roughness: 0.36, clearcoat: 0.4 }), tete: 'gibson', gibson: true, angle: 15, matFace: C.noirTete, filetTete: true, cloche: false, boutons: 'metal', metal, yS, zS: zCorde, ecart: 51.5, arriere: (i, xs) => [xs * 0.85, yV - 34, z(0, yV - 70) + 11] });
  }
  if (id === 'billybo') {
    const ep = 45, tb = ep / 2, yS = -4, yN = yS + 625, metal = C.chrome, mt = matTable(P, bb, f);
    const r = corps({ ep, rH: 2, rB: 4, filetH: 4.5 }, [mt, mt, C.creme]); tri += r.geo.index.count / 3;
    const yFin = yN - 625 * (1 - Math.pow(2, -22 / 12)) - 8, zF = tb + 5.5, zCorde = tb + 13.5;
    E.plaque(forme(lisse([[33, 190, 'c'], [58, 166], [90, 137], [118, 108, 'c'], [115, 68], [110, 26, 'c'], [52, 26, 'c'], [35, 46, 'c']], 60)), 2, C.noir, 0, 0, tb + 0.2, 0, 0.5); vis(E, C, [[42, 176], [110, 104], [104, 32], [42, 50]], tb + 2.2, 1.6);
    filtertron(E, C, 0, yFin - 34, tb); filtertron(E, C, 0, 40, tb); inverseur(E, C, 86, 92, tb + 2.2, null, C.noir);
    E.plaque(forme(lisse([[-84, 0, 'c'], [-42, 7.5], [42, 7.5], [84, 0, 'c'], [42, -7.5], [-42, -7.5]], 40)), 5.5, C.ebene, 0, yS, tb, 0, 1);
    E.aj(new THREE.CylinderGeometry(4.2, 4.2, 74, 10), metal, 0, yS, tb + 9.2, 0, 0, PI / 2); for (const sx of [-45, 45]) E.aj(new THREE.SphereGeometry(6, 10, 8), metal, sx, yS, tb + 8);
    E.boite(66, 17, 11, metal, 0, -54, tb + 1); E.plaque(forme([[-30, 0], [30, 0], [18, -122], [-18, -122]]), 2.6, metal, 0, -60, tb + 2, 0, 0.6);
    { const t = new THREE.Shape(); t.moveTo(-9, -108); t.lineTo(9, -108); t.lineTo(0, -94); t.closePath(); E.aj(new THREE.ShapeGeometry(t), mat(0xb3141a, 0.4), 0, -60, tb + 4.75); E.boite(22, 30, 0.5, C.noirMat, 0, -118, tb + 4.6); E.boite(14, 22, 0.5, metal, 0, -118, tb + 4.75); }
    for (const [x, y] of [[98, -30], [117, -79], [133, -129]]) boutonMetal(E, C, x, y, tb, metal); E.cyl(7.5, 9, metal, -104, 193, tb, 14); E.cyl(6.8, 0.6, C.acier, -104, 193, tb + 9, 14);
    E.aj(new THREE.CylinderGeometry(9.5, 9.5, 3, 14), metal, 172.5, -150, 0, 0, 0, PI / 2 - 0.08);
    attache(E, C, [-90, 250, 0], [0.45, 1, 0]); attache(E, C, [-149, -258, 0], [-0.1, -1, 0]);
    faireManche(E, C, { yN, diap: 625, nF: 22, wN: 42.9, w12: 52.5, zF, touche: C.palissandre, reperes: 'bord', cases: [3, 5, 7, 9, 12, 15, 17, 19, 21], filet: true, yTalon: 206, profTalon: 34, longTalon: 40,
      matManche: vernis({ color: new THREE.Color(f.uni), roughness: 0.36, clearcoat: 0.4 }), tete: 'gibson', gibson: true, angle: 14, matFace: C.noirTete, filetTete: true, cloche: false, boutons: 'metal', metal, yS, zS: zCorde, ecart: 51.5, arriere: (i, xs) => [xs * 0.92, -54, tb + 11] });
  }
  tri += E.finir(grp);
  grp.scale.setScalar(0.001);
  grp.userData = { id, triangles: Math.round(tri), fini: f.nom, fender };
  return grp;
}
export function faireGuitare(id, couleur = 0) {
  const L = FINIS[id]; if (!L) throw new Error('Guitare inconnue : ' + id);
  const f = typeof couleur === 'number' ? L[couleur] || L[0] : L.find((x) => x.nom === couleur) || L[0];
  return faire(id, f);
}
