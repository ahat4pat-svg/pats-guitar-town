// Matériel de chant et chanteurs, tout en code, dans le même esprit que les guitares.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const cache = new Map();
const mat = (cle, o) => { if (!cache.has(cle)) cache.set(cle, new THREE.MeshStandardMaterial(o)); return cache.get(cle); };
const noir = () => mat('noir', { color: 0x14161b, roughness: 0.45, metalness: 0.35 });
const grille = () => mat('grille', { color: 0x8d9298, roughness: 0.4, metalness: 0.72 });
const argent = () => mat('argent', { color: 0xd5d8de, roughness: 0.28, metalness: 0.82 });
const laiton = () => mat('laiton', { color: 0xc9a961, roughness: 0.4, metalness: 0.35, emissive: 0xc9a961, emissiveIntensity: 0.18 });
const bois = () => mat('bois', { color: 0x5c3b22, roughness: 0.6 });
const ledMat = () => mat('led', { color: 0xffb454, emissive: 0xff7a2a, emissiveIntensity: 1.3, roughness: 0.4 });

const boite = (w, h, d, r = 0.012) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
function maille(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }
function ajouter(g, geo, m, x, y, z, rx = 0, ry = 0, rz = 0) {
  const mesh = maille(new THREE.Mesh(geo, m)); mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz); g.add(mesh); return mesh;
}

export function faireMicro(type = 'dynamique') {
  const g = new THREE.Group(); g.name = 'micro-' + type;
  if (type === 'condensateur') {
    ajouter(g, new THREE.CylinderGeometry(0.022, 0.024, 0.11, 12), argent(), 0, 0.09, 0);
    ajouter(g, new THREE.CylinderGeometry(0.02, 0.02, 0.045, 12), grille(), 0, 0.16, 0);
    ajouter(g, new THREE.TorusGeometry(0.034, 0.004, 6, 14), noir(), 0, 0.1, 0, Math.PI / 2);
    ajouter(g, new THREE.CylinderGeometry(0.012, 0.014, 0.04, 10), noir(), 0, 0.02, 0);
    return g;
  }
  const sansFil = type === 'sansfil';
  ajouter(g, new THREE.CylinderGeometry(0.013, 0.015, sansFil ? 0.15 : 0.16, 10), noir(), 0, 0.09, 0);
  ajouter(g, new THREE.SphereGeometry(sansFil ? 0.024 : 0.027, 12, 10), grille(), 0, sansFil ? 0.185 : 0.195, 0);
  ajouter(g, new THREE.CylinderGeometry(0.016, 0.016, 0.012, 10), laiton(), 0, 0.155, 0);
  if (sansFil) ajouter(g, new THREE.CylinderGeometry(0.0016, 0.0016, 0.055, 5), noir(), 0.012, 0.04, 0, 0, 0, 0.5);
  return g;
}

export function fairePied({ type = 'dynamique', perche = false, haut = 1.38 } = {}) {
  const g = new THREE.Group(); g.name = 'pied-' + type;
  const socle = haut < 0.45 ? 0.055 : 0.16;
  ajouter(g, new THREE.CylinderGeometry(socle, socle + 0.008, 0.02, 12), noir(), 0, 0.015, 0);
  ajouter(g, new THREE.CylinderGeometry(0.01, 0.012, haut, 8), noir(), 0, haut / 2 + 0.02, 0);
  const mic = faireMicro(type); mic.scale.setScalar(type === 'condensateur' ? 1.15 : 1.05);
  if (perche) {
    ajouter(g, new THREE.CylinderGeometry(0.01, 0.01, 0.42, 8), noir(), 0.16, haut + 0.02, 0, 0, 0, Math.PI / 2);
    ajouter(g, new THREE.SphereGeometry(0.02, 8, 6), laiton(), 0, haut + 0.02, 0);
    mic.position.set(0.36, haut + 0.02, 0); mic.rotation.z = -0.35;
  } else mic.position.set(0, haut + 0.02, 0);
  g.add(mic); return g;
}

export function faireSono({ dos = false } = {}) {
  const g = new THREE.Group(); g.name = dos ? 'sono-dos' : 'sono';
  const w = dos ? 0.26 : 0.38, h = dos ? 0.32 : 0.5, d = dos ? 0.14 : 0.26;
  ajouter(g, boite(w, h, d, 0.02), noir(), 0, h / 2 + 0.02, 0);
  ajouter(g, boite(w * 0.78, h * 0.62, 0.012, 0.008), grille(), 0, h * 0.58, d / 2 + 0.004);
  ajouter(g, new THREE.TorusGeometry(dos ? 0.028 : 0.04, 0.006, 6, 12), laiton(), 0, h / 2 + 0.04, d / 2 + 0.012);
  ajouter(g, new THREE.SphereGeometry(0.008, 8, 6), ledMat(), w * 0.28, h * 0.22, d / 2 + 0.01);
  if (dos) {
    ajouter(g, boite(0.08, 0.012, 0.05, 0.004), laiton(), 0, h + 0.03, 0);
  } else {
    ajouter(g, new THREE.TorusGeometry(0.045, 0.008, 6, 10), noir(), 0, h + 0.06, 0, Math.PI / 2);
    for (const s of [-1, 1]) ajouter(g, new THREE.CylinderGeometry(0.028, 0.028, 0.03, 8), noir(), s * (w * 0.32), 0.02, d * 0.2, Math.PI / 2, 0, Math.PI / 2);
    ajouter(g, new THREE.CylinderGeometry(0.008, 0.008, 0.22, 6), noir(), w * 0.22, h * 0.72, d / 2 + 0.02);
    ajouter(g, new THREE.CylinderGeometry(0.012, 0.014, 0.016, 8), laiton(), -w * 0.22, h * 0.28, d / 2 + 0.012, Math.PI / 2);
  }
  return g;
}

