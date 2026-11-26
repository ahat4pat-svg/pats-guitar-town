import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const PI = Math.PI;
function alea(graine) { let s = graine; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const css = (n) => '#' + n.toString(16).padStart(6, '0');
function zones(g, L) {
  const H = L / 2, e = L / 4;
  const zone = (x0, y0, w, h, xm, ym, f) => { g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip(); g.setTransform(e, 0, 0, -e, x0 - xm * e, y0 + h + ym * e); f(g); g.restore(); };
  return {
    haut: (f) => { zone(0, 0, L / 2, H / 2, -1, 0.8, (c) => f(c, false)); zone(L / 2, 0, L / 2, H / 2, -1, 0.8, (c) => f(c, true)); },
    bas: (f) => { zone(0, H / 2, L / 4, H / 2, -0.5, 0, (c) => f(c, false)); zone(L / 4, H / 2, L / 4, H / 2, -0.5, 0, (c) => f(c, true)); },
    bras: (f) => zone(L / 2, H / 2, L / 2, H / 2, -1, 0.8, (c) => f(c)),
  };
}
export function faireAtlasKit(K, L = 2048) {
  const c = document.createElement('canvas'); c.width = L; c.height = L / 2; const g = c.getContext('2d');
  K.peindre(zones(g, L));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const plein = (g, c) => { g.fillStyle = c; g.fillRect(-2, -1, 4, 4); };
const rect = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const poly = (g, c, pts) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
const trait = (g, c, w, pts) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
const rond = (g, c, x, y, r, ry = r) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, r, ry, 0, 0, PI * 2); g.fill(); };
const courbe = (g, c, w, pts) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) g.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2); g.lineTo(...pts[pts.length - 1]); g.stroke(); };
const symetrie = (f) => { f(1); f(-1); };
function manches(g, peau, tissu, jusqua = 0.57, poignet = null) { plein(g, peau); if (tissu) rect(g, tissu, -jusqua, 0.8, jusqua * 2, 1); if (poignet) symetrie((s) => rect(g, poignet, s > 0 ? jusqua - 0.028 : -jusqua, 0.8, 0.028, 1)); }
function ouverte(g, dedans, haut = 0.085, bas = 0.07) { poly(g, dedans, [[-haut, 1.56], [haut, 1.56], [bas, 0.98], [-bas, 0.98]]); }
function revers(g, c, w = 0.006, haut = 0.085, pointe = 1.22) { symetrie((s) => trait(g, c, w, [[s * haut, 1.54], [s * 0.15, 1.44], [s * 0.035, pointe]])); }
function cravate(g, c, { noeud = 1.495, bout = 1.14, l = 0.03, dx = 0 } = {}, motif) {
  g.save(); g.beginPath(); g.moveTo(-0.02, noeud + 0.02); g.lineTo(0.02, noeud + 0.02); g.lineTo(0.016, noeud - 0.02); g.lineTo(l + dx, bout + 0.045); g.lineTo(dx, bout); g.lineTo(-l + dx, bout + 0.045); g.lineTo(-0.016, noeud - 0.02); g.closePath(); g.fillStyle = c; g.fill(); if (motif) { g.clip(); motif(g); } g.restore(); }
function col(g, c, ombre) { symetrie((s) => { poly(g, c, [[s * 0.012, 1.5], [s * 0.085, 1.555], [s * 0.1, 1.5], [s * 0.05, 1.455]]); if (ombre) trait(g, ombre, 0.004, [[s * 0.012, 1.5], [s * 0.05, 1.455], [s * 0.1, 1.5]]); }); }
function ceinture(g, c, clous) { rect(g, c, -0.5, 0.955, 1, 0.05); if (clous) for (let x = -0.24; x <= 0.24; x += 0.022) rond(g, clous, x, 0.98, 0.006); }
function souliers(g, c, o = {}) { rect(g, c, -0.5, 0, 1, o.haut || 0.125); if (o.bout) rect(g, o.bout, -0.5, 0, 1, 0.075); if (o.lacets) symetrie((s) => { for (let y = 0.085; y < (o.haut || 0.125); y += 0.014) trait(g, o.lacets, 0.004, [[s * 0.1, y], [s * 0.14, y]]); }); }
function dragon(g, pts, w = 0.03) {
  courbe(g, '#d8a531', w * 1.5, pts); courbe(g, '#b3141a', w, pts);
  const r = alea(17); for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; for (let k = 0; k < 3; k++) { const t = (k + 0.5) / 3, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; rond(g, '#e8b944', x + (r() - 0.5) * w * 0.5, y + (r() - 0.5) * w * 0.5, w * 0.16); } }
  const [x, y] = pts[0], [x1, y1] = pts[1], an = Math.atan2(y - y1, x - x1);
  g.save(); g.translate(x, y); g.rotate(an); poly(g, '#d8a531', [[-w, -w * 1.1], [w * 1.7, -w * 0.5], [w * 2.6, 0], [w * 1.7, w * 0.5], [-w, w * 1.1]]); poly(g, '#b3141a', [[-w * 0.8, -w * 0.75], [w * 1.5, -w * 0.3], [w * 2.1, 0], [w * 1.5, w * 0.3], [-w * 0.8, w * 0.75]]);
  for (const s of [-1, 1]) { trait(g, '#e8b944', w * 0.22, [[0, s * w * 0.8], [-w * 1.4, s * w * 2]]); trait(g, '#ffe08a', w * 0.2, [[w * 2.4, 0], [w * 3.6, s * w * 0.7]]); } rond(g, '#fff3c0', w * 0.9, w * 0.25, w * 0.16); g.restore();
}
const MATS = new Map();
const mat = (couleur, o = {}) => { const k = couleur + JSON.stringify(o); if (!MATS.has(k)) MATS.set(k, new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.8, metalness: 0, ...o })); return MATS.get(k); };
const argent = () => mat(0xc9ccd2, { roughness: 0.35, metalness: 0.6 });
function atelier(leger) {
  const lots = new Map();
  const sur = (os) => {
    const aj = (geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
      const g = geo.index ? geo.toNonIndexed() : geo; for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
      g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz)));
      const cle = os + '|' + m.uuid; if (!lots.has(cle)) lots.set(cle, { os, m, L: [] }); lots.get(cle).L.push(g); return A; };
    const A = { aj,
      boule: (m, r, x, y, z, sx = 1, sy = 1, sz = 1, d = 1) => aj(new THREE.IcosahedronGeometry(r, leger ? Math.max(0, d - 1) : d), m, x, y, z, 0, 0, 0, sx, sy, sz),
      cyl: (m, r1, r2, h, x, y, z, rx = 0, ry = 0, rz = 0, n = 14, ouvert = false) => aj(new THREE.CylinderGeometry(r1, r2, h, n, 1, ouvert), m, x, y, z, rx, ry, rz),
      boite: (m, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => aj(new THREE.BoxGeometry(w, h, d), m, x, y, z, rx, ry, rz),
      tore: (m, R, r, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => aj(new THREE.TorusGeometry(R, r, 6, 18), m, x, y, z, rx, ry, rz, sx, sy, sz),
      cone: (m, r, h, x, y, z, rx = 0, ry = 0, rz = 0, n = 6) => aj(new THREE.ConeGeometry(r, h, n), m, x, y, z, rx, ry, rz),
    };
    return A; };
  const finir = () => { const R = {}; for (const { os, m, L } of lots.values()) { const g = mergeGeometries(L, false); L.forEach((x) => x.dispose()); g.computeVertexNormals(); const me = new THREE.Mesh(g, m); if (m.side === THREE.DoubleSide) me.userData.double = true; (R[os] = R[os] || []).push(me); } return R; };
  return { sur, finir };
}
export function piecesKit(K, seulement, leger) { const E = atelier(leger); K.pieces((os) => E.sur(seulement && !seulement.includes(os) ? '_' : os), mat); const R = E.finir(); delete R._; return R; }
const CZ = 0.05;
function boucles(H, m, { haut = 1.8, bas = 1.45, r0 = 0.112, r1 = 0.15, gros = 0.046, pas = 0.04, ouvert = () => 0.75, graine = 3, calotte = true, cz = CZ, aplat = 1 } = {}) {
  const r = alea(graine);
  for (let y = haut; y >= bas - 1e-6; y -= pas) { const t = (haut - y) / Math.max(0.001, haut - bas), R = r0 + (r1 - r0) * t, n = Math.max(6, Math.round(2 * PI * R / (gros * 1.05))), o = ouvert(y), dec = r() * 6;
    for (let k = 0; k < n; k++) { let a = (k / n) * 2 * PI + dec; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) < o) continue;
      const g2 = gros * (0.78 + 0.45 * r()); H.boule(m, g2, Math.sin(a) * R * 0.94 + (r() - 0.5) * 0.012, y + (r() - 0.5) * 0.02, cz + Math.cos(a) * R * aplat + (r() - 0.5) * 0.012); } }
  if (calotte) { H.boule(m, 0.1, 0, haut - 0.03, cz, 1.12, 0.75, 1.12); for (let k = 0; k < 8; k++) { const a = k / 8 * 2 * PI; H.boule(m, gros * 0.95, Math.sin(a) * 0.065, haut + 0.012 + r() * 0.012, cz + Math.cos(a) * 0.065); } H.boule(m, gros, 0, haut + 0.03, cz); }
}
function lunettes(H, m, { r = 0.03, ecart = 0.043, y = 1.676, z = 0.166, large = 1 } = {}) {
  for (const s of [-1, 1]) { H.aj(new THREE.CylinderGeometry(r, r, 0.012, 12), m, s * ecart, y, z, PI / 2, 0, 0, large, 1, 1); H.boite(m, 0.012, 0.008, 0.11, s * (ecart + r * large + 0.004), y + 0.004, z - 0.058); }
  H.boite(m, 0.03, 0.007, 0.01, 0, y + 0.006, z);
}
function chapeau(H, m, { y = 1.79, r = 0.112, rHaut = r, h = 0.12, bord = 0.19, epBord = 0.012, penche = -0.06, z = CZ - 0.005 } = {}) {
  H.aj(new THREE.CylinderGeometry(rHaut, r, h, 18), m, 0, y + h / 2 * Math.cos(penche), z - h / 2 * Math.sin(penche), penche, 0, 0);
  H.aj(new THREE.CylinderGeometry(bord, bord, epBord, 22), m, 0, y, z, penche, 0, 0);
}
function meche(H, m, pts, dx = 0, seg = 10) {
  const pos = [], idx = [], n = pts.length;
  for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; let ty = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(ty, tz) || 1; ty /= l; tz /= l;
    const [y, z, rx, rn] = pts[i]; for (let k = 0; k < seg; k++) { const an = k / seg * 2 * PI, c = Math.cos(an), q = Math.sin(an); pos.push(dx + c * rx, y + q * rn * -tz, z + q * rn * ty); } }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < seg; k++) { const a = i * seg + k, b = i * seg + (k + 1) % seg, c = a + seg, d = b + seg; idx.push(a, b, d, a, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); H.aj(g, m);
}
const matieres = ({ peau, barbe, cheveux = 'cache', sourcils = null, yeux = null, semelle = 'atlas' }) => (nom, partie) => {
  if (partie === 'tete') return nom === 'Skin' ? peau : nom === 'Skin_Darker' ? (barbe ?? peau) : nom === 'Hair' ? cheveux : nom === 'Eyebrows' ? sourcils : nom === 'Eye' ? yeux : null;
  if (partie === 'bas' && nom === 'White') return semelle;
  return 'atlas'; };