export function fairePedale() {
  const g = new THREE.Group(); g.name = 'pedale-voix';
  ajouter(g, boite(0.11, 0.045, 0.16, 0.01), noir(), 0, 0.03, 0);
  ajouter(g, boite(0.07, 0.012, 0.05, 0.004), mat('pedale', { color: 0x2a2420, roughness: 0.5, metalness: 0.2 }), 0, 0.055, 0.02);
  ajouter(g, new THREE.SphereGeometry(0.006, 8, 6), ledMat(), 0.035, 0.058, -0.05);
  for (const x of [-0.028, 0, 0.028]) ajouter(g, new THREE.CylinderGeometry(0.009, 0.009, 0.012, 8), laiton(), x, 0.058, -0.045);
  const c = document.createElement('canvas'); c.width = 128; c.height = 48;
  const ctx = c.getContext('2d'); ctx.fillStyle = '#14161b'; ctx.fillRect(0, 0, 128, 48);
  ctx.fillStyle = '#f3ede2'; ctx.font = '700 28px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('VOIX', 64, 26);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.25 });
  ajouter(g, new THREE.PlaneGeometry(0.07, 0.026), m, 0, 0.054, 0.055, -0.7, 0, 0);
  return g;
}

export function faireIntras() {
  const g = new THREE.Group(); g.name = 'intras';
  ajouter(g, boite(0.16, 0.035, 0.1, 0.01), bois(), 0, 0.02, 0);
  ajouter(g, boite(0.14, 0.008, 0.08, 0.004), mat('mousse', { color: 0x1c1a22, roughness: 0.9 }), 0, 0.04, 0);
  for (const s of [-1, 1]) {
    ajouter(g, new THREE.SphereGeometry(0.012, 8, 6), argent(), s * 0.035, 0.05, 0);
    ajouter(g, new THREE.SphereGeometry(0.007, 6, 5), noir(), s * 0.035, 0.05, 0.01);
  }
  return g;
}

const TEINTES = {
  chanteuse: [
    { Red_Dark: 0x7a2348, LightBlue: 0xf4e4ea, LightBrown: 0xc4556a, White: 0xf7f1ea, cheveux: 0x1a120e, long: true },
    { Red_Dark: 0x1c5e58, LightBlue: 0xe5f0ee, LightBrown: 0xd7a15e, White: 0xf3efe6, cheveux: 0x3a2418, long: true },
    { Red_Dark: 0x4c3478, LightBlue: 0xefe6f6, LightBrown: 0xe7b3c8, White: 0xf6f1ea, cheveux: 0x120e12, long: true },
  ],
  chanteur: { Red_Dark: 0x243044, LightBlue: 0xd9c7a4, LightBrown: 0x8a6238, White: 0xe7e0d4, cheveux: 0x16120e, long: false },
};

function chevelure(long, couleur) {
  const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.92 });
  const calotte = maille(new THREE.Mesh(new THREE.SphereGeometry(long ? 0.115 : 0.108, 12, 8), m));
  calotte.scale.set(1.02, long ? 0.72 : 0.5, 1.05); calotte.position.set(0, long ? 0.1 : 0.12, 0.01); g.add(calotte);
  if (long) {
    const dos = maille(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.045, 0.34, 8), m));
    dos.position.set(0, -0.06, -0.07); g.add(dos);
    for (const s of [-1, 1]) {
      const cote = maille(new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), m));
      cote.scale.set(0.7, 1.1, 0.8); cote.position.set(s * 0.09, 0.02, -0.02); g.add(cote);
    }
  }
  return g;
}

function attacher(racine, noms, enfant, x, y, z, rx = 0, ry = 0, rz = 0) {
  let os = null; for (const n of noms) { os = racine.getObjectByName(n); if (os) break; }
  enfant.position.set(x, y, z); enfant.rotation.set(rx, ry, rz);
  if (!os) { racine.add(enfant); return false; }
  racine.updateMatrixWorld(true);
  let sq = null; racine.traverse((o) => { if (!sq && o.isSkinnedMesh && o.skeleton) sq = o.skeleton; });
  const i = sq ? sq.bones.indexOf(os) : -1;
  if (sq && i >= 0 && sq.boneInverses[i]) {
    const g = new THREE.Group(); g.matrixAutoUpdate = false;
    const inv = new THREE.Matrix4().copy(sq.bones[0].parent.matrixWorld).invert();
    g.matrix.multiplyMatrices(sq.boneInverses[i], inv); os.add(g); g.add(enfant);
  } else os.add(enfant);
  return true;
}

function chemin(points, boucle) {
  const pts = boucle ? points.slice(0, -1) : points;
  const seg = []; let L = 0;
  const n = boucle ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 0.001;
    seg.push({ a, b, len, d0: L }); L += len;
  }
  return { longueur: L, boucle, point(d) {
    if (boucle) d = ((d % L) + L) % L; else d = Math.max(0, Math.min(L - 1e-4, d));
    for (const s of seg) if (d <= s.d0 + s.len + 1e-6) {
      const t = (d - s.d0) / s.len;
      return { x: s.a[0] + (s.b[0] - s.a[0]) * t, z: s.a[1] + (s.b[1] - s.a[1]) * t, dx: s.b[0] - s.a[0], dz: s.b[1] - s.a[1] };
    }
    const s = seg[seg.length - 1]; return { x: s.b[0], z: s.b[1], dx: s.b[0] - s.a[0], dz: s.b[1] - s.a[1] };
  } };
}

const CERCLE = Array.from({ length: 9 }, (_, i) => { const a = i / 8 * Math.PI * 2 + 0.4; return [Math.sin(a) * 15.6, Math.cos(a) * 15.6]; });

export function faireChanteurs(avatar) {
  if (!avatar || !avatar.modele) return [];
  const clip = (avatar.clips || []).find((c) => (c.name || '').split('|').pop() === 'Walk');
  const fiches = [
    { role: 'chanteuse', teinte: TEINTES.chanteuse[0], micro: 'dynamique', chemin: chemin([[2.15, 18], [2.15, 66]], false), dist: 8, vitesse: 1.22 },
    { role: 'chanteuse', teinte: TEINTES.chanteuse[1], micro: 'sansfil', chemin: chemin(CERCLE, true), dist: 18, vitesse: 1.15 },
    { role: 'chanteuse', teinte: TEINTES.chanteuse[2], micro: 'dynamique', chemin: chemin([[-12.2, -4.1], [-30.2, -10.0]], false), dist: 4, vitesse: 1.18 },
    { role: 'chanteur', teinte: TEINTES.chanteur, micro: 'sansfil', chemin: chemin([[-2.35, 16], [-2.35, 64]], false), dist: 22, vitesse: 1.28 },
  ];
  return fiches.map((f) => {
    const clone = SkeletonUtils.clone(avatar.modele);
    clone.traverse((o) => {
      if (!o.isMesh) return;
      const src = Array.isArray(o.material) ? o.material : [o.material];
      const mats = src.map((m0) => { const m1 = m0.clone(); const hex = f.teinte[m1.name] ?? (m1.name === 'Hair' ? f.teinte.cheveux : null); if (hex != null) m1.color.setHex(hex); return m1; });
      o.material = Array.isArray(o.material) ? mats : mats[0]; o.castShadow = true; o.frustumCulled = false;
    });
    const groupe = new THREE.Group(); groupe.add(clone); groupe.userData.role = f.role;
    clone.updateMatrixWorld(true);
    attacher(clone, ['Head'], chevelure(f.teinte.long, f.teinte.cheveux), 0, 0.02, 0.01);
    const mic = faireMicro(f.micro); mic.scale.setScalar(1.65);
    mic.position.set(0.28, 1.0, 0.2); mic.rotation.set(-0.35, -0.4, -0.2); clone.add(mic);
    const sono = faireSono({ dos: true }); sono.scale.setScalar(1.55);
    sono.position.set(0, 1.08, -0.16); sono.rotation.set(0.12, Math.PI, 0); clone.add(sono);
    const mixer = new THREE.AnimationMixer(clone); let action = null;
    if (clip) { action = mixer.clipAction(clip); action.time = Math.random() * clip.duration; action.timeScale = f.vitesse / 1.25; action.play(); }
    const p = f.chemin.point(f.dist); groupe.position.set(p.x, 0, p.z); groupe.rotation.y = Math.atan2(p.dx, p.dz);
    return { ...f, groupe, mixer, action, sens: 1 };
  });
}

export function animerChanteurs(liste, dt) {
  for (const c of liste) {
    if (c.fige) { c.mixer.update(dt); continue; }
    const L = c.chemin.longueur;
    if (c.chemin.boucle) c.dist = (c.dist + c.vitesse * dt) % L;
    else {
      c.dist += c.sens * c.vitesse * dt;
      if (c.dist >= L) { c.dist = L; c.sens = -1; }
      if (c.dist <= 0) { c.dist = 0; c.sens = 1; }
    }
    const p = c.chemin.point(c.dist);
    c.groupe.position.set(p.x, 0, p.z);
    const face = c.chemin.boucle ? 1 : c.sens;
    const vise = Math.atan2(p.dx * face, p.dz * face);
    let d = vise - c.groupe.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    c.groupe.rotation.y += d * Math.min(1, dt * 5);
    c.mixer.update(dt);
  }
}