export const KITS = [
  { id: 'flash', nom: 'Flash', guitare: ['lespaul', 'Heritage Cherry Sunburst'], peau: 0xb9855a,
    matiere: matieres({ peau: 0xb9855a, semelle: 0xf2efe6 }),
    peindre(Z) { const peau = css(this.peau);
      Z.haut((g, dos) => { plein(g, '#f1ede3'); for (let y = 1.02; y < 1.5; y += 0.09) trait(g, 'rgba(60,50,40,.07)', 0.012, [[-0.3, y], [0.3, y + 0.02]]);
        if (!dos) { g.save(); g.translate(0, 1.3); rect(g, '#1b1a1c', -0.1, -0.085, 0.2, 0.17); rond(g, '#d9d4c8', 0, 0.012, 0.045, 0.052); rect(g, '#1b1a1c', -0.028, -0.01, 0.018, 0.022); rect(g, '#1b1a1c', 0.01, -0.01, 0.018, 0.022); rect(g, '#b3141a', -0.085, -0.075, 0.17, 0.02); g.restore(); }
        trait(g, '#cfc8ba', 0.012, [[-0.09, 1.535], [0, 1.5], [0.09, 1.535]]); });
      Z.bras((g) => { plein(g, peau); symetrie((s) => { for (const x of [0.5, 0.522, 0.544]) rect(g, '#cfd2d8', s > 0 ? x : -x - 0.012, 0.8, 0.012, 1); rect(g, '#23201f', s > 0 ? 0.565 : -0.585, 0.8, 0.02, 1); });
        rond(g, 'rgba(40,50,70,.55)', 0.36, 1.42, 0.03, 0.05); rond(g, 'rgba(40,50,70,.5)', -0.38, 1.42, 0.026, 0.05); });
      Z.bas((g, dos) => { plein(g, '#0f0f11'); symetrie((s) => { trait(g, 'rgba(255,255,255,.13)', 0.012, [[s * 0.1, 0.95], [s * 0.095, 0.56], [s * 0.11, 0.2]]); trait(g, 'rgba(255,255,255,.07)', 0.03, [[s * 0.15, 0.9], [s * 0.15, 0.3]]); for (const y of [0.58, 0.5, 0.22]) trait(g, 'rgba(255,255,255,.1)', 0.008, [[s * 0.06, y], [s * 0.17, y + 0.02]]); });
        ceinture(g, '#1a1612', '#b9bcc2');
        souliers(g, '#121214', { haut: 0.2, bout: dos ? null : '#f2efe6', lacets: dos ? null : '#f2efe6' }); if (!dos) symetrie((s) => rond(g, '#f2efe6', s * 0.17, 0.15, 0.016)); });
    },
    pieces(S, M) { const H = S('Head'), noir = M(0x0c0b0d), feutre = M(0x151417, { roughness: 0.6 }), ag = argent();
      boucles(H, noir, { haut: 1.77, bas: 1.4, r0: 0.114, r1: 0.168, gros: 0.05, ouvert: (y) => (y > 1.685 ? 0 : y > 1.56 ? 0.3 : 0.55), graine: 5, calotte: false });
      H.boule(noir, 0.036, 0, 1.712, 0.185); for (const s of [-1, 1]) { H.boule(noir, 0.042, s * 0.07, 1.705, 0.162); H.boule(noir, 0.04, s * 0.03, 1.718, 0.18); H.boule(noir, 0.036, s * 0.082, 1.615, 0.15); H.boule(noir, 0.04, s * 0.098, 1.65, 0.14); H.boule(noir, 0.04, s * 0.1, 1.585, 0.14); H.boule(noir, 0.042, s * 0.11, 1.51, 0.155); H.boule(noir, 0.04, s * 0.108, 1.44, 0.165); }
      chapeau(H, feutre, { y: 1.795, r: 0.108, rHaut: 0.122, h: 0.25, bord: 0.185, penche: -0.05 });
      H.aj(new THREE.CylinderGeometry(0.1112, 0.11, 0.04, 18), M(0x2a2523, { roughness: 0.5 }), 0, 1.822, CZ - 0.004, -0.05, 0, 0);
      for (let k = 0; k < 9; k++) { const a = (k - 4) * 0.36; H.aj(new THREE.CylinderGeometry(0.017, 0.017, 0.006, 10), ag, Math.sin(a) * 0.113, 1.822 + Math.cos(a) * 0.005, CZ - 0.004 + Math.cos(a) * 0.113, PI / 2, a, 0); }
      lunettes(H, M(0x060607, { roughness: 0.7 }), { r: 0.033, z: 0.176, y: 1.668 });
      H.cyl(M(0xf4f1ea), 0.008, 0.008, 0.09, 0.045, 1.582, 0.212, 1.2, 0.6, 0, 8); H.cyl(M(0xff7a2a, { emissive: 0xff5a10, emissiveIntensity: 1.4 }), 0.0085, 0.0085, 0.01, 0.069, 1.5645, 0.247, 1.2, 0.6, 0, 8);
      for (const [os, s] of [['LowerArmL', 1], ['LowerArmR', -1]]) for (const x of [0.5, 0.525, 0.548]) S(os).tore(ag, 0.036, 0.007, s * x, 1.415, 0.08, 0, PI / 2, 0);
    } },
  { id: 'jiji', nom: 'Jiji', guitare: ['strat', 'Olympic White'], peau: 0x8a5a38,
    matiere: matieres({ peau: 0x8a5a38, sourcils: 0x1a120c, semelle: 0x1a1512 }),
    peindre(Z) { const peau = css(this.peau), or = '#d8ab3f', noir = '#15131a';
      Z.haut((g, dos) => { plein(g, noir);
        if (!dos) { ouverte(g, '#3a2a4a', 0.05, 0.02); poly(g, '#7a4fb0', [[-0.05, 1.56], [0.05, 1.56], [0.03, 1.36], [0, 1.3], [-0.03, 1.36]]); trait(g, '#a987d6', 0.006, [[-0.02, 1.52], [0.005, 1.42], [-0.01, 1.34]]);
          for (let i = 0; i < 7; i++) { const y = 1.47 - i * 0.062, w = 0.19 - i * 0.012; symetrie((s) => { trait(g, or, 0.013, [[s * 0.045, y], [s * w, y + 0.012]]); trait(g, noir, 0.004, [[s * 0.05, y], [s * w, y + 0.012]]); rond(g, or, s * w, y + 0.012, 0.014); rond(g, noir, s * w, y + 0.012, 0.006); rond(g, or, s * 0.045, y, 0.01); }); }
          symetrie((s) => trait(g, or, 0.008, [[s * 0.045, 1.52], [s * 0.03, 1.0]])); }
        else { symetrie((s) => { courbe(g, or, 0.008, [[s * 0.03, 1.5], [s * 0.1, 1.3], [s * 0.04, 1.03]]); rond(g, or, s * 0.1, 1.3, 0.012); }); trait(g, or, 0.006, [[0, 1.5], [0, 1.03]]); }
        rect(g, or, -0.4, 1.0, 0.8, 0.022); symetrie((s) => { rect(g, or, s > 0 ? 0.2 : -0.24, 1.47, 0.04, 0.06); for (let k = 0; k < 4; k++) rect(g, '#f0d27a', s > 0 ? 0.2 + k * 0.011 : -0.24 + k * 0.011, 1.44, 0.004, 0.04); }); });
      Z.bras((g) => { manches(g, peau, noir, 0.55); symetrie((s) => { for (let k = 0; k < 4; k++) { const x = s * (0.41 + k * 0.03); rect(g, or, Math.min(x, x + s * 0.012), 0.8, 0.012, 1); } rect(g, '#4a3526', s > 0 ? 0.53 : -0.575, 0.8, 0.045, 1); courbe(g, or, 0.007, [[s * 0.3, 1.38], [s * 0.34, 1.45], [s * 0.38, 1.38], [s * 0.34, 1.4]]); }); });
      Z.bas((g) => { plein(g, '#20202e'); symetrie((s) => trait(g, 'rgba(255,255,255,.06)', 0.02, [[s * 0.15, 0.95], [s * 0.15, 0.2]])); souliers(g, '#17120f', { haut: 0.17 }); });
    },
    pieces(S, M) { const H = S('Head'), noir = M(0x120e0c), N = S('Neck'), fourrure = M(0x4a3526, { roughness: 1 }), mauve = M(0x7a4fb0);
      H.boule(noir, 0.148, 0, 1.765, 0.02, 1.08, 0.95, 1, 2); const r = alea(11);
      for (let k = 0; k < 90; k++) { const u = r() * 2 - 1, a = r() * 2 * PI, q = Math.sqrt(1 - u * u), x = q * Math.sin(a), y = u, z = q * Math.cos(a); if (y < -0.3 && z > 0.2) continue; if (y < -0.75) continue;
        H.boule(noir, 0.03 + r() * 0.018, x * 0.152 * 1.08, 1.765 + y * 0.145, 0.02 + z * 0.152); }
      for (const s of [-1, 1]) { H.boule(noir, 0.04, s * 0.112, 1.665, 0.07); H.boule(noir, 0.03, s * 0.108, 1.62, 0.06); }
      H.boite(noir, 0.058, 0.007, 0.012, 0, 1.614, 0.168);
      for (let k = 0; k < 13; k++) { const a = (k / 13) * 2 * PI; N.boule(fourrure, 0.042 + r() * 0.012, Math.sin(a) * 0.105, 1.505 - Math.cos(a) * 0.022, 0.05 + Math.cos(a) * 0.1); }
      N.boule(mauve, 0.045, 0, 1.49, 0.15, 1.25, 0.8, 0.8); N.boule(mauve, 0.03, 0.02, 1.445, 0.165, 0.9, 1.5, 0.7); N.boule(mauve, 0.028, -0.015, 1.41, 0.17, 0.8, 1.6, 0.6);
      for (const [os, s] of [['LowerArmL', 1], ['LowerArmR', -1]]) for (let k = 0; k < 7; k++) { const a = (k / 7) * 2 * PI; S(os).boule(fourrure, 0.03, s * 0.555, 1.415 + Math.sin(a) * 0.045, 0.08 + Math.cos(a) * 0.045); }
    } },
  { id: 'angus', nom: 'Angus Long', guitare: ['sg', 'Heritage Cherry'], peau: 0xe8bd96,
    matiere: matieres({ peau: 0xe8bd96, sourcils: 0x4a2f1a, semelle: 0x141414 }),
    peindre(Z) { const peau = css(this.peau), velours = '#1b1d33', clair = '#2a2d4a';
      Z.haut((g, dos) => { plein(g, velours); for (let x = -0.3; x < 0.3; x += 0.05) trait(g, 'rgba(120,130,200,.07)', 0.014, [[x, 1.0], [x + 0.02, 1.56]]);
        if (!dos) { ouverte(g, '#f3f1ea', 0.085, 0.1); col(g, '#ffffff', '#c9c6bd');
          cravate(g, '#1a1c30', { noeud: 1.455, bout: 1.1, l: 0.034, dx: 0.02 }, (c) => { for (let y = 1.0; y < 1.6; y += 0.045) poly(c, '#d9b23a', [[-0.1, y], [0.1, y + 0.07], [0.1, y + 0.085], [-0.1, y + 0.015]]); });
          revers(g, clair, 0.008, 0.085, 1.18); symetrie((s) => { trait(g, clair, 0.006, [[s * 0.1, 0.98], [s * 0.085, 1.2]]); rect(g, clair, s > 0 ? 0.15 : -0.22, 1.1, 0.07, 0.006); }); poly(g, '#d9b23a', [[0.15, 1.37], [0.2, 1.37], [0.195, 1.32], [0.175, 1.3], [0.155, 1.32]]); }
        else trait(g, clair, 0.006, [[0, 1.0], [0, 1.2]]); });
      Z.bras((g) => manches(g, peau, velours, 0.555, '#f3f1ea'));
      Z.bas((g) => { plein(g, peau); rect(g, velours, -0.5, 0.6, 1, 0.5); rect(g, clair, -0.5, 0.6, 1, 0.012); trait(g, clair, 0.005, [[0, 1.0], [0, 0.82]]);
        rect(g, '#fbfaf6', -0.5, 0, 1, 0.3); for (const y of [0.29, 0.26, 0.225]) rect(g, '#dcd9d0', -0.5, y, 1, 0.006); symetrie((s) => rond(g, 'rgba(160,110,80,.28)', s * 0.119, 0.53, 0.04, 0.03)); souliers(g, '#121212', { haut: 0.13, lacets: '#3a3a3a' }); });
    },
    pieces(S, M) { const H = S('Head'), brun = M(0x5e3d22), drap = M(0x191b30), or = M(0xd9b23a);
      boucles(H, brun, { haut: 1.73, bas: 1.49, r0: 0.114, r1: 0.148, gros: 0.044, ouvert: (y) => (y > 1.715 ? 0.3 : 0.85), graine: 9, calotte: false });
      H.boule(brun, 0.034, -0.05, 1.722, 0.158); H.boule(brun, 0.032, 0.045, 1.725, 0.16); H.boule(brun, 0.03, 0, 1.728, 0.166);
      H.boule(drap, 0.132, 0, 1.782, CZ - 0.005, 1.04, 0.6, 1.08, 2); H.cyl(drap, 0.126, 0.13, 0.034, 0, 1.768, CZ - 0.005, 0, 0, 0, 18); H.boule(drap, 0.014, 0, 1.862, CZ - 0.005);
      H.aj(new THREE.CylinderGeometry(0.09, 0.09, 0.014, 16), drap, 0, 1.76, 0.185, 0.22, 0, 0, 1.15, 1, 0.95);
      for (const a of [-0.9, -0.3, 0.3, 0.9]) H.boite(or, 0.007, 0.07, 0.007, Math.sin(a) * 0.126, 1.806, CZ + Math.cos(a) * 0.13, -0.5 * Math.cos(a), 0, 0.5 * Math.sin(a)); H.boite(or, 0.034, 0.03, 0.008, 0, 1.798, CZ + 0.136, -0.35, 0, 0);
    } },
  { id: 'zzpop', nom: 'ZZ Pop', guitare: ['billybo', 'Rouge'], peau: 0xdcaa82,
    matiere: matieres({ peau: 0xdcaa82, barbe: 0xc79a62, sourcils: 0xb48a52, semelle: 0x121212 }),
    peindre(Z) { const peau = css(this.peau), noir = '#131316';
      Z.haut((g, dos) => { plein(g, noir); if (!dos) { ouverte(g, '#f2f0ea', 0.085, 0.085); col(g, '#ffffff', '#c9c6bd'); cravate(g, '#c3161c', { noeud: 1.49, bout: 1.03, l: 0.036 }, (c) => trait(c, 'rgba(255,255,255,.18)', 0.008, [[-0.008, 1.45], [-0.012, 1.06]]));
          revers(g, '#2c2c31', 0.008, 0.085, 1.2); symetrie((s) => { trait(g, '#2c2c31', 0.006, [[s * 0.085, 0.98], [s * 0.085, 1.2]]); rect(g, '#2c2c31', s > 0 ? 0.14 : -0.21, 1.1, 0.07, 0.006); }); }
        else trait(g, '#2c2c31', 0.006, [[0, 1.0], [0, 1.22]]); });
      Z.bras((g) => manches(g, peau, noir, 0.555, '#f2f0ea'));
      Z.bas((g) => { plein(g, '#141417'); symetrie((s) => trait(g, 'rgba(255,255,255,.07)', 0.006, [[s * 0.119, 0.93], [s * 0.119, 0.14]])); souliers(g, '#0e0e0f', { haut: 0.13 }); });
    },
    pieces(S, M) { const H = S('Head'), beige = M(0xb8a67c), brun = M(0x5d4a30), barbe = M(0xc79a62, { roughness: 1 }), r = alea(23);
      H.boule(brun, 0.127, 0, 1.745, CZ - 0.002, 1.02, 0.95, 1.04, 2); H.cyl(beige, 0.124, 0.124, 0.03, 0, 1.722, CZ - 0.002, 0.1, 0, 0, 18);
      for (let i = 0; i < 11; i++) { const ph = 0.1 + i * 0.15, n = Math.max(1, Math.round(22 * Math.sin(ph))); for (let k = 0; k < n; k++) { const a = (k + (i % 2) * 0.5) / n * 2 * PI, x = Math.sin(ph) * Math.sin(a), y = Math.cos(ph), z = Math.sin(ph) * Math.cos(a); if (y < -0.12) continue;
        H.boule((i + k) % 2 ? beige : brun, 0.017, x * 0.131 * 1.02, 1.745 + y * 0.125, CZ - 0.002 + z * 0.135, 1, 1, 1, 0); } }
      H.boite(M(0x060607, { roughness: 0.7 }), 0.19, 0.046, 0.022, 0, 1.676, 0.168); for (const s of [-1, 1]) H.boite(M(0x060607, { roughness: 0.7 }), 0.014, 0.03, 0.12, s * 0.1, 1.68, 0.108);
      H.boule(barbe, 0.055, 0, 1.6, 0.14, 1.5, 0.75, 0.8); for (const s of [-1, 1]) { H.boule(barbe, 0.05, s * 0.075, 1.6, 0.1, 0.9, 1.3, 1); H.boule(barbe, 0.045, s * 0.095, 1.65, 0.075, 0.6, 1.2, 0.9); }
      H.boule(barbe, 0.07, 0, 1.54, 0.135, 1.35, 0.9, 0.8);
      for (const s of [-1, 1]) { for (let i = 0; i < 7; i++) { const t = i / 6, y = 1.5 - t * 0.31, w = 0.056 - t * 0.022; H.boule(barbe, w, s * (0.037 + t * 0.026) + (r() - 0.5) * 0.006, y, 0.155 + t * 0.03, 1, 1.9, 0.72, 2); } H.cone(barbe, 0.03, 0.09, s * 0.064, 1.118, 0.186, PI, 0, 0, 7); }
    } },
  { id: 'pretzel', nom: 'Brian Pretzel', guitare: ['g6120', 'Orange'], peau: 0xf1cba8,
    matiere: matieres({ peau: 0xf1cba8, sourcils: 0x5a4226, semelle: 0xe9e4d6 }),
    peindre(Z) { const peau = css(this.peau), cuir = '#141416', clou = '#c9ccd2';
      Z.haut((g, dos) => { plein(g, cuir); symetrie((s) => trait(g, 'rgba(255,255,255,.08)', 0.02, [[s * 0.22, 1.45], [s * 0.2, 1.05]]));
        if (!dos) { ouverte(g, '#e9e6de', 0.085, 0.075); rond(g, '#2a2a2e', 0, 1.3, 0.055, 0.07); rond(g, '#b3141a', 0, 1.32, 0.03, 0.03); rect(g, '#2a2a2e', -0.05, 1.2, 0.1, 0.014);
          symetrie((s) => { poly(g, '#1f1f23', [[s * 0.085, 1.55], [s * 0.19, 1.47], [s * 0.2, 1.36], [s * 0.07, 1.2]]); trait(g, clou, 0.004, [[s * 0.085, 1.55], [s * 0.19, 1.47], [s * 0.2, 1.36], [s * 0.07, 1.2]]);
            for (let k = 0; k < 7; k++) rond(g, clou, s * (0.1 + k * 0.014), 1.52 - k * 0.012, 0.006); for (let k = 0; k < 6; k++) rond(g, clou, s * (0.185 - k * 0.02), 1.345 - k * 0.025, 0.006);
            trait(g, clou, 0.005, [[s * 0.075, 1.18], [s * 0.075, 1.0]]); rect(g, clou, s > 0 ? 0.13 : -0.2, 1.12, 0.07, 0.005); for (let k = 0; k < 5; k++) rond(g, clou, s * (0.22 + k * 0.012), 1.5, 0.006); }); }
        else { for (let k = 0; k < 16; k++) { const a = k / 16 * 2 * PI; rond(g, clou, Math.sin(a) * 0.11, 1.3 + Math.cos(a) * 0.11, 0.007); } rond(g, '#e9e6de', 0, 1.3, 0.06, 0.06); rond(g, cuir, 0, 1.3, 0.045, 0.045); rond(g, '#b3141a', 0, 1.3, 0.02, 0.02); for (let x = -0.2; x <= 0.2; x += 0.025) rond(g, clou, x, 1.49, 0.006); }
        rect(g, '#1f1f23', -0.4, 1.0, 0.8, 0.035); for (let x = -0.26; x <= 0.26; x += 0.03) rond(g, clou, x, 1.018, 0.006); });
      Z.bras((g) => { manches(g, peau, cuir, 0.43); symetrie((s) => { rect(g, '#1f1f23', s > 0 ? 0.4 : -0.43, 0.8, 0.03, 1); rect(g, clou, s > 0 ? 0.39 : -0.395, 0.8, 0.005, 1); });
        g.save(); g.translate(0.5, 1.42); rond(g, 'rgba(35,60,90,.75)', 0, 0, 0.035, 0.04); rond(g, css(0xf1cba8), 0, 0.005, 0.016, 0.02); rond(g, 'rgba(150,30,40,.8)', 0, 0.005, 0.009, 0.011); trait(g, 'rgba(35,60,90,.75)', 0.006, [[-0.05, -0.03], [0.05, -0.035]]); g.restore(); rond(g, 'rgba(35,60,90,.6)', -0.5, 1.42, 0.03, 0.04); });
      Z.bas((g) => { plein(g, '#16161a'); symetrie((s) => trait(g, 'rgba(255,255,255,.06)', 0.006, [[s * 0.119, 0.93], [s * 0.119, 0.14]])); rect(g, '#2a2f45', -0.5, 0.13, 1, 0.05); ceinture(g, '#0e0e0f', clou); souliers(g, '#0e0e10', { haut: 0.13 }); });
    },
    pieces(S, M) { const H = S('Head'), blond = M(0xc4b07a, { roughness: 1 }), fonce = M(0x5f4a2e), N = S('Neck'), rouge = M(0xa81c1c), blanc = M(0xf1ede3), r = alea(31);
      { const C0 = [[1.795, -0.05, 0.02, 0.012], [1.82, 0.0, 0.05, 0.03], [1.865, 0.07, 0.058, 0.042], [1.905, 0.14, 0.06, 0.05], [1.915, 0.19, 0.058, 0.048], [1.885, 0.228, 0.054, 0.042], [1.835, 0.232, 0.048, 0.034], [1.795, 0.21, 0.036, 0.024], [1.778, 0.185, 0.012, 0.008]];
        meche(H, blond, C0); for (const s of [-1, 1]) meche(H, blond, C0.map(([y, z, rx, rn]) => [1.78 + (y - 1.78) * 0.82, z - 0.02, rx * 0.62, rn * 0.85]), s * 0.054); }
      H.boule(blond, 0.103, 0, 1.752, 0.02, 0.9, 0.6, 1.12, 2); H.boule(blond, 0.06, 0, 1.8, -0.035, 1.15, 0.55, 1.5, 2);
      for (const s of [-1, 1]) H.boule(fonce, 0.068, s * 0.09, 1.7, -0.005, 0.28, 0.9, 1.35, 2);
      H.boule(fonce, 0.098, 0, 1.675, -0.048, 0.98, 0.95, 0.7, 2); H.boule(fonce, 0.06, 0, 1.6, -0.03, 1.1, 0.8, 0.55);
      N.tore(rouge, 0.078, 0.022, 0, 1.512, 0.052, PI / 2 - 0.2, 0, 0, 1, 1.15, 1); N.boule(rouge, 0.026, 0.03, 1.5, 0.148); N.cone(rouge, 0.028, 0.08, 0.055, 1.47, 0.15, PI, 0, -0.5, 4); N.cone(rouge, 0.026, 0.07, 0.02, 1.455, 0.158, PI, 0, 0.1, 4);
      for (let k = 0; k < 9; k++) { const a = -1.3 + k * 0.33; N.boule(blanc, 0.007, Math.sin(a) * 0.082, 1.512 + Math.cos(a) * 0.02 + ((k % 2) - 0.5) * 0.018, 0.052 + Math.cos(a) * 0.098); }
      S('LowerArmL').tore(M(0x1f1f23), 0.045, 0.012, 0.41, 1.415, 0.075, 0, PI / 2, 0); S('LowerArmR').tore(M(0x1f1f23), 0.045, 0.012, -0.41, 1.415, 0.075, 0, PI / 2, 0);
    } },
  { id: 'billyj', nom: 'Billy J', guitare: ['lpjunior', 'Vintage Sunburst'], peau: 0xf3d6bd,
    matiere: matieres({ peau: 0xf3d6bd, sourcils: 0x0c0c0e, yeux: 0x7fae8a, semelle: 0xe9e4d6 }),
    peindre(Z) { const peau = css(this.peau), noir = '#151517';
      Z.haut((g, dos) => { plein(g, noir);
        if (!dos) { col(g, '#222226', '#3a3a40'); trait(g, '#2c2c31', 0.005, [[0, 1.5], [0, 1.0]]);
          symetrie((s) => { rect(g, '#2c2c31', s > 0 ? 0.07 : -0.18, 1.33, 0.11, 0.006); rect(g, '#222226', s > 0 ? 0.2 : -0.25, 1.49, 0.05, 0.018); });
          rond(g, '#f2efe6', 0.125, 1.39, 0.03); rond(g, '#151517', 0.125, 1.39, 0.017); rond(g, '#c3161c', 0.125, 1.39, 0.008);
          rond(g, '#f2efe6', -0.12, 1.4, 0.026, 0.02); rect(g, '#c3161c', -0.2, 1.26, 0.05, 0.03); rect(g, '#f2efe6', -0.145, 1.26, 0.03, 0.03); rond(g, '#e0b53a', -0.09, 1.21, 0.016); rond(g, '#e0b53a', -0.17, 1.2, 0.014); rond(g, '#151517', -0.17, 1.2, 0.007);
          rect(g, '#e0b53a', 0.1, 1.27, 0.035, 0.028); rond(g, '#f2efe6', 0.17, 1.22, 0.018); rond(g, '#c3161c', 0.17, 1.22, 0.01); poly(g, '#f2efe6', [[0.18, 1.5], [0.19, 1.478], [0.21, 1.478], [0.195, 1.465], [0.2, 1.445], [0.18, 1.458], [0.16, 1.445], [0.165, 1.465], [0.15, 1.478], [0.17, 1.478]]);
          cravate(g, '#0b0b0c', { noeud: 1.49, bout: 1.1, l: 0.034 }, (c) => { for (let y = 1.08; y < 1.52; y += 0.022) for (let x = -0.04 + ((Math.round(y / 0.022)) % 2) * 0.011; x < 0.05; x += 0.022) rond(c, '#f2efe6', x, y, 0.0048); }); }
        else { trait(g, '#2c2c31', 0.005, [[-0.2, 1.42], [0, 1.4], [0.2, 1.42]]); } });
      Z.bras((g) => { manches(g, peau, noir, 0.555); rect(g, '#c3161c', 0.3, 1.39, 0.05, 0.05); rect(g, '#f2efe6', 0.31, 1.4, 0.03, 0.03); rond(g, '#f2efe6', -0.33, 1.42, 0.022); symetrie((s) => rect(g, '#2c2c31', s > 0 ? 0.52 : -0.555, 0.8, 0.035, 1)); });
      Z.bas((g, dos) => { plein(g, '#111113'); symetrie((s) => trait(g, 'rgba(255,255,255,.06)', 0.006, [[s * 0.15, 0.93], [s * 0.15, 0.14]])); ceinture(g, '#0b0b0c', '#d5d8de'); if (!dos) rond(g, '#8fc4d8', 0, 0.98, 0.022, 0.017);
        souliers(g, '#0e0e10', { haut: 0.14, bout: dos ? null : '#e9e4d6', lacets: dos ? null : '#e9e4d6' }); });
    },
    pieces(S, M) { const H = S('Head'), noir = M(0x0b0b0e), cerne = M(0x1d181c), r = alea(41);
      H.boule(noir, 0.118, 0, 1.722, CZ - 0.015, 1.0, 0.92, 1.08, 2);
      for (let i = 0; i < 8; i++) { const ph = 0.1 + i * 0.26, n = Math.max(1, Math.round(13 * Math.sin(ph))); for (let k = 0; k < n; k++) { const a = (k + r()) / n * 2 * PI, x = Math.sin(ph) * Math.sin(a), y = Math.cos(ph), z = Math.sin(ph) * Math.cos(a); if (y < -0.35) continue; if (y < 0.3 && z > 0.72) continue;
        const L = 0.09 + r() * 0.06; H.aj(new THREE.ConeGeometry(0.03, L, 5), noir, x * 0.125, 1.725 + y * 0.115, CZ - 0.015 + z * 0.13, Math.acos(Math.max(-1, Math.min(1, y))) + (r() - 0.5) * 0.5, Math.atan2(x, z) + (r() - 0.5) * 0.5, 0); } }
      for (const [x, rz] of [[-0.06, 0.5], [-0.02, 0.15], [0.03, -0.2], [0.07, -0.55]]) H.cone(noir, 0.026, 0.085, x, 1.735, 0.158, PI - 0.25, 0, rz, 4);
      H.boule(noir, 0.085, 0, 1.655, -0.02, 1.15, 0.9, 0.8); for (const x of [-0.07, -0.035, 0, 0.035, 0.07]) H.cone(noir, 0.026, 0.09, x, 1.585, -0.075 + Math.abs(x) * 0.5, PI + 0.3, 0, x * 3, 4);
      for (const s of [-1, 1]) { H.aj(new THREE.CylinderGeometry(0.021, 0.021, 0.004, 10), cerne, s * 0.042, 1.675, 0.1455, PI / 2, 0, 0, 1.2, 1, 0.85); for (let k = 0; k < 3; k++) H.cone(noir, 0.022, 0.07, s * 0.112, 1.64 - k * 0.035, 0.07 - k * 0.01, PI, 0, s * 0.35, 4); }
    } },
  { id: 'mage', nom: 'Jimmy Mage', guitare: ['eds1275', 'Heritage Cherry'], peau: 0xf0d0b2,
    matiere: matieres({ peau: 0xf0d0b2, sourcils: 0x100c0c, semelle: 0x101010 }),
    peindre(Z) { const peau = css(this.peau), noir = '#121114';
      Z.haut((g, dos) => { plein(g, noir);
        if (!dos) { ouverte(g, peau, 0.1, 0.075); trait(g, 'rgba(120,70,40,.25)', 0.005, [[0, 1.42], [0, 1.2]]); symetrie((s) => { trait(g, 'rgba(120,70,40,.2)', 0.005, [[s * 0.02, 1.4], [s * 0.07, 1.385]]); trait(g, '#d8a531', 0.006, [[s * 0.1, 1.56], [s * 0.075, 0.98]]); });
          dragon(g, [[0.2, 1.44], [0.14, 1.36], [0.21, 1.27], [0.13, 1.19], [0.2, 1.11], [0.14, 1.04]], 0.026); dragon(g, [[-0.14, 1.4], [-0.2, 1.31], [-0.13, 1.22], [-0.2, 1.13], [-0.14, 1.05]], 0.022);
          symetrie((s) => { for (const [x, y] of [[0.24, 1.2], [0.11, 1.46], [0.24, 1.08]]) { rond(g, '#e8b944', s * x, y, 0.008); } }); }
        else { dragon(g, [[-0.1, 1.46], [0.08, 1.42], [0.13, 1.33], [-0.02, 1.28], [-0.13, 1.21], [-0.02, 1.13], [0.12, 1.1], [0.06, 1.03]], 0.034); for (const [x, y] of [[0.18, 1.45], [-0.2, 1.34], [0.2, 1.2], [-0.2, 1.08]]) rond(g, '#e8b944', x, y, 0.009); }
        rect(g, '#d8a531', -0.4, 1.0, 0.8, 0.012); });
      Z.bras((g) => { manches(g, peau, noir, 0.555); symetrie((s) => { dragon(g, [[s * 0.5, 1.42], [s * 0.44, 1.45], [s * 0.38, 1.39], [s * 0.32, 1.45], [s * 0.26, 1.4]], 0.02); rect(g, '#d8a531', s > 0 ? 0.545 : -0.555, 0.8, 0.01, 1); }); });
      Z.bas((g, dos) => { plein(g, '#121114'); symetrie((s) => { dragon(g, [[s * 0.15, 0.9], [s * 0.19, 0.8], [s * 0.13, 0.7], [s * 0.19, 0.6], [s * 0.13, 0.5], [s * 0.18, 0.4], [s * 0.13, 0.3], [s * 0.17, 0.2]], 0.024); if (!dos) rond(g, '#e8b944', s * 0.07, 0.75, 0.008); }); rect(g, '#d8a531', -0.5, 0.965, 1, 0.012); souliers(g, '#0f0f10', { haut: 0.13 }); });
    },
    pieces(S, M) { const H = S('Head'), noir = M(0x0d0b0c), drap = M(0x121114, { side: THREE.DoubleSide }), or = M(0xd8a531);
      boucles(H, noir, { haut: 1.79, bas: 1.47, r0: 0.112, r1: 0.162, gros: 0.048, ouvert: (y) => (y > 1.73 ? 0.3 : 0.8), graine: 13 });
      H.boule(noir, 0.036, -0.055, 1.745, 0.155); H.boule(noir, 0.036, 0.055, 1.745, 0.155); H.boule(noir, 0.03, 0, 1.758, 0.162);
      for (const s of [-1, 1]) { H.boule(noir, 0.04, s * 0.118, 1.5, 0.13); H.boule(noir, 0.036, s * 0.112, 1.445, 0.15); }
      for (const [os, s] of [['LowerLegL', 1], ['LowerLegR', -1]]) { S(os).cyl(drap, 0.076, 0.122, 0.3, s * 0.119, 0.225, 0.085, 0, 0, 0, 14, true); S(os).cyl(or, 0.124, 0.124, 0.012, s * 0.119, 0.081, 0.085, 0, 0, 0, 14, true); }
    } },
  { id: 'derek', nom: 'Derek Scar', guitare: ['sg', 'Cerise usée'], peau: 0xf1c8a6,
    matiere: matieres({ peau: 0xf1c8a6, barbe: 0x9c5630, cheveux: 0xd9b870, sourcils: 0xb98a4a, semelle: 0x2a1c12 }),
    peindre(Z) { const peau = css(this.peau);
      const carreaux = (g) => { plein(g, '#3f6096'); for (let x = -1; x < 1; x += 0.075) { rect(g, 'rgba(18,30,62,.55)', x, 0.8, 0.026, 1); rect(g, 'rgba(235,240,250,.75)', x + 0.045, 0.8, 0.005, 1); }
        for (let y = 0.8; y < 1.8; y += 0.075) { rect(g, 'rgba(18,30,62,.55)', -1, y, 2, 0.026); rect(g, 'rgba(235,240,250,.75)', -1, y + 0.045, 2, 0.005); } };
      Z.haut((g, dos) => { carreaux(g); if (!dos) { rect(g, '#2f4c7c', -0.014, 1.0, 0.028, 0.52); for (let y = 1.06; y < 1.5; y += 0.075) rond(g, '#e9e6de', 0, y, 0.006); col(g, '#3f6096', '#1e3157'); poly(g, peau, [[-0.03, 1.56], [0.03, 1.56], [0, 1.47]]); symetrie((s) => { rect(g, '#2f4c7c', s > 0 ? 0.08 : -0.17, 1.3, 0.09, 0.09); rect(g, 'rgba(235,240,250,.6)', s > 0 ? 0.08 : -0.17, 1.385, 0.09, 0.005); }); }
        else trait(g, '#1e3157', 0.006, [[-0.2, 1.45], [0, 1.43], [0.2, 1.45]]); });
      Z.bras((g) => { carreaux(g); symetrie((s) => { rect(g, peau, s > 0 ? 0.565 : -1, 0.8, 0.435, 1); rect(g, '#2f4c7c', s > 0 ? 0.535 : -0.565, 0.8, 0.03, 1); }); });
      Z.bas((g, dos) => { plein(g, '#3b5580'); for (let x = -0.5; x < 0.5; x += 0.02) rect(g, 'rgba(255,255,255,.04)', x, 0, 0.008, 1); symetrie((s) => { trait(g, '#c58a3a', 0.004, [[s * 0.172, 0.95], [s * 0.172, 0.14]]); rond(g, 'rgba(210,225,245,.22)', s * 0.119, 0.74, 0.04, 0.12); rond(g, 'rgba(210,225,245,.2)', s * 0.119, 0.5, 0.035, 0.04);
          if (dos) { poly(g, '#33496f', [[s * 0.07, 0.93], [s * 0.16, 0.93], [s * 0.155, 0.82], [s * 0.115, 0.8], [s * 0.075, 0.82]]); } else trait(g, '#c58a3a', 0.004, [[s * 0.05, 0.94], [s * 0.1, 0.9], [s * 0.17, 0.9]]); });
        rect(g, '#33496f', -0.5, 0.13, 1, 0.03); ceinture(g, '#4a2f1a', null); if (!dos) rect(g, '#b9bcc2', -0.02, 0.962, 0.04, 0.036); souliers(g, '#5a3a22', { haut: 0.13 }); });
    },
    pieces(S, M) { const H = S('Head'), blond = M(0xd9b870), roux = M(0x9c5630, { roughness: 1 }), verre = M(0x9fd8c8, { transparent: true, opacity: 0.7, roughness: 0.12, metalness: 0.1 });
      H.boule(blond, 0.115, 0, 1.735, CZ - 0.02, 1.0, 0.82, 1.12, 2); H.boule(blond, 0.05, 0, 1.7, -0.115, 1, 1, 1); H.tore(M(0x3a2a1c), 0.03, 0.01, 0, 1.675, -0.145, 0.5, 0, 0);
      for (let i = 0; i < 8; i++) { const t = i / 7; H.boule(blond, 0.042 - t * 0.014, 0.004 * Math.sin(i * 2), 1.655 - t * 0.3, -0.165 + 0.035 * Math.sin(t * PI) + t * 0.035, 1, 1.5, 0.9); }
      H.boule(roux, 0.068, 0, 1.555, 0.115, 1.2, 0.95, 0.95); H.boule(roux, 0.05, 0, 1.51, 0.13, 1.1, 0.9, 0.8); H.boule(roux, 0.03, 0, 1.612, 0.158, 2.1, 0.55, 0.7);
      for (const s of [-1, 1]) { H.boule(roux, 0.05, s * 0.07, 1.585, 0.09, 0.85, 1.25, 1.1); H.boule(roux, 0.04, s * 0.095, 1.64, 0.06, 0.55, 1.3, 1); H.boule(roux, 0.04, s * 0.05, 1.53, 0.12); }
      S('WristL').cyl(verre, 0.0135, 0.0135, 0.062, 0.765, 1.412, 0.1, 0, 0, PI / 2, 10); S('WristL').cyl(verre, 0.009, 0.0135, 0.012, 0.802, 1.412, 0.1, 0, 0, -PI / 2, 10);
    } },
  { id: 'pat', nom: 'Pat', guitare: ['voodoo', 'Orange'], peau: 0xe9c09a,
    matiere: matieres({ peau: 0xe9c09a, cheveux: 0x2b1e16, sourcils: 0x2b1e16, semelle: 0xf4f1ea }),
    peindre(Z) { const peau = css(this.peau), blanc = '#f1efe9', pli = '#d6d2c8', noir = '#141416', reflet = '#2a2a30';
      Z.haut((g, dos) => { plein(g, blanc); symetrie((s) => trait(g, pli, 0.01, [[s * 0.21, 1.4], [s * 0.23, 1.1]]));
        if (!dos) {
          symetrie((s) => poly(g, noir, [[s * 0.07, 1.545], [s * 0.15, 1.53], [s * 0.165, 1.42], [s * 0.215, 1.33], [s * 1.0, 1.3], [s * 1.0, 0.8], [s * 0.04, 0.8], [s * 0.012, 0.93], [s * 0.012, 1.22]]));
          symetrie((s) => { trait(g, reflet, 0.005, [[s * 0.07, 1.545], [s * 0.012, 1.22], [s * 0.012, 0.95]]); rect(g, reflet, s > 0 ? 0.1 : -0.17, 1.08, 0.07, 0.005); });
          for (const y of [1.17, 1.1, 1.03]) rond(g, '#55555c', 0.004, y, 0.007);
          poly(g, peau, [[-0.04, 1.56], [0.04, 1.56], [0.004, 1.47]]); col(g, '#ffffff', '#c9c6bd');
          cravate(g, '#0b0b0c', { noeud: 1.45, bout: 1.0, l: 0.02, dx: 0.03 }, (c) => trait(c, 'rgba(255,255,255,.12)', 0.004, [[0.0, 1.42], [0.02, 1.1]]));
          rect(g, '#0b0b0c', -0.012, 1.45, 0.022, 0.07); }
        else { symetrie((s) => poly(g, '#1d1d22', [[s * 0.06, 1.55], [s * 0.16, 1.53], [s * 0.175, 1.42], [s * 0.215, 1.33], [s * 1.0, 1.3], [s * 1.0, 0.8], [0, 0.8], [0, 1.55]]));
          rect(g, '#141416', -0.12, 1.02, 0.24, 0.02); trait(g, reflet, 0.004, [[0, 1.5], [0, 1.0]]); } });
      Z.bras((g) => { manches(g, peau, blanc, 0.37); symetrie((s) => { rect(g, pli, s > 0 ? 0.335 : -0.37, 0.8, 0.035, 1); trait(g, '#bdb8ac', 0.004, [[s * 0.338, 0.8], [s * 0.338, 1.8]]); trait(g, '#bdb8ac', 0.004, [[s * 0.352, 0.8], [s * 0.352, 1.8]]); }); });
      Z.bas((g, dos) => { plein(g, '#1c2535'); for (let x = -0.5; x < 0.5; x += 0.018) rect(g, 'rgba(120,140,180,.05)', x, 0, 0.007, 1);
        symetrie((s) => { trait(g, '#8a6a3a', 0.003, [[s * 0.172, 0.95], [s * 0.172, 0.14]]); rond(g, 'rgba(150,170,210,.14)', s * 0.119, 0.72, 0.04, 0.11); rond(g, 'rgba(150,170,210,.1)', s * 0.119, 0.5, 0.035, 0.035);
          if (dos) poly(g, '#18202e', [[s * 0.07, 0.92], [s * 0.16, 0.92], [s * 0.155, 0.82], [s * 0.115, 0.8], [s * 0.075, 0.82]]); else trait(g, '#8a6a3a', 0.003, [[s * 0.05, 0.94], [s * 0.1, 0.89], [s * 0.17, 0.89]]); });
        rect(g, '#161d2a', -0.5, 0.1, 1, 0.035); ceinture(g, '#0e0e0f', null); if (!dos) rect(g, '#9a9da4', -0.018, 0.962, 0.036, 0.034);
        souliers(g, '#f2efe6', { haut: 0.1, bout: dos ? null : '#fbfaf6', lacets: dos ? null : '#a9a59b' }); rect(g, '#cfcbc0', -0.5, 0.012, 1, 0.006); if (!dos) symetrie((s) => rond(g, '#2a2a2e', s * 0.17, 0.06, 0.006)); });
    },
    pieces(S, M) { const H = S('Head'), feutre = M(0x111113, { roughness: 0.55 }), ruban = M(0x2a2a2f, { roughness: 0.35, metalness: 0.1 }), brun = M(0x2b1e16, { roughness: 1 });
      H.aj(new THREE.CylinderGeometry(0.12, 0.114, 0.115, 24), feutre, 0, 1.785 + 0.0575, CZ - 0.008, -0.05, 0, 0);
      H.aj(new THREE.CylinderGeometry(0.168, 0.168, 0.012, 28), feutre, 0, 1.785, CZ - 0.008, -0.05, 0, 0, 1, 1, 0.9);
      H.aj(new THREE.CylinderGeometry(0.1155, 0.1155, 0.032, 24), ruban, 0, 1.806, CZ - 0.009, -0.05, 0, 0);
      for (const s of [-1, 1]) { H.boule(brun, 0.035, s * 0.1, 1.74, CZ + 0.02, 0.6, 1.1, 1.2); H.boule(brun, 0.03, s * 0.092, 1.7, CZ - 0.04, 0.6, 1, 1); }
      H.boule(brun, 0.09, 0, 1.73, CZ - 0.06, 1.15, 0.6, 0.7);
      H.boule(brun, 0.014, 0, 1.558, 0.148, 1.0, 1.4, 0.7);
    } },
  { id: 'bily', nom: 'Bily Vert', micro: 'bily', chant: true, peau: 0xefcfb4,
    matiere: matieres({ peau: 0xefcfb4, semelle: 0xf2f2ee }),
    peindre(Z) { const peau = css(this.peau), tee = '#26282c', vert = '#9dff1a';
      Z.haut((g, dos) => { plein(g, tee); for (let y = 1.02; y < 1.5; y += 0.07) trait(g, 'rgba(255,255,255,.05)', 0.01, [[-0.3, y], [0.3, y + 0.01]]);
        if (!dos) { rect(g, vert, -0.09, 1.2, 0.18, 0.05); rect(g, vert, -0.09, 1.12, 0.12, 0.03); } else { rect(g, vert, -0.11, 1.32, 0.22, 0.06); }
        trait(g, '#16171a', 0.014, [[-0.1, 1.54], [0, 1.5], [0.1, 1.54]]); });
      Z.bras((g) => { plein(g, peau); rect(g, tee, -0.5, 0.8, 1.0, 1); symetrie((s) => rect(g, vert, s > 0 ? 0.47 : -0.5, 0.8, 0.03, 1)); });
      Z.bas((g, dos) => { plein(g, peau); rect(g, '#1d1f23', -0.5, 0.52, 1, 0.5); symetrie((s) => { rect(g, vert, s * 0.215 - 0.008, 0.52, 0.016, 0.45); });
        rect(g, '#f4f4f0', -0.5, 0.14, 1, 0.22); rect(g, vert, -0.5, 0.33, 1, 0.012); rect(g, '#f4f4f0', -0.5, 0, 1, 0.13); rect(g, '#2a2b30', -0.5, 0, 1, 0.025);
        if (!dos) symetrie((s) => { for (let y = 0.05; y < 0.13; y += 0.022) trait(g, vert, 0.004, [[s * 0.1, y], [s * 0.15, y + 0.01]]); }); });
    },
    pieces(S, M) { const H = S('Head'), noir = M(0x0a0a0c, { roughness: 0.6 }), vert = M(0x9dff1a, { roughness: 0.5, emissive: 0x3d8a00, emissiveIntensity: 0.5 }), tee = M(0x26282c);
      H.boule(noir, 0.118, 0, 1.735, CZ - 0.02, 1.02, 0.8, 1.14, 2); H.boule(noir, 0.1, 0, 1.64, -0.08, 1.15, 1.5, 0.8, 1);
      for (const s of [-1, 1]) { H.boule(noir, 0.05, s * 0.108, 1.66, CZ + 0.02, 0.75, 1.9, 1.3); H.boule(noir, 0.045, s * 0.112, 1.58, CZ - 0.01, 0.8, 1.6, 1.2); H.boule(noir, 0.04, s * 0.1, 1.5, CZ - 0.02, 0.8, 1.3, 1.1); H.boule(noir, 0.05, s * 0.03, 1.77, 0.15, 1.9, 0.6, 0.8); }
      for (let i = 0; i < 10; i++) { const t = i / 9; H.boule(vert, 0.03, 0, 1.808 - 0.03 * t, 0.135 - t * 0.2, 0.8, 0.9, 1.3); }
      for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const t = i / 5; H.boule(vert, 0.02, s * (0.02 + t * 0.05), 1.795 - t * 0.04, 0.125 - t * 0.12); }
      const T = S('Chest'); T.boule(tee, 0.2, 0, 1.25, 0.0, 1.45, 1.3, 1.0, 1); T.boule(tee, 0.19, 0, 1.08, 0.0, 1.4, 1.0, 1.0, 1);
      for (const [os, s] of [['UpperArmL', 1], ['UpperArmR', -1]]) S(os).cyl(tee, 0.09, 0.105, 0.3, s * 0.36, 1.43, 0, 0, 0, PI / 2, 14);
      S('UpperLegL').cyl(M(0x1d1f23), 0.14, 0.17, 0.5, 0.11, 0.72, 0, 0, 0, 0, 14); S('UpperLegR').cyl(M(0x1d1f23), 0.14, 0.17, 0.5, -0.11, 0.72, 0, 0, 0, 0, 14);
    } },
  { id: 'sabri', nom: 'Sabri Miel', micro: 'sabri', chant: true, peau: 0xf0cdb0,
    matiere: matieres({ peau: 0xf0cdb0, semelle: 0xf4eee2 }),
    peindre(Z) { const peau = css(this.peau), robe = '#7fb7e0', r = alea(41);
      const pail = (g, y0, y1, x0 = -1, x1 = 1) => { for (let i = 0; i < Math.round((y1 - y0) * (x1 - x0) * 2200); i++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0); g.fillStyle = ['#dff1ff', '#ffffff', '#4a8fc8', '#ffe9a8', '#b8dcf5'][(r() * 5) | 0]; g.fillRect(x, y, 0.007, 0.007); } };
      Z.haut((g, dos) => { plein(g, robe); pail(g, 0.8, 1.8); trait(g, '#e8f4ff', 0.01, [[-0.14, 1.53], [0, 1.47], [0.14, 1.53]]); rect(g, '#f4f9ff', -0.2, 1.0, 0.4, 0.018);
        poly(g, peau, [[-0.1, 1.56], [0.1, 1.56], [0.14, 1.5], [0, 1.43], [-0.14, 1.5]]); });
      Z.bras((g) => { plein(g, peau); rect(g, robe, -0.33, 0.8, 0.66, 1); });
      Z.bas((g, dos) => { plein(g, peau); rect(g, robe, -0.5, 0.74, 1, 0.3); for (let i = 0; i < 2600; i++) { const x = -0.5 + r(), y = 0.74 + r() * 0.3; g.fillStyle = ['#dff1ff', '#ffffff', '#4a8fc8', '#ffe9a8'][(r() * 4) | 0]; g.fillRect(x, y, 0.007, 0.007); }
        rect(g, '#f4f9ff', -0.5, 0.74, 1, 0.014);
        rect(g, '#f6f0e4', -0.5, 0, 1, 0.09); symetrie((s) => { trait(g, '#f6f0e4', 0.01, [[s * 0.12, 0.09], [s * 0.12, 0.17]]); }); rect(g, '#d8b878', -0.5, 0.09, 1, 0.01); });
    },
    pieces(S, M) { const H = S('Head'), bl = M(0xe9cf82, { roughness: 0.5 }), blF = M(0xd9ba66, { roughness: 0.5 });
      H.boule(bl, 0.118, 0, 1.74, CZ - 0.02, 1.04, 0.85, 1.16, 2); H.boule(bl, 0.11, 0, 1.6, -0.075, 1.2, 2.3, 0.85, 1);
      for (const s of [-1, 1]) { for (let k = 0; k < 4; k++) H.boule(k % 2 ? blF : bl, 0.048 - k * 0.004, s * (0.115 + k * 0.004), 1.66 - k * 0.07, CZ + 0.0 - k * 0.025, 0.8, 1.4, 1.2); }
      for (const s of [-1, 1]) { for (let k = 0; k < 5; k++) { const t = k / 4; H.boule(k % 2 ? blF : bl, 0.032, s * (0.02 + t * 0.085), 1.795 - t * 0.095, 0.138 - t * 0.012, 1.1, 1, 0.8); } }
    } },
  { id: 'tay', nom: 'Taylor Swing', micro: 'tay', chant: true, peau: 0xf3d5bd,
    matiere: matieres({ peau: 0xf3d5bd, semelle: 0xd8b24a }),
    peindre(Z) { const peau = css(this.peau), r = alea(77), corps = '#1d2a6b';
      const pail = (g, y0, y1, x0, x1, n, cols) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[(r() * cols.length) | 0]; g.fillRect(x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), 0.008, 0.008); } };
      Z.haut((g, dos) => { plein(g, corps); pail(g, 0.8, 1.8, -1, 1, 5200, ['#7f9bff', '#c9d6ff', '#ffffff', '#ff8ad4', '#53e0e0', '#2d3f9a']);
        for (let y = 1.02; y < 1.5; y += 0.09) trait(g, 'rgba(255,255,255,.12)', 0.006, [[-0.3, y], [0.3, y + 0.025]]);
        poly(g, peau, [[-0.1, 1.56], [0.1, 1.56], [0.15, 1.5], [0, 1.4], [-0.15, 1.5]]); trait(g, '#e8edff', 0.008, [[-0.15, 1.5], [0, 1.4], [0.15, 1.5]]); });
      Z.bras((g) => { plein(g, peau); rect(g, corps, -0.45, 0.8, 0.9, 1); pail(g, 0.8, 1.8, -0.45, 0.45, 2000, ['#7f9bff', '#c9d6ff', '#ffffff', '#ff8ad4']); });
      Z.bas((g, dos) => { plein(g, peau); rect(g, corps, -0.5, 0.88, 1, 0.14); pail(g, 0.88, 1.02, -0.5, 0.5, 600, ['#7f9bff', '#c9d6ff', '#ffffff', '#ff8ad4']);
        rect(g, '#c9a24a', -0.5, 0, 1, 0.5); pail(g, 0, 0.5, -0.5, 0.5, 2600, ['#fff2b8', '#ffe07a', '#ffffff', '#b8892a']); rect(g, '#7a5a1a', -0.5, 0.49, 1, 0.012); });
    },
    pieces(S, M) { const H = S('Head'), bl = M(0xe8cf86, { roughness: 0.5 }), blF = M(0xd6b86a, { roughness: 0.5 });
      H.boule(bl, 0.118, 0, 1.74, CZ - 0.02, 1.04, 0.85, 1.16, 2); H.boule(bl, 0.12, 0, 1.45, -0.085, 1.2, 2.5, 0.75, 1);
      for (const s of [-1, 1]) for (let k = 0; k < 8; k++) H.boule(k % 2 ? blF : bl, 0.05 - k * 0.002, s * (0.118 + 0.012 * Math.sin(k * 1.3)), 1.66 - k * 0.062, CZ - 0.015 * k + 0.02, 0.8, 1.35, 1.2);
      for (let k = 0; k < 7; k++) H.boule(k % 2 ? blF : bl, 0.055, 0.07 * Math.sin(k * 1.6), 1.42 - k * 0.075, -0.14 - 0.005 * k, 1.2, 1.2, 1);
      for (let k = 0; k < 5; k++) { const t = k / 4; H.boule(k % 2 ? blF : bl, 0.034, (t - 0.5) * 0.2, 1.775 - 0.012 * Math.sin(t * PI), 0.148 - Math.abs(t - 0.5) * 0.05, 1.1, 1.0, 0.8); }
      S('LowerLegL').cyl(M(0xc9a24a, { metalness: 0.5, roughness: 0.3 }), 0.062, 0.075, 0.03, 0.1, 0.5, 0, 0, 0, 0, 14); S('LowerLegR').cyl(M(0xc9a24a, { metalness: 0.5, roughness: 0.3 }), 0.062, 0.075, 0.03, -0.1, 0.5, 0, 0, 0, 0, 14);
    } },
  { id: 'bruno', nom: 'Bruno March', micro: 'bruno', chant: true, peau: 0xc99a70,
    matiere: matieres({ peau: 0xc99a70, semelle: 0x2a1a12 }),
    peindre(Z) { const peau = css(this.peau), r = alea(9);
      const imprime = (g, y0, y1, x0, x1) => { g.fillStyle = '#f0a03a'; g.fillRect(x0, y0, x1 - x0, y1 - y0); for (let i = 0; i < 90; i++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), q = r(); g.fillStyle = q < 0.3 ? '#2a9d8f' : q < 0.55 ? '#8a2a1e' : q < 0.8 ? '#f6e2b0' : '#1c3a5a'; if (q < 0.5) { g.beginPath(); g.moveTo(x, y - 0.03); g.lineTo(x + 0.03, y + 0.03); g.lineTo(x - 0.03, y + 0.03); g.closePath(); g.fill(); } else rond(g, g.fillStyle, x, y, 0.02 + r() * 0.015); } };
      Z.haut((g, dos) => { imprime(g, 0.8, 1.8, -1, 1);
        if (!dos) { poly(g, '#e8c9a0', [[-0.14, 1.56], [0.14, 1.56], [0.09, 0.98], [-0.09, 0.98]]); rect(g, '#f0e6d2', -0.04, 0.98, 0.08, 0.5); symetrie((s) => { poly(g, '#f6e2b0', [[s * 0.012, 1.5], [s * 0.1, 1.56], [s * 0.15, 1.5], [s * 0.06, 1.42]]); trait(g, '#8a2a1e', 0.008, [[s * 0.12, 1.5], [s * 0.1, 0.98]]); });
          poly(g, peau, [[-0.07, 1.56], [0.07, 1.56], [0.012, 1.2]]); } else { rect(g, '#2a9d8f', -0.15, 1.1, 0.3, 0.015); } });
      Z.bras((g) => { plein(g, peau); rect(g, '#f0a03a', -0.4, 0.8, 0.8, 1); for (let i = 0; i < 14; i++) { const x = -0.4 + r() * 0.8, y = 0.9 + r() * 0.8; rond(g, ['#2a9d8f', '#8a2a1e', '#f6e2b0'][i % 3], x, y, 0.03); } });
      Z.bas((g, dos) => { plein(g, '#1f2630'); symetrie((s) => { trait(g, 'rgba(255,255,255,.1)', 0.012, [[s * 0.1, 0.95], [s * 0.1, 0.16]]); }); ceinture(g, '#1a1008', null); if (!dos) rect(g, '#c9a24a', -0.02, 0.962, 0.04, 0.036);
        souliers(g, '#2a1a12', { haut: 0.11, bout: dos ? null : '#3a2418' }); });
    },
    pieces(S, M) { const H = S('Head'), feutre = M(0x2b2a2e, { roughness: 0.6 }), ruban = M(0xd9a23a, { roughness: 0.4 }), noir = M(0x16100c, { roughness: 0.8 }), or = M(0xe8b84a, { metalness: 0.8, roughness: 0.25 });
      H.aj(new THREE.CylinderGeometry(0.098, 0.116, 0.115, 20), feutre, 0, 1.842, CZ - 0.01, -0.04, 0, 0); H.boite(feutre, 0.04, 0.012, 0.19, 0, 1.906, CZ - 0.01);
      H.aj(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 28), feutre, 0, 1.785, CZ - 0.005, -0.06, 0, 0, 1.0, 1, 0.92); H.aj(new THREE.CylinderGeometry(0.117, 0.117, 0.03, 20), ruban, 0, 1.806, CZ - 0.01, -0.04, 0, 0);
      for (const s of [-1, 1]) { H.boule(noir, 0.03, s * 0.1, 1.72, CZ + 0.02, 0.6, 1.2, 1.2); H.boule(noir, 0.032, s * 0.095, 1.69, CZ - 0.04, 0.6, 1, 1); } H.boule(noir, 0.085, 0, 1.72, CZ - 0.06, 1.15, 0.6, 0.7);
      lunettes(H, M(0x050507, { roughness: 0.25, metalness: 0.2 }), { r: 0.034, z: 0.176, y: 1.67, ecart: 0.044 });
      H.boule(noir, 0.012, 0, 1.585, 0.154, 3.6, 0.55, 0.7);
      S('Neck').tore(or, 0.095, 0.011, 0, 1.43, 0.045, PI / 2 - 0.35, 0, 0);
      S('Chest').aj(new THREE.CylinderGeometry(0.028, 0.028, 0.008, 18), or, 0, 1.31, 0.165, PI / 2, 0, 0);
    } },
  { id: 'weekend', nom: 'Weekend Rouge', micro: 'weekend', chant: true, peau: 0xb98660,
    matiere: matieres({ peau: 0xb98660, semelle: 0x111112 }),
    peindre(Z) { const peau = css(this.peau), rouge = '#b3141c', fonce = '#80101a';
      Z.haut((g, dos) => { plein(g, rouge); for (let y = 1.0; y < 1.5; y += 0.08) trait(g, 'rgba(60,0,0,.12)', 0.01, [[-0.3, y], [0.3, y + 0.012]]);
        if (!dos) { poly(g, '#111114', [[-0.075, 1.56], [0.075, 1.56], [0.06, 0.98], [-0.06, 0.98]]); symetrie((s) => { poly(g, fonce, [[s * 0.06, 1.56], [s * 0.15, 1.5], [s * 0.05, 1.18], [s * 0.012, 1.3]]); trait(g, '#e03a3a', 0.005, [[s * 0.075, 1.54], [s * 0.15, 1.46], [s * 0.04, 1.2]]); });
          poly(g, peau, [[-0.035, 1.56], [0.035, 1.56], [0.0, 1.46]]); poly(g, '#0b0b0d', [[-0.02, 1.5], [0.02, 1.5], [0.012, 1.4], [0.0, 1.12], [-0.012, 1.4]]); }
        else { symetrie((s) => trait(g, fonce, 0.006, [[s * 0.02, 1.5], [s * 0.03, 1.0]])); } });
      Z.bras((g) => { manches(g, peau, rouge, 0.54, '#f2eadc'); });
      Z.bas((g, dos) => { plein(g, rouge); symetrie((s) => { trait(g, '#e03a3a', 0.006, [[s * 0.1, 0.95], [s * 0.1, 0.14]]); trait(g, fonce, 0.01, [[s * 0.02, 0.9], [s * 0.02, 0.14]]); }); ceinture(g, '#101012', null); if (!dos) rect(g, '#c9a24a', -0.02, 0.962, 0.04, 0.036);
        souliers(g, '#0e0e10', { haut: 0.115 }); });
    },
    pieces(S, M) { const H = S('Head'), noir = M(0x0c0a0a, { roughness: 0.9 });
      boucles(H, noir, { haut: 1.86, bas: 1.6, r0: 0.116, r1: 0.14, gros: 0.05, ouvert: (y) => (y > 1.76 ? 0.0 : 0.9), graine: 21, aplat: 0.95 });
      H.boule(noir, 0.06, 0, 1.9, CZ, 1.6, 0.8, 1.4);
      lunettes(H, M(0x050507, { roughness: 0.2, metalness: 0.2 }), { r: 0.036, z: 0.177, y: 1.668, ecart: 0.046, large: 1.15 });
    } },
  { id: 'pinky', nom: 'Pinky Punk', micro: 'pinky', chant: true, peau: 0xf2cfb4,
    matiere: matieres({ peau: 0xf2cfb4, semelle: 0x151517 }),
    peindre(Z) { const peau = css(this.peau), r = alea(55), cuir = '#15151a', rose = '#e8338a';
      Z.haut((g, dos) => { plein(g, cuir);
        if (!dos) { poly(g, rose, [[-0.13, 1.56], [0.13, 1.56], [0.09, 0.98], [-0.09, 0.98]]); for (let i = 0; i < 700; i++) { g.fillStyle = ['#ffd0ea', '#ffffff', '#ff7ab8', '#c9c9d4'][(r() * 4) | 0]; g.fillRect(-0.12 + r() * 0.24, 0.98 + r() * 0.58, 0.007, 0.007); }
          symetrie((s) => { trait(g, '#3a3a44', 0.006, [[s * 0.13, 1.54], [s * 0.1, 1.0]]); for (let y = 1.48; y > 1.05; y -= 0.07) rond(g, '#c9c9d4', s * (0.125 - (1.48 - y) * 0.07), y, 0.006); }); poly(g, peau, [[-0.07, 1.56], [0.07, 1.56], [0, 1.47]]); }
        else { for (let y = 1.1; y < 1.5; y += 0.09) trait(g, 'rgba(255,255,255,.1)', 0.008, [[-0.3, y], [0.3, y + 0.02]]); rond(g, '#c9c9d4', 0, 1.3, 0.03); } });
      Z.bras((g) => { manches(g, peau, cuir, 0.5, '#c9c9d4'); symetrie((s) => { for (const x of [0.3, 0.4]) rond(g, '#c9c9d4', s * x, 1.43, 0.008); }); });
      Z.bas((g, dos) => { plein(g, cuir); symetrie((s) => { trait(g, 'rgba(255,255,255,.16)', 0.012, [[s * 0.1, 0.95], [s * 0.095, 0.4]]); trait(g, 'rgba(255,255,255,.08)', 0.03, [[s * 0.15, 0.9], [s * 0.15, 0.3]]); });
        ceinture(g, '#0a0a0c', '#c9c9d4'); if (!dos) rect(g, rose, -0.02, 0.962, 0.04, 0.036);
        rect(g, '#0d0d0f', -0.5, 0, 1, 0.24); rect(g, '#2a2a30', -0.5, 0, 1, 0.03); symetrie((s) => { for (const y of [0.08, 0.15, 0.21]) rect(g, '#c9c9d4', s * 0.13 - 0.03, y, 0.06, 0.01); }); });
    },
    pieces(S, M) { const H = S('Head'), plat = M(0xf1ecd6, { roughness: 0.55 }), platF = M(0xdcd5b4, { roughness: 0.55 }), arg = argent();
      H.boule(plat, 0.112, 0, 1.745, CZ - 0.02, 1.0, 0.78, 1.1, 2);
      for (let k = 0; k < 16; k++) { const a = k / 16 * 2 * PI, rr = 0.045 + (k % 3) * 0.035, y = 1.80 + 0.008 * (k % 3), long = 0.085 + 0.03 * ((k * 7) % 3);
        H.cone(k % 2 ? plat : platF, 0.03, long, Math.sin(a) * rr, y + long / 2 - 0.02, CZ - 0.02 + Math.cos(a) * rr * 1.1, Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5, 5); }
      for (const s of [-1, 1]) { H.cone(plat, 0.026, 0.07, s * 0.108, 1.7, CZ - 0.01, 0, 0, -s * 1.1, 5); H.tore(arg, 0.018, 0.004, s * 0.106, 1.6, CZ + 0.0, 0, PI / 2, 0); }
      H.cone(plat, 0.03, 0.09, 0, 1.83, 0.12, -0.9, 0, 0, 5);
      for (const [os, sg] of [['LowerArmL', 1], ['LowerArmR', -1]]) { S(os).tore(M(0x0c0c0e), 0.037, 0.009, sg * 0.52, 1.415, 0.0, 0, PI / 2, 0); S(os).tore(arg, 0.039, 0.003, sg * 0.5, 1.415, 0.0, 0, PI / 2, 0); }
    } },
  { id: 'slim', nom: 'Slim Amour', micro: 'slim', chant: true, peau: 0xb98258,
    matiere: matieres({ peau: 0xb98258, barbe: 0xb98258, semelle: 0x111112 }),
    peindre(Z) { const peau = css(this.peau), noir = '#0d0d10', arg = '#d4d8e0';
      const grille = (g, x0, x1, y0, y1, pas) => { for (let y = y0; y <= y1; y += pas) trait(g, 'rgba(200,205,215,.55)', 0.004, [[x0, y], [x1, y]]); for (let x = x0; x <= x1; x += pas) trait(g, 'rgba(200,205,215,.55)', 0.004, [[x, y0], [x, y1]]);
        for (let y = y0; y <= y1; y += pas) for (let x = x0; x <= x1; x += pas) rond(g, arg, x, y, 0.0075); };
      Z.haut((g, dos) => { plein(g, noir);
        if (!dos) { poly(g, '#16161a', [[-0.19, 1.56], [0.19, 1.56], [0.17, 1.2], [0.1, 1.1], [-0.1, 1.1], [-0.17, 1.2]]); grille(g, -0.17, 0.17, 1.18, 1.54, 0.03); poly(g, peau, [[-0.06, 1.56], [0.06, 1.56], [0, 1.5]]); }
        else grille(g, -0.19, 0.19, 1.4, 1.54, 0.03); });
      Z.bras((g) => { plein(g, noir); symetrie((s) => { for (let y = 1.36; y <= 1.5; y += 0.03) for (let x = 0.12; x <= 0.3; x += 0.03) rond(g, arg, s * x, y, 0.0075); }); symetrie((s) => rect(g, peau, s > 0 ? 0.56 : -0.6, 0.8, 0.04, 1)); });
      Z.bas((g, dos) => { plein(g, '#111114'); symetrie((s) => trait(g, 'rgba(255,255,255,.1)', 0.012, [[s * 0.1, 0.95], [s * 0.1, 0.16]])); ceinture(g, '#0a0a0c', null); souliers(g, '#0c0c0e', { haut: 0.11 }); });
    },
    pieces(S, M) { const H = S('Head'), noir = M(0x16100e, { roughness: 0.7 }), barbe = M(0x20150f, { roughness: 1 });
      H.boule(noir, 0.112, 0, 1.745, CZ - 0.035, 1.02, 0.8, 1.1, 2);
      for (const s of [-1, 1]) H.boule(noir, 0.05, s * 0.104, 1.7, CZ - 0.02, 0.6, 1.4, 1.3);
      H.boule(noir, 0.06, 0, 1.64, -0.1, 1.1, 1.2, 1);
      for (let k = 0; k < 6; k++) H.boule(k % 2 ? noir : barbe, 0.04 - k * 0.003, 0.025 * Math.sin(k * 1.7), 1.58 - k * 0.07, -0.115 - 0.004 * k, 0.9, 1.5, 0.9);
      H.boule(barbe, 0.05, 0, 1.6, 0.145, 1.5, 0.65, 0.8); H.boule(barbe, 0.065, 0, 1.55, 0.13, 1.3, 0.9, 0.9);
      for (const s of [-1, 1]) { H.boule(barbe, 0.048, s * 0.075, 1.6, 0.1, 0.9, 1.3, 1); H.boule(barbe, 0.04, s * 0.098, 1.66, 0.07, 0.6, 1.2, 0.9); }
      S('LowerArmR').tore(argent(), 0.02, 0.005, -0.54, 1.415, 0.0, 0, PI / 2, 0);
    } },
];
