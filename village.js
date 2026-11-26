import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GUITARES, faireGuitare as faireGuitareExacte } from './guitares.js';
import { PUBLIC, SANS_KITS, ELEVE } from './config.js';
import { KITS, faireAtlasKit, piecesKit } from './kits.js';
import { PORTES } from './portes.js';
const OUTILS = [], NOM_STUDIO = '', ouvrirOutil = () => {};
window.__village = { figer: false, temps: [] };
const tic = (n) => window.__village.temps.push([n, Math.round(performance.now())]);
const C = { nuit0: 0x04070f, brume: 0x0b1832, bleu: 0x1e4fa0, orange: 0xffb454, orange5: 0xff9e38, chaud: 0xffe2b8, laiton: 0xc9a961, creme: 0xf3ede2 };
const R = 78;
const K = 0.0013;
const TACTILE = matchMedia('(pointer:coarse)').matches;
const $ = (s) => document.querySelector(s);
THREE.ShaderChunk.project_vertex = THREE.ShaderChunk.project_vertex.replace('mvPosition = modelViewMatrix * mvPosition;',
  `vec4 posMonde = modelMatrix * mvPosition;
  if ( ! isOrthographic && posMonde.y > -150.0 ) { vec2 ecart = posMonde.xz - cameraPosition.xz; posMonde.y -= ${K} * dot( ecart, ecart ); }
  mvPosition = viewMatrix * posMonde;`);
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.debug.checkShaderErrors = false;
renderer.setPixelRatio(Math.min(devicePixelRatio, TACTILE ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(C.nuit0);
scene.fog = new THREE.FogExp2(C.brume, 0.0085);
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 600);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.28, 0.6, 0.93);
{
  const m = bloom.materialHighPassFilter, avant = 'vec4 texel = texture2D( tDiffuse, vUv );';
  if (m.fragmentShader.includes(avant)) { m.fragmentShader = m.fragmentShader.replace(avant, avant + ' if ( ! ( texel.r >= 0.0 && texel.r < 60000.0 && texel.g >= 0.0 && texel.g < 60000.0 && texel.b >= 0.0 && texel.b < 60000.0 ) ) texel = vec4( 0.0, 0.0, 0.0, 1.0 );'); m.needsUpdate = true; }
   }
composer.addPass(bloom);
let flouBase = 0.28, flouLeger = 1;
composer.addPass(new OutputPass());
const hemi = new THREE.HemisphereLight(0x6a8fd0, 0x101826, 0.95); scene.add(hemi);
const lune = new THREE.DirectionalLight(0x9fc0ea, 1.7);
lune.castShadow = true;
lune.shadow.mapSize.set(TACTILE ? 1024 : 2048, TACTILE ? 1024 : 2048);
Object.assign(lune.shadow.camera, { left: -46, right: 46, top: 46, bottom: -46, near: 1, far: 140 });
lune.shadow.bias = -0.0008; lune.shadow.normalBias = 0.05; lune.shadow.radius = 5;
scene.add(lune, lune.target);
function lampe(x, y, z, couleur = C.orange, intensite = 26, portee = 13) {
  const l = new THREE.PointLight(couleur, intensite, portee, 1.8); l.position.set(x, y, z); scene.add(l); lampesDehors.push(l); return l;
}
const lampesDehors = [];
function toile(l, h, dessin) {
  const c = document.createElement('canvas'); c.width = l; c.height = h; dessin(c.getContext('2d'), l, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function alea(graine) { let s = graine; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const T = (x, y, z, ry = 0, rx = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1));
class Lot {
  constructor() { this.m = new Map(); }
  add(mat, geo, mtx) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.clearGroups(); if (mtx) g.applyMatrix4(mtx);
    if (!this.m.has(mat)) this.m.set(mat, []); this.m.get(mat).push(g); return this;
  }
  finir(parent) {
    for (const [mat, gs] of this.m) { const mesh = new THREE.Mesh(mergeGeometries(gs), mat);
      mesh.castShadow = !mat.userData.sansOmbre && !mat.userData.sansProjeter; mesh.receiveShadow = !mat.userData.sansOmbre; parent.add(mesh); }
    return parent;
  }
}
const texMur = toile(256, 256, (g, S) => { const r = alea(11); g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 16) { g.fillStyle = `rgba(0,0,0,${0.09 + r() * 0.05})`; g.fillRect(0, y, S, 2); }
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.06})`; g.fillRect(r() * S, r() * S, 6 + r() * 20, 14); } });
texMur.wrapS = texMur.wrapT = THREE.RepeatWrapping;
function mur(lot, mat, w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / 3.2, uv.getY(k) * dims[f][1] / 3.2); }
  lot.add(mat, g, T(x, y, z));
}
const doux = (lot, mat, w, h, d, x, y, z, r = 0.07, ry = 0, rx = 0) => lot.add(mat, new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), T(x, y, z, ry, rx));
const M = {
  brique: new THREE.MeshStandardMaterial({ color: 0x3d4557, roughness: 0.85, map: texMur }),
  pierre: new THREE.MeshStandardMaterial({ color: 0x564b44, roughness: 0.85, map: texMur }),
  pierre2: new THREE.MeshStandardMaterial({ color: 0x4a3f3a, roughness: 0.85, map: texMur }),
  bois: new THREE.MeshStandardMaterial({ color: 0x8a5632, roughness: 0.6 }),
  sombre: new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 0.5, metalness: 0.35 }),
  corniche: new THREE.MeshStandardMaterial({ color: 0x262a33, roughness: 0.6 }),
  beton: new THREE.MeshStandardMaterial({ color: 0x8a8279, roughness: 0.9 }),
  toit: new THREE.MeshStandardMaterial({ color: 0x1a1e27, roughness: 0.7 }),
  colonne: new THREE.MeshStandardMaterial({ color: 0xb9ad9c, roughness: 0.7 }),
  auvent: new THREE.MeshStandardMaterial({ color: 0xc0601f, roughness: 0.8, emissive: 0x6a2a08, emissiveIntensity: 0.5 }),
  lettres: new THREE.MeshStandardMaterial({ color: 0xf3ede2, roughness: 0.5, emissive: 0xffd9a0, emissiveIntensity: 0.55 }),
  laiton: new THREE.MeshStandardMaterial({ color: C.laiton, metalness: 0.25, roughness: 0.4, emissive: C.laiton, emissiveIntensity: 0.4 }),
  marche: new THREE.MeshStandardMaterial({ color: 0xa8917a, roughness: 0.85 }),
  grille: new THREE.MeshStandardMaterial({ color: 0x3a2516, roughness: 0.6, metalness: 0.2 }),
  vitreNuit: new THREE.MeshStandardMaterial({ color: 0x1a2a44, roughness: 0.12, metalness: 0.7 }),
  haie: new THREE.MeshStandardMaterial({ color: 0x1c4c3e, roughness: 0.95 }),
  tronc: new THREE.MeshStandardMaterial({ color: 0x4a3526, roughness: 0.9 }),
  feuilles: [0x23604f, 0x2b7260, 0x1c5245].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.92 })),
  sapin: new THREE.MeshStandardMaterial({ color: 0x1a4a44, roughness: 0.92 }),
  poteau: new THREE.MeshStandardMaterial({ color: 0x16181d, roughness: 0.45, metalness: 0.55 }),
  ampoule: new THREE.MeshStandardMaterial({ color: 0xffe2b8, emissive: 0xffa550, emissiveIntensity: 1.3, roughness: 0.4 }),
};
M.ampoule.userData.sansOmbre = true;
{ const tF = toile(8, 128, (g, l, h) => { const d = g.createLinearGradient(0, 0, 0, h); d.addColorStop(0, '#d4dcd8'); d.addColorStop(0.4, '#93a39d'); d.addColorStop(0.8, '#3a4644'); d.addColorStop(1, '#1b2123'); g.fillStyle = d; g.fillRect(0, 0, l, h); });
  for (const m of [...M.feuilles, M.sapin]) { m.map = tF; m.color.offsetHSL(0, 0, 0.05);
    m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vec3( 1.0, 0.52, 0.2 ) * clamp( vMapUv.x, 0.0, 1.0 ) * 0.42;'); }; } }
const texVitre = toile(128, 256, (g, l, h) => { const d = g.createLinearGradient(0, 0, 0, h); d.addColorStop(0, '#ffcf8e'); d.addColorStop(0.5, '#ffab52'); d.addColorStop(1, '#d9762a');
  g.fillStyle = d; g.fillRect(0, 0, l, h); g.fillStyle = 'rgba(70,32,6,.24)'; g.fillRect(0, h * 0.7, l, h * 0.3);
  const o = g.createRadialGradient(l / 2, h * 0.42, 0, l / 2, h * 0.42, h * 0.62); o.addColorStop(0, 'rgba(255,236,200,.22)'); o.addColorStop(1, 'rgba(110,50,10,.22)'); g.fillStyle = o; g.fillRect(0, 0, l, h); });
M.vitre = [0.66, 0.44, 0.24].map((i) => new THREE.MeshStandardMaterial({ map: texVitre, emissiveMap: texVitre, emissive: 0xffffff, emissiveIntensity: i, roughness: 0.3 }));
M.vitrine = new THREE.MeshStandardMaterial({ map: texVitre, emissiveMap: texVitre, emissive: 0xffffff, emissiveIntensity: 0.64, roughness: 0.3 });
for (const v of [...M.vitre, M.vitrine]) v.userData.sansOmbre = true;
const texLueur = toile(128, 256, (g, l, h) => { const d = g.createLinearGradient(0, 0, 0, h); d.addColorStop(0, 'rgba(255,190,110,.85)'); d.addColorStop(0.5, 'rgba(255,170,90,.28)'); d.addColorStop(1, 'rgba(255,160,80,0)');
  g.fillStyle = d; g.fillRect(0, 0, l, h); const e = g.createLinearGradient(0, 0, l, 0); e.addColorStop(0, 'rgba(0,0,0,1)'); e.addColorStop(0.22, 'rgba(0,0,0,0)'); e.addColorStop(0.78, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = e; g.fillRect(0, 0, l, h); });
M.lueur = new THREE.MeshBasicMaterial({ map: texLueur, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.3, polygonOffset: true, polygonOffsetFactor: -4 });
const texRond = toile(128, 128, (g, S) => { const d = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); d.addColorStop(0, 'rgba(255,205,140,.8)'); d.addColorStop(0.4, 'rgba(255,180,100,.3)'); d.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = d; g.fillRect(0, 0, S, S); });
M.lueurRonde = new THREE.MeshBasicMaterial({ map: texRond, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.3, polygonOffset: true, polygonOffsetFactor: -4 });
const texLueurLongue = toile(128, 256, (g, l, h) => { const d = g.createLinearGradient(0, 0, 0, h); d.addColorStop(0, 'rgba(255,186,108,.5)'); d.addColorStop(0.3, 'rgba(255,172,92,.34)'); d.addColorStop(0.65, 'rgba(255,164,84,.13)'); d.addColorStop(1, 'rgba(255,160,80,0)');
  g.fillStyle = d; g.fillRect(0, 0, l, h); const e = g.createLinearGradient(0, 0, l, 0); e.addColorStop(0, 'rgba(0,0,0,1)'); e.addColorStop(0.3, 'rgba(0,0,0,0)'); e.addColorStop(0.7, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = e; g.fillRect(0, 0, l, h); });
M.lueurLongue = new THREE.MeshBasicMaterial({ map: texLueurLongue, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5, polygonOffset: true, polygonOffsetFactor: -4 });
M.lueur.userData.sansOmbre = M.lueurRonde.userData.sansOmbre = M.lueurLongue.userData.sansOmbre = true;
function lueurSol(lot, larg, prof, x, z, ry = 0, mat = M.lueur) {
  const g = new THREE.PlaneGeometry(larg, prof, 6, 10); g.rotateX(-Math.PI / 2); g.translate(0, 0.07, prof / 2); lot.add(mat, g, T(x, 0, z, ry));
}
const tousHalos = [], vHalo = new THREE.Vector3();
function halo(couleur, taille, opacite) {
  const t = toile(256, 256, (g, S) => { const d = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    d.addColorStop(0, 'rgba(255,255,255,1)'); d.addColorStop(0.35, 'rgba(255,255,255,.35)'); d.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = d; g.fillRect(0, 0, S, S); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color: couleur, transparent: true, opacity: opacite, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.scale.setScalar(taille); s.raycast = () => {}; tousHalos.push(s); return s;
}
const LIEUX = {
  chapeau: { nom: 'Le chapeau', sur: 'Au centre du village', x: 0, z: 0, porte: [0, 7.6],
    texte: "Le coin de Pat. Son histoire, sa façon de jouer, et comment le joindre.",
    liste: [['Vingt ans de scène', 'à venir'], ['Pourquoi j\'enseigne', 'à venir'], ['Écrire à Pat', 'à venir']] },
  ecole: { nom: 'L\'école', sur: 'Les cours de guitare', x: -46, z: -32, porte: [-46, -19.4],
    texte: "Ton cours t'attend ici : les notes de la semaine, les exercices et la prochaine rencontre.",
    liste: [['Ton prochain cours', 'essai'], ['Exercices de la semaine', 'essai'], ['S\'inscrire', 'essai']] },
  biblio: { nom: 'La bibliothèque', sur: 'Partitions, documents, Songbook', x: 46, z: -32, porte: [46, -17.9],
    texte: "Tout ce qui est papier. Tu cherches une pièce, elle s'ouvre sur place.",
    liste: [['Partitions et tablatures', 'essai'], ['Songbook : paroles et accords', 'essai'], ['Guitare Pat : ralentir, boucler', 'essai']] },
  cinema: { nom: 'Le cinéma', sur: 'Les capsules', x: -46, z: 34, l: 24, p: 17, porte: [-37.9, 34], sortie: { x: -31.6, z: 31.4, vers: [-14, 12] }, etq: [-6, 34] },
  magasin: { nom: 'Le magasin de musique', sur: 'Guitares et instruments', x: 46, z: 34, l: 24, p: 17, porte: [37.9, 34], sortie: { x: 31.6, z: 31.4, vers: [14, 12] }, etq: [6, 34] },
};
const DEPART = [0, 52];
const RUES = [[0, 0, 0, 76, 9], [0, 0, -46, -15, 7.5], [0, 0, 46, -13, 7.5], [0, 0, -31, 25, 6.5], [0, 0, 31, 25, 6.5], [-46, -15, 46, -13, 6]];
const distRue = (x, z) => Math.min(...RUES.map(([x1, z1, x2, z2, l]) => { const dx = x2 - x1, dz = z2 - z1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - x1 - t * dx, z - z1 - t * dz) - l / 2; }));
const TS = 4096, px = (v) => (v / R + 1) / 2 * TS, ech = (m) => m / R / 2 * TS;
const sol = toile(TS, TS, (g, S) => {
  const r = alea(7);
  g.fillStyle = '#1a352f'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90000; i++) { g.fillStyle = `rgba(${40 + r() * 50},${95 + r() * 70},${75 + r() * 40},${0.04 + r() * 0.09})`; g.fillRect(r() * S, r() * S, 2 + r() * 5, 2 + r() * 5); }
  for (let i = 0; i < 260; i++) { const x = r() * S, y = r() * S, t = 60 + r() * 160; const d = g.createRadialGradient(x, y, 0, x, y, t); d.addColorStop(0, `rgba(${r() < 0.5 ? '8,26,24' : '70,128,96'},.27)`); d.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = d; g.fillRect(x - t, y - t, 2 * t, 2 * t); }
  const pierre = '#7a7166', bord = '#3a3631';
  for (const passe of [0, 1]) for (const [x1, z1, x2, z2, l] of RUES) { g.strokeStyle = passe ? pierre : bord; g.lineWidth = ech(l + (passe ? 0 : 0.7)); g.lineCap = 'round';
    g.beginPath(); g.moveTo(px(x1), px(z1)); g.lineTo(px(x2), px(z2)); g.stroke(); }
  const place = (x, z, ray) => { g.fillStyle = bord; g.beginPath(); g.arc(px(x), px(z), ech(ray + 0.35), 0, 7); g.fill(); g.fillStyle = pierre; g.beginPath(); g.arc(px(x), px(z), ech(ray), 0, 7); g.fill(); };
  if (LIEUX.studio) for (const passe of [0, 1]) { g.strokeStyle = passe ? pierre : bord; g.lineWidth = ech(4.6 + (passe ? 0 : 0.7)); g.lineCap = 'round'; g.beginPath(); g.moveTo(px(0), px(-17)); g.lineTo(px(0), px(-44)); g.stroke(); }
  place(0, 0, 19); place(-46, -16.5, 9.5); place(46, -14.5, 10.5); place(0, 58, 6.5);
  place(-27.5, -27, 9.2); place(-13, -22.2, 6.8);
  { for (const passe of [0, 1]) { g.strokeStyle = passe ? pierre : bord; g.lineWidth = ech(3.4 + (passe ? 0 : 0.6)); g.lineCap = 'round'; g.beginPath(); g.moveTo(px(35.8), px(31.2)); g.lineTo(px(36.4), px(47.2)); g.stroke(); }
    g.fillStyle = bord; g.beginPath(); g.arc(px(36.4), px(47.2), ech(6.35), 0, 7); g.fill(); g.fillStyle = '#3a3430'; g.beginPath(); g.arc(px(36.4), px(47.2), ech(6.0), 0, 7); g.fill();
    g.strokeStyle = 'rgba(70,54,40,.85)'; g.lineWidth = ech(2.2); g.lineCap = 'round'; g.beginPath(); g.moveTo(px(16.8), px(-15)); g.quadraticCurveTo(px(18.4), px(-30), px(18), px(-42)); g.stroke();
    const sd = g.createRadialGradient(px(18), px(-44.5), 0, px(18), px(-44.5), ech(5.4)); sd.addColorStop(0, 'rgba(34,24,18,.95)'); sd.addColorStop(0.7, 'rgba(52,38,28,.8)'); sd.addColorStop(1, 'rgba(52,38,28,0)'); g.fillStyle = sd; g.fillRect(px(18) - ech(6), px(-44.5) - ech(6), ech(12), ech(12)); }
  if (LIEUX.studio) { g.fillStyle = bord; g.beginPath(); g.arc(px(0), px(-43.6), ech(6.15), 0, 7); g.fill(); g.fillStyle = '#2f3440'; g.beginPath(); g.arc(px(0), px(-43.6), ech(5.8), 0, 7); g.fill(); }
  { g.fillStyle = bord; g.beginPath(); g.arc(px(35.8), px(31.2), ech(6.95), 0, 7); g.fill(); g.fillStyle = '#353c4c'; g.beginPath(); g.arc(px(35.8), px(31.2), ech(6.6), 0, 7); g.fill(); }
  { g.fillStyle = bord; g.beginPath(); g.arc(px(-35.8), px(31.2), ech(6.95), 0, 7); g.fill(); g.fillStyle = '#2a2622'; g.beginPath(); g.arc(px(-35.8), px(31.2), ech(6.6), 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(20,18,16,.3)'; g.lineWidth = 2.5;
  for (let a = 11.5; a <= 19; a += 1.5) { g.beginPath(); g.arc(px(0), px(0), ech(a), 0, 7); g.stroke(); }
  for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; g.beginPath(); g.moveTo(px(Math.cos(a) * 11.5), px(Math.sin(a) * 11.5)); g.lineTo(px(Math.cos(a) * 19), px(Math.sin(a) * 19)); g.stroke(); }
  for (const [x1, z1, x2, z2, l] of RUES) { const n = Math.hypot(x2 - x1, z2 - z1); g.strokeStyle = 'rgba(20,18,16,.1)'; g.lineWidth = 2;
    for (let d = 20; d < n; d += 1.6) { const t = d / n, cx = x1 + (x2 - x1) * t, cz = z1 + (z2 - z1) * t; if (Math.hypot(cx + 46, cz + 16.5) < 13 || Math.hypot(cx - 46, cz + 14.5) < 14) continue; const nx = -(z2 - z1) / n * l / 2, nz = (x2 - x1) / n * l / 2; g.beginPath(); g.moveTo(px(cx - nx), px(cz - nz)); g.lineTo(px(cx + nx), px(cz + nz)); g.stroke(); } }
  for (let i = 0; i < 30000; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.06})`; g.fillRect(r() * S, r() * S, 3, 3); }
});
{
  const dessus = new THREE.Mesh(new THREE.RingGeometry(0.001, R, 144, 72), new THREE.MeshStandardMaterial({ map: sol, roughness: 0.95 }));
  dessus.rotation.x = -Math.PI / 2; dessus.receiveShadow = true; scene.add(dessus);
  const tranche = new THREE.Mesh(new THREE.CylinderGeometry(R, R - 1, 4, 144, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a2320, roughness: 1 })); tranche.position.y = -2; scene.add(tranche);
  const socle = new THREE.Mesh(new THREE.CylinderGeometry(R + 2, R + 2.6, 3, 144), new THREE.MeshStandardMaterial({ color: 0x15100d, roughness: 0.55, metalness: 0.1 })); socle.position.y = -5.5; scene.add(socle);
  const filet = new THREE.Mesh(new THREE.TorusGeometry(R + 2.02, 0.14, 10, 160), new THREE.MeshStandardMaterial({ color: C.laiton, metalness: 0.9, roughness: 0.3, emissive: C.laiton, emissiveIntensity: 0.15 })); filet.rotation.x = Math.PI / 2; filet.position.y = -4; scene.add(filet);
  const bordure = new THREE.Mesh(new THREE.TorusGeometry(R - 0.4, 0.3, 10, 160), new THREE.MeshStandardMaterial({ color: 0x1b1714, roughness: 0.7 })); bordure.rotation.x = Math.PI / 2; bordure.position.y = 0.15; scene.add(bordure);
}
const etoiles = (() => { const n = 900, p = new Float32Array(n * 3), r = alea(3);
  for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, e = 0.12 + r() * 1.35, d = 380; p.set([Math.cos(a) * Math.cos(e) * d, Math.sin(e) * d + 60, Math.sin(a) * Math.cos(e) * d], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xbfd4ee, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.65, fog: false })); pts.frustumCulled = false; scene.add(pts); return pts; })();
const ciel = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  uniforms: { bas: { value: new THREE.Color(0x0c1b3a) }, haut: { value: new THREE.Color(C.nuit0) } },
  vertexShader: 'varying vec3 d; void main() { d = position; vec4 p = viewMatrix * vec4( position * 400.0 + cameraPosition, 1.0 ); gl_Position = projectionMatrix * p; }',
  fragmentShader: 'uniform vec3 bas; uniform vec3 haut; varying vec3 d; void main() { float h = normalize( d ).y; gl_FragColor = vec4( mix( bas, haut, smoothstep( -0.12, 0.62, h ) ), 1.0 ); }' }));
ciel.frustumCulled = false; ciel.renderOrder = -10; scene.add(ciel);
const boites = [], ronds = [], cacheurs = [], halosLoin = [];
const boite = (x1, x2, z1, z2) => boites.push({ x1, x2, z1, z2 });
let police;
function fenetre(lot, m, w, h, niv, { appui = true, meneau = true, traverse = 0.64 } = {}) {
  const P = (g, mat, x, y, z) => lot.add(mat, g, m.clone().multiply(T(x, y, z)));
  P(new THREE.PlaneGeometry(w, h), niv && niv.isMaterial ? niv : niv === 'nuit' ? M.vitreNuit : niv === 'vitrine' ? M.vitrine : M.vitre[niv], 0, 0, 0.05);
  const e = 0.13, s = 0.22, n = Math.max(2, Math.round(w / 1.1));
  P(new THREE.BoxGeometry(w + 2 * e, e, s), M.sombre, 0, h / 2 + e / 2, s / 2); P(new THREE.BoxGeometry(w + 2 * e, e, s), M.sombre, 0, -h / 2 - e / 2, s / 2);
  for (const c of [-1, 1]) P(new THREE.BoxGeometry(e, h, s), M.sombre, c * (w / 2 + e / 2), 0, s / 2);
  if (meneau) for (let i = 1; i < n; i++) P(new THREE.BoxGeometry(0.06, h, 0.1), M.sombre, -w / 2 + i * w / n, 0, 0.1);
  if (traverse) P(new THREE.BoxGeometry(w, 0.06, 0.1), M.sombre, 0, -h / 2 + h * traverse, 0.1);
  if (appui) P(new RoundedBoxGeometry(w + 0.5, 0.12, 0.42, 2, 0.04), M.beton, 0, -h / 2 - e - 0.05, 0.2);
}
function relief(lot, texte, taille, x, y, z, ry = 0, mat = M.lettres) {
  const g = new TextGeometry(texte, { font: police, size: taille, height: taille * 0.16, curveSegments: 5, bevelEnabled: true, bevelThickness: taille * 0.02, bevelSize: taille * 0.012, bevelSegments: 2 });
  g.computeBoundingBox(); g.translate(-(g.boundingBox.max.x + g.boundingBox.min.x) / 2, 0, 0); lot.add(mat, g, T(x, y, z, ry));
}
function lettrageNet(texte, taille, couleur = '#f3ede2') {
  const W = 2048, H = 512, formes = police.generateShapes(texte, 100), bo = new THREE.Box2();
  for (const f of formes) for (const q of f.getPoints(6)) bo.expandByPoint(q);
  const lw = bo.max.x - bo.min.x, lh = bo.max.y - bo.min.y, k = Math.min((W - 64) / lw, (H - 64) / lh), cx = (bo.min.x + bo.max.x) / 2, cy = (bo.min.y + bo.max.y) / 2;
  const t = toile(W, H, (g) => { g.clearRect(0, 0, W, H); g.fillStyle = couleur; g.translate(W / 2, H / 2); g.scale(k, -k); g.translate(-cx, -cy);
    const trace = (pts) => { pts.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.closePath(); };
    for (const f of formes) { g.beginPath(); trace(f.getPoints(14)); for (const h of f.holes) trace(h.getPoints(14)); g.fill('evenodd'); } });
  t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true;
  const e = taille / 100, geo = new THREE.PlaneGeometry(W / k * e, H / k * e); geo.translate(0, cy * e, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, color: 0xf0e9dc })); m.raycast = () => {}; return m;
}
function dessinerAffiche(g, L, H, img) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#0b1424'; g.fillRect(0, 0, L, H);
  if (img) { const w = L * 0.84, h = w * img.height / img.width; g.drawImage(img, (L - w) / 2, (H - h) / 2, w, h); }
  else { const cx = L / 2, cy = H * 0.55, w = L * 0.36, h = H * 0.25; g.fillStyle = '#f3ede2';
    g.beginPath(); g.ellipse(cx, cy + h * 0.5, w * 0.9, h * 0.12, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(cx - w * 0.5, cy + h * 0.5); g.lineTo(cx - w * 0.57, cy - h * 0.5); g.lineTo(cx + w * 0.57, cy - h * 0.5); g.lineTo(cx + w * 0.5, cy + h * 0.5); g.closePath(); g.fill();
    g.save(); g.translate(cx + w * 0.12, cy - h * 0.74); g.rotate(-0.3); g.beginPath(); g.ellipse(0, 0, w * 0.62, h * 0.09, 0, 0, 7); g.fill(); g.restore();
    g.fillStyle = '#0b1424'; g.fillRect(cx - w * 0.54, cy + h * 0.2, w * 1.08, h * 0.1); }
  g.strokeStyle = '#c9a961'; g.lineWidth = L * 0.012; g.strokeRect(L * 0.055, L * 0.055, L * 0.89, H - L * 0.11);
  const d = g.createLinearGradient(0, 0, 0, H); d.addColorStop(0, 'rgba(255,196,130,.2)'); d.addColorStop(0.5, 'rgba(255,180,100,.04)'); d.addColorStop(1, 'rgba(0,0,0,.2)'); g.fillStyle = d; g.fillRect(0, 0, L, H);
}
function matAffiche(force = 0.6) { const t = toile(384, 576, (g, L, H) => dessinerAffiche(g, L, H)); const m = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: force, roughness: 0.85 }); m.userData.sansOmbre = true; return m; }
const nivAlea = (r, clair = 0.5) => { const v = r(); return v < clair ? 0 : v < clair + 0.22 ? 1 : v < clair + 0.36 ? 2 : 'nuit'; };
function faireEcole() {
  const L = LIEUX.ecole, g = new THREE.Group(), lot = new Lot(), r = alea(21); g.position.set(L.x, 0, L.z);
  mur(lot, M.brique, 26, 7.4, 14, 0, 3.7, 0);
  doux(lot, M.beton, 26.5, 0.6, 14.5, 0, 0.3, 0, 0.1);
  doux(lot, M.corniche, 26.4, 0.18, 14.4, 0, 7.2, 0, 0.05); doux(lot, M.corniche, 27, 0.4, 15, 0, 7.6, 0, 0.12);
  mur(lot, M.bois, 19, 3.6, 9.5, 0, 9.6, -1.2);
  doux(lot, M.corniche, 20, 0.34, 10.5, 0, 11.57, -1.2, 0.12); doux(lot, M.sombre, 4.2, 1.3, 3, 5, 12.3, -2, 0.1);
  for (const [w, x, z, ry] of [[26.4, 0, 7.2, 0], [14.4, -13.2, 0, Math.PI / 2], [14.4, 13.2, 0, Math.PI / 2]]) {
    doux(lot, M.sombre, w, 0.07, 0.07, x, 8.85, z, 0.03, ry); const n = Math.round(w / 1.6);
    for (let i = 0; i <= n; i++) { const d = -w / 2 + i * w / n; lot.add(M.sombre, new THREE.BoxGeometry(0.045, 1.0, 0.045), T(x + (ry ? 0 : d), 8.33, z + (ry ? d : 0))); }
  }
  mur(lot, M.bois, 10, 4.5, 4.6, 0, 2.25, 9.3);
  doux(lot, M.sombre, 13, 0.3, 7, 0, 4.72, 10.2, 0.12); doux(lot, M.corniche, 12.4, 0.5, 0.25, 0, 5.1, 13.45, 0.08);
  for (const c of [-1, 1]) lot.add(M.sombre, new THREE.CylinderGeometry(0.11, 0.11, 4.5, 12), T(c * 5.9, 2.3, 13.2));
  fenetre(lot, T(-3.05, 2.05, 11.61), 2.6, 3.3, 'vitrine', { appui: false, traverse: 0.72 }); fenetre(lot, T(3.05, 2.05, 11.61), 2.6, 3.3, 'vitrine', { appui: false, traverse: 0.72 });
  fenetre(lot, T(0, 1.42, 11.61), 2.3, 2.5, 'vitrine', { appui: false, traverse: 0 });
  fenetre(lot, T(0, 3.3, 11.61), 2.3, 0.8, 0, { appui: false, meneau: false, traverse: 0 });
  for (const c of [-1, 1]) lot.add(M.laiton, new THREE.CylinderGeometry(0.022, 0.022, 0.34, 10), T(c * 0.13, 1.12, 11.86));
  doux(lot, M.beton, 11.5, 0.1, 3.4, 0, 0.05, 13.2, 0.04);
  relief(lot, "L'école", 1.3, 0, 5.38, 13.3);
  for (const x of [-10.4, -7.0, 7.0, 10.4]) fenetre(lot, T(x, 2.35, 7.0), 2.4, 3.0, 'vitrine', { traverse: 0.7 });
  for (const x of [-10.4, -7.0, -3.5, 0, 3.5, 7.0, 10.4]) fenetre(lot, T(x, 5.75, 7.0), 1.8, 2.0, nivAlea(r, 0.6));
  for (const x of [-6.6, -3.3, 0, 3.3, 6.6]) fenetre(lot, T(x, 9.65, 3.55), 2.5, 1.8, nivAlea(r, 0.55), { traverse: 0 });
  for (const c of [-1, 1]) for (const z of [-4.2, 0, 4.2]) { fenetre(lot, T(c * 13, 2.35, z, c * Math.PI / 2), 1.8, 2.6, nivAlea(r, 0.4)); fenetre(lot, T(c * 13, 5.75, z, c * Math.PI / 2), 1.8, 2.0, nivAlea(r, 0.4)); }
  for (const x of [-9, -4.5, 0, 4.5, 9]) { fenetre(lot, T(x, 2.35, -7, Math.PI), 1.8, 2.6, nivAlea(r, 0.2)); fenetre(lot, T(x, 5.75, -7, Math.PI), 1.8, 2.0, nivAlea(r, 0.2)); }
  lueurSol(lot, 18, 30, 0, 11.7, 0, M.lueurLongue); for (const x of [-8.7, 8.7]) lueurSol(lot, 7.5, 9, x, 7.1);
  doux(lot, M.haie, 30, 1.3, 1.2, 0, 0.65, -16, 0.4); for (const c of [-1, 1]) doux(lot, M.haie, 1.2, 1.3, 9.6, c * 14.4, 0.65, -11.6, 0.4);
  lot.finir(g); scene.add(g); cacheurs.push(g);
  boite(L.x - 13.2, L.x + 13.2, L.z - 16.6, L.z + 7.2); boite(L.x - 5.1, L.x + 5.1, L.z + 7, L.z + 11.7);
  lampe(L.x, 3.4, L.z + 15.5, C.orange, 9, 18);
}
function faireBiblio() {
  const L = LIEUX.biblio, g = new THREE.Group(), lot = new Lot(), r = alea(57); g.position.set(L.x, 0, L.z);
  mur(lot, M.pierre, 24, 9.6, 14, 0, 4.8, 0);
  doux(lot, M.beton, 24.6, 0.9, 14.6, 0, 0.45, 0, 0.12);
  doux(lot, M.corniche, 24.5, 0.2, 14.5, 0, 9.25, 0, 0.05); doux(lot, M.corniche, 25.2, 0.5, 15.2, 0, 9.85, 0, 0.14);
  { const s = new THREE.Shape(); s.moveTo(-12.9, 0); s.lineTo(12.9, 0); s.lineTo(0, 4.3); s.closePath();
    lot.add(M.toit, new THREE.ExtrudeGeometry(s, { depth: 15.4, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.1, bevelSegments: 2 }), T(0, 10.1, -7.7));
    const t = new THREE.Shape(); t.moveTo(-10.6, 0); t.lineTo(10.6, 0); t.lineTo(0, 3.5); t.closePath(); lot.add(M.pierre2, new THREE.ExtrudeGeometry(t, { depth: 0.2, bevelEnabled: false }), T(0, 10.35, 7.72));
    lot.add(M.vitre[0], new THREE.CircleGeometry(1.05, 40), T(0, 11.75, 7.96)); lot.add(M.sombre, new THREE.TorusGeometry(1.1, 0.1, 10, 48), T(0, 11.75, 7.96)); }
  for (const x of [-11.2, -7.4, -3.7, 3.7, 7.4, 11.2]) doux(lot, M.pierre2, 0.8, 8.2, 0.55, x, 4.9, 7.2, 0.08);
  for (const x of [-9.3, -5.55, 5.55, 9.3]) fenetre(lot, T(x, 4.9, 7.0), 2.0, 6.2, nivAlea(r, 0.85), { traverse: 0.72 });
  doux(lot, M.beton, 15.2, 0.75, 4.6, 0, 0.375, 9.2, 0.06);
  for (let i = 0; i < 3; i++) doux(lot, M.beton, 15.8 + i * 0.7, 0.25, 0.5, 0, 0.625 - i * 0.25, 11.75 + i * 0.5, 0.05);
  for (const x of [-6.5, -3.9, -1.3, 1.3, 3.9, 6.5]) { lot.add(M.colonne, new THREE.CylinderGeometry(0.33, 0.38, 6.9, 24), T(x, 4.2, 10.6));
    doux(lot, M.colonne, 1.0, 0.22, 1.0, x, 0.86, 10.6, 0.05); doux(lot, M.colonne, 0.95, 0.2, 0.95, x, 7.72, 10.6, 0.05); }
  doux(lot, M.pierre2, 14.8, 0.95, 4.4, 0, 8.3, 9.3, 0.1); doux(lot, M.corniche, 15.3, 0.22, 4.9, 0, 8.88, 9.3, 0.08);
  relief(lot, 'La bibliothèque', 0.62, 0, 8.02, 11.52);
  mur(lot, M.bois, 4.6, 4.9, 0.3, 0, 3.2, 7.1);
  fenetre(lot, T(0, 2.05, 7.27), 2.3, 2.6, 'vitrine', { appui: false, traverse: 0 }); fenetre(lot, T(0, 4.3, 7.27), 2.3, 1.2, 0, { appui: false, traverse: 0 });
  for (const c of [-1, 1]) for (const z of [-3.6, 2.4]) fenetre(lot, T(c * 12, 7.6, z, c * Math.PI / 2), 1.7, 2.0, nivAlea(r, 0.5));
  for (const x of [-8, -2.7, 2.7, 8]) fenetre(lot, T(x, 5.2, -7, Math.PI), 1.9, 4.6, nivAlea(r, 0.15), { traverse: 0.7 });
  for (const [c, nom] of [[-1, 'Songbook'], [1, 'Guitare Pat']]) { const x = c * 17.2, z = -0.8;
    mur(lot, M.pierre2, 10.4, 5.2, 9.4, x, 2.6, z); doux(lot, M.beton, 10.8, 0.5, 9.8, x, 0.25, z, 0.1);
    doux(lot, M.corniche, 10.8, 0.18, 9.8, x, 5.05, z, 0.05); doux(lot, M.corniche, 11.3, 0.36, 10.3, x, 5.38, z, 0.12);
    fenetre(lot, T(x, 2.0, z + 4.7), 6.6, 2.9, 'vitrine', { traverse: 0.74 });
    doux(lot, M.auvent, 7.6, 0.12, 2.2, x, 3.95, z + 5.55, 0.05, 0, 0.36);
    relief(lot, nom, 0.5, x, 4.42, z + 4.72);
    fenetre(lot, T(x + c * 5.2, 2.6, z, c * Math.PI / 2), 1.8, 2.6, nivAlea(r, 0.5));
    lueurSol(lot, 9, 10, x, z + 4.8); boite(L.x + x - 5.3, L.x + x + 5.3, L.z - 16.6, L.z + z + 4.9); }
  lueurSol(lot, 22, 30, 0, 12.8, 0, M.lueurLongue);
  doux(lot, M.haie, 46, 1.3, 1.2, 0, 0.65, -16, 0.4);
  lot.finir(g); scene.add(g); cacheurs.push(g);
  boite(L.x - 12.2, L.x + 12.2, L.z - 16.6, L.z + 7.2); boite(L.x - 8.6, L.x + 8.6, L.z + 7, L.z + 13.0);
  lampe(L.x, 4.2, L.z + 15, C.orange, 10.5, 20);
  for (const x of [35, 57.5]) lampe(x, 5.0, -13.5, C.orange, 9, 13);
}
const OUV = 0.24;
const chapeau = new THREE.Group();
function faireChapeau() {
  scene.add(chapeau); cacheurs.push(chapeau);
  const grain = toile(256, 256, (g, S) => { const r = alea(5); g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 26000; i++) { const v = 96 + r() * 64; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 3); } });
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(18, 7); grain.colorSpace = THREE.NoColorSpace;
  const feutre = new THREE.MeshPhysicalMaterial({ color: 0x0e0f15, roughness: 0.96, metalness: 0, bumpMap: grain, bumpScale: 1.1,
    sheen: 0.4, sheenColor: new THREE.Color(0x5f86c9), sheenRoughness: 0.6, side: THREE.DoubleSide });
  const feutreC = feutre.clone();
  feutreC.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  { float bordV = pow( 1.0 - abs( normal.z ), 2.2 ) * smoothstep( 0.3, 0.95, abs( normal.x ) );   // le bord du volume, vu de la caméra
    totalEmissiveRadiance += bordV * ( normal.x < 0.0 ? vec3( 0.045, 0.10, 0.26 ) : vec3( 0.16, 0.075, 0.02 ) ); }`); };
  const P = (x, y) => new THREE.Vector2(x, y), tour = (pts, a0 = 0, da = Math.PI * 2, mat = feutre) => { const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 96, a0, da), mat); m.castShadow = m.receiveShadow = true; chapeau.add(m); return m; };
  tour([P(0.01, 0.6), P(6.0, 0.6), P(5.96, 1.2), P(5.84, 6.6), P(5.98, 11.4), P(6.42, 14.6), P(6.62, 15.05), P(6.56, 15.2), P(6.3, 15.22)], 0, Math.PI * 2, feutreC);
  tour([P(5.9, 0), P(9.42, 0), P(9.42, 0.6), P(5.9, 0.6)]);
  tour([P(10.2, 0), P(10.36, 0.9), P(10.42, 1.5), P(10.28, 1.78), P(10.04, 1.66), P(9.78, 1.2), P(9.5, 0.78), P(9.4, 0.6)], OUV, Math.PI * 2 - 2 * OUV);
  for (const c of [-1, 1]) { const b = new THREE.Mesh(new THREE.LatheGeometry([P(0.42, 0), P(0.5, 0.5), P(0.56, 1.0), P(0.54, 1.42), P(0.42, 1.68), P(0.24, 1.78), P(0.001, 1.8)], 28), feutre);
    b.position.set(Math.sin(c * OUV) * 9.9, 0, Math.cos(c * OUV) * 9.9); b.castShadow = true; chapeau.add(b); }
  const marches = new Lot(); for (let i = 0; i < 3; i++) doux(marches, M.marche, 4.4 + i * 0.5, 0.2, 0.5, 0, 0.5 - i * 0.2, 9.75 + i * 0.45, 0.05); marches.finir(chapeau);
  const tRuban = toile(512, 64, (g, l, h) => { const d = g.createLinearGradient(0, 0, 0, h); d.addColorStop(0, '#f2a352'); d.addColorStop(0.2, '#e88a30'); d.addColorStop(0.75, '#c96a1c'); d.addColorStop(1, '#8a4410');
    g.fillStyle = d; g.fillRect(0, 0, l, h);
    const c = g.createLinearGradient(0, 0, l, 0); for (let i = 0; i <= 16; i++) { const u = i / 16, a = 0.5 - 0.5 * Math.cos(u * Math.PI * 2); c.addColorStop(u, `rgba(8,6,10,${(Math.pow(a, 0.7) * 0.86).toFixed(3)})`); } g.fillStyle = c; g.fillRect(0, 0, l, h); });
  const lisere = new THREE.Mesh(new THREE.CylinderGeometry(6.0, 6.0, 1.25, 96, 1, true, 0.236, Math.PI * 2 - 0.472), new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: tRuban, roughness: 0.42, metalness: 0,
    sheen: 0.6, sheenColor: new THREE.Color(0xffc98a), sheenRoughness: 0.35, side: THREE.DoubleSide }));
  lisere.position.y = 1.4; chapeau.add(lisere);
  const mPasse = new THREE.MeshStandardMaterial({ color: C.laiton, metalness: 0.85, roughness: 0.32, emissive: C.laiton, emissiveIntensity: 0.22 });
  for (const y of [0.76, 2.04]) { const p = new THREE.Mesh(new THREE.TorusGeometry(6.0, 0.045, 8, 128, Math.PI * 2 - 0.472), mPasse); p.rotation.x = Math.PI / 2; p.rotation.z = Math.PI / 2 + 0.236; p.position.y = y; chapeau.add(p); }
  { const b = new THREE.Mesh(new THREE.TorusGeometry(6.56, 0.06, 8, 128), new THREE.MeshStandardMaterial({ color: C.orange, emissive: C.orange, emissiveIntensity: 0.9, roughness: 0.4 })); b.rotation.x = Math.PI / 2; b.position.y = 15.2; b.userData.lueur = true; chapeau.add(b); }
  { const tD = toile(8, 128, (g, l, h) => { const d = g.createLinearGradient(0, 0, 0, h); d.addColorStop(0, '#ffe2b8'); d.addColorStop(0.35, '#ffb454'); d.addColorStop(1, '#3a1a06'); g.fillStyle = d; g.fillRect(0, 0, l, h); });
    const paroi = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 5.8, 5.2, 72, 1, true), new THREE.MeshBasicMaterial({ map: tD, side: THREE.BackSide, toneMapped: false, color: 0xd8b890 })); paroi.position.y = 12.55; paroi.userData.lueur = true; chapeau.add(paroi); }
  const tPorte = toile(256, 384, (g, l, h) => { g.clearRect(0, 0, l, h); const d = g.createLinearGradient(0, 0, 0, h); d.addColorStop(0, '#fff0d4'); d.addColorStop(1, '#ffb454');
    g.fillStyle = d; g.beginPath(); g.moveTo(0, h); g.lineTo(0, l / 2); g.arc(l / 2, l / 2, l / 2, Math.PI, 0); g.lineTo(l, h); g.closePath(); g.fill(); g.fillStyle = '#17110c'; g.fillRect(l / 2 - 3, 0, 6, h); });
  const porte = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 3.1), new THREE.MeshBasicMaterial({ map: tPorte, transparent: true, toneMapped: false, color: 0xd9c19c }));
  porte.position.set(0, 2.15, 6.04); porte.userData.lueur = true; chapeau.add(porte);
  {
    const bande = (dehors, dedansL) => { const f = new THREE.Shape(), hd = 2.067, wo = 1.15 + dehors, ro = 1.033 + dehors, wi = 1.15 + dedansL, ri = 1.033 + dedansL;
      f.moveTo(-wo, 0); f.lineTo(-wo, hd); f.absellipse(0, hd, wo, ro, Math.PI, 0, true); f.lineTo(wo, 0); f.lineTo(wi, 0); f.lineTo(wi, hd); f.absellipse(0, hd, wi, ri, 0, Math.PI, false); f.lineTo(-wi, 0); f.closePath(); return f; };
    const ch = new THREE.Mesh(new THREE.ExtrudeGeometry(bande(0.26, 0.045), { depth: 0.42, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 28 }), new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 0.6 }));
    ch.position.set(0, 0.6, 5.78); ch.castShadow = true; chapeau.add(ch);
    const fl = new THREE.Mesh(new THREE.ExtrudeGeometry(bande(0.045, 0), { depth: 0.47, bevelEnabled: false, curveSegments: 28 }), mPasse); fl.position.set(0, 0.6, 5.78); chapeau.add(fl); }
  { const h0 = halo(0xffa550, 6.5, 0.11); h0.position.set(0, 4.3, 6.4); h0.userData.lueur = true; chapeau.add(h0); halosLoin.push([h0, 4.3]); }
  const dedans = new THREE.Mesh(new THREE.CircleGeometry(6.3, 72), new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false })); dedans.rotation.x = -Math.PI / 2; dedans.position.y = 10.2; dedans.scale.setScalar(0.94); dedans.userData.lueur = true; chapeau.add(dedans);
  const tourne = new THREE.Group(); tourne.rotation.y = -0.85; chapeau.add(tourne);
  const pivot = new THREE.Group(); pivot.position.set(-6.5, 15.25, 0); pivot.rotation.z = 0.5; tourne.add(pivot);
  const couvercle = new THREE.Mesh(new THREE.CylinderGeometry(6.62, 6.62, 0.24, 72), feutre); couvercle.position.set(6.55, 0, 0); couvercle.castShadow = true; pivot.add(couvercle);
  const h1 = halo(C.bleu, 62, 0.5); h1.position.set(0, 11, -4); h1.userData.lueur = true; chapeau.add(h1);
  const h2 = halo(C.orange, 26, 0.45); h2.position.set(0, 18.5, 0); h2.userData.lueur = true; chapeau.add(h2);
  halosLoin.push([h1, 11], [h2, 18.5]);
  const sol2 = new Lot(); { const g = new THREE.CircleGeometry(15, 48); g.rotateX(-Math.PI / 2); g.translate(0, 0.08, 0); sol2.add(M.lueurRonde, g, T(0, 0, 6)); } sol2.finir(scene);
  lampe(0, 19.5, 2, C.orange, 190, 60); lampe(0, 2.2, 8.9, 0xffc88a, 15, 15);
  ronds.push({ x: 0, z: 0, r: 6.2 });
}
function hauteurSol(x, z) {
  if (dedans) { const I = INT[dedans]; return Y0 + (I.sol ? I.sol(x - I.o[0], z - I.o[1]) : 0); }
  const r = Math.hypot(x, z); if (r < 9.42) return 0.6;
  if (r < 10.9 && Math.abs(Math.atan2(x, z)) < OUV) return Math.min(0.6, Math.ceil((10.9 - r) / 0.45) * 0.2);
  return 0;
}
function faireMagasin() {
  const L = LIEUX.magasin, g = new THREE.Group(), lot = new Lot(), r = alea(57), CX = 48, CZ = 34; g.position.set(CX, 0, CZ); g.rotation.y = -Math.PI / 2;
  mur(lot, M.pierre2, 15, 6.4, 12, 0, 3.2, 0);
  doux(lot, M.beton, 15.5, 0.5, 12.5, 0, 0.25, 0, 0.1);
  doux(lot, M.corniche, 15.4, 0.18, 12.4, 0, 6.3, 0, 0.05); doux(lot, M.corniche, 16, 0.4, 13, 0, 6.6, 0, 0.12);
  mur(lot, M.bois, 10, 2.6, 7, 0, 8.1, -1);
  doux(lot, M.corniche, 10.8, 0.3, 7.8, 0, 9.55, -1, 0.12); doux(lot, M.sombre, 2.6, 1.0, 2.2, -2.6, 10.2, -2, 0.1);
  for (const x of [-3, 0, 3]) fenetre(lot, T(x, 8.15, 2.52), 2.2, 1.6, nivAlea(r, 0.6), { traverse: 0 });
  mur(lot, M.bois, 13, 4.4, 2.2, 0, 2.2, 7.1);
  doux(lot, M.sombre, 13.5, 1.0, 2.5, 0, 4.9, 7.15, 0.1); doux(lot, M.corniche, 13.9, 0.16, 2.9, 0, 5.46, 7.15, 0.06);
  doux(lot, M.auvent, 13.3, 0.12, 1.5, 0, 4.2, 8.95, 0.05, 0, 0.16);
  for (const c of [-1, 1]) lot.add(M.sombre, new THREE.CylinderGeometry(0.035, 0.035, 1.35, 8), T(c * 6.5, 4.42, 8.9, 0, 1.15));
  const verre = (graine, formes) => { const t = toile(256, 256, (g2, S) => { const d = g2.createLinearGradient(0, 0, 0, S); d.addColorStop(0, '#ff9e38'); d.addColorStop(1, '#7a3e12'); g2.fillStyle = d; g2.fillRect(0, 0, S, S);
      const q = alea(graine), cx = S * (0.3 + q() * 0.4), o = g2.createRadialGradient(cx, S * 0.4, 0, cx, S * 0.4, S * 0.6); o.addColorStop(0, 'rgba(255,226,184,.5)'); o.addColorStop(1, 'rgba(255,226,184,0)'); g2.fillStyle = o; g2.fillRect(0, 0, S, S);
      if (formes) { g2.filter = 'blur(7px)'; g2.fillStyle = 'rgba(70,28,6,.42)'; g2.fillRect(0, S * 0.3, S, 7);
        for (let i = 0; i < 3; i++) { const x = S * (0.14 + i * 0.3 + q() * 0.1), y = S * (0.5 + q() * 0.06); g2.beginPath(); g2.ellipse(x, y, 15, 21, 0, 0, 7); g2.fill(); g2.fillRect(x - 3, y - 62, 6, 46); }
        g2.fillRect(S * (0.08 + q() * 0.5), S * 0.78, S * 0.34, S * 0.22); g2.filter = 'none'; } });
    const m = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.3 }); m.userData.sansOmbre = true; return m; };
  fenetre(lot, T(-3.95, 2.0, 8.21), 4.5, 3.0, verre(3, true), { appui: false, meneau: false, traverse: 0 }); fenetre(lot, T(3.95, 2.0, 8.21), 4.5, 3.0, verre(8, true), { appui: false, meneau: false, traverse: 0 });
  fenetre(lot, T(0, 1.42, 8.21), 2.3, 2.5, verre(5, false), { appui: false, traverse: 0 });
  fenetre(lot, T(0, 3.3, 8.21), 2.3, 0.8, 0, { appui: false, meneau: false, traverse: 0 });
  for (const c of [-1, 1]) lot.add(M.laiton, new THREE.CylinderGeometry(0.022, 0.022, 0.34, 10), T(c * 0.13, 1.12, 8.46));
  for (const c of [-1, 1]) doux(lot, M.beton, 4.9, 0.5, 0.5, c * 3.95, 0.25, 8.35, 0.05);
  relief(lot, 'Le magasin de musique', 0.6, 0, 4.62, 8.4);
  { const mS = new THREE.MeshBasicMaterial({ color: 0x1c0e07 }); mS.userData.sansOmbre = true;
    const corps = (ac) => { const s = new THREE.Shape();
      if (ac) { s.moveTo(0, -0.25); s.bezierCurveTo(0.2, -0.25, 0.215, -0.08, 0.15, 0.0); s.bezierCurveTo(0.12, 0.04, 0.14, 0.1, 0.16, 0.13); s.bezierCurveTo(0.19, 0.22, 0.1, 0.26, 0, 0.26);
        s.bezierCurveTo(-0.1, 0.26, -0.19, 0.22, -0.16, 0.13); s.bezierCurveTo(-0.14, 0.1, -0.12, 0.04, -0.15, 0.0); s.bezierCurveTo(-0.215, -0.08, -0.2, -0.25, 0, -0.25); }
      else { s.moveTo(0, -0.22); s.bezierCurveTo(0.17, -0.23, 0.19, -0.08, 0.15, 0.0); s.bezierCurveTo(0.13, 0.05, 0.15, 0.1, 0.16, 0.2); s.bezierCurveTo(0.16, 0.26, 0.1, 0.24, 0.085, 0.16);
        s.bezierCurveTo(0.07, 0.12, 0.05, 0.12, 0.04, 0.14); s.lineTo(-0.04, 0.14); s.bezierCurveTo(-0.06, 0.12, -0.08, 0.13, -0.1, 0.19); s.bezierCurveTo(-0.12, 0.3, -0.19, 0.29, -0.18, 0.2);
        s.bezierCurveTo(-0.17, 0.1, -0.14, 0.05, -0.16, 0.0); s.bezierCurveTo(-0.2, -0.08, -0.17, -0.23, 0, -0.22); }
      return new THREE.ShapeGeometry(s, 16); };
    const silhouette = (x, ac, e, rz) => { const B = T(x, 0.62 + 0.3 * e, 8.3, 0, 0, rz), P = (geo, px2, py, w = 1, h = 1) => lot.add(mS, geo.scale(e * w, e * h, 1), B.clone().multiply(T(px2 * e, py * e, 0)));
      P(corps(ac), 0, 0); P(new THREE.PlaneGeometry(0.052, ac ? 0.42 : 0.52), 0, ac ? 0.45 : 0.39); P(new THREE.PlaneGeometry(ac ? 0.08 : 0.065, 0.16), ac ? 0 : -0.012, ac ? 0.73 : 0.72);
      lot.add(mS, new THREE.PlaneGeometry(0.03, 0.3 * e + 0.4), T(x, (0.5 + 0.3 * e + 0.4) / 2 + 0.3, 8.29)); lot.add(mS, new THREE.PlaneGeometry(0.5, 0.03), T(x, 0.52, 8.29)); };
    silhouette(-5.0, true, 1.75, 0.06); silhouette(-3.1, false, 1.75, -0.07); silhouette(4.6, true, 1.75, -0.05);
    lot.add(mS, new THREE.PlaneGeometry(1.15, 0.95), T(2.85, 0.98, 8.29)); lot.add(mS, new THREE.PlaneGeometry(0.32, 0.05), T(2.85, 1.5, 8.29)); }
  for (const c of [-1, 1]) for (const z of [-3.6, 0, 3.6]) { fenetre(lot, T(c * 7.52, 2.35, z, c * Math.PI / 2), 1.9, 2.6, nivAlea(r, 0.45)); fenetre(lot, T(c * 7.52, 5.0, z, c * Math.PI / 2), 1.9, 1.1, nivAlea(r, 0.4), { traverse: 0 }); }
  for (const x of [-4.5, 0, 4.5]) fenetre(lot, T(x, 2.35, -6.02, Math.PI), 1.8, 2.6, nivAlea(r, 0.2));
  doux(lot, M.beton, 13.8, 0.1, 3.0, 0, 0.05, 9.4, 0.04);
  { const mP = M.lueurRonde.clone(); mP.color.setHex(0xff9e38); mP.opacity = 0.4; mP.userData.sansOmbre = true; const gP = new THREE.CircleGeometry(4, 40); gP.rotateX(-Math.PI / 2); gP.translate(0, 0.075, 0); lot.add(mP, gP, T(0, 0, 10.4)); }
  doux(lot, M.haie, 16.4, 1.3, 1.1, 0, 0.65, -7.2, 0.4);
  lot.finir(g); scene.add(g); cacheurs.push(g);
  boite(CX - 6, CX + 6, CZ - 7.5, CZ + 7.5); boite(CX - 8.2, CX - 6, CZ - 6.5, CZ + 6.5); boite(CX + 6, CX + 7.8, CZ - 8.2, CZ + 8.2);
  lampe(CX - 10.4, 3.0, CZ, C.orange5, 5, 9);
}
const VIVANTS19 = [];
const matFigure = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0 });
const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const _qP = new THREE.Quaternion(), _qD = new THREE.Quaternion(), _eY = new THREE.Vector3(0, 1, 0);
function tournerOs(os, axe, angle) {
  if (!os) return; os.parent.updateWorldMatrix(true, false); os.parent.getWorldQuaternion(_qP); _qD.setFromAxisAngle(axe, angle);
  os.quaternion.premultiply(_qP).premultiply(_qD).premultiply(_qP.clone().invert()); os.updateMatrixWorld(true);
}
const PARTIES = { Casual2_Feet_1: 'soulier', Casual2_Feet_2: 'touche', Casual2_Body_1: 'haut', Casual2_Body_2: 'peau', Casual2_Head_1: 'peau', Casual2_Head_2: 'peauF', Casual2_Head_3: 'sourcil', Casual2_Head_4: 'oeil', Casual2_Head_5: 'cheveux', Casual2_Legs: 'bas' };
function personneFigee(o = {}) {
  const A = AVATARS.casual, m = SkeletonUtils.clone(A.modele), clip = A.clips.find((c) => c.name.endsWith('|Idle_Neutral')) || A.clips[0];
  const mx = new THREE.AnimationMixer(m); mx.clipAction(clip).play(); mx.update(o.t0 ?? 0.4); m.updateMatrixWorld(true);
  const os = (n) => m.getObjectByName(n);
  if (o.pose) { o.pose(os); m.updateMatrixWorld(true); }
  const C = { haut: 0xb5532a, bas: 0x1c2233, peau: 0xba9c79, cheveux: 0x2a1d14, soulier: 0xf3ede2, touche: 0xd97757, sourcil: 0x2c2018, oeil: 0x15100c, ...o.couleurs }, col = {};
  for (const k of Object.keys(C)) col[k] = new THREE.Color(C[k]); col.peauF = col.peau.clone().multiplyScalar(0.82);
  const P = [], K = [], v = new THREE.Vector3();
  m.traverse((x) => { if (!x.isSkinnedMesh || (o.cacher || []).includes(x.name)) return; const c = col[PARTIES[x.name]] || col.peau, pos = x.geometry.attributes.position; x.skeleton.update();
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); x.applyBoneTransform(i, v); v.applyMatrix4(x.matrixWorld); P.push(v.x, v.y, v.z); K.push(c.r, c.g, c.b); } });
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(K, 3)); g.computeVertexNormals();
  try { g = toCreasedNormals(g, 1.15); } catch (_) {}
  const mesh = new THREE.Mesh(g, matFigure); mesh.castShadow = true;
  const pos = (n) => os(n).getWorldPosition(new THREE.Vector3());
  return { mesh, pos };
}
const BAS_ASSIS = 0.42;
function poseAssise(os, X = AX.x) { for (const s of ['L', 'R']) { tournerOs(os('UpperLeg' + s), X, -Math.PI / 2 + 0.06); tournerOs(os('LowerLeg' + s), X, Math.PI / 2 - 0.08); } }
function poseJam(os) { poseAssise(os); tournerOs(os('UpperArmR'), AX.x, -0.8); tournerOs(os('LowerArmR'), AX.x, -0.55); tournerOs(os('UpperArmL'), AX.x, -1.0); tournerOs(os('LowerArmL'), AX.x, -0.5); }
function poseTable(os) { poseAssise(os); for (const s of ['L', 'R']) { tournerOs(os('UpperArm' + s), AX.x, -0.55); tournerOs(os('LowerArm' + s), AX.x, -0.8); } }
function segment(lot, mat, a, b, r1, r2 = r1, n = 10) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length(); if (L < 1e-4) return;
  lot.add(mat, new THREE.CylinderGeometry(r2, r1, L, n), new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(_eY, d.normalize()), new THREE.Vector3(1, 1, 1)));
}
function figer(g) { g.updateMatrixWorld(true); const lot = new Lot(), out = new THREE.Group(); g.traverse((o) => { if (o.isMesh) lot.add(o.material, o.geometry, o.matrixWorld.clone()); }); lot.finir(out); return out; }
const matSatin = (c, plus = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, emissive: c, emissiveIntensity: 0.1, side: THREE.DoubleSide, ...plus });
const matChrome = () => new THREE.MeshStandardMaterial({ color: 0xe3e8ee, metalness: 1, roughness: 0.2 });
const texGrille = (fond, trait, pas = 7, d = 256) => { const t = toile(d, d, (g, S) => { g.fillStyle = fond; g.fillRect(0, 0, S, S); g.strokeStyle = trait; g.lineWidth = 2; for (let i = 0; i <= S; i += pas) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
const MICROS = [
  { id: 'boule', nom: 'Dynamique à boule', sous: 'le classique des scènes', couleur: '#c9a961' },
  { id: 'noir', nom: 'Dynamique noir, mince', sous: 'le moderne de la voix', couleur: '#e0267a' },
  { id: 'chrome', nom: 'Capsule chromée', sous: 'vintage · années 50', couleur: '#8fd3d0' },
  { id: 'ruban', nom: 'Micro à ruban', sous: 'vintage · studio et radio', couleur: '#ffb454' },
];
function faireMicro(type) {
  const g = new THREE.Group(), L = new Lot(), chrome = matChrome(), noir = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.5, metalness: 0.3 }), laiton = M.laiton;
  const tourne = (pts, n = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
  if (type === 'boule') {
    const grille = new THREE.MeshStandardMaterial({ map: texGrille('#cfd6de', '#5b6470', 12), color: 0xffffff, roughness: 0.3, metalness: 0.85 }); grille.map.repeat.set(4, 2);
    L.add(grille, new THREE.SphereGeometry(0.036, 28, 20), T(0, 0.168, 0)); L.add(chrome, new THREE.CylinderGeometry(0.029, 0.026, 0.014, 24), T(0, 0.134, 0));
    L.add(noir, tourne([[0.0, 0], [0.014, 0.0], [0.016, 0.02], [0.017, 0.06], [0.021, 0.1], [0.026, 0.128], [0.0, 0.128]]), T(0, 0.0, 0)); L.add(new THREE.MeshStandardMaterial({ color: 0xc0261c, roughness: 0.4 }), new THREE.TorusGeometry(0.0225, 0.0028, 6, 24), T(0, 0.118, 0, 0, Math.PI / 2));
    L.add(chrome, new THREE.BoxGeometry(0.014, 0.022, 0.006), T(0, 0.075, 0.019));
  } else if (type === 'noir') {
    const maille = new THREE.MeshStandardMaterial({ map: texGrille('#1a1c22', '#45495a', 8), roughness: 0.55, metalness: 0.5 }); maille.map.repeat.set(5, 3);
    L.add(maille, new THREE.SphereGeometry(0.024, 24, 18), T(0, 0.175, 0).multiply(new THREE.Matrix4().makeScale(1, 1.25, 1))); L.add(laiton, new THREE.CylinderGeometry(0.0225, 0.0205, 0.008, 22), T(0, 0.148, 0));
    L.add(noir, tourne([[0.0, 0], [0.012, 0.0], [0.0135, 0.07], [0.0155, 0.12], [0.0185, 0.146], [0.0, 0.146]]), T(0, 0.0, 0)); L.add(new THREE.MeshStandardMaterial({ color: 0xe0267a, roughness: 0.45, emissive: 0xe0267a, emissiveIntensity: 0.25 }), new THREE.CylinderGeometry(0.0145, 0.0145, 0.012, 20), T(0, 0.06, 0));
  } else if (type === 'chrome') {
    L.add(chrome, new THREE.SphereGeometry(1, 28, 20), T(0, 0.155, 0).multiply(new THREE.Matrix4().makeScale(0.05, 0.078, 0.036)));
    for (let i = -4; i <= 4; i++) { const a = i * 0.27; L.add(noir, new THREE.BoxGeometry(0.0055, 0.1, 0.004), T(Math.sin(a) * 0.0505, 0.155, Math.cos(a) * 0.0365).multiply(new THREE.Matrix4().makeRotationY(a))); }
    L.add(chrome, new THREE.TorusGeometry(0.066, 0.0055, 8, 28, Math.PI), T(0, 0.155, 0, 0, 0, Math.PI)); for (const s of [-1, 1]) L.add(laiton, new THREE.CylinderGeometry(0.011, 0.011, 0.012, 14), T(s * 0.066, 0.155, 0, 0, 0, Math.PI / 2));
    L.add(chrome, new THREE.CylinderGeometry(0.011, 0.014, 0.075, 14), T(0, 0.058, 0)); L.add(chrome, new THREE.CylinderGeometry(0.019, 0.019, 0.016, 18), T(0, 0.092, 0));
  } else {
    const email = new THREE.MeshStandardMaterial({ color: 0x1b6b62, roughness: 0.4, metalness: 0.2, emissive: 0x0d3a35, emissiveIntensity: 0.25 }), brass = new THREE.MeshStandardMaterial({ color: 0xc9a24e, roughness: 0.3, metalness: 0.9 });
    L.add(brass, new RoundedBoxGeometry(0.062, 0.15, 0.04, 3, 0.02), T(0, 0.165, 0)); for (let i = 0; i < 12; i++) L.add(noir, new THREE.BoxGeometry(0.052, 0.0045, 0.002), T(0, 0.103 + i * 0.0105, 0.0205));
    L.add(email, new THREE.TorusGeometry(0.1, 0.0075, 8, 36), T(0, 0.17, 0, 0, 0, 0).multiply(new THREE.Matrix4().makeScale(0.62, 1, 1)));
    for (const s of [-1, 1]) L.add(brass, new THREE.CylinderGeometry(0.0095, 0.0095, 0.02, 14), T(s * 0.062, 0.17, 0, 0, 0, Math.PI / 2));
    L.add(email, new THREE.CylinderGeometry(0.012, 0.016, 0.07, 14), T(0, 0.062, 0)); L.add(brass, new THREE.CylinderGeometry(0.02, 0.02, 0.012, 18), T(0, 0.096, 0));
  }
  L.finir(g); habiller(g, false); return g;
}
function faireMicroSurPied(type, haut = 0.5) {
  const g = new THREE.Group(), L = new Lot(), chrome = matChrome(); L.add(M.laiton, new THREE.CylinderGeometry(0.13, 0.15, 0.03, 26), T(0, 0.015, 0)); L.add(M.sombre, new THREE.CylinderGeometry(0.045, 0.05, 0.02, 20), T(0, 0.04, 0));
  L.add(chrome, new THREE.CylinderGeometry(0.0085, 0.0085, haut, 10), T(0, 0.05 + haut / 2, 0)); L.add(M.sombre, new THREE.CylinderGeometry(0.02, 0.02, 0.04, 14), T(0, 0.05 + haut, 0)); L.finir(g);
  const chant = MICROS_CHANT.some((q) => q.id === type), mic = chant ? faireMicroChant(type) : faireMicro(type); if (chant) mic.scale.setScalar(1.35); mic.position.y = 0.04 + haut; mic.rotation.x = 0.32; g.add(mic); g.scale.setScalar(1.55); habiller(g, false); return g;
}
function faireMicroDos() {
  const g = new THREE.Group(), L = new Lot(), chrome = matChrome();
  segment(L, chrome, new THREE.Vector3(0, -0.52, 0), new THREE.Vector3(0, 0.52, 0), 0.017, 0.017, 12); segment(L, M.sombre, new THREE.Vector3(0, -0.36, 0), new THREE.Vector3(0, -0.2, 0), 0.026, 0.026, 12);
  L.add(M.sombre, new THREE.CylinderGeometry(0.03, 0.03, 0.05, 14), T(0, 0.52, 0));
  for (let i = 0; i < 3; i++) { const a = i * 2.094; segment(L, M.sombre, new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(Math.sin(a) * 0.12, -0.56, Math.cos(a) * 0.12 * 0.4), 0.011, 0.009, 8); }
  L.finir(g); const mic = faireMicro('boule'); mic.scale.setScalar(1.7); mic.rotation.x = 0.0; mic.position.y = 0.52; g.add(mic);
  const w = new THREE.Group(); w.add(g); w.scale.setScalar(1 / 1.3); w.rotation.z = 0; habiller(w, true); return w;
}
const MICROS_CHANT = [
  { id: 'bily', nom: 'Bily Vert', sous: 'noir · grille vert néon', couleur: '#9dff1a' },
  { id: 'sabri', nom: 'Sabri Miel', sous: 'rose pailleté', couleur: '#ff8fc4' },
  { id: 'tay', nom: 'Taylor Swing', sous: 'couvert de strass', couleur: '#b9c6ff' },
  { id: 'bruno', nom: 'Bruno March', sous: 'tout en or', couleur: '#e8b84a' },
  { id: 'weekend', nom: 'Weekend Rouge', sous: 'rouge et noir', couleur: '#ff4a4a' },
  { id: 'pinky', nom: 'Pinky Punk', sous: 'rose vif · tête argentée', couleur: '#ff4fa0' },
  { id: 'slim', nom: 'Slim Amour', sous: 'noir · sans fil', couleur: '#c9ccd6' },
];
function faireMicroChant(type) {
  const g = new THREE.Group(), L = new Lot(), tourne = (pts, n = 24) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
  const paillettes = (fond, cols, n, d = 256) => { const t = toile(d, d, (c, S) => { c.fillStyle = fond; c.fillRect(0, 0, S, S); const q = alea(7); for (let i = 0; i < n; i++) { c.fillStyle = cols[(q() * cols.length) | 0]; const s = 2 + q() * 5; c.fillRect(q() * S, q() * S, s, s); } });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const corps = [[0.0, 0], [0.013, 0.0], [0.0155, 0.03], [0.0175, 0.08], [0.0205, 0.125], [0.0245, 0.152], [0.0, 0.152]];
  const brillant = (c, plus = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, metalness: 0.7, ...plus });
  if (type === 'bily') {
    const vert = new THREE.MeshStandardMaterial({ color: 0x9dff1a, emissive: 0x9dff1a, emissiveIntensity: 0.9, roughness: 0.4 }), maille = new THREE.MeshStandardMaterial({ map: texGrille('#0a0a0b', '#9dff1a', 9), roughness: 0.45, metalness: 0.6, emissive: 0x2a6a00, emissiveIntensity: 0.5 }); maille.map.repeat.set(5, 3);
    L.add(new THREE.MeshStandardMaterial({ color: 0x101113, roughness: 0.55, metalness: 0.2 }), tourne(corps), T(0, 0, 0)); L.add(maille, new THREE.SphereGeometry(0.037, 24, 18), T(0, 0.19, 0)); L.add(vert, new THREE.TorusGeometry(0.0295, 0.004, 6, 24), T(0, 0.154, 0, 0, Math.PI / 2)); L.add(vert, new THREE.CylinderGeometry(0.0172, 0.0172, 0.012, 20), T(0, 0.06, 0));
  } else if (type === 'sabri') {
    const t = paillettes('#ff8fc4', ['#ffffff', '#ffd6ec', '#ff4fa0', '#ffe9a8', '#ffb3da'], 950), rose = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.45 });
    L.add(rose, tourne(corps), T(0, 0, 0)); L.add(rose, new THREE.SphereGeometry(0.038, 24, 18), T(0, 0.19, 0)); L.add(brillant(0xf2eef4), new THREE.CylinderGeometry(0.027, 0.027, 0.012, 22), T(0, 0.154, 0)); L.add(brillant(0xf2eef4), new THREE.TorusGeometry(0.0176, 0.0035, 6, 20), T(0, 0.04, 0, 0, Math.PI / 2));
  } else if (type === 'tay') {
    const t = paillettes('#cfd8e8', ['#ffffff', '#e8f0ff', '#b8c6ff', '#ffe6a0', '#d8b8ff', '#8fa0d8'], 1500), strass = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.15, metalness: 0.9 });
    L.add(strass, tourne(corps), T(0, 0, 0)); L.add(strass, new THREE.SphereGeometry(0.04, 24, 18), T(0, 0.192, 0)); L.add(brillant(0xe3e8ee, { metalness: 1, roughness: 0.2 }), new THREE.CylinderGeometry(0.028, 0.028, 0.01, 22), T(0, 0.155, 0));
    const gem = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaec2ff, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.6 }); for (let i = 0; i < 9; i++) { const a = i * 0.7; L.add(gem, new THREE.OctahedronGeometry(0.0075, 0), T(Math.sin(a) * 0.0385, 0.192 + Math.cos(i * 1.9) * 0.025, Math.cos(a) * 0.0385)); }
  } else if (type === 'bruno') {
    const or = brillant(0xe0b040, { metalness: 1, roughness: 0.22, emissive: 0x5a3c08, emissiveIntensity: 0.35 }), orMaille = new THREE.MeshStandardMaterial({ map: texGrille('#b88a26', '#6a4a10', 8), roughness: 0.3, metalness: 0.95, emissive: 0x5a3c08, emissiveIntensity: 0.3 }); orMaille.map.repeat.set(5, 3);
    L.add(or, tourne(corps), T(0, 0, 0)); L.add(orMaille, new THREE.SphereGeometry(0.037, 24, 18), T(0, 0.19, 0)); L.add(new THREE.MeshStandardMaterial({ color: 0x15110c, roughness: 0.4, metalness: 0.4 }), new THREE.CylinderGeometry(0.0262, 0.0262, 0.012, 22), T(0, 0.153, 0)); L.add(new THREE.MeshStandardMaterial({ color: 0x15110c, roughness: 0.4 }), new THREE.CylinderGeometry(0.0176, 0.0176, 0.008, 20), T(0, 0.07, 0));
  } else if (type === 'slim') {
    const noir = new THREE.MeshStandardMaterial({ color: 0x0e0e11, roughness: 0.45, metalness: 0.4 }), maille = new THREE.MeshStandardMaterial({ map: texGrille('#0a0a0c', '#2a2a30', 8), roughness: 0.5, metalness: 0.6 }); maille.map.repeat.set(5, 3);
    L.add(noir, tourne(corps), T(0, 0, 0)); L.add(maille, new THREE.SphereGeometry(0.037, 24, 18), T(0, 0.19, 0)); L.add(new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.4, metalness: 0.5 }), new THREE.CylinderGeometry(0.0262, 0.0262, 0.01, 22), T(0, 0.153, 0));
  } else if (type === 'pinky') {
    const rose = new THREE.MeshStandardMaterial({ color: 0xe8338a, roughness: 0.3, metalness: 0.5, emissive: 0x6a0f3a, emissiveIntensity: 0.4 }), maille = new THREE.MeshStandardMaterial({ map: texGrille('#d8dbe2', '#6a707c', 8), roughness: 0.25, metalness: 0.95 }); maille.map.repeat.set(5, 3);
    L.add(rose, tourne(corps), T(0, 0, 0)); L.add(maille, new THREE.SphereGeometry(0.038, 24, 18), T(0, 0.19, 0)); L.add(new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.4, metalness: 0.5 }), new THREE.CylinderGeometry(0.0262, 0.0262, 0.012, 22), T(0, 0.153, 0));
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; L.add(brillant(0xe3e8ee, { metalness: 1, roughness: 0.2 }), new THREE.SphereGeometry(0.0048, 6, 5), T(Math.sin(a) * 0.0185, 0.075, Math.cos(a) * 0.0185)); }
  } else {
    const rouge = new THREE.MeshStandardMaterial({ color: 0xc2141c, roughness: 0.35, metalness: 0.4, emissive: 0x4a0508, emissiveIntensity: 0.4 }), maille = new THREE.MeshStandardMaterial({ map: texGrille('#0c0c0e', '#3a3a42', 8), roughness: 0.5, metalness: 0.6 }); maille.map.repeat.set(5, 3);
    L.add(rouge, tourne(corps), T(0, 0, 0)); L.add(maille, new THREE.SphereGeometry(0.037, 24, 18), T(0, 0.19, 0)); L.add(new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.4, metalness: 0.5 }), new THREE.CylinderGeometry(0.0262, 0.0262, 0.012, 22), T(0, 0.153, 0));
    L.add(new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.4 }), new THREE.CylinderGeometry(0.0178, 0.0178, 0.012, 20), T(0, 0.095, 0)); L.add(new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.4 }), new THREE.CylinderGeometry(0.0158, 0.0158, 0.008, 20), T(0, 0.035, 0));
  }
  L.finir(g); habiller(g, false); return g;
}
const MAIN = { type: null, groupe: null, x: -0.66, y: 1.425, z: 0.02, glisse: 0, avant: 0.45, bras: [0.3, -0.5, -1.6, 0.0, 0.0], assis: [0, 0, -0.5, 0, 0] };
function faireMicroMain(type) {
  const w = new THREE.Group(), m = type === 'boule' ? faireMicro('boule') : faireMicroChant(type), piv = new THREE.Group(); m.rotation.z = Math.PI / 2; m.position.set(MAIN.glisse, 0, 0); piv.position.set(MAIN.x, MAIN.y, MAIN.z); piv.rotation.y = MAIN.avant; piv.add(m); w.add(piv);
  w.traverse((o) => { if (o.isMesh) { o.userData.kit = true; o.frustumCulled = false; o.castShadow = true; } }); return w;
}
function tenirMicro(type) {
  const A = AVATARS.casual;
  if (MAIN.groupe) { if (MAIN.groupe.parent) MAIN.groupe.parent.remove(MAIN.groupe); MAIN.groupe.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); MAIN.groupe = null; }
  const avait = MAIN.type; MAIN.type = type || null;
  if (!type) { if (avait && A.modele && melangeur) { melangeur.stopAllAction(); actuelle = null; jouer('idle', 0); } return; }
  if (avatar !== 'casual') mettreAvatar('casual'); if (!A.os || !A.os.WristR) return;
  MAIN.groupe = faireMicroMain(type); A.os.WristR.add(MAIN.groupe);
}
const _axM = new THREE.Quaternion();
function poserBrasMicro(modele, bind, B = MAIN.bras) {
  const U = modele.getObjectByName('UpperArmR'), Lw = modele.getObjectByName('LowerArmR'), W = modele.getObjectByName('WristR'); if (!U || !Lw || !bind.UpperArmR) return;
  U.quaternion.copy(bind.UpperArmR); Lw.quaternion.copy(bind.LowerArmR); W.quaternion.copy(bind.WristR); modele.updateWorldMatrix(true, true); modele.getWorldQuaternion(_axM);
  const ax = (v) => v.clone().applyQuaternion(_axM);
  tournerOs(U, ax(AX.z), B[0]); tournerOs(U, ax(AX.x), B[1]); tournerOs(Lw, ax(AX.x), B[2]); tournerOs(Lw, ax(AX.y), B[3]); tournerOs(W, ax(AX.x), B[4]);
}
const SIEGES = [];
let assis = null;
const JAMBES = ['UpperLegL', 'LowerLegL', 'UpperLegR', 'LowerLegR'];
function poserJambesAssis(modele, bind) {
  for (const n of JAMBES) { const o = modele.getObjectByName(n); if (o && bind[n]) o.quaternion.copy(bind[n]); }
  modele.updateWorldMatrix(true, true); modele.getWorldQuaternion(_axM); poseAssise((n) => modele.getObjectByName(n), AX.x.clone().applyQuaternion(_axM));
}
function sAsseoir(S) {
  if (assis || !S) return; const A = AVATARS[avatar]; if (!A || !A.modele) return;
  assis = { S, y0: A.modele.position.y }; invite = null;
  joueur.position.set(S.x, hauteurSol(S.x, S.z), S.z); joueur.rotation.y = S.face; lacet = lacetVise = S.face + Math.PI;
  A.modele.position.y = assis.y0 - 0.41 + (S.y || 0); jouer('idle', 0.1); ramasse = 0;
}
function seLever() {
  if (!assis) return; const A = AVATARS[avatar], S = assis.S; assis = null; invite = null;
  if (A && A.modele) { A.modele.position.y = A.modele.position.y + 0.41 - (S.y || 0); for (const n of JAMBES) { const o = A.modele.getObjectByName(n); if (o && A.bind && A.bind[n]) o.quaternion.copy(A.bind[n]); } if (melangeur) { melangeur.stopAllAction(); actuelle = null; jouer('idle', 0); } }
  joueur.position.x = S.x - Math.sin(S.face) * 0.8; joueur.position.z = S.z - Math.cos(S.face) * 0.8; joueur.position.y = hauteurSol(joueur.position.x, joueur.position.z);
}
function appliquerPoseV20() {
  const A = AVATARS[avatar]; if (!A || !A.modele || !A.bind) return;
  if (assis) poserJambesAssis(A.modele, A.bind);
  if (MAIN.groupe && avatar === 'casual' && assis) { const Lw = A.modele.getObjectByName('LowerArmR'); if (Lw) { A.modele.updateWorldMatrix(true, true); A.modele.getWorldQuaternion(_axM); tournerOs(Lw, AX.x.clone().applyQuaternion(_axM), MAIN.assis[2]); } }
}
function faireChanteurKit(K, t0 = 0.5) {
  const A = AVATARS.casual, m = SkeletonUtils.clone(A.modele), wrap = new THREE.Group(), clip = A.clips.find((c) => c.name.endsWith('|Idle_Neutral')) || A.clips[0];
  { const Q = []; m.traverse((x) => { if (x.userData && x.userData.kit) Q.push(x); }); for (const x of Q) if (x.parent) x.parent.remove(x); }
  const mx = new THREE.AnimationMixer(m); mx.clipAction(clip).play(); mx.update(t0);
  const tex = faireAtlasKit(K, 1024), mAtlas = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0 }), unis = new Map(), uni = (c) => { if (!unis.has(c)) unis.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0 })); return unis.get(c); };
  const lesPeaux = []; m.traverse((o) => { if (o.isSkinnedMesh) lesPeaux.push(o); });
  lesPeaux.forEach((o, i) => { const P = A.peaux[i]; if (!P) return; const r = K.matiere(P.nom, P.partie); o.visible = r !== 'cache'; o.material = r === 'atlas' ? mAtlas : r != null ? uni(r) : P.mat; });
  const sq = lesPeaux[0].skeleton, groupes = {};
  for (const nom of OS_KITS) { const os = m.getObjectByName(nom), i = os ? sq.bones.indexOf(os) : -1; if (i < 0) continue; const g = new THREE.Group(); g.matrixAutoUpdate = false; g.matrix.multiplyMatrices(sq.boneInverses[i], A.inv); os.add(g); groupes[nom] = g; }
  for (const [os, meshes] of Object.entries(piecesKit(K))) { const g = groupes[os]; if (!g) continue; for (const o of meshes) { o.frustumCulled = false; o.castShadow = true; g.add(o); } }
  if (K.micro && groupes.WristR) groupes.WristR.add(faireMicroMain(K.micro));
  wrap.add(m); wrap.updateMatrixWorld(true);
  m.updateMatrixWorld(true); wrap.userData.kit = K.id; return wrap;
}
const HAUTS19 = [0xb5532a, 0x2f7f78, 0xd9941e, 0x7d9a3a, 0x7a5aa8, 0xb8433f, 0x3d6fb3, 0xe0b8a0, 0x2e8b57, 0xd45d8a];
const BAS19 = [0x1c2233, 0x3a2f28, 0x25272d, 0x4a4f3a, 0x2a3f6a];
const CHEVEUX19 = [0x2a1d14, 0x6b4a2b, 0x1a1a1c, 0x8a8479, 0x8f4a26, 0xc9a45a];
const PEAUX19 = [0xba9c79, 0x8d6748, 0xd9b99b, 0x6a4a34, 0xe0bfa0];
function gens19(i, pose, plus = {}) {
  return personneFigee({ pose, t0: 0.3 + (i * 0.37) % 1.4, couleurs: { haut: HAUTS19[i % HAUTS19.length], bas: BAS19[(i * 2 + 1) % BAS19.length], cheveux: CHEVEUX19[(i * 3 + 1) % CHEVEUX19.length],
    peau: PEAUX19[(i * 2) % PEAUX19.length], soulier: [0xf3ede2, 0x3a2f28, 0xc0601f][i % 3], touche: HAUTS19[(i + 3) % HAUTS19.length] }, ...plus });
}
function assis19(parent, x, z, face, i, pose, plus = {}) { const { mesh } = gens19(i, pose, plus), g = new THREE.Group(); mesh.position.y = -BAS_ASSIS; g.add(mesh); g.position.set(x, 0, z); g.rotation.y = face; g.scale.setScalar(0.95); parent.add(g); return g; }
function debout19(parent, x, z, face, i, plus = {}) { const { mesh } = gens19(i, null, plus), g = new THREE.Group(); g.add(mesh); g.position.set(x, 0, z); g.rotation.y = face; g.scale.setScalar(0.96); parent.add(g); return g; }
function guitareSurGenoux(personne, couleur) {
  const gt = faireGuitare('acoustique'); gt.userData.corps.color.setHex(couleur); const f = figer(gt), piv = new THREE.Group(); f.scale.setScalar(0.92); piv.add(f); piv.position.set(-0.07, 0.62, 0.27); piv.rotation.z = -1.2; personne.add(piv); return piv;
}
const CHANT = { x: -13, z: -33 };
function faireEcoleChant() {
  const g = new THREE.Group(), lot = new Lot(), r = alea(77), L = CHANT; g.position.set(L.x, 0, L.z);
  const mPrune = new THREE.MeshStandardMaterial({ color: 0xa8326a, roughness: 0.8, emissive: 0x5a1236, emissiveIntensity: 0.55 });
  mur(lot, M.brique, 18, 6.4, 10, 0, 3.2, 0);
  doux(lot, M.beton, 18.5, 0.6, 10.5, 0, 0.3, 0, 0.1);
  doux(lot, M.corniche, 18.4, 0.18, 10.4, 0, 6.3, 0, 0.05); doux(lot, M.corniche, 19, 0.4, 11, 0, 6.65, 0, 0.12);
  mur(lot, M.bois, 12, 3.0, 7, 0, 8.35, -1);
  doux(lot, M.corniche, 13, 0.34, 8, 0, 9.98, -1, 0.12); doux(lot, M.sombre, 3.4, 1.2, 2.6, 4, 10.9, -2, 0.1);
  for (const [w, x, z, ry] of [[18.4, 0, 5.2, 0], [10.4, -9.2, 0, Math.PI / 2], [10.4, 9.2, 0, Math.PI / 2]]) {
    doux(lot, M.sombre, w, 0.07, 0.07, x, 6.95, z, 0.03, ry); const n = Math.round(w / 1.6);
    for (let i = 0; i <= n; i++) { const d = -w / 2 + i * w / n; lot.add(M.sombre, new THREE.BoxGeometry(0.045, 0.8, 0.045), T(x + (ry ? 0 : d), 6.55, z + (ry ? d : 0))); } }
  mur(lot, M.bois, 8, 4.2, 3, 0, 2.1, 6.5);
  doux(lot, M.sombre, 9.8, 0.3, 4.6, 0, 4.6, 7.8, 0.12); doux(lot, M.corniche, 9.4, 0.5, 0.25, 0, 4.98, 10.0, 0.08);
  for (const c of [-1, 1]) lot.add(M.sombre, new THREE.CylinderGeometry(0.11, 0.11, 4.6, 12), T(c * 4.5, 2.3, 9.9));
  fenetre(lot, T(-2.7, 1.95, 8.01), 2.0, 3.0, 'vitrine', { appui: false, traverse: 0.72 }); fenetre(lot, T(2.7, 1.95, 8.01), 2.0, 3.0, 'vitrine', { appui: false, traverse: 0.72 });
  fenetre(lot, T(0, 1.42, 8.01), 2.0, 2.5, 'vitrine', { appui: false, traverse: 0 }); fenetre(lot, T(0, 3.3, 8.01), 2.0, 0.8, 0, { appui: false, meneau: false, traverse: 0 });
  for (const c of [-1, 1]) lot.add(M.laiton, new THREE.CylinderGeometry(0.022, 0.022, 0.34, 10), T(c * 0.13, 1.12, 8.26));
  doux(lot, M.beton, 9.5, 0.1, 3.0, 0, 0.05, 9.7, 0.04);
  relief(lot, "L'école de chant", 0.62, 0, 5.34, 9.88);
  for (const x of [-7.2, -4.6, 4.6, 7.2]) { fenetre(lot, T(x, 2.3, 5.0), 2.0, 2.8, 'vitrine', { traverse: 0.7 }); doux(lot, mPrune, 2.4, 0.1, 0.9, x, 3.98, 5.4, 0.04, 0, 0.16); }
  for (const x of [-7.2, -4.8, -2.4, 0, 2.4, 4.8, 7.2]) fenetre(lot, T(x, 5.1, 5.0), 1.5, 1.7, nivAlea(r, 0.6));
  for (const x of [-4.6, 4.6]) fenetre(lot, T(x, 8.3, 2.55), 2.1, 1.7, nivAlea(r, 0.55), { traverse: 0 });
  for (const c of [-1, 1]) for (const z of [-2.5, 2.5]) { fenetre(lot, T(c * 9.02, 2.3, z, c * Math.PI / 2), 1.8, 2.6, nivAlea(r, 0.4)); fenetre(lot, T(c * 9.02, 5.1, z, c * Math.PI / 2), 1.8, 1.7, nivAlea(r, 0.4)); }
  for (const x of [-6, -2, 2, 6]) { fenetre(lot, T(x, 2.3, -5.02, Math.PI), 1.8, 2.6, nivAlea(r, 0.2)); fenetre(lot, T(x, 5.1, -5.02, Math.PI), 1.8, 1.7, nivAlea(r, 0.2)); }
  lot.add(M.laiton, new THREE.CylinderGeometry(1.05, 1.05, 0.12, 40), T(0, 8.35, 2.55, 0, Math.PI / 2)); lot.add(mPrune, new THREE.CylinderGeometry(0.93, 0.93, 0.14, 40), T(0, 8.35, 2.57, 0, Math.PI / 2));
  lot.add(M.lettres, new THREE.SphereGeometry(0.27, 20, 14), T(0, 8.70, 2.75)); lot.add(M.sombre, new THREE.SphereGeometry(0.235, 20, 14), T(0, 8.70, 2.78));
  lot.add(M.lettres, new THREE.CylinderGeometry(0.13, 0.085, 0.66, 14), T(0, 8.17, 2.75)); lot.add(M.laiton, new THREE.TorusGeometry(0.14, 0.02, 6, 16), T(0, 8.47, 2.75, 0, Math.PI / 2));
  for (const [rr, a0] of [[0.5, -0.6], [0.72, -0.6]]) { lot.add(M.lettres, new THREE.TorusGeometry(rr, 0.032, 6, 22, 1.2), T(0, 8.70, 2.69, 0, 0, a0)); lot.add(M.lettres, new THREE.TorusGeometry(rr, 0.032, 6, 22, 1.2), T(0, 8.70, 2.69, 0, 0, Math.PI + a0)); }
  lueurSol(lot, 12, 18, 0, 8.1, 0, M.lueurLongue); for (const x of [-6.4, 6.4]) lueurSol(lot, 5.5, 7, x, 5.05);
  doux(lot, M.haie, 19.6, 1.3, 1.2, 0, 0.65, -7.0, 0.4); for (const c of [-1, 1]) doux(lot, M.haie, 1.2, 1.3, 7.0, c * 9.9, 0.65, -3.6, 0.4);
  lot.finir(g); scene.add(g); cacheurs.push(g);
  boite(L.x - 9.4, L.x + 9.4, L.z - 5.6, L.z + 5.2); boite(L.x - 4.2, L.x + 4.2, L.z + 5, L.z + 8.1);
}
const FC = { x: -27.5, z: -28.5 };
function faireFoodCourt() {
  const g = new THREE.Group(), lot = new Lot(); g.position.set(FC.x, 0, FC.z);
  const P = (mat, geo, x, y, z, ry = 0, rx = 0, rz = 0) => lot.add(mat, geo, T(x, y, z, ry, rx, rz)), cy = (r1, r2, h, n = 14) => new THREE.CylinderGeometry(r1, r2, h, n);
  const std = (c, ro = 0.7, plus = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: ro, ...plus });
  const texPl = toile(256, 256, (c, S) => { const q = alea(5); for (let i = 0; i < 8; i++) { const v = q(); c.fillStyle = `rgb(${Math.round(150 + v * 40)},${Math.round(98 + v * 28)},${Math.round(58 + v * 16)})`; c.fillRect(0, i * 32, S, 32); c.fillStyle = 'rgba(40,20,8,.45)'; c.fillRect(0, i * 32, S, 2); } });
  texPl.wrapS = texPl.wrapT = THREE.RepeatWrapping; texPl.repeat.set(2.5, 2);
  const mDeck = new THREE.MeshStandardMaterial({ map: texPl, roughness: 0.78 }), mChene = std(0xa06e40, 0.55), mNoyer = std(0x5c3b22, 0.6), mSiege = std(0xc0601f, 0.7), mCreme = std(0xf3ede2, 0.6);
  P(mDeck, new RoundedBoxGeometry(10.6, 0.12, 15.6, 2, 0.03), 0, 0.01, 0);
  const JC = { x: 0, z: 5.4 };
  { const t = toile(256, 256, (c, S) => { for (const [ray, col] of [[1, '#1f4f5c'], [0.93, '#e8c27a'], [0.86, '#a8326a'], [0.66, '#d9941e'], [0.6, '#1f4f5c'], [0.38, '#e8c27a'], [0.32, '#a8326a']]) { c.fillStyle = col; c.beginPath(); c.arc(S / 2, S / 2, S / 2 * ray, 0, 7); c.fill(); } });
    const m = std(0xffffff, 0.95, { map: t }); const gg = new THREE.CircleGeometry(2.75, 40); gg.rotateX(-Math.PI / 2); lot.add(m, gg, T(JC.x, 0.078, JC.z)); }
  const rayures = (a, b) => { const t = toile(128, 64, (c, W, H) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? b : a; c.fillRect(i * W / 8, 0, W / 8, H); } }); t.wrapS = THREE.RepeatWrapping; return t; };
  const kiosque = (kx, kz, a, b, nom, i, objet) => {
    const mR = std(0xffffff, 0.8, { map: rayures(a, b) });
    mur(lot, M.bois, 3.2, 2.6, 0.14, kx, 1.3, kz - 1.1);
    for (const s of [-1, 1]) { P(mNoyer, cy(0.06, 0.06, 2.6, 10), kx + s * 1.6, 1.3, kz + 0.7); P(M.bois, new THREE.BoxGeometry(0.08, 2.6, 1.9), kx + s * 1.56, 1.3, kz - 0.2); }
    doux(lot, mNoyer, 3.1, 1.0, 0.7, kx, 0.5, kz + 0.1, 0.03); doux(lot, mChene, 3.3, 0.06, 0.9, kx, 1.03, kz + 0.1, 0.02);
    doux(lot, mR, 3.8, 0.1, 2.0, kx, 2.78, kz - 0.1, 0.03, 0, 0.3); doux(lot, mR, 3.8, 0.26, 0.06, kx, 2.38, kz + 0.9, 0.02);
    relief(lot, nom, 0.27, kx, 1.5, kz - 1.0);
    for (const s of [-1, 1]) { P(M.ampoule, new THREE.SphereGeometry(0.075, 10, 8), kx + s * 1.3, 2.3, kz + 0.75); }
    if (objet === 'cafe') { P(M.laiton, cy(0.13, 0.15, 0.4, 16), kx - 1.0, 1.26, kz); P(M.laiton, cy(0.04, 0.04, 0.1, 8), kx - 1.0, 1.51, kz); for (let k = 0; k < 4; k++) P(std([0xd45d8a, 0x2f7f78, 0xd9941e, 0xf3ede2][k]), cy(0.045, 0.04, 0.09, 10), kx + 0.1 + k * 0.17, 1.105, kz + 0.2); P(mCreme, cy(0.2, 0.2, 0.03, 18), kx + 1.0, 1.065, kz - 0.05); }
    else { for (let k = 0; k < 3; k++) { P(std([0xb8433f, 0xd9941e, 0x7d9a3a][k]), cy(0.16, 0.16, 0.05, 18), kx - 0.9 + k * 0.7, 1.085, kz); P(mCreme, cy(0.18, 0.18, 0.015, 18), kx - 0.9 + k * 0.7, 1.062, kz); } P(M.laiton, cy(0.1, 0.1, 0.3, 14), kx + 1.2, 1.2, kz - 0.1); }
    boite(FC.x + kx - 1.8, FC.x + kx + 1.8, FC.z + kz - 1.2, FC.z + kz + 0.6);
    debout19(g, kx, kz - 0.5, 0, i, { couleurs: { haut: [0xe8dcc4, 0xb8433f][i % 2], bas: 0x3a2f28 } });
  };
  kiosque(-2.7, -6.5, 0xc0261c, 0xf3ede2, 'Casse-croûte', 20, 'plat'); kiosque(2.7, -6.5, 0x1f8f86, 0xf3ede2, 'Café', 21, 'cafe');
  const mTop = mChene;
  const table = (x, z) => { P(mTop, cy(0.58, 0.58, 0.05, 28), x, 0.745, z); P(M.sombre, cy(0.045, 0.05, 0.72, 10), x, 0.37, z); P(M.sombre, cy(0.28, 0.3, 0.03, 20), x, 0.09, z);
    P(M.sombre, cy(0.03, 0.04, 0.06, 8), x, 0.8, z); P(M.ampoule, new THREE.SphereGeometry(0.05, 10, 8), x, 0.86, z); P(mCreme, cy(0.036, 0.032, 0.08, 10), x + 0.3, 0.8, z + 0.1); P(std(0xd45d8a, 0.7), cy(0.1, 0.1, 0.015, 16), x - 0.28, 0.78, z - 0.12);
    ronds.push({ x: FC.x + x, z: FC.z + z, r: 0.62 }); };
  const tabouret = (x, z) => { P(mSiege, cy(0.21, 0.21, 0.045, 20), x, 0.43, z); for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) P(M.sombre, cy(0.016, 0.014, 0.42, 6), x + sx * 0.12, 0.21, z + sz * 0.12); ronds.push({ x: FC.x + x, z: FC.z + z, r: 0.24 }); };
  for (const [x, z] of [[-3.2, -2.8], [3.0, -2.6], [-3.4, 1.2], [3.2, 1.4]]) table(x, z);
  const TABLES = [[-4.15, -2.8, Math.PI / 2, 0], [-2.25, -2.8, -Math.PI / 2, 1], [3.0, -3.55, 0, 2], [3.0, -1.65, null], [-4.35, 1.2, Math.PI / 2, 3], [-2.45, 1.2, null], [3.2, 0.45, 0, 4], [3.2, 2.35, Math.PI, 5]];
  const CTAB = [[-3.2, -2.8], [3.0, -2.6], [-3.4, 1.2], [3.2, 1.4]];
  for (const [x, z, face, i] of TABLES) { tabouret(x, z); if (face !== null) assis19(g, x, z, face, i, poseTable);
    else { const T0 = CTAB.reduce((a, b) => (Math.hypot(a[0] - x, a[1] - z) < Math.hypot(b[0] - x, b[1] - z) ? a : b)); SIEGES.push({ id: 'tab' + SIEGES.length, x: FC.x + x, z: FC.z + z, face: Math.atan2(T0[0] - x, T0[1] - z), y: 0 }); } }
  const R = 1.7, GUIT = [0xd0924e, 0x8a3a12, 0xe9dcc0];
  [[Math.PI + 0.6, 6], [Math.PI * 1.5, 7], [Math.PI * 2 - 0.6, 8], [0.55, null], [Math.PI - 0.55, null]].forEach(([a, i], k) => { const x = JC.x + R * Math.cos(a), z = JC.z + R * Math.sin(a); tabouret(x, z);
    if (i === null) SIEGES.push({ id: 'jam' + SIEGES.length, x: FC.x + x, z: FC.z + z, face: Math.atan2(JC.x - x, JC.z - z), y: 0 });
    if (i !== null) { const p = assis19(g, x, z, Math.atan2(JC.x - x, JC.z - z), i, poseJam); guitareSurGenoux(p, GUIT[k]); VIVANTS19.push((t) => { p.rotation.z = Math.sin(t * 1.9 + k * 2.1) * 0.03; p.children[1].rotation.z = -1.2 + Math.sin(t * 5.2 + k) * 0.035; }); } });
  const mAmp = [M.ampoule, ...[0xff7ab0, 0x7ad8ff, 0xffd35a].map((c) => { const m = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: c, emissiveIntensity: 1.5, roughness: 0.4 }); m.userData.sansOmbre = true; return m; })];
  const poteaux = [[-5.1, 7.1], [5.1, 7.1], [-5.1, 0], [5.1, 0], [-5.1, -7.1], [5.1, -7.1]];
  for (const [x, z] of poteaux) P(mNoyer, cy(0.07, 0.09, 4.3, 10), x, 2.15, z);
  const fil = (ax, az, bx, bz, ha, hb, sag = 0.4) => { const n = 9, pts = []; for (let k = 0; k <= n; k++) { const u = k / n; pts.push(new THREE.Vector3(ax + (bx - ax) * u, ha + (hb - ha) * u - sag * Math.sin(Math.PI * u), az + (bz - az) * u)); }
    pts.forEach((p, k) => { if (k) segment(lot, M.sombre, pts[k - 1], p, 0.008, 0.008, 4); if (k > 0 && k < n) P(mAmp[(k + ax) & 3], new THREE.SphereGeometry(0.065, 8, 6), p.x, p.y - 0.07, p.z); }); };
  fil(-5.1, 7.1, 5.1, 7.1, 4.2, 4.2); fil(-5.1, 0, 5.1, 0, 4.25, 4.25, 0.5); fil(-5.1, -7.1, 5.1, -7.1, 4.2, 4.2);
  fil(-5.1, 7.1, -5.1, 0, 4.2, 4.25, 0.3); fil(-5.1, 0, -5.1, -7.1, 4.25, 4.2, 0.3); fil(5.1, 7.1, 5.1, 0, 4.2, 4.25, 0.3); fil(5.1, 0, 5.1, -7.1, 4.25, 4.2, 0.3);
  { const t = toile(256, 320, (c, W, H) => { c.fillStyle = '#1f3a34'; c.fillRect(0, 0, W, H); c.strokeStyle = '#c9a961'; c.lineWidth = 8; c.strokeRect(8, 8, W - 16, H - 16); c.fillStyle = '#f3ede2'; c.textAlign = 'center'; c.font = `700 64px ${PT}`; c.fillText('JAM', W / 2, 96); c.fillText('LIBRE', W / 2, 168);
      c.fillStyle = '#ffb454'; c.font = `700 25px ${PC}`; c.fillText('Apporte ta guitare', W / 2, 224); c.fillStyle = '#f3ede2'; c.font = `600 24px ${PC}`; c.fillText('ou assieds-toi', W / 2, 262); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 1.15), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.8 })); m.position.set(-3.2, 0.95, 7.6); m.rotation.x = -0.12; g.add(m);
    for (const s of [-1, 1]) P(M.bois, new THREE.BoxGeometry(0.06, 1.0, 0.06), -3.2 + s * 0.42, 0.5, 7.62, 0, 0.12); }
  { const gg = new THREE.CircleGeometry(7, 36); gg.rotateX(-Math.PI / 2); const mG = M.lueurRonde.clone(); mG.opacity = 0.16; mG.userData.sansOmbre = true; lot.add(mG, gg, T(0, 0.09, 0)); }
  lot.finir(g); scene.add(g);
  for (const [x, z] of [[0, 0], [0, 4.5]]) { const h = halo(0xffb060, 3.6, 0.3); h.position.set(FC.x + x, 4.0, FC.z + z); scene.add(h); halosLoin.push([h, 4.0]); }
}
const FEU = { x: 18, z: -44.5 };
function faireFeu() {
  const g = new THREE.Group(), lot = new Lot(); g.position.set(FEU.x, 0, FEU.z);
  const mPierre = new THREE.MeshStandardMaterial({ color: 0x74604f, roughness: 0.95 }), mBuche = new THREE.MeshStandardMaterial({ color: 0x3a2216, roughness: 0.9 }), mTronc = new THREE.MeshStandardMaterial({ color: 0x5a3b24, roughness: 0.9 });
  const mBraise = new THREE.MeshStandardMaterial({ color: 0x2a0e06, emissive: 0xff4a10, emissiveIntensity: 1.1, roughness: 0.6 }); mBraise.userData.sansOmbre = true;
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, rr = 0.86 + (i % 3) * 0.03; lot.add(mPierre, new THREE.DodecahedronGeometry(0.2 + (i % 4) * 0.02, 0), T(Math.cos(a) * rr, 0.1, Math.sin(a) * rr, a, 0.3 * (i % 2))); }
  { const cd = new THREE.CircleGeometry(0.8, 24); cd.rotateX(-Math.PI / 2); lot.add(mBraise, cd, T(0, 0.04, 0)); }
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + 0.3; segment(lot, mBuche, new THREE.Vector3(Math.cos(a) * 0.78, 0.12, Math.sin(a) * 0.78), new THREE.Vector3(Math.cos(a) * 0.07, 0.6, Math.sin(a) * 0.07), 0.075, 0.062, 8); lot.add(mBraise, new THREE.SphereGeometry(0.07, 8, 6), T(Math.cos(a) * 0.78, 0.12, Math.sin(a) * 0.78)); }
  const texCernes = toile(64, 64, (c, S) => { for (let k = 6; k >= 0; k--) { c.fillStyle = k % 2 ? '#b98a56' : '#d6aa72'; c.beginPath(); c.arc(S / 2, S / 2, S / 2 * (k + 1) / 7, 0, 7); c.fill(); } });
  const mCernes = new THREE.MeshStandardMaterial({ map: texCernes, roughness: 0.8 });
  const BUCHES = [0.22, 0.78, 1.15, 1.5, 1.85].map((u) => u * Math.PI);
  for (const a of BUCHES) { const x = Math.cos(a) * 2.8, z = Math.sin(a) * 2.8, ry = Math.atan2(-Math.cos(a), -Math.sin(a)), Lg = 1.9, Rg = 0.24;
    lot.add(mTronc, new THREE.CylinderGeometry(Rg, Rg + 0.02, Lg, 14), T(x, Rg, z, ry, 0, Math.PI / 2));
    for (const s of [-1, 1]) { const cg = new THREE.CircleGeometry(Rg, 16); cg.rotateX(s > 0 ? -Math.PI / 2 : Math.PI / 2); cg.translate(0, s * Lg / 2 + s * 0.002, 0); lot.add(mCernes, cg, T(x, Rg, z, ry, 0, Math.PI / 2)); }
    ronds.push({ x: FEU.x + x, z: FEU.z + z, r: 0.3 }); }
  { const cg = new THREE.CircleGeometry(8, 36); cg.rotateX(-Math.PI / 2); const mG = M.lueurRonde.clone(); mG.opacity = 0.62; mG.userData.sansOmbre = true; lot.add(mG, cg, T(0, 0.085, 0)); }
  lot.finir(g);
  const flamme = (rr, h, c, o) => { const m = new THREE.Mesh(new THREE.ConeGeometry(rr, h, 10, 1, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); m.position.y = 0.35 + h / 2; m.raycast = () => {}; g.add(m); return m; };
  const F = [flamme(0.42, 1.15, 0xff5a12, 0.8), flamme(0.28, 0.85, 0xff9a22, 0.85), flamme(0.14, 0.55, 0xffe08a, 0.95)];
  const N = 34, pos = new Float32Array(N * 3), ph = Array.from({ length: N }, (_, i) => ({ p: (i * 0.618) % 1, a: i * 2.4, v: 0.5 + (i % 5) * 0.12 }));
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const braises = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffa040, size: 0.09, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); braises.frustumCulled = false; g.add(braises);
  scene.add(g);
  const lumiere = lampe(FEU.x, 1.4, FEU.z, 0xff8a2e, 36, 26), h = halo(0xff8a3a, 7.5, 0.5); h.position.set(FEU.x, 1.2, FEU.z); scene.add(h); halosLoin.push([h, 1.2]); lumiere.userData.base = 36;
  VIVANTS19.push((t) => {
    F.forEach((m, k) => { m.scale.set(1 + 0.12 * Math.sin(t * 9 + k * 1.7), 1 + 0.2 * Math.sin(t * 7.3 + k * 2.3) + 0.06 * Math.sin(t * 17 + k), 1 + 0.12 * Math.cos(t * 8.4 + k)); m.rotation.y = t * (1.4 + k * 0.5); });
    if (lumiere.visible) lumiere.intensity = lumiere.userData.base * (0.9 + 0.1 * Math.sin(t * 11) + 0.06 * Math.sin(t * 23.7 + 1) + 0.04 * Math.sin(t * 5.3));
    ph.forEach((q, i) => { const u = (t * 0.22 * q.v + q.p) % 1; pos[i * 3] = Math.sin(q.a + u * 4) * (0.2 + u * 0.55); pos[i * 3 + 1] = 0.5 + u * 2.6; pos[i * 3 + 2] = Math.cos(q.a * 1.3 + u * 3) * (0.2 + u * 0.5); }); geo.attributes.position.needsUpdate = true; });
  BUCHES.forEach((a, k) => { if (k === 2 || k === 4) return; for (const o of [-0.5, 0.5]) { const x = Math.cos(a) * 2.8 + -Math.sin(a) * o, z = Math.sin(a) * 2.8 + Math.cos(a) * o; SIEGES.push({ id: 'feu' + SIEGES.length, x: FEU.x + x, z: FEU.z + z, face: Math.atan2(-x, -z), y: 0.04 }); } });
  const A1 = BUCHES[2], A2 = BUCHES[4];
  { const x = Math.cos(A1) * 2.8, z = Math.sin(A1) * 2.8, p = assis19(g, x, z, Math.atan2(-x, -z), 12, poseJam, { couleurs: { haut: 0xd9941e, bas: 0x2a3f6a } }); p.position.y = 0.04; guitareSurGenoux(p, 0xd0924e); }
  { const x = Math.cos(A2) * 2.8, z = Math.sin(A2) * 2.8, p = assis19(g, x, z, Math.atan2(-x, -z), 13, poseTable, { couleurs: { haut: 0x7a5aa8 } }); p.position.y = 0.04; }
  ronds.push({ x: FEU.x, z: FEU.z, r: 1.0 });
}
const ANNEXE = { cx: 48, cz: 34, x0: 15.5 };
const PORTE_ANNEXE = { x: ANNEXE.cx - 9.6, z: ANNEXE.cz + ANNEXE.x0, r: 2.2 };
function faireAnnexeDehors() {
  const g = new THREE.Group(), lot = new Lot(), r = alea(58), { cx: CX, cz: CZ, x0: X0 } = ANNEXE; g.position.set(CX, 0, CZ); g.rotation.y = -Math.PI / 2;
  const mDeck = new THREE.MeshStandardMaterial({ color: 0x7a4a2a, roughness: 0.75 });
  mur(lot, M.pierre2, 10, 5.4, 9.8, X0, 2.7, 1.1);
  doux(lot, M.beton, 10.5, 0.5, 10.3, X0, 0.25, 1.1, 0.1); doux(lot, M.corniche, 10.4, 0.18, 10.2, X0, 5.3, 1.1, 0.05); doux(lot, M.corniche, 11, 0.4, 10.8, X0, 5.6, 1.1, 0.12);
  mur(lot, M.bois, 9.4, 4.0, 2.2, X0, 2.0, 7.1);
  doux(lot, M.sombre, 9.8, 1.0, 2.5, X0, 4.5, 7.15, 0.1); doux(lot, M.corniche, 10.2, 0.16, 2.9, X0, 5.06, 7.15, 0.06);
  relief(lot, 'La cabine de chant', 0.46, X0, 4.55, 8.4);
  const verre = (graine, formes) => { const t = toile(256, 256, (c, S) => { const d = c.createLinearGradient(0, 0, 0, S); d.addColorStop(0, '#ffb35a'); d.addColorStop(1, '#8a3a24'); c.fillStyle = d; c.fillRect(0, 0, S, S);
      const q = alea(graine), o = c.createRadialGradient(S * 0.5, S * 0.4, 0, S * 0.5, S * 0.4, S * 0.6); o.addColorStop(0, 'rgba(255,226,184,.55)'); o.addColorStop(1, 'rgba(255,226,184,0)'); c.fillStyle = o; c.fillRect(0, 0, S, S);
      c.filter = 'blur(4px)'; c.fillStyle = 'rgba(60,18,16,.62)';
      for (const f of formes) { const x = S * f[1]; if (f[0] === 'robe') { c.beginPath(); c.arc(x, S * 0.3, 11, 0, 7); c.fill(); c.beginPath(); c.moveTo(x - 9, S * 0.36); c.lineTo(x + 9, S * 0.36); c.lineTo(x + 16, S * 0.62); c.lineTo(x + 34 * f[2], S * 0.97); c.lineTo(x - 34 * f[2], S * 0.97); c.lineTo(x - 16, S * 0.62); c.closePath(); c.fill(); }
        else { c.fillRect(x - 1.5, S * 0.24, 3, S * 0.72); c.beginPath(); c.arc(x, S * 0.24, 8, 0, 7); c.fill(); c.fillRect(x - 15, S * 0.95, 30, 5); } }
      c.filter = 'none'; });
    const m = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.3 }); m.userData.sansOmbre = true; return m; };
  fenetre(lot, T(X0 - 3.0, 2.0, 8.21), 3.4, 3.0, verre(3, [['robe', 0.3, 1], ['robe', 0.7, 1.35]]), { appui: false, meneau: false, traverse: 0 }); fenetre(lot, T(X0 + 3.0, 2.0, 8.21), 3.4, 3.0, verre(8, [['pied', 0.25], ['robe', 0.55, 0.8], ['robe', 0.8, 1.2]]), { appui: false, meneau: false, traverse: 0 });
  fenetre(lot, T(X0, 1.42, 8.21), 2.1, 2.5, verre(5, []), { appui: false, traverse: 0 }); fenetre(lot, T(X0, 3.3, 8.21), 2.1, 0.8, 0, { appui: false, meneau: false, traverse: 0 });
  for (const c of [-1, 1]) lot.add(M.laiton, new THREE.CylinderGeometry(0.022, 0.022, 0.34, 10), T(X0 + c * 0.13, 1.12, 8.46));
  for (const c of [-1, 1]) doux(lot, M.beton, 3.6, 0.5, 0.5, X0 + c * 3.0, 0.25, 8.35, 0.05);
  for (const c of [-1, 1]) for (const z of [-1.2, 2.6]) { fenetre(lot, T(X0 + c * 5.02, 2.35, z, c * Math.PI / 2), 1.9, 2.6, nivAlea(r, 0.45)); }
  for (const x of [-2.5, 2.5]) fenetre(lot, T(X0 + x, 2.35, -3.82, Math.PI), 1.8, 2.6, nivAlea(r, 0.2));
  doux(lot, M.auvent, 14.2, 0.12, 1.5, 13.6, 4.2, 8.95, 0.05, 0, 0.16);
  for (const x of [7.4, 10.6, 14.5, 20.4]) lot.add(M.sombre, new THREE.CylinderGeometry(0.06, 0.06, 4.05, 10), T(x, 2.02, 9.6));
  doux(lot, mDeck, 14.3, 0.12, 3.9, 13.7, 0.06, 7.95, 0.03); doux(lot, mDeck, 3.0, 0.12, 12.4, 9.0, 0.06, 0.1, 0.03);
  doux(lot, M.sombre, 3.6, 0.26, 7.6, 9.0, 4.95, 4.4, 0.06); for (const z of [1.6, 3.6, 5.6, 7.6]) lot.add(M.corniche, new THREE.BoxGeometry(3.6, 0.2, 0.12), T(9.0, 4.74, z));
  for (const z of [1.4, 4.8]) for (const s of [-1, 1]) lot.add(M.laiton, new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), T(9.0 + s * 1.2, 4.55, z));
  for (const z of [2.4, 5.8]) { lot.add(M.ampoule, new THREE.SphereGeometry(0.1, 12, 8), T(9.0, 4.45, z)); }
  doux(lot, M.bois, 0.5, 0.45, 1.4, 8.3, 0.23, 2.4, 0.04); doux(lot, M.bois, 0.5, 0.45, 1.4, 9.7, 0.23, 2.4, 0.04); doux(lot, M.beton, 2.0, 0.07, 1.5, 9.0, 0.54, 2.4, 0.03);
  for (const [x, z] of [[7.3, 8.6], [20.5, 8.6]]) { lot.add(M.bois, new THREE.CylinderGeometry(0.34, 0.28, 0.5, 14), T(x, 0.25, z)); lot.add(M.haie, new THREE.SphereGeometry(0.5, 14, 10), T(x, 0.8, z)); }
  lueurSol(lot, 3.8, 5, X0 - 3.0, 8.3); lueurSol(lot, 3.8, 5, X0 + 3.0, 8.3); lueurSol(lot, 4.5, 12, X0, 8.5, 0, M.lueurLongue);
  { const mP = M.lueurRonde.clone(); mP.color.setHex(0xff9e38); mP.opacity = 0.4; mP.userData.sansOmbre = true; const gP = new THREE.CircleGeometry(4, 40); gP.rotateX(-Math.PI / 2); gP.translate(0, 0.075, 0); lot.add(mP, gP, T(X0, 0, 10.6)); }
  doux(lot, M.haie, 10.6, 1.3, 1.1, X0, 0.65, -4.6, 0.4);
  lot.finir(g); scene.add(g); cacheurs.push(g);
  boite(CX - 8.3, CX + 3.9, CZ + 10.3, CZ + 20.7);
  for (const z of [2.4, 5.8]) { const v = g.localToWorld(new THREE.Vector3(9.0, 4.45, z)), h = halo(0xffa95c, 1.5, 0.3); h.position.copy(v); scene.add(h); halosLoin.push([h, v.y]); }
}
function faireChant() { faireEcoleChant(); faireFoodCourt(); faireFeu(); faireAnnexeDehors(); }
function zoneChant(x, z) {
  return (Math.abs(x - CHANT.x) < 13 && z > -42 && z < -14) || (x > -36 && x < -19 && z > -43 && z < -15) || Math.hypot(x - FEU.x, z - FEU.z) < 7.4 || (Math.abs(x - 17.3) < 3.2 && z > -42 && z < -15)
    || (x > 33 && x < 58 && z > 38 && z < 59) || Math.hypot(x - 36.4, z - 47.2) < 7.2;
}
const PORTES_CHANT = [
  { x: PORTE_ANNEXE.x, z: PORTE_ANNEXE.z, r: PORTE_ANNEXE.r, invite: { cle: 'porte-annexe', texte: 'Entrer · La cabine de chant', action: () => entrer('annexe') } },
  { x: CHANT.x, z: CHANT.z + 8.6, r: 2.4, invite: { cle: 'porte-chant', texte: 'Entrer · L’école de chant', action: () => entrer('chant') } },
];
const ARCHETYPES = [
  { id: 'jazz', nom: 'Soirée jazz', sous: 'robe longue · années 40-50', couleur: '#8fd3d0' },
  { id: 'soul', nom: 'Soul et bals', sous: 'robe courte, bottes · années 60', couleur: '#ffb454' },
  { id: 'diva', nom: 'Grande diva', sous: 'robe de bal · scène classique', couleur: '#ff8a7a' },
  { id: 'pop', nom: 'Pop de scène', sous: 'look d’aujourd’hui', couleur: '#ff7ab0' },
];
function faireChanteuse(type) {
  const g = new THREE.Group(), lot = new Lot(), V = (x, y, z) => new THREE.Vector3(x, y, z), sph = (r) => new THREE.SphereGeometry(r, 14, 10), echelle = (sx, sy, sz) => new THREE.Matrix4().makeScale(sx, sy, sz);
  const jupe = (pts, mat, n = 36, zc = 0.055) => lot.add(mat, new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n), T(0, 0, zc));
  const bague = (r, tube, y, mat, zc = 0.055) => lot.add(mat, new THREE.TorusGeometry(r, tube, 6, 40), T(0, y, zc, 0, Math.PI / 2));
  const or = new THREE.MeshStandardMaterial({ color: 0xe8c27a, roughness: 0.3, metalness: 0.7, emissive: 0x7a5a1a, emissiveIntensity: 0.35 }), perle = new THREE.MeshStandardMaterial({ color: 0xf6efe2, roughness: 0.3, emissive: 0x8a8070, emissiveIntensity: 0.2 });
  const S = { jazz: { c: { haut: 0x0e7c80, peau: 0xa57855, cheveux: 0x140c08, bas: 0x0e7c80, soulier: 0x0e7c80, touche: 0x0e7c80 }, cacher: ['Casual2_Legs', 'Casual2_Feet_1', 'Casual2_Feet_2'] },
    soul: { c: { haut: 0xf2a516, peau: 0x6a4a34, cheveux: 0x2a1810, bas: 0x6a4a34, soulier: 0xf6f1e8, touche: 0xf6f1e8 }, cacher: [] },
    diva: { c: { haut: 0xb3122b, peau: 0xe0bfa0, cheveux: 0x7a3a1a, bas: 0xb3122b, soulier: 0xb3122b, touche: 0xb3122b }, cacher: ['Casual2_Legs', 'Casual2_Feet_1', 'Casual2_Feet_2'] },
    pop: { c: { haut: 0x14b8b0, peau: 0xc9a07c, cheveux: 0xf0e0b8, bas: 0xe0267a, soulier: 0xe0267a, touche: 0xe0267a }, cacher: [] } }[type];
  const { mesh, pos } = personneFigee({ couleurs: S.c, cacher: S.cacher, t0: 0.5 + ARCHETYPES.findIndex((a) => a.id === type) * 0.3 });
  g.add(mesh);
  const hc = pos('Head').add(V(0, 0.11, 0)), cheveux = matSatin(S.c.cheveux, { roughness: 0.4, emissiveIntensity: 0.05 }), gant = (c, a, b) => { for (const s of ['L', 'R']) { const A = a(s), B = b(s); segment(lot, c, A, B, 0.047, 0.04, 10); lot.add(c, sph(0.05), T(B.x, B.y - 0.02, B.z)); } };
  const bras = (s, t) => pos('UpperArm' + s).lerp(pos('LowerArm' + s), t);
  if (type === 'jazz') {
    const robe = matSatin(0x0e7c80, { roughness: 0.35, emissiveIntensity: 0.14 });
    jupe([[0.55, 0.02], [0.46, 0.14], [0.31, 0.3], [0.23, 0.47], [0.2, 0.7], [0.22, 0.95], [0.19, 1.08], [0.165, 1.17]], robe); bague(0.55, 0.012, 0.03, matSatin(0xf6efe2));
    gant(matSatin(0xf6efe2, { roughness: 0.6 }), (s) => bras(s, 0.45), (s) => pos('Wrist' + s));
    lot.add(perle, new THREE.TorusGeometry(0.095, 0.012, 6, 26), T(pos('Neck').x, pos('Neck').y - 0.035, pos('Neck').z + 0.02, 0, Math.PI / 2 - 0.25));
    lot.add(cheveux, sph(1), T(hc.x, hc.y - 0.02, hc.z - 0.07).multiply(echelle(0.155, 0.17, 0.12)));
    for (const s of [-1, 1]) { lot.add(cheveux, sph(0.065), T(hc.x + s * 0.135, hc.y - 0.1, hc.z - 0.03)); lot.add(cheveux, sph(0.055), T(hc.x + s * 0.11, hc.y - 0.17, hc.z - 0.07)); }
    lot.add(cheveux, sph(0.075), T(hc.x - 0.1, hc.y + 0.1, hc.z + 0.07));
    { const f = V(hc.x + 0.13, hc.y + 0.04, hc.z + 0.06), blanc = matSatin(0xfffaf0, { roughness: 0.5, emissiveIntensity: 0.25 }), vert = matSatin(0x2e7a3e);
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; lot.add(blanc, sph(0.036), T(f.x + Math.cos(a) * 0.04, f.y + Math.sin(a) * 0.04, f.z + 0.01).multiply(echelle(1, 1, 0.55))); }
      lot.add(matSatin(0xf2d36a), sph(0.022), T(f.x, f.y, f.z + 0.03)); for (const s of [-1, 1]) lot.add(vert, sph(0.04), T(f.x + s * 0.07, f.y - 0.065, f.z - 0.005, 0, 0, s * 0.8).multiply(echelle(1.7, 0.5, 0.5))); }
  } else if (type === 'diva') {
    const robe = matSatin(0xb3122b, { roughness: 0.32, emissiveIntensity: 0.16 }), jupon = matSatin(0xd23a52, { roughness: 0.5, emissiveIntensity: 0.12 });
    jupe([[0.98, 0.03], [0.92, 0.14], [0.8, 0.3], [0.62, 0.52], [0.42, 0.74], [0.26, 0.94], [0.19, 1.07], [0.165, 1.17]], robe);
    for (const [r, y] of [[0.94, 0.045], [0.74, 0.36], [0.5, 0.64]]) bague(r, 0.028, y, or); jupe([[0.94, 0.12], [0.88, 0.2], [0.7, 0.36]], jupon, 36);
    bague(0.175, 0.02, 1.1, or);
    gant(matSatin(0xe8c27a, { roughness: 0.4 }), (s) => bras(s, 0.4), (s) => pos('Wrist' + s));
    lot.add(cheveux, sph(1), T(hc.x, hc.y - 0.2, hc.z - 0.09).multiply(echelle(0.17, 0.34, 0.13)));
    for (const s of [-1, 1]) { lot.add(cheveux, sph(0.075), T(hc.x + s * 0.14, hc.y - 0.1, hc.z - 0.01)); lot.add(cheveux, sph(0.07), T(hc.x + s * 0.15, hc.y - 0.22, hc.z - 0.05)); lot.add(cheveux, sph(0.065), T(hc.x + s * 0.14, hc.y - 0.33, hc.z - 0.08)); }
    lot.add(or, new THREE.TorusGeometry(0.105, 0.011, 6, 28), T(hc.x, hc.y + 0.1, hc.z + 0.01, 0, Math.PI / 2 - 0.15)); for (let k = -2; k <= 2; k++) { const a = k * 0.42; lot.add(or, new THREE.ConeGeometry(0.014, 0.055 - Math.abs(k) * 0.008, 6), T(hc.x + Math.sin(a) * 0.105, hc.y + 0.135, hc.z + 0.01 + Math.cos(a) * 0.105 * 0.98)); }
    lot.add(matSatin(0xff4f8a, { roughness: 0.15, emissiveIntensity: 0.6 }), sph(0.02), T(hc.x, hc.y + 0.14, hc.z + 0.115));
    lot.add(matSatin(0xff4f8a, { roughness: 0.15, emissiveIntensity: 0.6 }), sph(0.026), T(pos('Neck').x, pos('Neck').y - 0.1, pos('Neck').z + 0.12));
  } else if (type === 'soul') {
    const robe = matSatin(0xf2a516, { roughness: 0.55, emissiveIntensity: 0.14 }), blanc = matSatin(0xf6f1e8, { roughness: 0.5 });
    jupe([[0.38, 0.55], [0.32, 0.7], [0.25, 0.88], [0.2, 1.05], [0.165, 1.17]], robe); bague(0.375, 0.016, 0.57, blanc); bague(0.355, 0.012, 0.62, matSatin(0x1f8f86));
    for (const s of ['L', 'R']) segment(lot, blanc, pos('LowerLeg' + s).add(V(0, 0.02, 0)), pos('Foot' + s).add(V(0, 0.07, 0)), 0.078, 0.062, 12);
    lot.add(matSatin(0x1f8f86), new THREE.TorusGeometry(0.125, 0.014, 6, 26), T(hc.x, hc.y + 0.06, hc.z - 0.005, 0, Math.PI / 2 - 0.1));
    lot.add(cheveux, sph(1), T(hc.x, hc.y + 0.14, hc.z - 0.03).multiply(echelle(0.15, 0.2, 0.15))); lot.add(cheveux, sph(0.11), T(hc.x, hc.y + 0.3, hc.z - 0.03));
    lot.add(cheveux, sph(1), T(hc.x, hc.y - 0.06, hc.z - 0.1).multiply(echelle(0.15, 0.13, 0.08)));
    for (const s of [-1, 1]) lot.add(or, new THREE.TorusGeometry(0.03, 0.007, 6, 14), T(hc.x + s * 0.125, hc.y - 0.09, hc.z + 0.01, 0, 0));
  } else {
    const robe = matSatin(0x14b8b0, { roughness: 0.25, metalness: 0.2, emissiveIntensity: 0.3 }), botte = matSatin(0xe0267a, { roughness: 0.25, metalness: 0.3, emissiveIntensity: 0.25 });
    jupe([[0.27, 0.73], [0.23, 0.86], [0.2, 1.0], [0.165, 1.17]], robe); bague(0.265, 0.016, 0.74, matSatin(0xffe08a, { emissiveIntensity: 0.5 }));
    for (const s of ['L', 'R']) { segment(lot, botte, pos('UpperLeg' + s).add(V(0, -0.14, 0)), pos('Foot' + s).add(V(0, 0.06, 0)), 0.086, 0.064, 12); lot.add(botte, new THREE.BoxGeometry(0.11, 0.07, 0.26), T(pos('Foot' + s).x, 0.04, pos('Foot' + s).z + 0.06)); }
    for (const s of [-1, 1]) lot.add(or, sph(0.04), T(pos('UpperArmL').x * s, pos('UpperArmL').y + 0.02, pos('UpperArmL').z).multiply(echelle(1.1, 0.7, 1.1)));
    const argent = matSatin(0xfff3c4, { roughness: 0.4, emissiveIntensity: 0.3 }), rose = matSatin(0xff5fa8, { roughness: 0.4, emissiveIntensity: 0.3 });
    lot.add(argent, sph(0.065), T(hc.x, hc.y + 0.1, hc.z - 0.13)); segment(lot, argent, V(hc.x, hc.y + 0.09, hc.z - 0.14), V(hc.x, hc.y - 0.2, hc.z - 0.19), 0.05, 0.03, 10); segment(lot, rose, V(hc.x, hc.y - 0.2, hc.z - 0.19), V(hc.x, hc.y - 0.38, hc.z - 0.2), 0.03, 0.012, 10);
    lot.add(cheveux, sph(1), T(hc.x, hc.y + 0.03, hc.z - 0.03).multiply(echelle(0.14, 0.12, 0.13)));
    const noir = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.4, metalness: 0.3 });
    lot.add(noir, new THREE.TorusGeometry(0.13, 0.006, 6, 26, Math.PI), T(hc.x, hc.y - 0.03, hc.z)); lot.add(noir, sph(0.025), T(hc.x - 0.135, hc.y - 0.04, hc.z));
    segment(lot, noir, V(hc.x - 0.135, hc.y - 0.04, hc.z + 0.01), V(hc.x - 0.1, hc.y - 0.12, hc.z + 0.1), 0.005, 0.005, 5); segment(lot, noir, V(hc.x - 0.1, hc.y - 0.12, hc.z + 0.1), V(hc.x - 0.03, hc.y - 0.145, hc.z + 0.14), 0.005, 0.005, 5); lot.add(rose, sph(0.014), T(hc.x - 0.025, hc.y - 0.145, hc.z + 0.145));
  }
  lot.finir(g); g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g;
}
function faireCinema() {
  const g = new THREE.Group(), lot = new Lot(), r = alea(73), CX = -48, CZ = 34; g.position.set(CX, 0, CZ); g.rotation.y = Math.PI / 2;
  const versMonde = (lx, y, lz) => [CX + lz, y, CZ - lx];
  mur(lot, M.brique, 15, 7.6, 12, 0, 3.8, 0);
  doux(lot, M.beton, 15.5, 0.5, 12.5, 0, 0.25, 0, 0.1);
  doux(lot, M.corniche, 15.4, 0.18, 12.4, 0, 7.5, 0, 0.05); doux(lot, M.corniche, 16, 0.4, 13, 0, 7.8, 0, 0.12);
  mur(lot, M.pierre2, 8, 1.9, 5, 0, 8.95, -2); doux(lot, M.corniche, 8.6, 0.3, 5.6, 0, 10.05, -2, 0.12);
  for (const x of [-6, -3, 0, 3, 6]) doux(lot, M.corniche, 0.55, 2.5, 0.22, x, 6.1, 6.06, 0.05);
  lot.add(M.laiton, new THREE.BoxGeometry(14.2, 0.05, 0.06), T(0, 4.78, 6.05)); lot.add(M.laiton, new THREE.BoxGeometry(15.6, 0.05, 0.05), T(0, 7.4, 6.24));
  mur(lot, M.pierre, 11.6, 3.5, 1.8, 0, 1.75, 6.9);
  doux(lot, M.sombre, 12.0, 0.3, 2.1, 0, 3.62, 6.95, 0.06);
  const mBandeau = new THREE.MeshStandardMaterial({ color: 0x101829, roughness: 0.8, emissive: 0x16233c, emissiveIntensity: 0.35 });
  doux(lot, M.sombre, 9.0, 1.0, 2.7, 0, 4.05, 9.1, 0.07);
  lot.add(mBandeau, new THREE.BoxGeometry(8.6, 0.76, 0.04), T(0, 4.05, 10.46));
  for (const c of [-1, 1]) { lot.add(mBandeau, new THREE.BoxGeometry(0.04, 0.76, 2.3), T(c * 4.51, 4.05, 9.15)); lot.add(M.laiton, new THREE.BoxGeometry(8.7, 0.04, 0.05), T(0, 4.05 + c * 0.42, 10.47)); }
  { const L2 = lettrageNet('Le cinéma', 0.5); L2.position.set(0, 3.83, 10.49); g.add(L2); }
  { const pos = [];
    for (let x = -4.4; x <= 4.401; x += 0.22) pos.push([x, 3.5, 10.43]);
    for (const c of [-1, 1]) for (let z = 7.98; z < 10.3; z += 0.22) pos.push([c * 4.48, 3.5, z]);
    for (const z of [8.45, 9.15, 9.85]) for (let x = -3.96; x <= 3.961; x += 0.44) pos.push([x, 3.535, z]);
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe2b8 }), pos.length), m4 = new THREE.Matrix4();
    pos.forEach((q, i) => { m4.makeTranslation(q[0], q[1], q[2]); im.setMatrixAt(i, m4); }); im.frustumCulled = false; im.raycast = () => {}; g.add(im); }
  const verre = toile(128, 256, (g2, L, H) => { const d = g2.createLinearGradient(0, 0, 0, H); d.addColorStop(0, '#ff9e38'); d.addColorStop(1, '#7a3e12'); g2.fillStyle = d; g2.fillRect(0, 0, L, H);
    const o = g2.createRadialGradient(L * 0.5, H * 0.35, 0, L * 0.5, H * 0.35, H * 0.6); o.addColorStop(0, 'rgba(255,226,184,.45)'); o.addColorStop(1, 'rgba(255,226,184,0)'); g2.fillStyle = o; g2.fillRect(0, 0, L, H); });
  const mVerre = new THREE.MeshStandardMaterial({ map: verre, emissiveMap: verre, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.3 }); mVerre.userData.sansOmbre = true;
  fenetre(lot, T(0, 1.42, 7.81), 2.6, 2.5, mVerre, { appui: false, traverse: 0 });
  fenetre(lot, T(0, 3.0, 7.81), 2.6, 0.42, 1, { appui: false, meneau: false, traverse: 0 });
  for (const c of [-1, 1]) lot.add(M.laiton, new THREE.CylinderGeometry(0.022, 0.022, 0.5, 10), T(c * 0.14, 1.2, 8.06));
  for (const c of [-1, 1]) fenetre(lot, T(c * 5.25, 1.85, 7.81), 0.7, 2.6, mVerre, { appui: false, meneau: false, traverse: 0 });
  { const mFond = matAffiche(0.6);
    for (const c of [-1, 1]) { const x = c * 3.05;
      doux(lot, M.laiton, 1.62, 2.42, 0.07, x, 1.9, 7.83, 0.02); lot.add(mFond, new THREE.PlaneGeometry(1.46, 2.26), T(x, 1.9, 7.88));
      lot.add(M.laiton, new THREE.CylinderGeometry(0.025, 0.025, 1.2, 10), T(x, 3.24, 8.02, 0, 0, Math.PI / 2)); lot.add(M.ampoule, new THREE.BoxGeometry(1.08, 0.012, 0.035), T(x, 3.213, 8.02));
      for (const s2 of [-1, 1]) lot.add(M.laiton, new THREE.CylinderGeometry(0.009, 0.009, 0.2, 6), T(x + s2 * 0.45, 3.24, 7.92, 0, Math.PI / 2)); } }
  for (const c of [-1, 1]) for (const z of [-3.2, 1.4]) fenetre(lot, T(c * 7.52, 5.7, z, c * Math.PI / 2), 1.6, 1.1, nivAlea(r, 0.4), { traverse: 0 });
  doux(lot, M.beton, 12.2, 0.1, 3.3, 0, 0.05, 9.3, 0.04);
  { const mP = M.lueurRonde.clone(); mP.color.setHex(0xff9e38); mP.opacity = 0.3; mP.userData.sansOmbre = true; const gP = new THREE.CircleGeometry(4.4, 40); gP.rotateX(-Math.PI / 2); gP.translate(0, 0.075, 0); lot.add(mP, gP, T(0, 0, 10.2)); }
  doux(lot, M.haie, 16.4, 1.3, 1.1, 0, 0.65, -7.2, 0.4);
  lot.finir(g); scene.add(g); cacheurs.push(g);
  for (const lx of [-2.6, 2.6]) { const [x, y, z] = versMonde(lx, 3.4, 9.6), h = halo(0xffa95c, 4.2, 0.16); h.position.set(x, y, z); scene.add(h); halosLoin.push([h, y]); }
  boite(CX - 6, CX + 6, CZ - 7.5, CZ + 7.5); boite(CX + 6, CX + 8.0, CZ - 5.9, CZ + 5.9); boite(CX - 7.8, CX - 6, CZ - 8.2, CZ + 8.2);
  lampe(CX + 10.2, 3.0, CZ, 0xff9e38, 3.6, 5);
  for (const lx of [-2.7, 2.7]) { const sp = new THREE.SpotLight(0xffb454, 6, 6, 0.6, 0.9, 1.5), [x, y, z] = versMonde(lx, 4.62, 9.7), [tx, ty, tz] = versMonde(lx, 7.6, 6.1);
    sp.position.set(x, y, z); sp.target.position.set(tx, ty, tz); scene.add(sp, sp.target); }
}
const arbres = new THREE.Group();
const LAMPADAIRES = [];
for (let z = 31.5; z <= 66; z += 11) LAMPADAIRES.push([-5.4, z], [5.4, z]);
for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8 + (i === 0 ? 0.1 : i === 7 ? -0.1 : 0); LAMPADAIRES.push([Math.sin(a) * 20.3, Math.cos(a) * 20.3]); }
LAMPADAIRES.push([-57, -16], [-35, -16], [35, -13.5], [57.5, -13.5], [-22, -8.5], [22, -7.5], [-15, 14], [15, 14], [-26, 27], [26, 27]);
function faireDecor() {
  const lot = new Lot(), lotA = new Lot(), r = alea(42);
  const poser = (mat, geo, mtx, y0, y1) => { const g = geo.clone().applyMatrix4(mtx), p = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); let l = 0;
      if (y < 9) for (const [lx, lz] of LAMPADAIRES) { const d = Math.hypot(x - lx, z - lz, (y - 5.3) * 0.8); if (d < 8) l = Math.max(l, (1 - d / 8) * (1 - d / 8)); }
      uv.setXY(i, l * Math.max(0, Math.min(1, 0.18 - nrm.getY(i) * 1.1)), Math.min(0.98, Math.max(0.02, (y - y0) / (y1 - y0)))); }
    lotA.add(mat, g); };
  const tronc = new THREE.CylinderGeometry(0.16, 0.3, 1, 10);
  const E = (m, sx, sy, sz) => m.scale(new THREE.Vector3(sx, sy, sz));
  const masses = [1, 2, 3, 4].map((g0) => { const g = new THREE.SphereGeometry(1, 28, 18), p = g.attributes.position, uv = g.attributes.uv, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = v.clone().normalize();
      const b = 1 + 0.13 * Math.sin(n.x * 4.1 + g0 * 1.7) * Math.cos(n.z * 3.7 + g0) + 0.09 * Math.sin(n.y * 6.3 + n.x * 5.1 + g0 * 2.3) + 0.06 * Math.cos(n.z * 8.2 + n.y * 3.3 + g0);
      v.copy(n).multiplyScalar(b); if (v.y < -0.35) v.y = -0.35 + (v.y + 0.35) * 0.45; p.setXYZ(i, v.x, v.y, v.z); uv.setXY(i, 0.5, Math.min(0.98, Math.max(0.02, (v.y + 0.6) / 1.75))); }
    g.computeVertexNormals(); return g; });
  const jupe = (() => { const g = new THREE.LatheGeometry([[0.02, 1], [0.2, 0.74], [0.46, 0.42], [0.78, 0.14], [1, 0], [0.86, 0.02], [0.4, 0.1]].map(([x, y]) => new THREE.Vector2(x, y)), 14), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), k = 1 + 0.09 * Math.sin(a * 7) * (1 - p.getY(i)); p.setXYZ(i, p.getX(i) * k, p.getY(i), p.getZ(i) * k); uv.setXY(i, 0.5, 0.25 + p.getY(i) * 0.7); }
    g.computeVertexNormals(); return g; })();
  const libre = (x, z, m = 3) => Math.hypot(x, z) > 22 && Math.hypot(x, z) < R - 4 && distRue(x, z) > m && !boites.some((b) => x > b.x1 - m && x < b.x2 + m && z > b.z1 - m && z < b.z2 + m)
    && !['cinema', 'magasin'].some((k) => Math.abs(x - LIEUX[k].x) < LIEUX[k].l / 2 + 1 && Math.abs(z - LIEUX[k].z) < LIEUX[k].p / 2 + 1)
    && !['ecole', 'biblio'].some((k) => Math.abs(x - LIEUX[k].x) < 19 && z > LIEUX[k].z + 6 && z < LIEUX[k].z + 50);
  const feuillu = (x, z, t) => { const q = alea(Math.floor(Math.abs(x * 131 + z * 71)) + 9), mat = M.feuilles[Math.floor(r() * 3)]; for (let i = 0; i < 5; i++) r();
    const haut = q() < 0.38, hT = (haut ? 5.2 : 4.3) * t;
    lotA.add(M.tronc, tronc.clone(), E(T(x, hT / 2, z), t, hT, t));
    for (const c of [-1, 1]) { const a = q() * 6.28, l = (1.5 + q() * 0.6) * t; lotA.add(M.tronc, tronc.clone(), E(T(x + Math.sin(a) * l * 0.32, hT * 0.86 + l * 0.3, z + Math.cos(a) * l * 0.32, a, 0.75 * c > 0 ? 0.75 : 0.6), t * 0.5, l, t * 0.5)); }
    const formes = haut
      ? [[0, 5.9, 0, 1.75, 1.25], [0.5, 4.5, 0.4, 1.5, 1.0], [-0.6, 4.7, -0.3, 1.45, 1.0], [0.1, 7.5, 0.1, 1.25, 1.15], [-0.2, 3.7, 0.7, 1.05, 0.8], [0.4, 6.6, -0.6, 1.05, 0.9]]
      : [[0, 4.6, 0, 2.25, 0.8], [1.55, 4.0, 0.5, 1.6, 0.78], [-1.5, 4.2, -0.4, 1.7, 0.78], [0.2, 5.9, 0.3, 1.6, 0.8], [-0.4, 3.9, 1.5, 1.4, 0.74], [0.5, 4.1, -1.5, 1.45, 0.74], [1.0, 5.4, -0.7, 1.15, 0.8], [-1.1, 5.5, 0.6, 1.1, 0.8]];
    for (const [dx, dy, dz, s0, ay] of formes) { const s1 = s0 * (0.9 + q() * 0.22);
      poser(mat, masses[Math.floor(q() * 4)], E(T(x + (dx + (q() - 0.5) * 0.3) * t, (dy + 1.6 + (q() - 0.5) * 0.3) * t, z + (dz + (q() - 0.5) * 0.3) * t, q() * 6.28), s1 * t, s1 * t * ay, s1 * t), (haut ? 3.6 : 3.9) * t, (haut ? 10.6 : 8.6) * t); }
    ronds.push({ x, z, r: 0.5 * t }); };
  const sapin = (x, z, t) => { const q = alea(Math.floor(Math.abs(x * 97 + z * 53)) + 5); for (let i = 0; i < 4; i++) r();
    lotA.add(M.tronc, tronc.clone(), E(T(x, 1.5 * t, z), t * 0.8, 3.0 * t, t * 0.8));
    const n = 5, hTot = 8.4 * (0.92 + q() * 0.2);
    for (let i = 0; i < n; i++) { const k = i / (n - 1), ray = (2.2 - k * 1.6) * (0.92 + q() * 0.16), h = (2.6 - k * 0.5);
      poser(M.sapin, jupe, E(T(x + (q() - 0.5) * 0.12 * t, (1.7 + k * (hTot - 3.6)) * t, z + (q() - 0.5) * 0.12 * t, q() * 6.28), ray * t, h * t, ray * t), 1.2 * t, (hTot - 0.4) * t); }
    ronds.push({ x, z, r: 0.45 * t }); };
  for (let z = 26; z <= 70; z += 11) for (const c of [-1, 1]) feuillu(c * 8.4, z, 1.15 + r() * 0.25);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.26, x = Math.sin(a) * 25.5, z = Math.cos(a) * 25.5; if (libre(x, z, 2.2)) feuillu(x, z, 1.05 + r() * 0.25); }
  for (const [x, z] of [[-27, 60], [-21, 62.5], [-19, 55.5], [-26, 53]]) feuillu(x, z, 1.1 + r() * 0.3);
  const retires = [], VUE = [0, 60], ENSEIGNES = [[46, -20.5], [-46, -18.7]];
  const dansCouloir = (x, z) => ENSEIGNES.some(([ex, ez]) => { const dx = ex - VUE[0], dz = ez - VUE[1], t = ((x - VUE[0]) * dx + (z - VUE[1]) * dz) / (dx * dx + dz * dz);
    return t > 0.12 && t < 0.97 && Math.hypot(x - VUE[0] - t * dx, z - VUE[1] - t * dz) < 4.2; });
  let n = 0; for (let i = 0; i < 900 && n < 48; i++) { const a = r() * Math.PI * 2, d = 24 + Math.sqrt(r()) * (R - 28), x = Math.sin(a) * d, z = Math.cos(a) * d;
    if (!libre(x, z, 3.2) || Math.hypot(x + 23, z - 58) < 7 || ronds.some((c) => Math.hypot(c.x - x, c.z - z) < 5) || retires.some((c) => Math.hypot(c.x - x, c.z - z) < 5)) continue;
    const estFeuillu = r() < 0.62, t = 0.95 + r() * 0.6;
    if (Math.hypot(x + 26, z - 32.4) < 1.5) { for (let j = 0; j < (estFeuillu ? 6 : 4); j++) r(); retires.push({ x, z }); window.__village.arbreRetireCinema = { x, z }; n++; continue; }
    if (LIEUX.studio && ((Math.abs(x) < 9.6 && z > -59.5 && z < -44) || Math.hypot(x, z + 43.6) < 8.6 || (Math.abs(x) < 5 && z < -19 && z > -45))) { for (let j = 0; j < (estFeuillu ? 6 : 4); j++) r(); retires.push({ x, z }); (window.__village.arbresRetiresStudio ||= []).push({ x, z }); n++; continue; }
    if (zoneChant(x, z)) { for (let j = 0; j < (estFeuillu ? 6 : 4); j++) r(); retires.push({ x, z }); n++; continue; }
    if (!estFeuillu && dansCouloir(x, z)) { for (let j = 0; j < 4; j++) r(); retires.push({ x, z }); window.__village.sapinsRetires = retires; n++; continue; }
    (estFeuillu ? feuillu : sapin)(x, z, t); n++; }
  const lampadaire = (x, z) => {
    lot.add(M.poteau, new THREE.CylinderGeometry(0.2, 0.27, 0.55, 16), T(x, 0.275, z)); lot.add(M.poteau, new THREE.CylinderGeometry(0.06, 0.1, 4.3, 12), T(x, 2.7, z));
    lot.add(M.poteau, new THREE.CylinderGeometry(0.17, 0.09, 0.16, 16), T(x, 4.92, z)); lot.add(M.ampoule, new THREE.SphereGeometry(0.31, 20, 16), T(x, 5.3, z)); lot.add(M.poteau, new THREE.CylinderGeometry(0.05, 0.2, 0.12, 16), T(x, 5.66, z)); lot.add(M.poteau, new THREE.SphereGeometry(0.05, 8, 6), T(x, 5.76, z));
    lot.add(M.grille, new THREE.TorusGeometry(0.318, 0.007, 6, 28), T(x, 5.3, z, 0, Math.PI / 2)); for (let i = 0; i < 4; i++) lot.add(M.grille, new THREE.TorusGeometry(0.318, 0.006, 6, 28), T(x, 5.3, z, i * Math.PI / 4));
    { const h = halo(0xffa95c, 3.4, 0.2); h.position.set(x, 5.3, z); scene.add(h); halosLoin.push([h, 5.3]); }
    const g = new THREE.CircleGeometry(5.2, 28); g.rotateX(-Math.PI / 2); g.translate(0, 0.07, 0); lot.add(M.lueurRonde, g, T(x, 0, z)); ronds.push({ x, z, r: 0.3 }); };
  for (const [x, z] of LAMPADAIRES) lampadaire(x, z);
  lot.finir(scene); lotA.finir(arbres); scene.add(arbres);
  const mPanneau = new THREE.MeshStandardMaterial({ color: 0x0f1a2e, roughness: 0.6 }), mOr = new THREE.MeshStandardMaterial({ color: C.laiton, emissive: C.laiton, emissiveIntensity: 0.5, roughness: 0.4 });
  for (const k of []) { const L = LIEUX[k], g = new THREE.Group(), l2 = new Lot(), c = Math.sign(L.x), x = L.x - c * 9, z = L.z - 5.5; g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, 6 - z);
    for (const s of [-1, 1]) l2.add(M.poteau, new THREE.CylinderGeometry(0.09, 0.11, 3.9, 10), T(s * 3.2, 1.95, 0));
    doux(l2, mPanneau, 7.4, 2.5, 0.16, 0, 3.0, 0, 0.06); doux(l2, M.poteau, 7.7, 0.12, 0.3, 0, 4.3, 0, 0.04);
    relief(l2, 'BIENTÔT', 0.26, 0, 3.62, 0.1, 0, mOr); relief(l2, L.nom, k === 'magasin' ? 0.5 : 0.78, 0, 2.5, 0.1);
    { const gg = new THREE.CircleGeometry(5, 24); gg.rotateX(-Math.PI / 2); gg.translate(0, 0.07, 0); l2.add(M.lueurRonde, gg, T(0, 0, 2.4)); }
    l2.finir(g); scene.add(g); for (const s of [-3.2, -1.6, 0, 1.6, 3.2]) ronds.push({ x: x + Math.cos(g.rotation.y) * s, z: z - Math.sin(g.rotation.y) * s, r: 0.7 }); }
}
const Y0 = -300;
const INT = {
  ecole: { nom: "L'école", salle: 'La salle de cours', o: [-60, 600], l: 17, p: 11.5, h: 4.3, depart: [0, 2.2], hemi: 0.46, luneForce: 0.85, lune: [-4, 26, 5], ombre: 12 },
  biblio: { nom: 'La bibliothèque', salle: 'La grande salle', o: [60, 600], l: 24, p: 16, h: 8.4, marge: 0.5, depart: [0, 4.0], hemi: 0.3, luneForce: 0.9, lune: [-5, 28, 6], ombre: 16, portrait: { recul: 9, haut: 3.6, fov: 78 } },
  magasin: { nom: 'Le magasin de musique', salle: 'Le magasin', o: [-150, 720], l: 18, p: 12, h: 4.6, depart: [0, 3.4], cadrePano: { recul: 6.4, haut: 3.0, fov: 64 }, hemi: 0.38, luneForce: 0.7, lune: [-4, 26, 5], ombre: 13, flou: 0.24 },
  annexe: { nom: 'Le magasin de musique', salle: 'La cabine de chant', o: [-300, 720], l: 14, p: 9.5, h: 4.3, depart: [0, 3.5], hemi: 0.4, luneForce: 0.75, lune: [-4, 26, 5], ombre: 11, flou: 0.24,
    dehors: { x: ANNEXE.cx, z: ANNEXE.cz + ANNEXE.x0, porte: [PORTE_ANNEXE.x, PORTE_ANNEXE.z], sortie: { x: 35.6, z: 49.5, vers: [20, 36] } } },
  chant: { nom: 'L’école de chant', salle: 'La salle de chant', o: [-450, 720], l: 16, p: 11, h: 4.4, depart: [0, 3.0], hemi: 0.42, luneForce: 0.75, lune: [-4, 26, 5], ombre: 12, flou: 0.24,
    dehors: { x: CHANT.x, z: CHANT.z, porte: [CHANT.x, CHANT.z + 8.6] } },
  cinema: { nom: 'Le cinéma', salle: 'La salle', o: [150, 720], l: 14, p: 20, h: 6.4, depart: [0, 7.7], hemi: 0.26, luneForce: 0.45, lune: [-3, 26, 6], ombre: 13, flou: 0.22, portrait: { recul: 7.5, haut: 3.2, fov: 72 } },
  chapeau: { nom: 'Le chapeau', salle: 'Le coin de Pat', o: [0, 720], rayon: 5.7, h: 9.5, depart: [0, 2.4], hemi: 0.25, hemiCiel: 0xffe2b8, hemiSol: 0x16233c, luneForce: 3.0, luneCouleur: 0xffe9cc, lune: [-1.2, 30, -0.6], luneVise: [-0.2, -0.3], ombre: 8 },
};
for (const I of Object.values(INT)) { I.boites = []; I.ronds = []; I.points = []; I.groupe = new THREE.Group(); I.groupe.position.set(I.o[0], Y0, I.o[1]); I.groupe.visible = false; scene.add(I.groupe); }
const PANNEAUX = {
  songbook: { nom: 'Songbook', sur: 'La bibliothèque · rallonge', texte: 'Paroles et accords. À venir.', liste: [['Paroles et accords', 'essai']] },
  guitarepat: { nom: 'Guitare Pat', sur: 'La bibliothèque · rallonge', texte: 'Ralentir, boucler. À venir.', liste: [['Ralentir, boucler', 'essai']] },
};
let dedans = null, enTransit = false, invite = null;
function ambiance(I) {
  const c = lune.shadow.camera; ciel.visible = etoiles.visible = !I;
  if (I) { hemi.color.setHex(I.hemiCiel || 0xffe0b8); hemi.groundColor.setHex(I.hemiSol || 0x2a1c12); hemi.intensity = I.hemi; lune.color.setHex(I.luneCouleur || 0xffe6c4); lune.intensity = I.luneForce;
    Object.assign(c, { left: -I.ombre, right: I.ombre, top: I.ombre, bottom: -I.ombre, near: 1, far: 70 }); scene.fog.density = 0; scene.fog.color.setHex(0x0a0705);
    bloom.threshold = 0.9; flouBase = I.flou || 0.3; bloom.strength = flouBase * flouLeger; bloom.radius = 0.5; }
  else { hemi.color.setHex(0x6a8fd0); hemi.groundColor.setHex(0x101826); hemi.intensity = 0.95; lune.color.setHex(0x9fc0ea); lune.intensity = 1.7;
    Object.assign(c, { left: -46, right: 46, top: 46, bottom: -46, near: 1, far: 140 }); scene.fog.density = 0.0085; scene.fog.color.setHex(C.brume); bloom.threshold = 0.93; flouBase = 0.28; bloom.strength = flouBase * flouLeger; bloom.radius = 0.6; }
  c.updateProjectionMatrix();
}
function fondu(fait) {
  if (enTransit) return; enTransit = true; touches.clear(); $('#voile').classList.add('noir'); $('#entrer').classList.remove('visible'); invite = null; document.body.classList.remove('invite', 'pres-arche', 'salle-ouverte'); majFinis();
  setTimeout(() => { fait(); camPos.set(0, 0, 0); reglerCamera(0, true);
    requestAnimationFrame(() => requestAnimationFrame(() => { $('#voile').classList.remove('noir'); enTransit = false; })); }, 240);
}
function poserDedans(k, ou) {
  const I = INT[k]; if (I.construire) I.construire(); dedans = k; for (const [n, J] of Object.entries(INT)) J.groupe.visible = n === k;
  const d = ou || (I.arrivee ? I.arrivee() : { x: I.depart[0], z: I.depart[1], ry: Math.PI, lacet: 0 });
  joueur.position.set(I.o[0] + d.x, Y0, I.o[1] + d.z); joueur.position.y = hauteurSol(joueur.position.x, joueur.position.z); joueur.rotation.y = d.ry; lacet = lacetVise = d.lacet; ambiance(I);
  I.pano = null; if (I.cadrePano && !I.vu && !ou) { I.vu = true; I.pano = { t: 0 }; lacet = lacetVise = PANO(0); }
  document.body.classList.toggle('au-magasin', k === 'magasin'); document.body.classList.toggle('au-cinema', k === 'cinema'); document.body.classList.toggle('au-studio', k === 'studio');
  document.body.classList.add('dedans'); $('#salle-lieu').textContent = I.nom; $('#salle-nom').textContent = I.salle; $('#mortaise').classList.remove('ouvert');
  $('#sortir').textContent = I.parent ? 'Le coin de Pat' : 'Sortir';  majRaccourcis();
}
function poserDehors() {
  const k = dedans, L = LIEUX[k] || INT[k].dehors; dedans = null; for (const J of Object.values(INT)) J.groupe.visible = false;
  const d = Math.hypot(L.porte[0] - L.x, L.porte[1] - L.z) || 1, ux = (L.porte[0] - L.x) / d, uz = (L.porte[1] - L.z) / d;
  let vx = ux, vz = uz; joueur.position.set(L.porte[0] + ux * 5.5, 0, L.porte[1] + uz * 5.5);
  if (L.sortie) { joueur.position.set(L.sortie.x, 0, L.sortie.z); const e = Math.hypot(L.sortie.vers[0] - L.sortie.x, L.sortie.vers[1] - L.sortie.z); vx = (L.sortie.vers[0] - L.sortie.x) / e; vz = (L.sortie.vers[1] - L.sortie.z) / e; }
  joueur.position.y = hauteurSol(joueur.position.x, joueur.position.z);
  joueur.rotation.y = Math.atan2(vx, vz); lacet = lacetVise = Math.atan2(-vx, -vz); camera.near = 0.1; ambiance(null); document.body.classList.remove('dedans', 'au-magasin', 'au-cinema', 'au-studio'); majRaccourcis();
}
const PANO_DUREE = 2.6, PANO = (t) => { const u = Math.min(1, t / PANO_DUREE); if (u < 0.74) return 0.82 * Math.cos(Math.PI * u / 0.74); const v = (u - 0.74) / 0.26; return -0.82 * (1 - v * v * (3 - 2 * v)); };
function entrer(k) { if (INT[k] && !dedans) fondu(() => poserDedans(k)); }
const POSTES_STUDIO = { son: { x: -4.6, z: 0.75, ry: Math.PI, lacet: 0 }, montage: { x: 4.4, z: -2.75, ry: Math.PI, lacet: 0 }, 'libre-a': { x: 5.75, z: 2.1, ry: Math.PI / 2, lacet: -Math.PI / 2 }, 'libre-b': { x: -5.75, z: 2.1, ry: -Math.PI / 2, lacet: Math.PI / 2 } };
const RACCOURCIS = { studio: OUTILS.filter((o) => POSTES_STUDIO[o.poste]).map((o) => [o.nom, { ...POSTES_STUDIO[o.poste], apres: () => ouvrirOutil(o.id) }]), biblio: [['Guitare Pat', { x: 5.7, z: -5.3, ry: Math.PI, lacet: 0 }], ['Songbook', { x: -6.9, z: -5.3, ry: Math.PI, lacet: 0 }]],
  cinema: [],
  magasin: [['Fender', { x: -5.4, z: -2.3, ry: -Math.PI / 2, lacet: Math.PI / 2 }], ['Gretsch', { x: -5.4, z: 2.0, ry: -Math.PI / 2, lacet: Math.PI / 2 }], ['Gibson', { x: 0, z: -2.6, ry: Math.PI, lacet: 0 }], ['Demers', { x: 5.4, z: -0.9, ry: Math.PI / 2, lacet: -Math.PI / 2 }], ['Kits', { x: 5.0, z: 3.4, ry: 0, lacet: Math.PI }]] };
const CADRE_ARCHE = { recul: 4.2, haut: 3.0, fov: 62, pente: 0.17 };
function allerDansSalle(d) { if (!dedans || enTransit || window.__pause) return; const k = dedans; fermerLieu(); fondu(() => { poserDedans(k, d); if (d.apres) { const att = () => (enTransit ? setTimeout(att, 120) : requestAnimationFrame(() => requestAnimationFrame(d.apres))); setTimeout(att, 200); } }); }
function majRaccourcis() { const R2 = RACCOURCIS[dedans] || [], b = $('#raccourcis'); b.hidden = !R2.length; b.innerHTML = R2.map(([nom], i) => `<button data-i="${i}">${nom}</button>`).join(''); INT.magasin.murProche = -1; }
function majMurProche() { if (dedans !== 'magasin') return; const I = INT.magasin, x = joueur.position.x - I.o[0], z = joueur.position.z - I.o[1], d = [x + I.l / 2, z + I.p / 2, I.l / 2 - x, I.p / 2 - z], m = Math.min(...d), k = d.indexOf(m), i = m >= 5 ? -1 : k === 0 ? (z < 0.3 ? 0 : 1) : k === 1 ? 2 : k === 2 ? 3 : (x > 1.8 && m < 3.4 ? 4 : -1);
  if (i !== I.murProche) { I.murProche = i; document.querySelectorAll('#raccourcis button').forEach((b, k) => b.classList.toggle('ici', k === i)); } }
$('#deplier-salle').onclick = () => document.body.classList.add('salle-ouverte');
$('#raccourcis').onclick = (e) => { const b = e.target.closest('button[data-i]'); if (b && RACCOURCIS[dedans]) { b.blur(); allerDansSalle(RACCOURCIS[dedans][+b.dataset.i][1]); } };
function passer(k, ou) { if (INT[k] && !enTransit) { fermerLieu(); fondu(() => poserDedans(k, ou)); } }
function sortir() { if (!dedans) return; if (window.__cinema) window.__cinema.arreter(); fermerLieu(); const I = INT[dedans]; if (I.parent) passer(I.parent, I.retour ? I.retour() : null); else fondu(poserDehors); }
const PT = 'Spectral, Georgia, serif', PC = 'Manrope, Arial, sans-serif';
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function placerEtiquettes() {}
$('#replier-guitare').addEventListener('click', () => document.body.classList.remove('guitare-ouverte'));
function faireInterieurs() {
  const std = (color, roughness, plus = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...plus });
  const texParquet = toile(512, 512, (g, S) => { const r = alea(31);
    for (let i = 0; i < 8; i++) { const y = i * 64, v = r(); g.fillStyle = `rgb(${Math.round(148 + v * 44)},${Math.round(96 + v * 32)},${Math.round(56 + v * 22)})`; g.fillRect(0, y, S, 64);
      for (let k = 0; k < 70; k++) { g.fillStyle = `rgba(60,30,10,${r() * 0.12})`; g.fillRect(r() * S, y + r() * 64, 40 + r() * 180, 1.5); }
      g.fillStyle = 'rgba(30,14,6,.6)'; g.fillRect(0, y, S, 2); const jx = r() * S; g.fillRect(jx, y, 2, 64); g.fillRect((jx + S * 0.47) % S, y, 2, 64); } });
  texParquet.wrapS = texParquet.wrapT = THREE.RepeatWrapping;
  const texPlatre = toile(256, 256, (g, S) => { const r = alea(13); g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 500; i++) { const x = r() * S, y = r() * S, t = 10 + r() * 40, d = g.createRadialGradient(x, y, 0, x, y, t); d.addColorStop(0, `rgba(0,0,0,${r() * 0.05})`); d.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = d; g.fillRect(x - t, y - t, 2 * t, 2 * t); } });
  texPlatre.wrapS = texPlatre.wrapT = THREE.RepeatWrapping;
  const texPlatreE = toile(256, 256, (g, S) => { const r = alea(17); g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 500; i++) { const x = r() * S, y = r() * S, t = 10 + r() * 40, d = g.createRadialGradient(x, y, 0, x, y, t); d.addColorStop(0, `rgba(0,0,0,${r() * 0.02})`); d.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = d; g.fillRect(x - t, y - t, 2 * t, 2 * t); } });
  texPlatreE.wrapS = texPlatreE.wrapT = THREE.RepeatWrapping; texPlatreE.repeat.set(1 / 3, 1 / 3);
  const texParquetB = toile(512, 512, (g, S) => { const r = alea(37);
    for (let i = 0; i < 8; i++) { const y = i * 64, v = r(); g.fillStyle = `rgb(${Math.round(128 + v * 22)},${Math.round(82 + v * 16)},${Math.round(42 + v * 10)})`; g.fillRect(0, y, S, 64);
      for (let k = 0; k < 70; k++) { g.fillStyle = `rgba(60,30,10,${r() * 0.07})`; g.fillRect(r() * S, y + r() * 64, 40 + r() * 180, 1.5); }
      g.fillStyle = 'rgba(30,14,6,.24)'; g.fillRect(0, y, S, 2); const jx = r() * S; g.fillRect(jx, y, 2, 64); g.fillRect((jx + S * 0.47) % S, y, 2, 64); } });
  texParquetB.wrapS = texParquetB.wrapT = THREE.RepeatWrapping;
  const texVitreI = toile(128, 192, (g, L, H) => { g.fillStyle = '#16233c'; g.fillRect(0, 0, L, H); for (const [x, y, t] of [[0.3, 0.62, 30], [0.76, 0.7, 20]]) { const d = g.createRadialGradient(L * x, H * y, 0, L * x, H * y, t); d.addColorStop(0, 'rgba(255,180,84,.5)'); d.addColorStop(1, 'rgba(255,180,84,0)'); g.fillStyle = d; g.fillRect(0, 0, L, H); } });
  const texOmbre = toile(128, 128, (g, S) => { const d = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); d.addColorStop(0, 'rgba(0,0,0,1)'); d.addColorStop(0.6, 'rgba(0,0,0,.7)'); d.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = d; g.fillRect(0, 0, S, S); });
  const MI = {
    parquet: new THREE.MeshStandardMaterial({ map: texParquet, roughness: 0.48 }), parquetB: new THREE.MeshStandardMaterial({ map: texParquetB, roughness: 0.7, color: 0xe8dccb }),
    vitre: new THREE.MeshStandardMaterial({ map: texVitreI, emissiveMap: texVitreI, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.15, metalness: 0 }),
    ombre: new THREE.MeshBasicMaterial({ map: texOmbre, transparent: true, depthWrite: false, opacity: 0.35, color: 0x000000, polygonOffset: true, polygonOffsetFactor: -3 }),
    laitonDoux: new THREE.MeshStandardMaterial({ color: C.laiton, metalness: 0.25, roughness: 0.4, emissive: C.laiton, emissiveIntensity: 0.28 }),
    corniche: new THREE.MeshStandardMaterial({ color: C.orange, emissive: 0xffb454, emissiveIntensity: 0.6, roughness: 0.4 }),
    murNord: std(0x1b2233, 0.9), alcove: std(0x3a2416, 0.75), fondAlcove: std(0x16233c, 0.9),
    noyer: std(0x5c3b22, 0.55), chene: std(0xa06e40, 0.55), ebene: std(0x2a1c14, 0.5),
    platre: std(0xb99c76, 0.92, { map: texPlatreE }), nuit: std(0x1d2f50, 0.88, { map: texPlatre }),
    plafond: std(0x2c2018, 0.9), poutre: std(0x3c2818, 0.8),
    tissuO: std(0xc8691f, 0.96), tissuB: std(0x25446f, 0.96), cuir: std(0x80451f, 0.5), grilleAmpli: std(0x9c8456, 0.95),
    papier: std(0xd9cfba, 0.85), feutre: std(0x17181f, 0.96),
    abat: new THREE.MeshStandardMaterial({ color: 0xf3d6a8, emissive: 0xffe2b8, emissiveIntensity: 0.82, roughness: 0.7, side: THREE.DoubleSide }),
    livres: [0x7a2a1e, 0x1e3a5f, 0x2f4a3a, 0xc9a961, 0xf3ede2, 0x3a2416].map((c) => std(c, 0.78)),
  };
  for (const m of [MI.plafond, MI.poutre, MI.abat, MI.ombre, MI.corniche]) m.userData.sansOmbre = true;
  MI.laitonL = M.laiton.clone(); MI.chaine = M.sombre.clone(); for (const m of [MI.laitonL, MI.chaine, MI.murNord]) m.userData.sansProjeter = true;
  for (const m of [MI.platre, MI.nuit]) m.userData.sansProjeter = true;
  const box = (w, h, d, r = 0.02) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  const cyl = (r1, r2, h, n = 12) => new THREE.CylinderGeometry(r1, r2, h, n);
  const dans = (lot, base) => (mat, geo, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) => lot.add(mat, geo, base.clone().multiply(T(x, y, z, ry, rx, rz)));
  const lueurI = (I, x, y, z, couleur, force, portee) => { const l = new THREE.PointLight(couleur, force, portee, 1.8); l.position.set(x, y, z); I.groupe.add(l); return l; };
  const haloI = (I, x, y, z, taille, opacite, couleur = 0xffa95c) => { const h = halo(couleur, taille, Math.min(opacite, 0.2)); h.position.set(x, y, z); I.groupe.add(h); };
  const rondI = (I, x, z, r) => I.ronds.push({ x: I.o[0] + x, z: I.o[1] + z, r });
  const boiteI = (I, x1, x2, z1, z2) => I.boites.push({ x1: I.o[0] + x1, x2: I.o[0] + x2, z1: I.o[1] + z1, z2: I.o[1] + z2 });
  const pointI = (I, cle, x, z, r, texte, action) => I.points.push({ cle, x: I.o[0] + x, z: I.o[1] + z, r, texte, action });
  const coque = (lot, I, mMur, { sol = MI.parquet, sansNord = false } = {}) => { const { l, p, h } = I;
    mur(lot, sol, l + 0.6, 0.3, p + 0.6, 0, -0.15, 0);
    if (!sansNord) mur(lot, mMur, l + 0.6, h, 0.3, 0, h / 2, -p / 2 - 0.15); mur(lot, mMur, l + 0.6, h, 0.3, 0, h / 2, p / 2 + 0.15);
    mur(lot, mMur, 0.3, h, p, -l / 2 - 0.15, h / 2, 0); mur(lot, mMur, 0.3, h, p, l / 2 + 0.15, h / 2, 0);
    lot.add(MI.plafond, new THREE.BoxGeometry(l + 0.6, 0.2, p + 0.6), T(0, h + 0.1, 0)); };
  const ombreSol = (lot, x, z, lx, lz, ry = 0) => { const g = new THREE.PlaneGeometry(lx, lz); g.rotateX(-Math.PI / 2); lot.add(MI.ombre, g, T(x, 0.03, z, ry)); };
  const projecteur = (I, x, y, z, vx, vy, vz, couleur, force, angle, penombre, portee = 9) => { const sp = new THREE.SpotLight(couleur, force, portee, angle, penombre, 1.5); sp.position.set(x, y, z); sp.target.position.set(vx, vy, vz); I.groupe.add(sp, sp.target); return sp; };
  const lutrinBois = (lot, base) => { const a = dans(lot, base); a(MI.noyer, box(0.62, 0.1, 0.5, 0.02), 0, 0.05, 0); a(MI.noyer, box(0.34, 1.0, 0.26, 0.03), 0, 0.58, 0); a(MI.noyer, box(0.8, 0.05, 0.56, 0.015), 0, 1.16, 0.03, 0, 0.42); a(MI.chene, box(0.8, 0.05, 0.05, 0.015), 0, 1.07, 0.27, 0, 0.42);
    for (const s of [-1, 1]) a(MI.papier, box(0.3, 0.035, 0.4, 0.01), s * 0.155, 1.2, 0.03, 0, 0.42, s * -0.06); a(MI.tissuO, box(0.025, 0.012, 0.44, 0.004), 0, 1.215, 0.03, 0, 0.42); };
  const chaise = (lot, x, z, ry) => { const a = dans(lot, T(x, 0, z, ry));
    a(MI.noyer, box(0.46, 0.05, 0.44), 0, 0.45, 0); a(MI.tissuO, box(0.4, 0.05, 0.38, 0.02), 0, 0.495, 0); a(MI.noyer, box(0.44, 0.4, 0.04), 0, 0.84, -0.215, 0, -0.12);
    for (const sx of [-1, 1]) { a(MI.noyer, box(0.04, 0.62, 0.04, 0.01), sx * 0.2, 0.74, -0.2, 0, -0.1); for (const sz of [-1, 1]) a(MI.ebene, cyl(0.017, 0.014, 0.45, 8), sx * 0.19, 0.225, sz * 0.18); } };
  const lutrin = (lot, x, z, ry) => { const a = dans(lot, T(x, 0, z, ry));
    for (let i = 0; i < 3; i++) { const an = i * 2.094; a(M.sombre, cyl(0.009, 0.009, 0.42, 6), Math.sin(an) * 0.15, 0.13, Math.cos(an) * 0.15, an, 0.95); }
    a(M.sombre, cyl(0.012, 0.012, 0.95, 8), 0, 0.72, 0); a(M.sombre, box(0.5, 0.34, 0.012, 0.005), 0, 1.3, 0.02, 0, -0.32); a(M.sombre, box(0.5, 0.025, 0.05, 0.005), 0, 1.15, 0.085, 0, -0.32);
    a(MI.papier, box(0.2, 0.27, 0.004, 0.001), -0.105, 1.31, 0.032, 0, -0.32); a(MI.papier, box(0.2, 0.27, 0.004, 0.001), 0.105, 1.31, 0.032, 0, -0.32); };
  const SUR_PIED = { 'acoustique:d0924e': ['mini000', 'Naturel'], 'acoustique:8a3a12': ['sj200', 'Vintage Sunburst'], 'acoustique:16161a': ['sj200', 'Ebony'],
    'electrique:c0281c': ['strat', 'Fiesta Red'], 'electrique:1e4fa0': ['tele', 'Lake Placid Blue'], 'electrique:e9dcc0': ['strat', 'Olympic White'] };
  const guitareExacteSurPied = (modele, couleur) => { const [id, fini] = SUR_PIED[modele + ':' + couleur.toString(16).padStart(6, '0')] || (modele === 'acoustique' ? ['sj200', 0] : ['strat', 0]);
    const G = habiller(faireGuitareExacte(id, fini)); G.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(G); G.position.set(0, 0.115 - b.min.y, 0.06); G.rotation.x = -0.16; G.userData.modele = id; return G; };
  const guitareSurPied = (I, lot, x, z, ry, modele, couleur, y = 0) => { const G = guitareExacteSurPied(modele, couleur);
    const piv = new THREE.Group(); piv.position.set(x, y, z); piv.rotation.y = ry; piv.add(G); I.groupe.add(piv);
    const a = dans(lot, T(x, y, z, ry)); a(M.sombre, cyl(0.011, 0.011, 0.86, 8), 0, 0.5, -0.1, 0, -0.16);
    for (const s of [-1, 1]) { a(M.sombre, cyl(0.011, 0.011, 0.5, 8), s * 0.16, 0.05, 0.02, s * 0.5, Math.PI / 2); a(M.sombre, cyl(0.009, 0.009, 0.18, 8), s * 0.1, 0.11, 0.07, 0, Math.PI / 2); a(M.sombre, cyl(0.008, 0.008, 0.09, 8), s * 0.045, 0.99, -0.13, 0, Math.PI / 2); }
    rondI(I, x, z, 0.36); };
  const ampli = (I, lot, x, z, ry, w = 0.72, h = 0.62, d = 0.32) => { const a = dans(lot, T(x, 0, z, ry));
    a(MI.ebene, box(w, h, d, 0.035), 0, h / 2 + 0.03, 0); a(MI.grilleAmpli, box(w - 0.09, h - 0.2, 0.012, 0.004), 0, h / 2 - 0.02, d / 2 + 0.002); a(M.laiton, box(w - 0.09, 0.07, 0.012, 0.004), 0, h - 0.035, d / 2 + 0.002);
    for (let i = 0; i < 5; i++) a(MI.ebene, cyl(0.016, 0.016, 0.02, 10), -w / 2 + 0.14 + i * 0.1, h - 0.035, d / 2 + 0.014, 0, Math.PI / 2);
    a(M.ampoule, new THREE.SphereGeometry(0.012, 8, 6), w / 2 - 0.1, h - 0.035, d / 2 + 0.012); a(MI.cuir, box(0.24, 0.02, 0.03, 0.008), 0, h + 0.045, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) a(MI.ebene, cyl(0.025, 0.025, 0.03, 8), sx * (w / 2 - 0.07), 0.015, sz * (d / 2 - 0.05));
    rondI(I, x, z, Math.max(w, d) / 2 + 0.05); };
  const suspension = (I, lot, x, y, z, hPlafond, taille = 1) => { const a = dans(lot, T(x, y, z));
    a(M.sombre, cyl(0.007, 0.007, hPlafond - y, 6), 0, (hPlafond - y) / 2, 0);
    a(M.laiton, new THREE.LatheGeometry([[0.03, 0.2], [0.07, 0.17], [0.2, 0.03], [0.24, 0]].map(([px, py]) => new THREE.Vector2(px * taille, py * taille)), 24), 0, 0, 0);
    a(M.ampoule, new THREE.SphereGeometry(0.075 * taille, 14, 10), 0, 0.02, 0); haloI(I, x, y - 0.02, z, 1.5 * taille, 0.3); };
  const applique = (I, lot, base) => { const a = dans(lot, base); a(M.laiton, cyl(0.06, 0.06, 0.02, 20), 0, 0, 0.01, 0, Math.PI / 2); a(M.laiton, cyl(0.011, 0.011, 0.2, 8), 0, 0, 0.11, 0, Math.PI / 2); a(M.laiton, cyl(0.011, 0.011, 0.1, 8), 0, 0.04, 0.2); a(M.laiton, cyl(0.03, 0.03, 0.012, 14), 0, 0.085, 0.2);
    a(MI.abat, new THREE.CylinderGeometry(0.075, 0.085, 0.18, 22, 1, true), 0, 0.16, 0.2); const v = new THREE.Vector3(0, 0.16, 0.2).applyMatrix4(base); haloI(I, v.x, v.y, v.z, 1.0, 0.2); };
  const tapisRect = (lot, x, z, w, d, ry = 0) => { const t = toile(512, 320, (g, l, h) => { g.fillStyle = '#7a2a1e'; g.fillRect(0, 0, l, h); g.strokeStyle = 'rgba(243,237,226,.7)'; g.lineWidth = 5; g.strokeRect(18, 18, l - 36, h - 36); g.strokeStyle = '#1e3a6e'; g.lineWidth = 16; g.strokeRect(38, 38, l - 76, h - 76);
      g.strokeStyle = '#c9a961'; g.lineWidth = 3; g.strokeRect(58, 58, l - 116, h - 116); const r = alea(9);
      for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) { const cx = 96 + i * 40, cy = 100 + j * 40; g.save(); g.translate(cx, cy); g.rotate(Math.PI / 4); g.fillStyle = (i + j) % 2 ? '#1e3a6e' : '#c9a961'; g.fillRect(-5.5, -5.5, 11, 11); g.restore(); }
      for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.fillRect(r() * l, r() * h, 2, 2); } });
    const geo = new THREE.BoxGeometry(w, 0.025, d); lot.add(std(0xc6bcb0, 0.97, { map: t }), geo, T(x, 0.0125, z, ry)); };
  const porteSortie = (lot, base, mot = 'Sortie', net = null) => { const a = dans(lot, base);
    a(M.sombre, box(2.3, 0.14, 0.2, 0.02), 0, 2.52, 0.06); for (const s of [-1, 1]) a(M.sombre, box(0.14, 2.52, 0.2, 0.02), s * 1.08, 1.26, 0.06);
    for (const s of [-1, 1]) { a(MI.noyer, box(0.98, 2.42, 0.07, 0.015), s * 0.5, 1.22, 0.05); a(MI.vitre, box(0.62, 1.2, 0.02, 0.005), s * 0.5, 1.6, 0.085); a(MI.ebene, box(0.66, 0.5, 0.02, 0.01), s * 0.5, 0.48, 0.085);
      a(M.laiton, cyl(0.016, 0.016, 0.3, 8), s * 0.1, 1.1, 0.12); }
    if (net) { const L2 = lettrageNet(mot, 0.2); L2.applyMatrix4(base.clone().multiply(T(0, 2.72, 0.09))); net.add(L2); return; }
    relief(lot, mot, 0.2, 0, 2.72, 0.06); const m = lot.m.get(M.lettres); m[m.length - 1].applyMatrix4(base); };
  tic('avant école');
  { const I = INT.ecole, lot = new Lot(), { l, p, h } = I, N = -p / 2, S = p / 2, O = -l / 2, E = l / 2;
    coque(lot, I, MI.platre);
    lot.add(MI.nuit, new THREE.BoxGeometry(l, h - 1.1, 0.04), T(0, 1.1 + (h - 1.1) / 2, N + 0.02));
    for (const [w, x, z, ry] of [[l, 0, N + 0.03, 0], [l, 0, S - 0.03, 0], [p, O + 0.03, 0, Math.PI / 2], [p, E - 0.03, 0, Math.PI / 2]]) { lot.add(MI.noyer, box(w, 1.1, 0.06, 0.01), T(x, 0.55, z, ry)); lot.add(MI.chene, box(w, 0.06, 0.1, 0.02), T(x, 1.12, z, ry)); lot.add(MI.ebene, box(w, 0.12, 0.08, 0.01), T(x, 0.06, z, ry)); }
    for (const x of [-5.6, 0, 5.6]) lot.add(MI.poutre, new THREE.BoxGeometry(0.28, 0.3, p), T(x, h - 0.15, 0));
    const tTab = toile(1280, 480, (g, L, H) => { g.fillStyle = '#0b0e10'; g.fillRect(0, 0, L, H); const r = alea(4);
      for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.018})`; g.fillRect(r() * L, r() * H, 60 + r() * 240, 10 + r() * 30); }
      g.strokeStyle = g.fillStyle = 'rgba(244,240,230,.92)'; g.lineCap = 'round'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const grille = (x, y, nom, cases) => { const e = 36, f = 50; g.font = 'italic 600 64px Georgia, serif'; g.fillText(nom, x + e * 2.5, y - 84);
        g.lineWidth = 7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + e * 5, y); g.stroke(); g.lineWidth = 3;
        for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(x + i * e, y); g.lineTo(x + i * e, y + f * 4); g.stroke(); }
        for (let i = 1; i <= 4; i++) { g.beginPath(); g.moveTo(x, y + i * f); g.lineTo(x + e * 5, y + i * f); g.stroke(); }
        cases.forEach((c, i) => { const cx = x + i * e; g.font = '600 30px Arial, sans-serif';
          if (c < 0) g.fillText('×', cx, y - 26); else if (c === 0) { g.beginPath(); g.arc(cx, y - 26, 9, 0, 7); g.stroke(); } else { g.beginPath(); g.arc(cx, y + (c - 0.5) * f, 14, 0, 7); g.fill(); } }); };
      grille(70, 200, 'C', [-1, 3, 2, 0, 1, 0]); grille(320, 200, 'G', [3, 2, 0, 0, 0, 3]); grille(570, 200, 'D', [-1, -1, 0, 2, 3, 2]);
      const tx = 860, ty = 170, tl = 380, te = 34; g.lineWidth = 2.5; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(tx, ty + i * te); g.lineTo(tx + tl, ty + i * te); g.stroke(); }
      g.lineWidth = 4; g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx, ty + te * 5); g.moveTo(tx + tl, ty); g.lineTo(tx + tl, ty + te * 5); g.stroke();
      g.font = '700 30px Georgia, serif'; ['T', 'A', 'B'].forEach((c, i) => g.fillText(c, tx - 28, ty + 40 + i * 36));
      g.font = '700 27px Arial, sans-serif'; [[4, 3], [3, 0], [3, 2], [3, 3], [2, 0], [2, 2], [1, 0], [1, 1]].forEach(([corde, c], i) => { const cx = tx + 36 + i * 44, cy = ty + corde * te;
        g.fillStyle = '#0b0e10'; g.fillRect(cx - 12, cy - 13, 24, 26); g.fillStyle = 'rgba(244,240,230,.95)'; g.fillText(String(c), cx, cy + 1); });
      g.font = 'italic 34px Georgia, serif'; g.fillText('La gamme de do', tx + tl / 2, ty - 62); g.fillText('do  ré  mi  fa  sol  la  si  do', tx + tl / 2, ty + te * 5 + 52); });
    lot.add(MI.noyer, box(5.7, 2.3, 0.07, 0.02), T(0, 2.45, N + 0.075));
    lot.add(new THREE.MeshStandardMaterial({ map: tTab, emissiveMap: tTab, emissive: 0xffffff, emissiveIntensity: 0.32, roughness: 0.95 }), new THREE.BoxGeometry(5.46, 2.05, 0.02), T(0, 2.45, N + 0.115));
    lot.add(MI.noyer, box(5.5, 0.05, 0.13, 0.015), T(0, 1.37, N + 0.15)); for (const x of [-1.9, -1.7, 1.2]) lot.add(MI.papier, box(0.1, 0.02, 0.02, 0.006), T(x, 1.405, N + 0.16, 0.3)); lot.add(MI.tissuB, box(0.16, 0.05, 0.07, 0.015), T(2.2, 1.42, N + 0.16));
    for (const z of [-2.7, 1.9]) { fenetre(lot, T(O + 0.02, 2.55, z, Math.PI / 2), 1.6, 2.3, MI.vitre, { traverse: 0.66 }); fenetre(lot, T(E - 0.02, 2.55, z, -Math.PI / 2), 1.6, 2.3, MI.vitre, { traverse: 0.66 }); }
    for (const z of [-0.4, 4.2]) { applique(I, lot, T(O + 0.06, 2.5, z, Math.PI / 2)); applique(I, lot, T(E - 0.06, 2.5, z, -Math.PI / 2)); }
    for (const x of [-4.2, 4.2]) applique(I, lot, T(x, 2.6, N + 0.06));
    { const a = dans(lot, T(-3.5, 0, -3.9)); a(MI.noyer, cyl(0.19, 0.19, 0.05, 20), 0, 0.68, 0); a(MI.cuir, cyl(0.18, 0.18, 0.04, 20), 0, 0.72, 0); for (let i = 0; i < 4; i++) { const an = i * 1.571 + 0.78; a(MI.ebene, cyl(0.016, 0.02, 0.7, 8), Math.sin(an) * 0.16, 0.34, Math.cos(an) * 0.16, an, 0.14); } a(M.laiton, new THREE.TorusGeometry(0.15, 0.008, 6, 24), 0, 0.26, 0, 0, Math.PI / 2); rondI(I, -3.5, -3.9, 0.26); }
    guitareSurPied(I, lot, -4.9, -4.6, 0.35, 'acoustique', 0xd0924e);
    ampli(I, lot, 4.3, -4.9, -0.2, 0.74, 0.64, 0.34); ampli(I, lot, 5.5, -4.75, -0.5, 0.5, 0.44, 0.28); guitareSurPied(I, lot, 6.7, -4.3, -0.7, 'electrique', 0xc0281c);
    tapisRect(lot, 0, -0.9, 8.4, 5.0);
    for (const x of [-3.4, -1.45, 1.45, 3.4]) { const ry = Math.PI - x * 0.07; chaise(lot, x, 0.7 + Math.abs(x) * -0.12, ry); rondI(I, x, 0.7 + Math.abs(x) * -0.12, 0.3); lutrin(lot, x * 0.93, -0.45 + Math.abs(x) * -0.12, -x * 0.07); rondI(I, x * 0.93, -0.45 + Math.abs(x) * -0.12, 0.14); }
    guitareSurPied(I, lot, -4.5, 0.9, 2.4, 'acoustique', 0x8a3a12); guitareSurPied(I, lot, 4.5, 0.9, -2.4, 'electrique', 0x1e4fa0);
    for (const [z, mod, c] of [[-0.95, 'electrique', 0xe9dcc0], [0.1, 'acoustique', 0x16161a]]) guitareSurPied(I, lot, E - 0.55, z, -Math.PI / 2, mod, c);
    { const a = dans(lot, T(O + 0.36, 0, 0.15, Math.PI / 2)); a(MI.noyer, box(2.2, 0.8, 0.5, 0.02), 0, 0.42, 0); a(MI.chene, box(2.26, 0.04, 0.56, 0.015), 0, 0.84, 0); for (const x of [-0.55, 0.55]) a(MI.ebene, box(1.0, 0.62, 0.02, 0.01), x, 0.42, 0.255);
      for (let i = 0; i < 7; i++) a(MI.livres[i % 6], new THREE.BoxGeometry(0.05 + (i % 3) * 0.012, 0.26 + (i % 4) * 0.02, 0.2), -0.9 + i * 0.07, 1.0 + (i % 4) * 0.01, 0);
      a(M.laiton, cyl(0.06, 0.08, 0.03, 16), 0.6, 0.875, 0); a(M.laiton, cyl(0.012, 0.012, 0.3, 8), 0.6, 1.03, 0); a(MI.abat, new THREE.CylinderGeometry(0.1, 0.17, 0.2, 18, 1, true), 0.6, 1.24, 0); haloI(I, O + 0.36, 1.24, 0.15 - 0.6, 1.3, 0.25); boiteI(I, O, O + 0.66, -1.0, 1.3); }
    porteSortie(lot, T(0, 0, S - 0.04, Math.PI));
    for (const [x, z] of [[-4.6, -1.5], [4.6, -1.5], [-4.6, 3.0], [4.6, 3.0]]) suspension(I, lot, x, 3.5, z, h, 0.85);
    { lot.add(M.laiton, cyl(0.035, 0.035, 4.6, 12), T(0, 3.78, N + 0.34, 0, 0, Math.PI / 2)); for (const x of [-1.8, 1.8]) lot.add(M.laiton, cyl(0.012, 0.012, 0.32, 8), T(x, 3.78, N + 0.18, 0, Math.PI / 2)); lot.add(M.ampoule, new THREE.BoxGeometry(4.4, 0.012, 0.04), T(0, 3.745, N + 0.34)); }
    for (const [x, y, z, f] of [[-4.6, 3.3, -1.5, 15], [4.6, 3.3, -1.5, 15], [0, 3.4, -4.3, 14], [0, 3.5, 2.8, 17]]) lueurI(I, x, y, z, 0xffc98a, f, 12);
    lot.finir(I.groupe);
    pointI(I, 'tableau', 0, -4.2, 2.1, 'Voir · le tableau', () => (ouvrirLieu('ecole')));
    pointI(I, 'sortie', 0, S - 0.7, 1.5, 'Sortir · retour au village', sortir);
  }
  tic('avant biblio');
  { const I = INT.biblio, lot = new Lot(), { l, p, h } = I, N = -p / 2, S = p / 2, O = -l / 2, E = l / 2, r = alea(88), HR = 4.75, NL = MI.livres.length;
    coque(lot, I, MI.nuit, { sol: MI.parquetB, sansNord: true });
    for (const x of [-9, -4.5, 0, 4.5, 9]) lot.add(MI.poutre, new THREE.BoxGeometry(0.34, 0.4, p), T(x, h - 0.2, 0)); for (const z of [-4, 4]) lot.add(MI.poutre, new THREE.BoxGeometry(l, 0.3, 0.3), T(0, h - 0.15, z));
    const rayonnage = (base, L) => { const a = dans(lot, base), prof = 0.46, travees = Math.max(1, Math.round(L / 1.9)), lt = L / travees;
      a(MI.ebene, new THREE.BoxGeometry(L, HR, 0.04), 0, HR / 2, 0.02); a(MI.noyer, box(L, 0.24, prof, 0.01), 0, 0.12, prof / 2); a(MI.noyer, box(L + 0.12, 0.2, prof + 0.1, 0.03), 0, HR + 0.02, prof / 2); a(M.laiton, box(L + 0.12, 0.025, 0.02, 0.005), 0, HR - 0.1, prof + 0.045);
      for (let i = 0; i <= travees; i++) a(MI.noyer, box(0.07, HR, prof, 0.01), -L / 2 + i * lt, HR / 2, prof / 2);
      for (let n = 0; n < 6; n++) { const y = 0.24 + n * 0.73; if (n) a(MI.noyer, new THREE.BoxGeometry(L, 0.04, prof - 0.02), 0, y, prof / 2);
        for (let i = 0; i < travees; i++) { let x = -L / 2 + i * lt + 0.06; const fin = -L / 2 + (i + 1) * lt - 0.06;
          while (x < fin - 0.08) { if (r() < 0.07) { x += 0.12 + r() * 0.3; continue; } const w = 0.035 + r() * 0.05, hh = 0.36 + r() * 0.26, d = 0.24 + r() * 0.1; if (x + w > fin) break;
            a(MI.livres[Math.floor(r() * NL)], new THREE.BoxGeometry(w, hh, d), x + w / 2, y + 0.02 + hh / 2, 0.06 + d / 2 + r() * 0.05); x += w + 0.004; } } } };
    rayonnage(T(O, 0, 0, Math.PI / 2), p); rayonnage(T(E, 0, 0, -Math.PI / 2), p);
    for (const [x, L] of [[-10.3, 3.4], [0, 7.4], [10.3, 3.4]]) rayonnage(T(x, 0, N), L);
    for (const x of [-7, 7]) rayonnage(T(x, 0, S, Math.PI), 9.4);
    for (const z of [-5, 0, 5]) { fenetre(lot, T(O + 0.02, 6.5, z, Math.PI / 2), 1.9, 2.3, MI.vitre, { traverse: 0.6 }); fenetre(lot, T(E - 0.02, 6.5, z, -Math.PI / 2), 1.9, 2.3, MI.vitre, { traverse: 0.6 }); }
    for (const [x, w] of [[-10.45, 3.7], [0, 8.0], [10.45, 3.7]]) lot.add(MI.murNord, new THREE.BoxGeometry(w, h, 0.3), T(x, h / 2, N - 0.15));
    lot.add(M.laiton, box(l, 0.04, 0.04, 0.008), T(0, 5.22, N + 0.02));
    const motifs = [(g, L, H) => { g.strokeStyle = '#c9a961'; g.lineWidth = 5; for (let i = 1; i <= 4; i++) { g.beginPath(); g.arc(L / 2, H * 0.62, i * 26, Math.PI, 0); g.stroke(); } g.fillStyle = '#ffb454'; g.beginPath(); g.arc(L / 2, H * 0.62, 9, 0, 7); g.fill(); },
      (g, L, H) => { g.strokeStyle = '#f3ede2'; g.globalAlpha = 0.75; g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(L * 0.14, H * (0.26 + i * 0.096)); g.lineTo(L * 0.86, H * (0.26 + i * 0.096)); g.stroke(); } g.globalAlpha = 1; g.fillStyle = '#ffb454'; g.beginPath(); g.arc(L * 0.64, H * 0.5, 11, 0, 7); g.fill(); },
      (g, L, H) => { g.fillStyle = '#1e3a6e'; g.beginPath(); g.arc(L * 0.42, H * 0.52, 62, 0, 7); g.fill(); g.fillStyle = '#c9a961'; g.beginPath(); g.arc(L * 0.6, H * 0.5, 40, 0, 7); g.fill(); }];
    [-6.3, 0, 6.3].forEach((x, i) => { const y = i === 1 ? 6.75 : 6.85, t = toile(320, 224, (g, L, H) => { g.fillStyle = '#16233c'; g.fillRect(0, 0, L, H); motifs[i](g, L, H); });
      lot.add(MI.noyer, box(1.9, 1.34, 0.08, 0.02), T(x, y, N + 0.05)); lot.add(MI.laitonDoux, box(1.7, 1.14, 0.02, 0.005), T(x, y, N + 0.095)); lot.add(std(0xffffff, 0.9, { map: t }), new THREE.BoxGeometry(1.62, 1.06, 0.02), T(x, y, N + 0.105));
      lot.add(M.laiton, cyl(0.02, 0.02, 1.1, 10), T(x, y + 0.86, N + 0.26, 0, 0, Math.PI / 2)); for (const s of [-0.4, 0.4]) lot.add(M.laiton, cyl(0.009, 0.009, 0.24, 6), T(x + s, y + 0.86, N + 0.14, 0, Math.PI / 2)); lot.add(MI.corniche, new THREE.BoxGeometry(1.0, 0.01, 0.03), T(x, y + 0.838, N + 0.26)); haloI(I, x, y + 0.7, N + 0.3, 1.6, 0.12, 0xffb454); });
    const bande = (w2, hd, dehors, dedansL) => { const f = new THREE.Shape(), wo = w2 + dehors, wi = w2 + dedansL;
      f.moveTo(-wo, 0); f.lineTo(-wo, hd); f.absellipse(0, hd, wo, wo, Math.PI, 0, true); f.lineTo(wo, 0); f.lineTo(wi, 0); f.lineTo(wi, hd); f.absellipse(0, hd, wi, wi, 0, Math.PI, false); f.lineTo(-wi, 0); f.closePath(); return f; };
    for (const [c, nom, cle] of [[-1, 'Songbook', 'songbook'], [1, 'Guitare Pat', 'guitarepat']]) { const x = c * 6.3, w2 = 1.55, hd = 2.5, PA = 1.25, zm = N - 0.3 - PA / 2;
      { const f = new THREE.Shape(); f.moveTo(-2.3, 0); f.lineTo(2.3, 0); f.lineTo(2.3, h); f.lineTo(-2.3, h); f.closePath(); const t = new THREE.Path(); t.moveTo(-w2, 0); t.lineTo(-w2, hd); t.absarc(0, hd, w2, Math.PI, 0, true); t.lineTo(w2, 0); t.closePath(); f.holes.push(t);
        lot.add(MI.murNord, new THREE.ExtrudeGeometry(f, { depth: 0.3, bevelEnabled: false, curveSegments: 28 }), T(x, 0, N - 0.3)); }
      mur(lot, MI.parquetB, 3.5, 0.3, PA + 0.3, x, -0.15, zm + 0.0); for (const s of [-1, 1]) lot.add(MI.alcove, new THREE.BoxGeometry(0.2, 4.5, PA + 0.3), T(x + s * (w2 + 0.1), 2.25, zm));
      lot.add(MI.alcove, new THREE.BoxGeometry(3.5, 0.2, PA + 0.3), T(x, 4.35, zm)); lot.add(MI.fondAlcove, new THREE.BoxGeometry(3.5, 4.5, 0.2), T(x, 2.25, N - 0.3 - PA - 0.1));
      lot.add(MI.noyer, new THREE.ExtrudeGeometry(bande(w2, hd, 0.34, 0.05), { depth: 0.5, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 28 }), T(x, 0, N));
      lot.add(MI.laitonDoux, new THREE.ExtrudeGeometry(bande(w2, hd, 0.05, 0), { depth: 0.55, bevelEnabled: false, curveSegments: 28 }), T(x, 0, N));
      mur(lot, MI.noyer, 1.7, 0.42, 0.9, x, 0.21, N - 0.85); mur(lot, MI.laitonDoux, 1.74, 0.03, 0.94, x, 0.435, N - 0.85);
      if (c < 0) lutrinBois(lot, T(x, 0.45, N - 0.85)); else guitareSurPied(I, lot, x, N - 0.9, 0, 'acoustique', 0xd0924e, 0.45);
      relief(lot, nom, 0.36, x, 4.58, N + 0.06);
      projecteur(I, x, 3.95, N - 0.15, x, 1.25, N - 0.9, 0xffc98a, 46, 0.6, 0.85, 7);
      if (PUBLIC && !ELEVE) { pointI(I, cle, x, N + 1.5, 2.2, nom + ' · Bientôt', () => {}); I.points[I.points.length - 1].muet = true; }
      I.points[I.points.length - 1].cadre = CADRE_ARCHE; }
    { const tR = toile(512, 512, (g, S0) => { const c = S0 / 2; for (const [ray, col] of [[1, '#7a2a1e'], [0.93, '#cdb9a8'], [0.9, '#1e3a6e'], [0.74, '#c9a961'], [0.72, '#7a2a1e'], [0.36, '#c9a961'], [0.34, '#1e3a6e']]) { g.fillStyle = col; g.beginPath(); g.arc(c, c, c * ray, 0, 7); g.fill(); }
        g.fillStyle = '#c9a961'; for (let i = 0; i < 16; i++) { const an = i / 16 * 6.283; g.beginPath(); g.arc(c + Math.cos(an) * c * 0.54, c + Math.sin(an) * c * 0.54, 8, 0, 7); g.fill(); }
        const q = alea(6); for (let i = 0; i < 12000; i++) { g.fillStyle = `rgba(0,0,0,${q() * 0.12})`; g.fillRect(q() * S0, q() * S0, 2, 2); } });
      lot.add(std(0xc6bcb0, 0.97, { map: tR }), new THREE.CylinderGeometry(2.5, 2.5, 0.025, 64), T(0, 0.0125, -0.5));
      lutrinBois(lot, T(0, 0, -0.5)); ombreSol(lot, 0, -0.45, 1.7, 1.5); projecteur(I, 0, 5.6, -0.3, 0, 1.0, -0.5, 0xffe2b8, 46, 0.5, 0.8, 9);
      rondI(I, 0, -0.5, 0.42); pointI(I, 'lutrin', 0, 0.5, 1.5, 'Voir · La bibliothèque', () => ouvrirLieu('biblio')); }
    tapisRect(lot, 0, 5.0, 2.4, 5.4, 0);
    for (const [x, z] of [[-6.6, -2.4], [6.6, -2.4], [-6.6, 3.0], [6.6, 3.0]]) { const a = dans(lot, T(x, 0, z));
      a(MI.noyer, box(4.4, 0.07, 1.3, 0.025), 0, 0.77, 0); a(MI.ebene, box(4.1, 0.1, 1.0, 0.02), 0, 0.69, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) a(MI.noyer, box(0.09, 0.7, 0.09, 0.015), sx * 2.0, 0.35, sz * 0.5);
      for (const lx of [-1.1, 1.1]) { a(M.laiton, cyl(0.07, 0.09, 0.03, 16), lx, 0.82, 0); a(M.laiton, cyl(0.011, 0.011, 0.34, 8), lx, 0.99, 0); a(M.laiton, box(0.48, 0.075, 0.15, 0.036), lx, 1.19, 0); a(M.ampoule, new THREE.BoxGeometry(0.42, 0.008, 0.09), lx, 1.151, 0); }
      for (const [bx, bz, br] of [[-1.7, 0.2, 0.3], [0.2, -0.25, -0.2], [1.75, 0.15, 0.15]]) { a(MI.papier, box(0.44, 0.03, 0.3, 0.008), bx, 0.82, bz, br); a(MI.livres[Math.floor(r() * NL)], box(0.46, 0.012, 0.32, 0.004), bx, 0.806, bz, br); }
      for (const cx of [-1.4, 0, 1.4]) { chaise(lot, x + cx, z + 0.98, Math.PI + (r() - 0.5) * 0.3); chaise(lot, x + cx, z - 0.98, (r() - 0.5) * 0.3); }
      ombreSol(lot, x, z, 5.6, 3.6); projecteur(I, x, 3.6, z, x, 0.77, z, 0xffe2b8, 11, 0.78, 0.85, 6);
      boiteI(I, x - 2.25, x + 2.25, z - 1.25, z + 1.25); }
    for (const z of [-2.6, 3.4]) { const a = dans(lot, T(0, 5.7, z)); a(MI.laitonL, new THREE.TorusGeometry(1.5, 0.04, 8, 64), 0, 0, 0, 0, Math.PI / 2); a(MI.laitonL, new THREE.TorusGeometry(0.8, 0.03, 8, 48), 0, 0.45, 0, 0, Math.PI / 2);
      for (let i = 0; i < 4; i++) { const an = i * 1.571 + 0.78; a(MI.chaine, cyl(0.008, 0.008, 2.75, 6), Math.sin(an) * 0.75, 1.35, Math.cos(an) * 0.75, an, -0.28); }
      for (let i = 0; i < 10; i++) { const an = i / 10 * 6.283; a(MI.laitonL, cyl(0.03, 0.02, 0.1, 8), Math.sin(an) * 1.5, 0.06, Math.cos(an) * 1.5); a(M.ampoule, new THREE.SphereGeometry(0.07, 12, 8), Math.sin(an) * 1.5, 0.17, Math.cos(an) * 1.5); }
      for (let i = 0; i < 5; i++) { const an = i / 5 * 6.283; a(M.ampoule, new THREE.SphereGeometry(0.06, 12, 8), Math.sin(an) * 0.8, 0.56, Math.cos(an) * 0.8); }
      haloI(I, 0, 5.9, z, 5.5, 0.1); lueurI(I, 0, 5.3, z, 0xffcf96, 34, 22); }
    porteSortie(lot, T(0, 0, S - 0.5, Math.PI)); lot.add(MI.noyer, box(2.8, 3.0, 0.5, 0.02), T(0, 1.5, S - 0.26));
    lot.finir(I.groupe);
    pointI(I, 'sortie', 0, S - 1.3, 1.5, 'Sortir · retour au village', sortir);
  }
  tic('avant chapeau');
  { const I = INT.chapeau, lot = new Lot(), g = I.groupe, RA = I.rayon, h = I.h, r = alea(5);
    const grain = toile(256, 256, (gg, S0) => { gg.fillStyle = '#808080'; gg.fillRect(0, 0, S0, S0); for (let i = 0; i < 26000; i++) { const v = 96 + r() * 64; gg.fillStyle = `rgba(${v},${v},${v},.5)`; gg.fillRect(r() * S0, r() * S0, 1 + r() * 2, 1 + r() * 3); } });
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(16, 9); grain.colorSpace = THREE.NoColorSpace;
    const feutre = new THREE.MeshPhysicalMaterial({ color: 0x2a1c12, roughness: 0.9, bumpMap: grain, bumpScale: 1.0, sheen: 0.5, sheenColor: new THREE.Color(0xc98a52), sheenRoughness: 0.55, side: THREE.BackSide });
    { const tM = toile(8, 256, (gg, L, H) => { const d = gg.createLinearGradient(0, H, 0, 0); d.addColorStop(0, '#000'); d.addColorStop(0.2, '#000'); d.addColorStop(0.215, '#c98a4c'); d.addColorStop(0.34, '#8a5a30'); d.addColorStop(0.52, '#55361c'); d.addColorStop(0.75, '#2c1c0f'); d.addColorStop(1, '#140c07'); gg.fillStyle = d; gg.fillRect(0, 0, L, H); });
      feutre.emissive = new THREE.Color(0xffffff); feutre.emissiveMap = tM; feutre.emissiveIntensity = 0.3; }
    const paroi = new THREE.Mesh(new THREE.CylinderGeometry(RA + 0.25, RA, h, 96, 1, true), feutre); paroi.position.y = h / 2; paroi.receiveShadow = true; g.add(paroi);
    { const geo = new THREE.CylinderGeometry(RA + 0.1, RA + 0.1, 0.3, 96), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * RA * 2 / 3.2, uv.getY(i) * RA * 2 / 3.2);
      const sol0 = new THREE.Mesh(geo, MI.parquet); sol0.position.y = -0.15; sol0.receiveShadow = true; g.add(sol0); }
    { const f = new THREE.Shape(); f.absarc(0, 0, RA + 0.4, 0, Math.PI * 2, false); const t = new THREE.Path(); t.absellipse(-0.9, 0.5, 2.5, 1.7, 0, Math.PI * 2, true, 0.35); f.holes.push(t);
      const dessus = new THREE.Mesh(new THREE.ShapeGeometry(f, 48), new THREE.MeshStandardMaterial({ color: 0x15161d, roughness: 0.96, side: THREE.DoubleSide })); dessus.rotation.x = -Math.PI / 2; dessus.position.y = h; dessus.castShadow = true; g.add(dessus);
      const bord = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 8, 72), new THREE.MeshStandardMaterial({ color: C.orange, emissive: C.orange, emissiveIntensity: 0.8, roughness: 0.4 })); bord.scale.set(2.5, 1.7, 1); bord.rotation.z = 0.35; bord.position.set(-0.9, 0.5, -0.02); dessus.add(bord);
      const tF = toile(64, 256, (gg, L, H) => { const d = gg.createLinearGradient(0, 0, 0, H); d.addColorStop(0, 'rgba(255,226,184,.5)'); d.addColorStop(0.6, 'rgba(255,214,160,.16)'); d.addColorStop(1, 'rgba(255,200,140,0)'); gg.fillStyle = d; gg.fillRect(0, 0, L, H); });
      const tV = toile(256, 256, (gg, L, H) => { const im = gg.createImageData(L, H); for (let y = 0; y < H; y++) for (let x = 0; x < L; x++) { const u = (x / (L - 1) - 0.5) * 2, v = y / (H - 1), a = Math.exp(-u * u * 3.2) * (0.55 - 0.42 * v) * (1 - Math.pow(Math.abs(u), 6)); im.data.set([255, 224, 180, Math.max(0, a) * 255], (y * L + x) * 4); } gg.putImageData(im, 0, 0); });
      const fais = new THREE.Mesh(new THREE.PlaneGeometry(6.4, h), new THREE.MeshBasicMaterial({ map: tV, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.42, fog: false, side: THREE.DoubleSide })); fais.position.set(-0.6, h / 2, -0.4); g.add(fais); I.faisceau = fais; }
    const OUVP = 0.21;
    for (let i = 0; i < 64; i++) { const an = i / 64 * Math.PI * 2 + Math.PI / 64; if (Math.abs(Math.atan2(Math.sin(an), Math.cos(an))) < OUVP) continue;
      lot.add(i % 2 ? MI.noyer : MI.chene, box(0.5, 1.3, 0.06, 0.012), T(Math.sin(an) * (RA - 0.05), 0.65, Math.cos(an) * (RA - 0.05), an + Math.PI)); }
    for (const [y, tube, mat] of [[1.34, 0.03, M.laiton], [0.05, 0.05, MI.ebene]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(RA - 0.08, tube, 8, 128, Math.PI * 2 - 2 * OUVP), mat); t.rotation.x = Math.PI / 2; t.rotation.z = Math.PI / 2 + OUVP - Math.PI; t.position.y = y; g.add(t); }
    { const tRu = toile(256, 32, (gg, L, H) => { const d = gg.createLinearGradient(0, 0, 0, H); d.addColorStop(0, '#f2a352'); d.addColorStop(0.3, '#e88a30'); d.addColorStop(1, '#a9561a'); gg.fillStyle = d; gg.fillRect(0, 0, L, H); });
      const ru = new THREE.Mesh(new THREE.CylinderGeometry(RA + 0.03, RA + 0.01, 0.55, 96, 1, true), new THREE.MeshPhysicalMaterial({ map: tRu, roughness: 0.45, sheen: 0.6, sheenColor: new THREE.Color(0xffc98a), sheenRoughness: 0.35, side: THREE.BackSide })); ru.position.y = 1.72; ru.receiveShadow = true; g.add(ru);
      const fil = new THREE.Mesh(new THREE.TorusGeometry(RA + 0.0, 0.035, 8, 128), MI.corniche); fil.rotation.x = Math.PI / 2; fil.position.y = 2.01; g.add(fil); }
    { const texte = 'Le coin de Pat', ta = 0.4, lettres = [...texte].map((c) => { if (c === ' ') return { w: ta * 0.42 }; const ge = new TextGeometry(c, { font: police, size: ta, height: ta * 0.16, curveSegments: 5, bevelEnabled: true, bevelThickness: ta * 0.02, bevelSize: ta * 0.012, bevelSegments: 2 }); ge.computeBoundingBox(); const b = ge.boundingBox; ge.translate(-(b.max.x + b.min.x) / 2, 0, 0); return { ge, w: b.max.x - b.min.x + ta * 0.1 }; });
      const total = lettres.reduce((s0, o) => s0 + o.w, 0), ray = RA - 0.02, lotL = new Lot(); let s0 = -total / 2;
      for (const o of lettres) { const th = (s0 + o.w / 2) / ray + 0.42; if (o.ge) lotL.add(M.lettres, o.ge, T(Math.sin(th) * ray, 2.3, -Math.cos(th) * ray, -th)); s0 += o.w; }
      I.lettrage = lotL.finir(new THREE.Group()); g.add(I.lettrage); }
    { const tR = toile(512, 512, (gg, S0) => { const c = S0 / 2; for (const [ray, col] of [[1, '#1a2d50'], [0.94, '#e0c48a'], [0.91, '#8a3a16'], [0.7, '#c9772e'], [0.67, '#1a2d50'], [0.3, '#e0c48a'], [0.27, '#8a3a16']]) { gg.fillStyle = col; gg.beginPath(); gg.arc(c, c, c * ray, 0, 7); gg.fill(); }
        gg.strokeStyle = '#e0c48a'; gg.lineWidth = 5; for (let i = 0; i < 12; i++) { const an = i / 12 * 6.283; gg.beginPath(); gg.moveTo(c + Math.cos(an) * c * 0.32, c + Math.sin(an) * c * 0.32); gg.lineTo(c + Math.cos(an + 0.26) * c * 0.64, c + Math.sin(an + 0.26) * c * 0.64); gg.stroke(); }
        for (let i = 0; i < 12000; i++) { gg.fillStyle = `rgba(0,0,0,${r() * 0.1})`; gg.fillRect(r() * S0, r() * S0, 2, 2); } });
      const tapis = new THREE.Mesh(new THREE.CircleGeometry(2.9, 64), std(0xffffff, 0.97, { map: tR })); tapis.rotation.x = -Math.PI / 2; tapis.position.set(-0.3, 0.012, -0.4); tapis.receiveShadow = true; g.add(tapis); }
    { const a = dans(lot, T(-1.25, 0, -0.9, 0.55));
      a(MI.cuir, box(1.0, 0.3, 0.92, 0.1), 0, 0.3, 0); a(MI.cuir, box(1.0, 0.95, 0.24, 0.11), 0, 0.82, -0.4, 0, -0.16); for (const s of [-1, 1]) a(MI.cuir, box(0.22, 0.56, 0.92, 0.1), s * 0.56, 0.44, 0);
      a(MI.tissuO, box(0.68, 0.16, 0.66, 0.07), 0, 0.5, 0.06); a(MI.tissuB, box(0.44, 0.4, 0.14, 0.06), 0.06, 0.78, -0.2, 0.2, -0.3);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) a(MI.ebene, cyl(0.035, 0.025, 0.14, 10), sx * 0.52, 0.07, sz * 0.36); rondI(I, -1.25, -0.9, 0.72); }
    { const a = dans(lot, T(-2.6, 0, -0.1)); a(MI.noyer, cyl(0.34, 0.34, 0.04, 28), 0, 0.6, 0); a(MI.ebene, cyl(0.025, 0.025, 0.58, 10), 0, 0.3, 0); a(MI.ebene, cyl(0.2, 0.22, 0.03, 24), 0, 0.015, 0);
      a(M.laiton, cyl(0.07, 0.09, 0.03, 16), 0, 0.635, -0.05); a(M.laiton, cyl(0.012, 0.012, 0.4, 8), 0, 0.84, -0.05); a(MI.abat, new THREE.CylinderGeometry(0.11, 0.2, 0.26, 20, 1, true), 0, 1.12, -0.05);
      a(MI.papier, box(0.2, 0.03, 0.27, 0.008), 0.08, 0.635, 0.14, 0.4); haloI(I, -2.6, 1.1, -0.15, 2.2, 0.3); lueurI(I, -2.6, 1.25, -0.15, 0xffb060, 9, 7); rondI(I, -2.6, -0.1, 0.36); }
    guitareSurPied(I, lot, 0.55, -1.5, -0.35, 'acoustique', 0xd0924e);
    { const bx = 3.55, bz = -1.5, ry = -Math.PI / 2 - 0.4, a = dans(lot, T(bx, 0, bz, ry));
      a(MI.noyer, box(1.9, 0.06, 0.85, 0.02), 0, 0.76, 0); a(MI.chene, box(1.9, 0.02, 0.85, 0.008), 0, 0.8, 0); a(MI.noyer, box(0.5, 0.56, 0.74, 0.02), -0.62, 0.45, 0); for (let i = 0; i < 3; i++) { a(MI.chene, box(0.44, 0.15, 0.02, 0.006), -0.62, 0.62 - i * 0.18, -0.375); a(M.laiton, cyl(0.012, 0.012, 0.1, 8), -0.62, 0.62 - i * 0.18, -0.39, 0, 0, Math.PI / 2); }
      for (const sz of [-1, 1]) { a(MI.ebene, box(0.06, 0.74, 0.06, 0.01), 0.86, 0.37, sz * 0.36); a(MI.ebene, box(0.05, 0.16, 0.05, 0.01), -0.62, 0.08, sz * 0.3); }
      a(MI.ebene, box(0.92, 0.54, 0.035, 0.012), 0.12, 1.26, 0.2, 0, -0.06); a(new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 0.25, metalness: 0.2, emissive: 0xffe2b8, emissiveIntensity: 0.3 }), box(0.86, 0.48, 0.006, 0.002), 0.12, 1.26, 0.18, 0, -0.06);
      a(MI.ebene, box(0.07, 0.2, 0.04, 0.01), 0.12, 0.91, 0.22); a(MI.ebene, box(0.3, 0.02, 0.2, 0.008), 0.12, 0.82, 0.22); a(MI.ebene, box(0.46, 0.018, 0.15, 0.006), 0.12, 0.822, -0.14);
      a(MI.papier, box(0.24, 0.02, 0.32, 0.006), 0.62, 0.822, -0.08, 0.2); a(MI.cuir, box(0.2, 0.03, 0.28, 0.008), -0.5, 0.826, 0.05, -0.15);
      a(M.laiton, cyl(0.08, 0.1, 0.03, 16), -0.72, 0.825, 0.24); a(M.laiton, cyl(0.012, 0.012, 0.42, 8), -0.72, 1.04, 0.24); a(MI.abat, new THREE.CylinderGeometry(0.1, 0.18, 0.22, 20, 1, true), -0.72, 1.32, 0.24);
      const vl = new THREE.Vector3(-0.72, 1.32, 0.24).applyMatrix4(T(bx, 0, bz, ry)); haloI(I, vl.x, vl.y, vl.z, 2.0, 0.28);
      const c = dans(lot, T(bx, 0, bz, ry).multiply(T(0.1, 0, -0.78, 0.25)));
      c(MI.cuir, box(0.5, 0.09, 0.48, 0.035), 0, 0.5, 0); c(MI.cuir, box(0.46, 0.5, 0.08, 0.035), 0, 0.84, -0.24, 0, -0.1); c(MI.noyer, box(0.05, 0.3, 0.05, 0.012), 0, 0.6, -0.26, 0, -0.1); c(M.sombre, cyl(0.028, 0.028, 0.36, 10), 0, 0.28, 0);
      for (let i = 0; i < 5; i++) { const an = i * 1.2566; c(M.sombre, box(0.045, 0.035, 0.3, 0.01), Math.sin(an) * 0.15, 0.07, Math.cos(an) * 0.15, an); c(MI.ebene, new THREE.SphereGeometry(0.035, 10, 8), Math.sin(an) * 0.3, 0.035, Math.cos(an) * 0.3); }
      for (const s2 of [-1, 1]) { c(MI.noyer, box(0.05, 0.03, 0.3, 0.01), s2 * 0.27, 0.68, -0.02); c(M.sombre, cyl(0.012, 0.012, 0.16, 8), s2 * 0.27, 0.6, 0.05); }
      const vc = new THREE.Vector3(0.1, 0, -0.78).applyMatrix4(T(bx, 0, bz, ry)); rondI(I, vc.x, vc.z, 0.36);
      for (const dx of [-0.65, 0, 0.65]) { const v = new THREE.Vector3(dx, 0, 0).applyMatrix4(T(bx, 0, bz, ry)); rondI(I, v.x, v.z, 0.5); }
       }
    porteSortie(lot, T(0, 0, RA - 0.12, Math.PI));
    lot.finir(g);
    for (let i = 0; i < 6; i++) { const an = i / 6 * Math.PI * 2 + Math.PI / 6; lueurI(I, Math.sin(an) * (RA - 0.3), 2.5, Math.cos(an) * (RA - 0.3), 0xffb454, 1.1, 5).decay = 2; }
    lueurI(I, 3.0, 1.6, -1.3, 0xffb060, 9, 7); lueurI(I, -0.6, 7.6, -0.4, 0xffe2b8, 9, 13);
    pointI(I, 'sortie', 0, RA - 1.1, 1.5, 'Sortir · retour au village', sortir);
  }
  tic('avant magasin');
  { const I = INT.magasin, lot = new Lot(), { l, p, h } = I, N = -p / 2, S = p / 2, O = -l / 2, E = l / 2;
    const texSol = toile(512, 512, (g, T2) => { const r = alea(41);
      for (let i = 0; i < 8; i++) { const y = i * 64, v = r(); g.fillStyle = `rgb(${Math.round(100 + v * 14)},${Math.round(54 + v * 9)},${Math.round(25 + v * 6)})`; g.fillRect(0, y, T2, 64);
        for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(40,18,6,${r() * 0.06})`; g.fillRect(r() * T2, y + r() * 64, 40 + r() * 180, 1.5); }
        g.fillStyle = 'rgba(30,14,6,.3)'; g.fillRect(0, y, T2, 2); const jx = r() * T2; g.fillRect(jx, y, 2, 64); g.fillRect((jx + T2 * 0.47) % T2, y, 2, 64); } });
    texSol.wrapS = texSol.wrapT = THREE.RepeatWrapping;
    const mSol = new THREE.MeshStandardMaterial({ map: texSol, roughness: 0.7 }), mMur = std(0x2e2119, 0.92, { map: texPlatre }), mLatte = std(0x432a18, 0.66), mLatteS = std(0x3b2515, 0.7), mFond = std(0x1a120c, 0.9);
    const mPanneau = std(0x101829, 0.86, { emissive: 0x16233c, emissiveIntensity: 0.3 }), mSupport = std(0x8f6f30, 0.45, { metalness: 0.35 }); mMur.userData.sansProjeter = true;
    coque(lot, I, mMur, { sol: mSol });
    for (const [w, x, z, ry] of [[l, 0, N + 0.03, 0], [l, 0, S - 0.03, 0], [p, O + 0.03, 0, Math.PI / 2], [p, E - 0.03, 0, Math.PI / 2]]) lot.add(MI.ebene, box(w, 0.14, 0.08, 0.01), T(x, 0.07, z, ry));
    for (const x of [-4.5, 4.5]) lot.add(MI.poutre, new THREE.BoxGeometry(0.28, 0.3, p), T(x, h - 0.15, 0));
    const MURS = [
      { nom: 'Fender', x0: O + 0.04, z0: -2.3, ry: Math.PI / 2, larg: 5.0, pas: 1.8, face: [1, 0] },
      { nom: 'Gretsch', x0: O + 0.04, z0: 2.0, ry: Math.PI / 2, larg: 3.2, pas: 1.8, face: [1, 0] },
      { nom: 'Gibson', x0: 0, z0: N + 0.04, ry: 0, larg: 11.6, pas: 1.9, face: [0, 1] },
      { nom: 'Demers', x0: E - 0.04, z0: -0.9, ry: -Math.PI / 2, larg: 9.6, pas: 1.72, face: [-1, 0] },
    ];
    for (const W of MURS) W.base = T(W.x0, 0, W.z0, W.ry);
    I.murs = MURS; I.places = [];
    for (const W of MURS) { const a = dans(lot, W.base), liste = GUITARES.filter((g) => g.marque === W.nom), n = liste.length;
      a(mFond, box(W.larg, 3.0, 0.05, 0.01), 0, 1.95, 0.025);
      for (let i = 0, nb = Math.round(W.larg / 0.2); i < nb; i++) a(i % 2 ? mLatte : mLatteS, box(0.15, 2.9, 0.035, 0.008), -W.larg / 2 + 0.1 + i * (W.larg - 0.2) / (nb - 1), 1.95, 0.062);
      a(MI.chene, box(W.larg + 0.2, 0.09, 0.14, 0.02), 0, 3.48, 0.07); a(MI.chene, box(W.larg + 0.2, 0.09, 0.14, 0.02), 0, 0.45, 0.07);
      a(M.laiton, cyl(0.022, 0.022, W.larg - 0.4, 10), 0, 3.3, 0.3, 0, 0, Math.PI / 2); a(M.ampoule, new THREE.BoxGeometry(W.larg - 0.6, 0.012, 0.03), 0, 3.275, 0.3);
      for (const s of [-1, 1]) a(M.laiton, cyl(0.009, 0.009, 0.26, 6), s * (W.larg / 2 - 0.5), 3.3, 0.17, 0, Math.PI / 2);
      { relief(lot, W.nom, 0.4, 0, 3.74, 0.05); const m = lot.m.get(M.lettres); m[m.length - 1].applyMatrix4(W.base); }
      lueurSol(lot, W.larg - 0.6, 3.0, W.x0 + W.face[0] * 0.12, W.z0 + W.face[1] * 0.12, W.ry);
      liste.forEach((G, i) => { const u = (i - (n - 1) / 2) * W.pas, q = new THREE.Vector3(u, 0, 0).applyMatrix4(W.base);
        a(mPanneau, box(1.1, 2.2, 0.03, 0.01), u, 1.95, 0.086);
        for (const s of [-1, 1]) { a(MI.laitonDoux, box(0.014, 2.2, 0.012, 0.004), u + s * 0.55, 1.95, 0.104); a(MI.laitonDoux, box(1.114, 0.014, 0.012, 0.004), u, 1.95 + s * 1.1, 0.104); }
        a(mSupport, box(0.09, 0.2, 0.02, 0.006), u, 2.5, 0.111); a(mSupport, cyl(0.008, 0.008, 0.16, 8), u, 2.5, 0.19, 0, Math.PI / 2);
        for (const s of [-1, 1]) a(MI.feutre, cyl(0.011, 0.011, 0.1, 8), u + s * 0.036, 2.51, 0.27, 0, Math.PI / 2 - 0.25);
        const tex = new THREE.CanvasTexture(Object.assign(document.createElement('canvas'), { width: 512, height: 112 })); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
        const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.219), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.7 }));
        plaque.rotation.y = W.ry; I.groupe.add(plaque);
        const lueur = halo(C.laiton, 1.1, 0.2); lueur.position.set(u, 2.5, 0.3).applyMatrix4(W.base); lueur.visible = false; I.groupe.add(lueur);
        const place = { G, W, u, tex, plaque, lueur, guitare: null, x: q.x + W.face[0] * 1.15, z: q.z + W.face[1] * 1.15 }; I.places.push(place);
        pointI(I, 'g-' + G.id, place.x, place.z, 1.12, '', () => { prendreGuitare(G.id); ramasse = 0.5; });
        const pt = I.points[I.points.length - 1]; pt.cache = () => portee.id === G.id && dosObjet === 'guitare' && G.couleurs.length < 2;
        Object.defineProperty(pt, 'texte', { get: () => (portee.id === G.id && dosObjet === 'guitare' ? 'Fini suivant' : `Prendre · ${G.modele}`) }); });
      for (const s of (W.larg < 6 ? [0] : [-1, 1])) { const v = new THREE.Vector3(s * W.larg * 0.27, 3.0, 1.15).applyMatrix4(W.base); lueurI(I, v.x, v.y, v.z, 0xffe2b8, 16, 7); } }
    for (const c of SANS_KITS ? [-1, 1] : [-1]) fenetre(lot, T(c * 5.2, 2.0, S - 0.02, Math.PI), 4.2, 2.8, MI.vitre, { appui: false, traverse: 0 });
    porteSortie(lot, T(0, 0, S - 0.04, Math.PI));
    tapisRect(lot, 0, 0.6, 6.4, 4.2);
    { const a = dans(lot, T(1.6, 0, 0.2)); a(MI.noyer, cyl(0.19, 0.19, 0.05, 20), 0, 0.68, 0); a(MI.cuir, cyl(0.18, 0.18, 0.04, 20), 0, 0.72, 0); for (let i = 0; i < 4; i++) { const an = i * 1.571 + 0.78; a(MI.ebene, cyl(0.016, 0.02, 0.7, 8), Math.sin(an) * 0.16, 0.34, Math.cos(an) * 0.16, an, 0.14); } a(M.laiton, new THREE.TorusGeometry(0.15, 0.008, 6, 24), 0, 0.26, 0, 0, Math.PI / 2); rondI(I, 1.6, 0.2, 0.26); }
    for (const [x, z] of [[-3.2, -1.2], [3.2, -1.2], [-3.2, 2.6], [3.2, 2.6]]) { lot.add(M.laiton, cyl(0.11, 0.11, 0.03, 20), T(x, h - 0.015, z)); lot.add(M.ampoule, cyl(0.075, 0.075, 0.012, 16), T(x, h - 0.034, z)); }
    lueurI(I, 0, 3.2, 1.2, 0xffc98a, 3.5, 8);
    { const a = dans(lot, T(-6.2, 0, 3.9, 0.0)); a(MI.noyer, box(3.0, 1.0, 0.8, 0.03), 0, 0.5, 0); a(MI.chene, box(3.14, 0.06, 0.94, 0.02), 0, 1.03, 0); a(MI.ebene, box(3.0, 0.12, 0.82, 0.01), 0, 0.06, 0);
      for (const x of [-0.98, 0, 0.98]) a(mLatteS, box(0.9, 0.7, 0.02, 0.01), x, 0.52, -0.405);
      a(M.laiton, cyl(0.07, 0.09, 0.03, 16), 1.05, 1.075, 0.1); a(M.laiton, cyl(0.012, 0.012, 0.34, 8), 1.05, 1.24, 0.1); a(MI.abat, new THREE.CylinderGeometry(0.1, 0.18, 0.2, 18, 1, true), 1.05, 1.46, 0.1); haloI(I, -6.2 + 1.05, 1.46, 3.9 + 0.1, 1.3, 0.25);
      a(MI.feutre, box(0.7, 0.012, 0.45, 0.004), -0.5, 1.066, 0.0); boiteI(I, -7.72, -4.68, 3.48, 4.32); lueurI(I, -5.2, 2.2, 3.6, 0xffc98a, 4, 4.5); }
    ampli(I, lot, -7.9, -5.1, 0.55, 0.74, 0.64, 0.34); ampli(I, lot, -6.7, -5.35, 0.2, 0.5, 0.44, 0.28); ampli(I, lot, 6.2, -5.4, -0.25, 0.66, 0.58, 0.32);
    if (SANS_KITS) { I.kits = []; I.majKits = () => {}; I.construireKits = () => {}; RACCOURCIS.magasin = RACCOURCIS.magasin.filter(([n]) => n !== 'Kits'); }
    else { const KV = KITS.filter((k) => !k.cache && !k.chant), n = KV.length, pasK = 0.6, cx = 5.0, larg = n * pasK + 0.3, base = T(cx, 0, S - 0.04, Math.PI), a = dans(lot, base), yT = 1.75;
      a(mFond, box(larg, 3.0, 0.05, 0.01), 0, 1.95, 0.025);
      for (let i = 0, nb = Math.round(larg / 0.2); i < nb; i++) a(i % 2 ? mLatte : mLatteS, box(0.15, 2.9, 0.035, 0.008), -larg / 2 + 0.1 + i * (larg - 0.2) / (nb - 1), 1.95, 0.062);
      a(MI.chene, box(larg + 0.2, 0.09, 0.14, 0.02), 0, 3.48, 0.07); a(MI.chene, box(larg + 0.2, 0.09, 0.14, 0.02), 0, 0.45, 0.07);
      a(mPanneau, box(larg - 0.3, 2.0, 0.03, 0.01), 0, yT + 0.28, 0.086); for (const s2 of [-1, 1]) { a(MI.laitonDoux, box(0.014, 2.0, 0.012, 0.004), s2 * (larg - 0.3) / 2, yT + 0.28, 0.104); a(MI.laitonDoux, box(larg - 0.286, 0.014, 0.012, 0.004), 0, yT + 0.28 + s2 * 1.0, 0.104); }
      a(M.laiton, cyl(0.022, 0.022, larg - 0.4, 10), 0, 3.3, 0.36, 0, 0, Math.PI / 2); a(M.ampoule, new THREE.BoxGeometry(larg - 0.6, 0.012, 0.03), 0, 3.275, 0.36);
      for (const s2 of [-1, 1]) a(M.laiton, cyl(0.009, 0.009, 0.32, 6), s2 * (larg / 2 - 0.5), 3.3, 0.2, 0, Math.PI / 2);
      a(MI.chene, box(larg - 0.1, 0.05, 0.3, 0.015), 0, yT - 0.025, 0.24); for (let i = 0; i <= 3; i++) a(mSupport, box(0.03, 0.16, 0.24, 0.006), -larg / 2 + 0.6 + i * (larg - 1.2) / 3, yT - 0.13, 0.2);
      { relief(lot, 'Les kits', 0.4, 0, 3.74, 0.05); const m = lot.m.get(M.lettres); m[m.length - 1].applyMatrix4(base); }
      lueurSol(lot, larg - 0.6, 2.6, cx, S - 0.14, Math.PI); lueurI(I, cx, 3.2, S - 1.7, 0xffe2b8, 11, 7.5);
      I.kits = KV.map((K, i) => { const u = (i - (n - 1) / 2) * pasK, q = new THREE.Vector3(u, 0, 0).applyMatrix4(base);
        a(mSupport, cyl(0.07, 0.085, 0.03, 16), u, yT + 0.015, 0.29);
        const tex = new THREE.CanvasTexture(Object.assign(document.createElement('canvas'), { width: 512, height: 128 })); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
        const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.135), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.7 }));
        plaque.position.set(u, yT + 1.08, 0.112).applyMatrix4(base); plaque.rotation.y = Math.PI; I.groupe.add(plaque);
        const place = { K, u, tex, plaque, buste: null, x: q.x, z: S - 1.3 };
        pointI(I, 'k-' + K.id, place.x, place.z, 0.72, '', () => essayerKit(K.id)); const pt = I.points[I.points.length - 1];
        Object.defineProperty(pt, 'texte', { get: () => (kit === K.id ? `Enlever · ${K.nom}` : `Essayer · ${K.nom}`) }); return place; });
      I.baseKits = base; I.yKits = yT;
      const dessinerKit = (P) => { const c = P.tex.image, g = c.getContext('2d'), porte = kit === P.K.id; g.clearRect(0, 0, 512, 128);
        g.fillStyle = porte ? '#2a1a0c' : '#0f0b08'; g.fillRect(0, 0, 512, 128); g.strokeStyle = porte ? '#ffb454' : '#c9a961'; g.lineWidth = porte ? 7 : 4; g.strokeRect(5, 5, 502, 118);
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f3ede2'; g.font = `600 ${porte ? 52 : 62}px ${PT}`; g.fillText(P.K.nom, 256, porte ? 46 : 66, 474);
        if (porte) { g.fillStyle = '#ffb454'; g.font = `700 30px ${PC}`; g.fillText('sur toi', 256, 98); } P.tex.needsUpdate = true; P.plaque.material.emissiveIntensity = porte ? 0.85 : 0.55; };
      I.majKits = () => { for (const P of I.kits) dessinerKit(P); };
      I.construireKits = () => { const A = AVATARS.casual; if (I.kitsBatis || !A.peaux) return; I.kitsBatis = true; const E2 = 1.25, morceaux = [], q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)), ech = new THREE.Vector3(E2, E2, E2);
        const cuire = (geo, couleur, M) => { const g = geo.index ? geo.toNonIndexed() : geo.clone(); for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k); g.applyMatrix4(M);
          const n = g.attributes.position.count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { c[i * 3] = couleur.r; c[i * 3 + 1] = couleur.g; c[i * 3 + 2] = couleur.b; } g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); morceaux.push(g); };
        for (const P of I.kits) { const M = new THREE.Matrix4().compose(new THREE.Vector3(P.u, yT + 0.03 - 1.487 * E2, 0.33 - 0.05 * E2).applyMatrix4(base), q, ech);
          for (const Q of A.peaux) { if (Q.partie !== 'tete') continue; const r = P.K.matiere(Q.nom, 'tete'); if (r === 'cache') continue;
            const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(Q.repos.slice(), 3)); cuire(g, r == null ? Q.mat.color : new THREE.Color(r), M); g.dispose(); }
          for (const L of Object.values(piecesKit(P.K, ['Head', 'Neck'], true))) for (const o of L) { cuire(o.geometry, o.material.color, M); o.geometry.dispose(); }
          P.buste = true; }
        const g = mergeGeometries(morceaux, false); morceaux.forEach((x) => x.dispose()); g.computeVertexNormals();
        I.bustes = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0 })); I.groupe.add(I.bustes); };
    }
    lot.finir(I.groupe);
    pointI(I, 'sortie', 0, S - 0.7, 1.5, 'Sortir · retour au village', sortir);
    const dessinerPlaque = (P) => { const c = P.tex.image, g = c.getContext('2d'), porte = portee.id === P.G.id && dosObjet === 'guitare'; g.clearRect(0, 0, 512, 112);
      g.fillStyle = porte ? '#2a1a0c' : '#0f0b08'; g.fillRect(0, 0, 512, 112); g.strokeStyle = porte ? '#ffb454' : '#c9a961'; g.lineWidth = porte ? 6 : 4; g.strokeRect(5, 5, 502, 102);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f3ede2'; g.font = `600 ${porte ? 46 : 58}px ${PT}`; g.fillText(P.G.modele, 256, porte ? 40 : 58, 474);
      if (porte) { g.fillStyle = '#ffb454'; g.font = `700 30px ${PC}`; g.fillText('sur ton dos', 256, 85); } P.tex.needsUpdate = true;
      P.plaque.position.set(P.u, porte ? 2.06 : 0.67, porte ? 0.108 : 0.085).applyMatrix4(P.W.base); P.plaque.scale.setScalar(porte ? 1.02 : 1); P.plaque.material.emissiveIntensity = porte ? 0.8 : 0.55; P.lueur.visible = porte; };
    I.majMurs = () => { for (const P of I.places) { dessinerPlaque(P); if (P.guitare) P.guitare.visible = P.G.id !== portee.id || dosObjet === 'micro'; } };
    I.construire = () => { if (I.bati) return; I.bati = true; let tri = 0;
      for (const P of I.places) { const g = habiller(faireGuitareExacte(P.G.id, 0), false), piv = new THREE.Group(); tri += g.userData.triangles || 0;
        g.scale.multiplyScalar(1.7); g.position.set(0, 0, 0.27); g.rotation.x = -0.03; piv.add(g); piv.position.set(P.u, 1.52, 0).applyMatrix4(P.W.base); piv.rotation.y = P.W.ry; I.groupe.add(piv); P.guitare = piv; }
      I.triangles = tri; I.majMurs(); I.construireKits(); };
    I.majMurs(); I.majKits();
  }
  { const I = INT.annexe, lot = new Lot(), { l, p, h } = I, N = -p / 2, S = p / 2, O = -l / 2, E = l / 2;
    const mMur = std(0x3a2233, 0.92, { map: texPlatre }); mMur.userData.sansProjeter = true;
    const mTissu = (c) => std(c, 0.96, { emissive: c, emissiveIntensity: 0.1 });
    const SING = [-5.85, -3.9, -1.95, 0, 1.95, 3.9, 5.85], TEINTES = [0x2f6a1a, 0xc0508a, 0x2a3f8a, 0xa8721a, 0x8a1f26, 0x7a2a6a, 0x4a4a58], ECLAIRS = [0xe8ffc8, 0xffd0e8, 0xd0dcff, 0xffd28a, 0xffa89a, 0xffc0ec, 0xdde2f0];
    coque(lot, I, mMur, { sol: MI.parquetB });
    for (const [w, x, z, ry] of [[l, 0, N + 0.03, 0], [l, 0, S - 0.03, 0], [p, O + 0.03, 0, Math.PI / 2], [p, E - 0.03, 0, Math.PI / 2]]) lot.add(MI.ebene, box(w, 0.14, 0.08, 0.01), T(x, 0.07, z, ry));
    for (const x of [-4.6, 4.6]) lot.add(MI.poutre, new THREE.BoxGeometry(0.28, 0.3, p), T(x, h - 0.15, 0));
    relief(lot, 'La cabine de chant', 0.34, 0, 3.7, N + 0.1);
    SING.forEach((x, k) => { const a = dans(lot, T(x, 0, N + 0.04)); a(MI.ebene, box(2.04, 2.7, 0.06, 0.02), 0, 1.78, 0.03); a(mTissu(TEINTES[k]), box(1.9, 2.54, 0.07, 0.03), 0, 1.78, 0.045);
      for (let j = 1; j < 6; j++) a(MI.ebene, box(0.012, 2.54, 0.02, 0.004), -0.95 + j * 0.317, 1.78, 0.085); a(MI.laitonDoux, box(2.04, 0.025, 0.04, 0.006), 0, 3.14, 0.07); });
    for (const x of [-6.25, -4.2, -2.1, 0, 2.1, 4.2, 6.25]) for (let i = 0; i < 3; i++) { const a = dans(lot, T(x + (i - 1) * 0.1, 0, N + 0.04)); a(i % 2 ? MI.noyer : MI.chene, box(0.085, 2.7, [0.05, 0.09, 0.06][i], 0.01), 0, 1.78, 0.04 + [0.05, 0.09, 0.06][i] / 2); }
    for (const s of [-1, 1]) for (let i = 0; i < 22; i++) { const a = dans(lot, T(s * (E - 0.04), 0, -3.9 + i * 0.37, -s * Math.PI / 2)); const d = [0.05, 0.1, 0.07][i % 3]; a(i % 2 ? MI.noyer : MI.chene, box(0.14, 2.6, d, 0.01), 0, 1.7, 0.03 + d / 2); }
    { const a = dans(lot, T(0, 0, N + 1.7)); a(MI.noyer, box(11.8, 0.2, 3.4, 0.03), 0, 0.1, 0); a(MI.chene, box(11.8, 0.03, 3.4, 0.01), 0, 0.205, 0); a(M.laiton, box(11.82, 0.025, 0.03, 0.004), 0, 0.19, 1.71);
      SING.forEach((x, k) => a(mTissu(TEINTES[k]), cyl(0.66, 0.66, 0.03, 30), x, 0.225, 0.2)); }
    boiteI(I, -5.95, 5.95, N, N + 3.45); ombreSol(lot, 0, N + 3.6, 11.6, 0.9);
    tapisRect(lot, 0, 2.6, 9.0, 2.6);
    const ZP = -0.15;
    SING.forEach((x0, k) => { const x = x0 + 0.95, a = dans(lot, T(x, 0, ZP)); a(MI.ebene, box(0.54, 0.06, 0.54, 0.01), 0, 0.03, 0); a(MI.noyer, box(0.46, 0.82, 0.46, 0.02), 0, 0.47, 0); a(M.laiton, box(0.54, 0.03, 0.54, 0.008), 0, 0.885, 0); a(M.laiton, box(0.5, 0.012, 0.012, 0.004), 0, 0.18, 0.235);
      boiteI(I, x - 0.3, x + 0.3, ZP - 0.3, ZP + 0.3); });
    { const a = dans(lot, T(-6.55, 0, 0.9, Math.PI / 2)); a(MI.noyer, box(3.5, 0.78, 0.5, 0.02), 0, 0.42, 0); a(M.laiton, box(3.54, 0.03, 0.54, 0.008), 0, 0.825, 0); a(M.laiton, box(3.2, 0.012, 0.012, 0.004), 0, 0.2, 0.255); boiteI(I, -6.85, -6.25, -0.9, 2.7); }
    { const XB0 = 4.85, XB1 = 6.9, ZB0 = 1.0, ZB1 = 3.7, HB = 2.5, cadre = M.sombre, vit = new THREE.MeshPhysicalMaterial({ color: 0xa9c8d6, roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }); vit.userData.sansOmbre = true; vit.userData.sansProjeter = true;
      lot.add(MI.noyer, box(XB1 - XB0, 0.08, ZB1 - ZB0, 0.01), T((XB0 + XB1) / 2, 0.04, (ZB0 + ZB1) / 2)); lot.add(MI.plafond, box(XB1 - XB0, 0.08, ZB1 - ZB0, 0.01), T((XB0 + XB1) / 2, HB, (ZB0 + ZB1) / 2));
      for (const [x, z] of [[XB0, ZB0], [XB0, ZB1], [XB1, ZB0], [XB1, ZB1]]) lot.add(cadre, new THREE.BoxGeometry(0.07, HB, 0.07), T(x, HB / 2, z));
      lot.add(vit, new THREE.PlaneGeometry(ZB1 - ZB0, HB - 0.1), T(XB0, HB / 2, (ZB0 + ZB1) / 2, Math.PI / 2)); lot.add(vit, new THREE.PlaneGeometry(XB1 - XB0, HB - 0.1), T((XB0 + XB1) / 2, HB / 2, ZB0)); lot.add(vit, new THREE.PlaneGeometry(0.9, HB - 0.1), T(XB0 + 0.5, HB / 2, ZB1));
      for (const y of [0.1, HB - 0.05]) { lot.add(cadre, box(0.06, 0.06, ZB1 - ZB0), T(XB0, y, (ZB0 + ZB1) / 2)); lot.add(cadre, box(XB1 - XB0, 0.06, 0.06), T((XB0 + XB1) / 2, y, ZB0)); }
      lot.add(mTissu(0x7a3a6a), box(0.12, 2.3, ZB1 - ZB0 - 0.3, 0.02), T(XB1 - 0.08, 1.2, (ZB0 + ZB1) / 2)); for (let i = 0; i < 5; i++) lot.add(mTissu(i % 2 ? 0xe0782a : 0x1f8f8a), box(0.1, 0.4, 0.4, 0.02), T(XB1 - 0.18, 0.6 + (i % 3) * 0.5, ZB0 + 0.5 + i * 0.5));
      const mx = 6.0, mz = 2.3; lot.add(M.sombre, cyl(0.17, 0.19, 0.03, 20), T(mx, 0.095, mz)); lot.add(MI.chene, cyl(0.011, 0.011, 1.5, 8), T(mx, 0.88, mz)); lot.add(MI.chene, cyl(0.009, 0.009, 0.4, 8), T(mx - 0.06, 1.62, mz - 0.1, 0, 0.5, Math.PI / 2));
      lot.add(M.sombre, new THREE.TorusGeometry(0.095, 0.006, 6, 24), T(mx - 0.27, 1.62, mz - 0.1, Math.PI / 2)); lot.add(MI.feutre, cyl(0.093, 0.093, 0.004, 22), T(mx - 0.27, 1.62, mz - 0.1, 0, 0, Math.PI / 2));
      { const a = dans(lot, T(mx - 0.8, 0, mz + 0.3)); a(MI.noyer, cyl(0.17, 0.17, 0.05, 18), 0, 0.72, 0); a(MI.cuir, cyl(0.16, 0.16, 0.04, 18), 0, 0.76, 0); for (let i = 0; i < 4; i++) { const an = i * 1.571 + 0.78; a(MI.ebene, cyl(0.015, 0.019, 0.74, 8), Math.sin(an) * 0.14, 0.36, Math.cos(an) * 0.14, an, 0.13); } }
      lueurI(I, 5.9, 2.2, 2.3, 0xffb878, 5, 4); boiteI(I, XB0 - 0.05, XB1 + 0.05, ZB0 - 0.05, ZB1 + 0.05); }
    chaise(lot, -6.0, 2.1, 1.1); chaise(lot, -5.3, 3.5, 2.5); rondI(I, -6.0, 2.1, 0.32); rondI(I, -5.3, 3.5, 0.32);
    { const a = dans(lot, T(-5.2, 0, 2.5)); a(MI.noyer, cyl(0.3, 0.3, 0.04, 22), 0, 0.5, 0); a(MI.ebene, cyl(0.03, 0.035, 0.48, 8), 0, 0.25, 0); a(M.laiton, cyl(0.2, 0.2, 0.012, 20), 0, 0.525, 0); rondI(I, -5.2, 2.5, 0.34); }
    for (const [x, z] of [[-6.8, 0.2], [6.8, -0.9]]) { const a = dans(lot, T(x, 0, z)); a(M.bois, cyl(0.26, 0.21, 0.4, 14), 0, 0.2, 0); a(M.haie, new THREE.SphereGeometry(0.4, 14, 10), 0, 0.72, 0); a(M.haie, new THREE.SphereGeometry(0.3, 14, 10), 0.12, 1.15, 0.04); rondI(I, x, z, 0.32); }
    for (const [x, z] of [[-3.2, -0.6], [3.2, -0.6], [-3.2, 2.8], [3.2, 2.8]]) { lot.add(M.laiton, cyl(0.11, 0.11, 0.03, 20), T(x, h - 0.015, z)); lot.add(M.ampoule, cyl(0.075, 0.075, 0.012, 16), T(x, h - 0.034, z)); }
    for (const c of [-1, 1]) fenetre(lot, T(c * 4.8, 2.0, S - 0.02, Math.PI), 3.4, 2.7, MI.vitre, { appui: false, traverse: 0 });
    porteSortie(lot, T(0, 0, S - 0.04, Math.PI));
    lot.finir(I.groupe);
    pointI(I, 'sortie', 0, S - 0.7, 1.5, 'Sortir · retour au village', sortir);
    [-4.2, 0, 4.2].forEach((x, k) => projecteur(I, x, h - 0.25, N + 3.5, x, 1.0, N + 1.9, [0xfff0d0, 0xffe0c0, 0xffd8d0][k], 55, 0.72, 0.85, 9));
    lueurI(I, -3.4, 3.0, 1.4, 0xffc98a, 11, 9); lueurI(I, 3.4, 3.0, 1.4, 0xffc98a, 11, 9);
    const plaqueTexte = (t1, t2, acc, w, hh) => { const c = Object.assign(document.createElement('canvas'), { width: 512, height: Math.round(512 * hh / w) }), g2 = c.getContext('2d'), W = c.width, H = c.height;
      g2.fillStyle = '#0f0b08'; g2.fillRect(0, 0, W, H); g2.strokeStyle = acc; g2.lineWidth = 5; g2.strokeRect(5, 5, W - 10, H - 10); g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillStyle = '#f3ede2'; g2.font = `600 ${Math.round(H * 0.3)}px ${PT}`; g2.fillText(t1, W / 2, H * 0.36, W - 40);
      g2.fillStyle = acc; g2.font = `700 ${Math.round(H * 0.19)}px ${PC}`; g2.fillText(t2, W / 2, H * 0.73, W - 40); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      return new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.7 })); };
    I.construire = () => { if (I.bati) return; I.bati = true; const tout = new THREE.Group(); I.groupe.add(tout);
      const KC = KITS.filter((q) => q.chant);
      KC.forEach((K, k) => { const x = SING[k], f = faireChanteurKit(K, 0.5 + k * 0.31); f.position.set(x, 0.24, N + 1.9); f.rotation.y = x < -0.1 ? 0.14 : x > 0.1 ? -0.14 : 0; f.scale.setScalar(0.98); tout.add(f);
        const pl = plaqueTexte(K.nom, 'tenue clin d’œil · micro en main', MICROS_CHANT[k].couleur, 1.5, 0.2); pl.position.set(x, 0.1, N + 3.42); tout.add(pl);
        const mc = faireMicroSurPied(MICROS_CHANT[k].id, 0.22); mc.position.set(x + 0.95, 0.9, ZP); tout.add(mc);
        const pm = plaqueTexte(MICROS_CHANT[k].nom, MICROS_CHANT[k].sous, MICROS_CHANT[k].couleur, 0.5, 0.2); pm.position.set(x + 0.95, 0.58, ZP + 0.235); tout.add(pm);
        pointI(I, 'k-' + K.id, x, N + 3.8, 0.9, '', () => essayerKit(K.id)); const pt = I.points[I.points.length - 1]; Object.defineProperty(pt, 'texte', { get: () => (kit === K.id ? `Enlever · ${K.nom}` : `Essayer · ${K.nom}`) });
        haloI(I, x + 0.95, 1.25, ZP + 0.1, 0.9, 0.16); });
      MICROS.forEach((Mi, k) => { const z = -0.1 + k * 0.7, mc = faireMicroSurPied(Mi.id, 0.22); mc.position.set(-6.55, 0.84, z); mc.scale.setScalar(1.0); mc.rotation.y = Math.PI / 2; tout.add(mc);
        const pm = plaqueTexte(Mi.nom, Mi.sous, Mi.couleur, 0.62, 0.2); pm.position.set(-6.28, 0.7, z); pm.rotation.y = Math.PI / 2; pm.scale.setScalar(0.8); tout.add(pm); });
    };
    I.respire = [];
  }
  { const I = INT.chant, lot = new Lot(), { l, p, h } = I, N = -p / 2, S = p / 2, O = -l / 2, E = l / 2;
    const mMur = std(0x58405a, 0.93, { map: texPlatre }); mMur.userData.sansProjeter = true;
    const mTissu = (c) => std(c, 0.96, { emissive: c, emissiveIntensity: 0.1 }), mMousse = std(0x23202b, 1), mMousse2 = std(0x3a3447, 1), mPrune = std(0xa8326a, 0.7, { emissive: 0x5a1236, emissiveIntensity: 0.45 });
    const texMiroir = toile(512, 512, (g, W, H) => { const d = g.createLinearGradient(0, 0, 0, H); d.addColorStop(0, '#e6eef6'); d.addColorStop(0.55, '#b9c9d8'); d.addColorStop(1, '#7f94a8'); g.fillStyle = d; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.moveTo(40, 0); g.lineTo(140, 0); g.lineTo(60, H); g.lineTo(-40, H); g.fill(); g.beginPath(); g.moveTo(300, 0); g.lineTo(350, 0); g.lineTo(270, H); g.lineTo(220, H); g.fill();
      g.fillStyle = 'rgba(70,40,30,.22)'; g.fillRect(0, H * 0.78, W, H * 0.22); g.fillStyle = 'rgba(255,190,110,.16)'; g.beginPath(); g.arc(W * 0.7, H * 0.24, 70, 0, 7); g.fill(); });
    const mMiroir = new THREE.MeshStandardMaterial({ map: texMiroir, emissiveMap: texMiroir, emissive: 0xffffff, emissiveIntensity: 0.42, roughness: 0.08, metalness: 0.0 }); mMiroir.userData.sansProjeter = true;
    coque(lot, I, mMur, { sol: MI.parquetB });
    for (const [w, x, z, ry] of [[l, 0, N + 0.03, 0], [l, 0, S - 0.03, 0], [p, O + 0.03, 0, Math.PI / 2], [p, E - 0.03, 0, Math.PI / 2]]) { lot.add(MI.ebene, box(w, 0.14, 0.08, 0.01), T(x, 0.07, z, ry)); lot.add(mPrune, box(w, 0.05, 0.05, 0.01), T(x, 1.0, z, ry)); }
    for (const x of [-5.4, 0, 5.4]) lot.add(MI.poutre, new THREE.BoxGeometry(0.28, 0.3, p), T(x, h - 0.15, 0));
    relief(lot, 'L’école de chant', 0.32, -3.2, 3.55, N + 0.1);
    for (let i = 0; i < 4; i++) { const z = -3.9 + i * 2.6, a = dans(lot, T(O + 0.05, 0, z, Math.PI / 2)); a(MI.ebene, box(2.5, 2.7, 0.05, 0.015), 0, 1.65, 0.0); a(mMiroir, new THREE.PlaneGeometry(2.36, 2.56), 0, 1.65, 0.03); }
    lot.add(M.laiton, cyl(0.025, 0.025, 10.2, 10), T(O + 0.42, 1.05, 0, 0, Math.PI / 2)); for (let i = 0; i < 6; i++) lot.add(M.laiton, cyl(0.014, 0.014, 0.38, 8), T(O + 0.23, 1.05, -4.5 + i * 1.8, 0, 0, Math.PI / 2));
    const mousse = (base, cols, rangs) => { const a = dans(lot, base), c = 0.3; a(MI.noyer, box(cols * c + 0.08, rangs * c + 0.08, 0.04), 0, 0, 0.02);
      for (let i = 0; i < cols; i++) for (let j = 0; j < rangs; j++) { const haut = (i + j) % 2; a(haut ? mMousse2 : mMousse, box(c - 0.02, c - 0.02, haut ? 0.11 : 0.06), (i - (cols - 1) / 2) * c, (j - (rangs - 1) / 2) * c, haut ? 0.095 : 0.07); } };
    for (const z of [-3.3, 0.2, 3.5]) mousse(T(E - 0.04, 2.5, z, -Math.PI / 2), 5, 5);
    for (const x of [-6.2, -3.4, -0.6]) mousse(T(x, 2.55, N + 0.04), 5, 5);
    for (let i = 0; i < 12; i++) { const d = [0.07, 0.13, 0.09][i % 3]; lot.add(i % 2 ? MI.noyer : MI.chene, box(0.09, d, 3.6, 0.01), T(-1.2 + i * 0.22, h - 0.35 - d / 2, 0.8)); }
    { const a = dans(lot, T(5.0, 0, N + 0.45)); a(MI.ebene, box(1.6, 1.28, 0.62, 0.03), 0, 0.68, 0); a(MI.noyer, box(1.66, 0.05, 0.66, 0.015), 0, 1.34, 0); a(MI.ebene, box(1.32, 0.07, 0.3, 0.01), 0, 0.78, 0.4); a(MI.noyer, box(0.06, 0.74, 0.4, 0.01), -0.7, 0.4, 0.28); a(MI.noyer, box(0.06, 0.74, 0.4, 0.01), 0.7, 0.4, 0.28);
      for (const s of [-1, 1]) a(M.laiton, cyl(0.026, 0.026, 0.05, 10), s * 0.52, 0.1, 0.47); a(M.laiton, cyl(0.014, 0.014, 0.5, 8), 0, 0.25, 0.64, 0, Math.PI / 2, 0);
      const cles = toile(512, 64, (g, W, H) => { g.fillStyle = '#f3efe4'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.5; for (let i = 0; i <= 29; i++) { g.beginPath(); g.moveTo(i * W / 29, 0); g.lineTo(i * W / 29, H); g.stroke(); }
        g.fillStyle = '#16161a'; for (let i = 0; i < 28; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) g.fillRect((i + 0.68) * W / 29, 0, W / 29 * 0.62, H * 0.6); });
      a(std(0xffffff, 0.5, { map: cles }), new THREE.PlaneGeometry(1.26, 0.22), 0, 0.8 + 0.001, 0.4, 0, -Math.PI / 2);
      a(MI.papier, box(0.7, 0.4, 0.015, 0.005), 0, 1.15, 0.32, 0, -0.22); a(M.sombre, box(0.74, 0.03, 0.05, 0.005), 0, 0.97, 0.36, 0, -0.22);
      const t = dans(lot, T(5.0, 0, N + 1.45)); t(MI.noyer, cyl(0.19, 0.19, 0.05, 18), 0, 0.5, 0); t(MI.cuir, cyl(0.17, 0.17, 0.04, 18), 0, 0.545, 0); for (let i = 0; i < 4; i++) { const an = i * 1.571 + 0.78; t(MI.ebene, cyl(0.015, 0.019, 0.5, 8), Math.sin(an) * 0.14, 0.25, Math.cos(an) * 0.14, an, 0.13); }
      boiteI(I, 5.0 - 0.85, 5.0 + 0.85, N, N + 0.95); rondI(I, 5.0, N + 1.45, 0.26); }
    tapisRect(lot, 4.0, N + 2.6, 4.6, 2.9);
    { const a = dans(lot, T(2.4, 0, N + 0.04)); a(MI.ebene, box(2.7, 1.6, 0.05, 0.02), 0, 2.2, 0.025); const ard = toile(512, 256, (g, W, H) => { g.fillStyle = '#16201c'; g.fillRect(0, 0, W, H); g.fillStyle = '#f3ede2'; g.textAlign = 'center'; g.font = `700 64px ${PT}`; g.fillText('Échauffement', W / 2, 86);
        g.fillStyle = '#ffb454'; g.font = `700 44px ${PC}`; g.fillText('Respire · Ouvre · Chante', W / 2, 150); g.fillStyle = '#f3ede2'; g.font = `600 44px ${PT}`; g.fillText('do  ré  mi  fa  sol', W / 2, 214); });
      a(std(0xffffff, 0.8, { map: ard, emissiveMap: ard, emissive: 0xffffff, emissiveIntensity: 0.4 }), new THREE.PlaneGeometry(2.58, 1.48), 0, 2.2, 0.054); }
    { const XB0 = 4.7, XB1 = 7.2, ZB0 = 1.0, ZB1 = 3.9, HB = 2.5, cadre = M.sombre, vit = new THREE.MeshPhysicalMaterial({ color: 0xa9c8d6, roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }); vit.userData.sansOmbre = true; vit.userData.sansProjeter = true;
      lot.add(MI.noyer, box(XB1 - XB0, 0.08, ZB1 - ZB0, 0.01), T((XB0 + XB1) / 2, 0.04, (ZB0 + ZB1) / 2)); lot.add(MI.plafond, box(XB1 - XB0, 0.08, ZB1 - ZB0, 0.01), T((XB0 + XB1) / 2, HB, (ZB0 + ZB1) / 2));
      for (const [x, z] of [[XB0, ZB0], [XB0, ZB1], [XB1, ZB0], [XB1, ZB1]]) lot.add(cadre, new THREE.BoxGeometry(0.07, HB, 0.07), T(x, HB / 2, z));
      lot.add(vit, new THREE.PlaneGeometry(ZB1 - ZB0, HB - 0.1), T(XB0, HB / 2, (ZB0 + ZB1) / 2, Math.PI / 2)); lot.add(vit, new THREE.PlaneGeometry(XB1 - XB0, HB - 0.1), T((XB0 + XB1) / 2, HB / 2, ZB0)); lot.add(vit, new THREE.PlaneGeometry(1.2, HB - 0.1), T(XB0 + 0.65, HB / 2, ZB1));
      for (const y of [0.1, HB - 0.05]) { lot.add(cadre, box(0.06, 0.06, ZB1 - ZB0), T(XB0, y, (ZB0 + ZB1) / 2)); lot.add(cadre, box(XB1 - XB0, 0.06, 0.06), T((XB0 + XB1) / 2, y, ZB0)); }
      lot.add(mTissu(0x7a3a6a), box(0.12, 2.3, ZB1 - ZB0 - 0.3, 0.02), T(XB1 - 0.08, 1.2, (ZB0 + ZB1) / 2)); for (let i = 0; i < 5; i++) lot.add(mTissu(i % 2 ? 0xe0782a : 0x1f8f8a), box(0.1, 0.4, 0.4, 0.02), T(XB1 - 0.18, 0.6 + (i % 3) * 0.5, ZB0 + 0.45 + i * 0.52));
      const mx = 6.2, mz = 2.4; lot.add(M.sombre, cyl(0.17, 0.19, 0.03, 20), T(mx, 0.095, mz)); lot.add(MI.chene, cyl(0.011, 0.011, 1.5, 8), T(mx, 0.88, mz)); lot.add(MI.chene, cyl(0.009, 0.009, 0.4, 8), T(mx - 0.06, 1.62, mz - 0.1, 0, 0.5, Math.PI / 2));
      lot.add(M.sombre, new THREE.TorusGeometry(0.095, 0.006, 6, 24), T(mx - 0.27, 1.62, mz - 0.1, Math.PI / 2)); lot.add(MI.feutre, cyl(0.093, 0.093, 0.004, 22), T(mx - 0.27, 1.62, mz - 0.1, 0, 0, Math.PI / 2));
      { const a = dans(lot, T(mx - 0.9, 0, mz + 0.35)); a(MI.noyer, cyl(0.17, 0.17, 0.05, 18), 0, 0.72, 0); a(MI.cuir, cyl(0.16, 0.16, 0.04, 18), 0, 0.76, 0); for (let i = 0; i < 4; i++) { const an = i * 1.571 + 0.78; a(MI.ebene, cyl(0.015, 0.019, 0.74, 8), Math.sin(an) * 0.14, 0.36, Math.cos(an) * 0.14, an, 0.13); } }
      lueurI(I, 6.0, 2.2, 2.4, 0xffb878, 5, 4); boiteI(I, XB0 - 0.05, XB1 + 0.05, ZB0 - 0.05, ZB1 + 0.05); }
    const T0 = [3.2, -3.0];
    for (let k = 0; k < 5; k++) { const an = (105 + k * 23) * Math.PI / 180, x = T0[0] + 2.9 * Math.cos(an), z = T0[1] + 2.9 * Math.sin(an), a = dans(lot, T(x, 0, z, Math.atan2(T0[0] - x, T0[1] - z)));
      a(M.sombre, cyl(0.17, 0.19, 0.03, 20), 0, 0.015, 0); a(M.laiton, cyl(0.011, 0.011, 1.45, 8), 0, 0.76, 0); a(M.sombre, cyl(0.028, 0.028, 0.05, 12), 0, 1.5, 0); rondI(I, x, z, 0.3); }
    { const a = dans(lot, T(T0[0], 0, T0[1])); a(M.sombre, cyl(0.2, 0.22, 0.035, 20), 0, 0.018, 0); a(M.laiton, cyl(0.012, 0.012, 1.6, 8), 0, 0.82, 0); a(M.sombre, cyl(0.03, 0.03, 0.05, 12), 0, 1.62, 0); rondI(I, T0[0], T0[1], 0.32); }
    { const a = dans(lot, T(-5.2, 0, 4.7)); a(MI.noyer, box(2.2, 0.06, 0.46, 0.02), 0, 0.46, 0); a(MI.tissuB, box(2.1, 0.07, 0.4, 0.02), 0, 0.52, 0); for (const s of [-1, 1]) a(MI.ebene, box(0.06, 0.45, 0.4, 0.01), s * 1.0, 0.22, 0); boiteI(I, -6.4, -4.0, 4.4, 5.05); }
    for (const [x, z] of [[-3.2, 4.9], [6.9, 4.9]]) { const a = dans(lot, T(x, 0, z)); a(M.bois, cyl(0.26, 0.21, 0.4, 14), 0, 0.2, 0); a(M.haie, new THREE.SphereGeometry(0.4, 14, 10), 0, 0.72, 0); a(M.haie, new THREE.SphereGeometry(0.3, 14, 10), 0.12, 1.15, 0.04); rondI(I, x, z, 0.32); }
    tapisRect(lot, -0.5, 0.6, 6.0, 4.4); ombreSol(lot, 5.0, N + 0.9, 2.0, 1.2); ombreSol(lot, 6.0, 2.4, 2.8, 3.2);
    for (const [x, z] of [[-4.2, -1.8], [-0.5, 1.8], [3.0, 1.4], [-2.2, 4.0]]) suspension(I, lot, x, 3.15, z, h, 1.0);
    for (const c of [-1, 1]) fenetre(lot, T(c * 4.8, 2.0, S - 0.02, Math.PI), 3.4, 2.7, MI.vitre, { appui: false, traverse: 0 });
    porteSortie(lot, T(0, 0, S - 0.04, Math.PI));
    lot.finir(I.groupe);
    pointI(I, 'sortie', 0, S - 0.7, 1.5, 'Sortir · retour au village', sortir);
    lueurI(I, -2.0, 3.0, -0.5, 0xffc98a, 11, 11); lueurI(I, 3.4, 3.0, -2.5, 0xffd9a8, 9, 9);
    const plaqueI = (t1, t2, acc, w, hh) => { const c = Object.assign(document.createElement('canvas'), { width: 512, height: Math.round(512 * hh / w) }), g2 = c.getContext('2d'), W = c.width, H = c.height;
      g2.fillStyle = '#0f0b08'; g2.fillRect(0, 0, W, H); g2.strokeStyle = acc; g2.lineWidth = 5; g2.strokeRect(5, 5, W - 10, H - 10); g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillStyle = '#f3ede2'; g2.font = `600 ${Math.round(H * 0.34)}px ${PT}`; g2.fillText(t1, W / 2, H * 0.4, W - 40);
      g2.fillStyle = acc; g2.font = `700 ${Math.round(H * 0.2)}px ${PC}`; g2.fillText(t2, W / 2, H * 0.74, W - 40); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      return new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.7 })); };
    I.construire = () => { if (I.bati) return; I.bati = true; const tout = new THREE.Group(); I.groupe.add(tout); const TYPES = ['boule', 'noir', 'chrome', 'ruban', 'boule'];
      for (let k = 0; k < 5; k++) { const an = (105 + k * 23) * Math.PI / 180, x = T0[0] + 2.9 * Math.cos(an), z = T0[1] + 2.9 * Math.sin(an), mc = faireMicro(TYPES[k]); mc.position.set(x, 1.5, z); mc.rotation.set(0.9, Math.atan2(x - T0[0], z - T0[1]), 0, 'YXZ'); mc.scale.setScalar(1.25); tout.add(mc); }
      const mp = faireMicro('chrome'); mp.position.set(T0[0], 1.62, T0[1]); mp.rotation.set(0.5, -2.2, 0, 'YXZ'); mp.scale.setScalar(1.25); tout.add(mp);
      haloI(I, T0[0], 1.8, T0[1], 1.2, 0.16); };
    I.respire = [];
  }
  tic('avant cinéma');
  { const I = INT.cinema, lot = new Lot(), { l, p, h } = I, N = -p / 2, S = p / 2, O = -l / 2, E = l / 2;
    const PAL = [[-0.2, 0.2], [1.6, 0.4], [3.4, 0.6]];
    I.sol = (x, z) => { let y = 0; for (const [z0, y0] of PAL) if (z >= z0) y = y0; return y; };
    const HALL = 0.6, mMur = std(0x1f1614, 0.95, { map: texPlatre }), mTapis = std(0x2b1619, 0.97), mAllee = std(0x5a1b1e, 0.95), mVelours = std(0x4c1519, 0.93, { side: THREE.DoubleSide }), mSiege = std(0x74241f, 0.9), mCadreEcran = std(0x0c0c10, 0.9);
    const mAbat = MI.abat.clone(), mVeille = new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffa550, emissiveIntensity: 0.9, roughness: 0.5 }), mEncastre = new THREE.MeshStandardMaterial({ color: 0xffe2b8, emissive: 0xffe2b8, emissiveIntensity: 0.5, roughness: 0.5 });
    for (const m of [mAbat, mVeille, mEncastre]) m.userData.sansOmbre = true; mMur.userData.sansProjeter = true; mVelours.userData.sansProjeter = true;
    coque(lot, I, mMur, { sol: mTapis });
    PAL.forEach(([z0, y0]) => { mur(lot, mTapis, l, 0.2, S - z0, 0, y0 - 0.1, (S + z0) / 2); lot.add(MI.laitonDoux, new THREE.BoxGeometry(l - 0.5, 0.02, 0.035), T(0, y0 + 0.006, z0 + 0.02));
      for (const s of [-1, 1]) lot.add(mVeille, new THREE.BoxGeometry(0.16, 0.05, 0.02), T(s * 1.12, y0 - 0.1, z0 - 0.012)); });
    for (const [z0, z1, y0] of [[-8.1, -0.2, 0], [-0.2, 1.6, 0.2], [1.6, 3.4, 0.4], [3.4, S - 0.5, 0.6]]) { lot.add(mAllee, new THREE.BoxGeometry(1.9, 0.016, z1 - z0), T(0, y0 + 0.009, (z0 + z1) / 2));
      for (const s of [-1, 1]) lot.add(MI.laitonDoux, new THREE.BoxGeometry(0.03, 0.018, z1 - z0), T(s * 0.95, y0 + 0.01, (z0 + z1) / 2)); }
    const EW = 8.0, EH = 4.5, EY = 3.6, EZ = N + 0.26;
    lot.add(MI.ebene, box(10.4, 0.36, 1.5, 0.03), T(0, 0.18, N + 0.85)); lot.add(MI.laitonDoux, new THREE.BoxGeometry(10.4, 0.02, 0.03), T(0, 0.365, N + 1.6)); boiteI(I, -5.25, 5.25, N, N + 1.65);
    lot.add(mCadreEcran, new THREE.BoxGeometry(EW + 0.5, EH + 0.5, 0.1), T(0, EY, EZ - 0.07));
    const matFilet = new THREE.LineBasicMaterial({ color: 0xc9a961, transparent: true, opacity: 1, toneMapped: false }), filet = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => new THREE.Vector3(a * (EW / 2 + 0.02), EY + b * (EH / 2 + 0.02), EZ + 0.012))), matFilet); I.groupe.add(filet);
    for (const z of [-6.3, 0, 6.3]) { for (const s of [-1, 1]) { lot.add(MI.laitonDoux, new THREE.BoxGeometry(10.4, 0.02, 0.04), T(0, h - 0.012, z + s * 2.6)); lot.add(MI.laitonDoux, new THREE.BoxGeometry(0.04, 0.02, 5.2), T(s * 5.2, h - 0.012, z)); } }
    for (const [x, z] of [[-3, -3.15], [3, -3.15], [-3, 3.15], [3, 3.15]]) { lot.add(MI.laitonDoux, cyl(0.17, 0.17, 0.02, 24), T(x, h - 0.012, z)); lot.add(mEncastre, cyl(0.12, 0.12, 0.012, 20), T(x, h - 0.026, z)); }
    const matEcran = new THREE.MeshBasicMaterial({ color: 0x080b12 }), ecran = new THREE.Mesh(new THREE.PlaneGeometry(EW, EH), matEcran); ecran.position.set(0, EY, EZ); I.groupe.add(ecran);
    const matVideo = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), planVideo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), matVideo); planVideo.position.set(0, EY, EZ + 0.01); planVideo.visible = false; planVideo.layers.set(1); I.groupe.add(planVideo);
    I.ecran = { w: EW, h: EH, x: 0, y: EY, z: EZ };
    const rideau = (larg, haut) => { const n = Math.max(8, Math.round(larg / 0.07)), g = new THREE.PlaneGeometry(larg, haut, n, 1), q = g.attributes.position;
      for (let i = 0; i < q.count; i++) { const x = q.getX(i); q.setZ(i, 0.085 * Math.sin(x * 11.5) + 0.03 * Math.sin(x * 29 + 1)); } g.computeVertexNormals(); return g; };
    for (const s of [-1, 1]) { lot.add(mVelours, rideau(2.55, 5.75), T(s * 5.6, 0.36 + 5.75 / 2, N + 0.34)); lot.add(mVelours, rideau(14.3, 5.5), T(s * (E - 0.2), 0.2 + 5.5 / 2, -1.75, -s * Math.PI / 2)); }
    lot.add(mVelours, rideau(l - 0.3, 0.45), T(0, h - 0.225, N + 0.46));
    for (const s of [-1, 1]) lot.add(MI.laitonDoux, cyl(0.025, 0.025, 14.4, 10), T(s * (E - 0.24), 5.76, -1.75, 0, Math.PI / 2));
    I.lumieres = []; I.halos = [];
    const eclairer = (x, y, z, couleur, force, portee) => { const L2 = lueurI(I, x, y, z, couleur, force, portee); I.lumieres.push([L2, force]); return L2; };
    const haloC = (x, y, z, taille, op) => { const hh = halo(0xffa95c, taille, op); hh.position.set(x, y, z); I.groupe.add(hh); I.halos.push([hh, op]); };
    for (const s of [-1, 1]) for (const z of [-5.4, -0.9, 3.9]) { const y0 = I.sol(0, z), x = s * (E - 0.34), a = dans(lot, T(x, y0, z, -s * Math.PI / 2));
      a(MI.noyer, box(0.46, 3.3, 0.12, 0.02), 0, 1.65, 0); a(MI.ebene, box(0.52, 0.14, 0.15, 0.01), 0, 0.07, 0); a(MI.laitonDoux, box(0.5, 0.03, 0.14, 0.008), 0, 3.3, 0);
      a(M.laiton, cyl(0.055, 0.055, 0.02, 18), 0, 2.2, 0.07, 0, Math.PI / 2); a(M.laiton, cyl(0.01, 0.01, 0.16, 8), 0, 2.2, 0.15, 0, Math.PI / 2); a(M.laiton, cyl(0.01, 0.01, 0.1, 8), 0, 2.24, 0.22);
      a(mAbat, new THREE.CylinderGeometry(0.07, 0.085, 0.2, 20, 1, true), 0, 2.37, 0.22);
      haloC(x - s * 0.22, y0 + 2.37, z, 0.9, 0.16); eclairer(x - s * 0.55, y0 + 2.2, z, 0xffb070, 3.4, 5.6); }
    const fauteuil = (x, y0, z) => { const a = dans(lot, T(x, y0, z));
      a(MI.ebene, new THREE.BoxGeometry(0.46, 0.34, 0.4), 0, 0.17, 0.02); a(mSiege, box(0.5, 0.13, 0.5, 0.045), 0, 0.42, -0.02, 0, 0.06);
      a(mSiege, box(0.5, 0.7, 0.13, 0.05), 0, 0.84, 0.27, 0, 0.16); a(MI.ebene, new THREE.BoxGeometry(0.5, 0.5, 0.03), 0, 0.72, 0.345, 0, 0.16);
      for (const s of [-1, 1]) { a(MI.noyer, box(0.07, 0.05, 0.44, 0.015), s * 0.3, 0.62, 0.0); a(MI.ebene, new THREE.BoxGeometry(0.05, 0.6, 0.1), s * 0.3, 0.3, 0.12); } };
    I.rangees = [];
    for (let k = 0; k < 4; k++) { const z = -1.3 + k * 1.8, y0 = I.sol(0, z); I.rangees.push({ z, y: y0 });
      for (const s of [-1, 1]) { for (let i = 0; i < 4; i++) fauteuil(s * (1.56 + i * 0.62), y0, z); boiteI(I, Math.min(s * 1.24, s * 3.74), Math.max(s * 1.24, s * 3.74), z - 0.34, z + 0.42); } }
    for (const s of [-1, 1]) { const a = dans(lot, T(s * 4.2, HALL, 5.6)); a(MI.noyer, box(5.5, 1.05, 0.2, 0.02), 0, 0.525, 0); a(MI.chene, box(5.6, 0.05, 0.28, 0.015), 0, 1.075, 0);
      a(MI.laitonDoux, cyl(0.02, 0.02, 5.4, 10), 0, 1.22, 0, 0, 0, Math.PI / 2); for (const u of [-2.6, 0, 2.6]) a(MI.laitonDoux, cyl(0.012, 0.012, 0.14, 8), u, 1.15, 0);
      boiteI(I, Math.min(s * 1.42, s * 7), Math.max(s * 1.42, s * 7), 5.44, 5.76); }
    { const a = dans(lot, T(-4.3, HALL, 8.3)); a(MI.noyer, box(2.8, 1.0, 0.8, 0.03), 0, 0.5, 0); a(MI.chene, box(2.94, 0.06, 0.94, 0.02), 0, 1.03, 0); a(MI.ebene, box(2.8, 0.12, 0.82, 0.01), 0, 0.06, 0);
      for (const x of [-0.9, 0, 0.9]) a(MI.ebene, box(0.8, 0.66, 0.02, 0.01), x, 0.52, -0.405);
      a(M.laiton, cyl(0.07, 0.09, 0.03, 16), -0.95, 1.075, 0.05); a(M.laiton, cyl(0.012, 0.012, 0.34, 8), -0.95, 1.24, 0.05); a(mAbat, new THREE.CylinderGeometry(0.1, 0.18, 0.2, 18, 1, true), -0.95, 1.46, 0.05);
      haloC(-4.3 - 0.95, HALL + 1.46, 8.35, 1.2, 0.2); boiteI(I, -5.76, -2.84, 7.86, 8.74); }
    { const a = dans(lot, T(4.6, HALL, 8.7)); a(MI.noyer, box(2.4, 0.4, 0.6, 0.03), 0, 0.2, 0); a(mSiege, box(2.34, 0.12, 0.56, 0.05), 0, 0.45, 0); boiteI(I, 3.36, 5.84, 8.36, 9.04); }
    I.affiches = [];
    for (const s2 of [-1, 1]) { const a = dans(lot, T(s2 * 3.4, HALL, S - 0.03, Math.PI)); a(MI.laitonDoux, box(1.3, 1.9, 0.05, 0.015), 0, 2.0, 0.02);
      const mF = matAffiche(0.5), pl = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 1.76), mF); pl.applyMatrix4(T(s2 * 3.4, HALL, S - 0.03, Math.PI).multiply(T(0, 2.0, 0.062))); I.groupe.add(pl); I.affiches.push(mF.map); }
    porteSortie(lot, T(0, HALL, S - 0.04, Math.PI), 'Sortie', I.groupe);
    lot.finir(I.groupe);
    eclairer(0, HALL + 2.7, 8.0, 0xffc98a, 8, 7.5); eclairer(0, 2.6, N + 3.0, 0xffc98a, 7, 9.5); for (const s of [-1, 1]) eclairer(s * 5.5, 1.3, N + 1.9, 0xffb070, 3, 5);
    const lueurEcran = lueurI(I, 0, EY - 0.4, N + 2.6, 0xbcd0ff, 0, 11);
    const TROIS = !PUBLIC || window.__village.spectacles === true, POINTS_PORTES = TROIS ? [['youtube', -3.05], ['cours', 0], ['spectacles', 3.05]] : [['youtube', -1.75], ['cours', 1.25]], xPorte = Object.fromEntries(POINTS_PORTES);
    RACCOURCIS.cinema = ['cours', 'youtube', 'spectacles'].filter((id) => id in xPorte).map((id) => [PORTES[id].nom, { x: xPorte[id], z: -7.0, ry: Math.PI, lacet: 0, apres: () => window.__cinema && window.__cinema.ouvrir(id) }]);
    const cadrePortrait = (recul, haut) => { const q = joueur.position, asp = innerWidth / innerHeight, camZ = Math.min(q.z - I.o[1] + recul, S + 3.6), d = Math.max(3, camZ - EZ), th = (EW / 0.88) / (2 * d);
      const v = Math.max(38, Math.min(74, 2 * Math.atan(th / asp) * 180 / Math.PI)), vr = v * Math.PI / 180, camY = q.y - Y0 + haut, a = Math.atan2(EY - camY, d), f = Math.atan2(haut, recul);
      return { recul, haut, fov: v, pente: Math.max(-(a - 0.1 * vr), f - 0.47 * vr) }; };
    Object.defineProperty(I, 'portrait', { get: () => cadrePortrait(5.9, 2.2) });
    const gPortes = new THREE.Group(), lotP = new Lot(); I.portes = gPortes;
    { const texLueur = toile(64, 256, (g, L2, H2) => { const d = g.createLinearGradient(0, H2, 0, 0); d.addColorStop(0, '#fff3d6'); d.addColorStop(0.3, '#ffb454'); d.addColorStop(0.75, '#8a4312'); d.addColorStop(1, '#2a1206'); g.fillStyle = d; g.fillRect(0, 0, L2, H2); });
      const bx = (w2, h2, d2) => new THREE.BoxGeometry(w2, h2, d2);
      const porteC = (id, x, w, ht, force, taille) => { const a = dans(lotP, T(x, 0.36, N + 0.9)), mL = new THREE.MeshBasicMaterial({ map: texLueur, color: new THREE.Color().setScalar(Math.min(1, force)) });
        for (const s2 of [-1, 1]) { a(MI.noyer, bx(0.2, ht + 0.2, 0.34), s2 * (w / 2 + 0.1), (ht + 0.2) / 2, 0); a(MI.laitonDoux, bx(0.022, ht, 0.02), s2 * (w / 2 - 0.011), ht / 2, 0.18); }
        a(MI.noyer, bx(w + 0.56, 0.2, 0.4), 0, ht + 0.1, 0); a(MI.laitonDoux, bx(w + 0.6, 0.03, 0.42), 0, ht + 0.215, 0); a(MI.laitonDoux, bx(w, 0.022, 0.02), 0, ht - 0.011, 0.18);
        a(MI.ebene, bx(w + 0.4, 0.04, 0.5), 0, 0.02, 0.06); a(mL, new THREE.PlaneGeometry(w, ht), 0, ht / 2, 0.02);
        { const g = new TextGeometry(PORTES[id].nom, { font: police, size: taille, height: taille * 0.12, curveSegments: 3, bevelEnabled: false }); g.computeBoundingBox(); g.translate(-(g.boundingBox.max.x + g.boundingBox.min.x) / 2, 0, 0); lotP.add(M.lettres, g, T(x, 0.36 + ht + 0.38, N + 0.98)); }
        if (force > 1) { const hh = halo(0xffa95c, w * 1.5, 0.22); hh.position.set(x, 0.36 + ht * 0.45, N + 1.3); gPortes.add(hh); I.halos.push([hh, 0.22]); } };
      porteC('youtube', xPorte.youtube, 1.5, 2.35, 0.7, 0.25); porteC('cours', xPorte.cours, 2.3, 3.0, 1.25, 0.36); if (TROIS) porteC('spectacles', xPorte.spectacles, 1.5, 2.35, 0.7, 0.25);
      lotP.finir(gPortes); I.groupe.add(gPortes); }
    const cadrePortes = { get: () => (innerWidth / innerHeight < 0.75 ? cadrePortrait(9.6, 3.3) : { recul: 6.2, haut: 2.9, fov: 60, pente: -0.02 }) };
    for (const [id, x] of POINTS_PORTES) { pointI(I, 'porte-' + id, x, N + 3.0, 1.9, 'Entrer · ' + PORTES[id].nom, () => window.__cinema && window.__cinema.ouvrir(id)); Object.defineProperty(I.points[I.points.length - 1], 'cadre', cadrePortes); }
    pointI(I, 'sortie', 0, S - 0.7, 1.5, 'Sortir · retour au village', sortir);
    I.niveau = 1; I.niveauVise = 1; let tAvant = 0, video = null, texVideo = null, enLecture = false; const coin = new THREE.Vector3();
    const appliquer = () => { const n = I.niveau; for (const [L2, f] of I.lumieres) L2.intensity = f * n; for (const [hh, op] of I.halos) hh.material.opacity = op * (0.15 + 0.85 * n);
      mAbat.emissiveIntensity = 0.82 * (0.1 + 0.9 * n); mEncastre.emissiveIntensity = 0.5 * Math.max(0, (n - 0.35) / 0.65); mVeille.emissiveIntensity = 0.9 * (0.45 + 0.55 * n); matFilet.opacity = enLecture ? 0.5 : 1;
      if (dedans === 'cinema') { hemi.intensity = I.hemi * (0.12 + 0.88 * n); lune.intensity = I.luneForce * (0.1 + 0.9 * n); } };
    I.respire = [(t) => { const dt = Math.min(0.1, Math.max(0, t - tAvant)); tAvant = t; if (Math.abs(I.niveauVise - I.niveau) > 0.002 || I.aAppliquer) { I.aAppliquer = false; I.niveau += (I.niveauVise - I.niveau) * Math.min(1, dt * 2.6); appliquer(); }
      if (video && texVideo) lueurEcran.intensity = enLecture ? 6 + Math.sin(t * 7.3) * 0.7 + Math.sin(t * 2.1) * 0.5 : 2; }];
    const ajuster = () => { if (!video) return; const ar = (video.videoWidth || 16) / (video.videoHeight || 9), k = Math.min(EW / ar, EH); planVideo.scale.set(k * ar, k, 1); };
    I.apresRendu = () => { if (!planVideo.visible) return; const ac = renderer.autoClear, fond = scene.background; renderer.setRenderTarget(null); renderer.autoClear = false; scene.background = null; renderer.clearDepth(); camera.layers.set(1); renderer.render(scene, camera); camera.layers.set(0); scene.background = fond; renderer.autoClear = ac; };
    window.__village.cinema = { I,
      baisser(etat, toutDeSuite) { enLecture = etat === true || etat === 'joue'; I.niveauVise = enLecture ? 0.08 : etat === 'pause' ? 0.35 : 1; I.aAppliquer = true; if (toutDeSuite) { I.niveau = I.niveauVise; appliquer(); } },
      montrer(v) { if (texVideo) { texVideo.dispose(); texVideo = null; } if (video) video.removeEventListener('loadedmetadata', ajuster); video = v || null; matVideo.map = null;
        if (video) { texVideo = new THREE.VideoTexture(video); texVideo.colorSpace = THREE.SRGBColorSpace; matVideo.map = texVideo; video.addEventListener('loadedmetadata', ajuster); ajuster(); }
        matVideo.needsUpdate = true; planVideo.visible = !!video; if (!video) lueurEcran.intensity = 0; },
      vue(oui) { I.vueEcran = !!oui; gPortes.visible = !oui; joueur.visible = !oui; document.body.classList.toggle('cine-ecran', !!oui); camPos.set(0, 0, 0); },
      rect() { const xs = [], ys = []; for (const sx of [-1, 1]) for (const sy of [-1, 1]) { coin.set(I.o[0] + sx * EW / 2, Y0 + EY + sy * EH / 2, I.o[1] + EZ).project(camera); xs.push((coin.x + 1) / 2 * innerWidth); ys.push((1 - coin.y) / 2 * innerHeight); }
        const x = Math.min(...xs), y = Math.min(...ys); return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }; },
      affiches(urls) { I.affiches.forEach((tex, i) => { const u = (urls || [])[i], c = tex.image, g = c.getContext('2d'); if (!u) { dessinerAffiche(g, c.width, c.height); tex.needsUpdate = true; return; }
        const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => { try { dessinerAffiche(g, c.width, c.height, img); g.getImageData(0, 0, 1, 1); tex.needsUpdate = true; } catch (_) { dessinerAffiche(g, c.width, c.height); tex.needsUpdate = true; } }; img.onerror = () => {}; img.src = u; }); },
      etat: () => ({ niveau: I.niveau, niveauVise: I.niveauVise, enLecture, filet: matFilet.opacity, video: !!video, vueEcran: !!I.vueEcran, bonhommeVisible: joueur.visible, planVisible: planVideo.visible, echelle: [planVideo.scale.x, planVideo.scale.y] }) };
  }
}
const MEM_GUITARE = 'village-musique.guitare', MEM_MEDIATORS = 'village-musique.mediators', MEM_DOS = 'village-musique.dos';
const lireMem = (cle) => { try { return JSON.parse(localStorage.getItem(cle)); } catch (_) { return null; } };
const ecrireMem = (cle, v) => { try { localStorage.setItem(cle, JSON.stringify(v)); } catch (_) {} };
const MEDIATORS = [[-23, 58], [-63.5, -27], [52, -53.4], [58.4, 45.4], [0, -8.55], [-58.4, 45.4]].map(([x, z]) => ({ x, z, groupe: new THREE.Group(), trouve: false }));
{
  const f = new THREE.Shape(); f.moveTo(0, -0.34); f.bezierCurveTo(0.14, -0.26, 0.3, 0.0, 0.3, 0.16); f.bezierCurveTo(0.3, 0.32, 0.16, 0.36, 0, 0.36);
  f.bezierCurveTo(-0.16, 0.36, -0.3, 0.32, -0.3, 0.16); f.bezierCurveTo(-0.3, 0.0, -0.14, -0.26, 0, -0.34);
  const geo = new THREE.ExtrudeGeometry(f, { depth: 0.04, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 }); geo.center();
  const mat = new THREE.MeshStandardMaterial({ color: C.orange, emissive: C.orange5, emissiveIntensity: 1.3, roughness: 0.3 }), deja = lireMem(MEM_MEDIATORS) || [];
  MEDIATORS.forEach((m, i) => { m.groupe.position.set(m.x, 1.15, m.z); m.corps = new THREE.Group(); m.corps.add(new THREE.Mesh(geo, mat)); m.corps.add(halo(C.orange, 2.4, 0.5)); m.groupe.add(m.corps);
    m.force = i ? 5 : 8; m.lampe = new THREE.PointLight(C.orange, m.force, 7, 2); m.groupe.add(m.lampe);
    m.trouve = deja.includes(i); montrerMediator(m); scene.add(m.groupe); });
}
function montrerMediator(m) { m.corps.visible = !m.trouve; m.lampe.intensity = m.trouve ? 0 : m.force; }
const nbMediators = () => MEDIATORS.filter((m) => m.trouve).length;
function majCompteur() { const n = nbMediators(); $('#compte').textContent = `Médiators ${n} / ${MEDIATORS.length}`; $('#compteur').classList.toggle('trouve', n > 0); }
const COULEURS = { acoustique: [['Naturel', 0xd0924e], ['Sunburst', 0x8a3a12], ['Noir', 0x16161a], ['Bleu nuit', 0x1e4fa0], ['Crème', 0xe9dcc0]],
  electrique: [['Rouge', 0xc0281c], ['Sunburst', 0xb85a14], ['Noir', 0x16161a], ['Bleu nuit', 0x1e4fa0], ['Crème', 0xe9dcc0]] };
function faireGuitare(modele) {
  const g = new THREE.Group();
  const mCorps = new THREE.MeshStandardMaterial({ color: COULEURS[modele][0][1], roughness: modele === 'electrique' ? 0.38 : 0.5, metalness: 0 });
  const mManche = new THREE.MeshStandardMaterial({ color: modele === 'electrique' ? 0xd9b77a : 0x3a2418, roughness: 0.5 });
  const mTouche = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.6 });
  const mMetal = new THREE.MeshStandardMaterial({ color: 0xcfd3d8, roughness: 0.3, metalness: 0.8 });
  const s = new THREE.Shape(); let ep;
  if (modele === 'acoustique') {
    s.moveTo(0, -0.25); s.bezierCurveTo(0.2, -0.25, 0.215, -0.08, 0.15, 0.0); s.bezierCurveTo(0.12, 0.04, 0.14, 0.1, 0.16, 0.13);
    s.bezierCurveTo(0.19, 0.22, 0.1, 0.26, 0, 0.26); s.bezierCurveTo(-0.1, 0.26, -0.19, 0.22, -0.16, 0.13); s.bezierCurveTo(-0.14, 0.1, -0.12, 0.04, -0.15, 0.0);
    s.bezierCurveTo(-0.215, -0.08, -0.2, -0.25, 0, -0.25); ep = 0.1;
  } else {
    s.moveTo(0, -0.22); s.bezierCurveTo(0.17, -0.23, 0.19, -0.08, 0.15, 0.0); s.bezierCurveTo(0.13, 0.05, 0.15, 0.1, 0.16, 0.2);
    s.bezierCurveTo(0.16, 0.26, 0.1, 0.24, 0.085, 0.16); s.bezierCurveTo(0.07, 0.12, 0.05, 0.12, 0.04, 0.14); s.lineTo(-0.04, 0.14);
    s.bezierCurveTo(-0.06, 0.12, -0.08, 0.13, -0.1, 0.19); s.bezierCurveTo(-0.12, 0.3, -0.19, 0.29, -0.18, 0.2); s.bezierCurveTo(-0.17, 0.1, -0.14, 0.05, -0.16, 0.0);
    s.bezierCurveTo(-0.2, -0.08, -0.17, -0.23, 0, -0.22); ep = 0.045;
  }
  const corps = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: ep, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3, curveSegments: 20 }), mCorps);
  corps.position.z = -ep / 2; corps.castShadow = true; g.add(corps);
  const face = ep / 2 + 0.013;
  if (modele === 'acoustique') {
    const rosace = new THREE.Mesh(new THREE.CircleGeometry(0.058, 28), new THREE.MeshBasicMaterial({ color: 0x0a0806 })); rosace.position.set(0, 0.07, face + 0.001); g.add(rosace);
    const anneau = new THREE.Mesh(new THREE.RingGeometry(0.062, 0.074, 28), new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.6 })); anneau.position.set(0, 0.07, face + 0.001); g.add(anneau);
    const chevalet = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.026, 0.012), mTouche); chevalet.position.set(0, -0.1, face + 0.006); g.add(chevalet);
  } else {
    const garde = new THREE.Mesh(new THREE.CircleGeometry(0.105, 28, 0.3, 4.2), new THREE.MeshStandardMaterial({ color: 0xf0ece2, roughness: 0.5 })); garde.position.set(0.012, 0.0, face + 0.001); garde.scale.set(1, 1.25, 1); g.add(garde);
    for (const y of [0.075, 0.01, -0.055]) { const mi = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.02, 0.01), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 })); mi.position.set(0, y, face + 0.006); g.add(mi); }
    const pont = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.035, 0.014), mMetal); pont.position.set(0, -0.115, face + 0.007); g.add(pont);
  }
  const yM = modele === 'acoustique' ? 0.24 : 0.13, lM = modele === 'acoustique' ? 0.4 : 0.5;
  const manche = new THREE.Mesh(new THREE.BoxGeometry(0.052, lM, 0.026), mManche); manche.position.set(0, yM + lM / 2, face - 0.02); manche.castShadow = true; g.add(manche);
  const touche = new THREE.Mesh(new THREE.BoxGeometry(0.048, lM + 0.08, 0.008), mTouche); touche.position.set(0, yM + lM / 2 - 0.04, face - 0.004); g.add(touche);
  const tete = new THREE.Mesh(new THREE.BoxGeometry(modele === 'acoustique' ? 0.075 : 0.06, 0.15, 0.02), modele === 'electrique' ? mManche : mTouche);
  tete.position.set(modele === 'acoustique' ? 0 : -0.012, yM + lM + 0.075, face - 0.026); g.add(tete);
  for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.012, 8), mMetal); c.rotation.z = Math.PI / 2;
    c.position.set(modele === 'acoustique' ? (i < 3 ? -0.044 : 0.044) : -0.048, yM + lM + 0.03 + (modele === 'acoustique' ? (i % 3) * 0.04 : i * 0.02), face - 0.026); g.add(c); }
  g.userData.corps = mCorps; return g;
}
const harnais = new THREE.Group();
const dos = new THREE.Group(), dosIn = new THREE.Group(); dos.add(dosIn); harnais.add(dos);
const DOS_TORSE = 0.1;
const matLisere = new THREE.MeshBasicMaterial({ color: 0x1c130c, side: THREE.BackSide });
matLisere.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normalize( normal ) * 2.4;'); };
const estClair = (css) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(css).trim()); if (!m) return false; const n = parseInt(m[1], 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.62; };
const courroie = new THREE.Group(); harnais.add(courroie);
function faireCourroie() {
  for (const o of [...courroie.children]) { courroie.remove(o); o.geometry.dispose(); }
  const A = AVATARS[avatar]; if (!A || !A.modele) return;
  joueur.updateMatrixWorld(true); const peaux = []; A.modele.traverse((o) => { if (o.isSkinnedMesh) { o.skeleton.update(); peaux.push(o); } else if (o.isMesh && !o.userData.kit) peaux.push(o); });
  const zD = -(DOS_TORSE + 0.035), guide = [[-0.105, 1.3, zD], [-0.17, 1.46, -0.1], [-0.17, 1.66, 0.03], [-0.1, 1.5, 0.3], [0.03, 1.24, 0.34], [0.2, 1.05, 0.26], [0.2, 0.96, -0.02], [0.2, 0.875, zD]].map((q) => new THREE.Vector3(...q));
  const c = new THREE.CatmullRomCurve3(guide, false, 'centripetal'), N = 64, centre = [], dehors = [], inv = new THREE.Matrix4().copy(joueur.matrixWorld).invert(), ray = new THREE.Raycaster();
  for (let i = 0; i <= N; i++) { const u = i / N, v = c.getPoint(u), coeur = new THREE.Vector3(0, Math.max(0.98, Math.min(1.36, v.y - 0.06)), 0), n = v.clone().sub(coeur).normalize();
    if (u > 0.16 && u < 0.74) {
      const o = coeur.clone().addScaledVector(n, 0.75).applyMatrix4(joueur.matrixWorld), d = n.clone().negate().transformDirection(joueur.matrixWorld); ray.set(o, d); ray.far = 0.75;
      const h = ray.intersectObjects(peaux, false)[0]; if (h) v.copy(h.point).applyMatrix4(inv); else v.copy(coeur).addScaledVector(n, 0.16); }
    centre.push(v.addScaledVector(n, 0.012)); dehors.push(n); }
  for (let k = 0; k < 2; k++) for (let i = 1; i < N; i++) centre[i].lerp(centre[i - 1].clone().add(centre[i + 1]).multiplyScalar(0.5), 0.5);
  const pos = [], idx = [], t = new THREE.Vector3(), w = new THREE.Vector3();
  for (let i = 0; i <= N; i++) { t.copy(centre[Math.min(N, i + 1)]).sub(centre[Math.max(0, i - 1)]).normalize(); w.crossVectors(dehors[i], t).normalize().multiplyScalar(0.025); const v = centre[i];
    pos.push(v.x - w.x, v.y - w.y, v.z - w.z, v.x + w.x, v.y + w.y, v.z + w.z); if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const bande = new THREE.Mesh(g, matCourroie); bande.castShadow = false; courroie.add(bande);
  for (const q of [centre[0], centre[N]]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.014, 14), matEmbout); e.rotation.x = Math.PI / 2; e.position.copy(q); e.position.z -= 0.012; courroie.add(e); }
}
const matCourroie = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.75, side: THREE.DoubleSide }), matEmbout = new THREE.MeshStandardMaterial({ color: C.laiton, metalness: 0.3, roughness: 0.4, emissive: C.laiton, emissiveIntensity: 0.25 });
function faireOmbreDos() {
  const tO = toile(64, 64, (g2, S) => { const d = g2.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); d.addColorStop(0, 'rgba(0,0,0,1)'); d.addColorStop(0.55, 'rgba(0,0,0,.6)'); d.addColorStop(1, 'rgba(0,0,0,0)'); g2.fillStyle = d; g2.fillRect(0, 0, S, S); });
  const o = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.66), new THREE.MeshBasicMaterial({ map: tO, transparent: true, opacity: 0.25, depthWrite: false })); o.rotation.y = Math.PI; o.rotation.z = 0.5; o.position.set(0.03, HAUTEUR * 0.62, -(DOS_TORSE + 0.004)); o.renderOrder = 1; harnais.add(o);
}
let osTorse = null, reposTorse = null; const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Vector3(), _dq = new THREE.Quaternion(), _r = new THREE.Vector3();
function suivreTorse() {
  if (!osTorse) return; joueur.updateMatrixWorld(true); _m.copy(joueur.matrixWorld).invert().multiply(osTorse.matrixWorld).decompose(_p, _q, _e);
  if (!reposTorse) reposTorse = { p: _p.clone(), q: _q.clone().invert() };
  _dq.copy(_q).multiply(reposTorse.q); harnais.quaternion.copy(_dq); harnais.position.copy(_p).sub(_r.copy(reposTorse.p).applyQuaternion(_dq));
}
const fiche = (id) => GUITARES.find((g) => g.id === id);
let portee = (() => { const v = lireMem(MEM_GUITARE), G = v && fiche(v.id); return G ? { id: v.id, c: Math.max(0, Math.min(G.couleurs.length - 1, v.c | 0)) } : { id: 'sj200', c: 0 }; })();
let envGuitares = null;
function habiller(g, ombre = true) {
  if (!envGuitares) envGuitares = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  g.traverse((o) => { if (!o.isMesh) return; o.castShadow = ombre; const m = o.material;
    if (m && !m.userData) m.userData = {};
    if (m && !m.userData.reflet && 'envMapIntensity' in m) { m.envMap = envGuitares; m.envMapIntensity = (m.envMapIntensity == null ? 1 : m.envMapIntensity) * 0.42; m.userData.reflet = true; m.needsUpdate = true; } });
  return g;
}
let dosObjet = lireMem(MEM_DOS) === 'micro' ? 'micro' : 'guitare';
function majBoutonsDos() { document.querySelectorAll('#dos-objet .choix').forEach((b) => b.setAttribute('aria-pressed', b.dataset.dos === dosObjet)); }
function mettreDos(quoi) { if (quoi !== 'guitare' && quoi !== 'micro') return; dosObjet = quoi; ecrireMem(MEM_DOS, quoi); poserGuitare(); }
function poserGuitare() {
  for (const o of [...dosIn.children]) { dosIn.remove(o); o.traverse((x) => { if (x.isMesh) x.geometry.dispose(); }); }
  if (dosObjet === 'micro') { const KM = KITS.find((k) => k.id === kit); dos.visible = false; courroie.visible = false; tenirMicro(KM && KM.micro ? KM.micro : 'boule');
    $('#ma-guitare').textContent = KM && KM.micro ? `Micro en main · ${(MICROS_CHANT.find((q) => q.id === KM.micro) || {}).sous || ''}` : 'Micro en main · le micro à boule'; majBoutonsDos(); if (INT.magasin.majMurs) INT.magasin.majMurs(); majFinis(); return; }
  majBoutonsDos(); dos.visible = true; courroie.visible = true; if (MAIN.type) tenirMicro(null);
  const g = habiller(faireGuitareExacte(portee.id, portee.c)), G = fiche(portee.id); g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(g); dos.position.z = -(DOS_TORSE + 0.02) + b.min.z * dos.scale.x;
  if (estClair(G.pastilles[portee.c])) { const peaux = []; g.traverse((o) => { if (o.isMesh && o.material.isMeshPhysicalMaterial) peaux.push(o); }); for (const o of peaux) { const l = new THREE.Mesh(o.geometry, matLisere); l.castShadow = false; g.add(l); } }
  dosIn.add(g); ecrireMem(MEM_GUITARE, portee);
  $('#ma-guitare').textContent = `${G.marque} ${G.modele} · ${G.couleurs[portee.c]}`;
  if (INT.magasin.majMurs) INT.magasin.majMurs(); majFinis();
}
function prendreGuitare(id) { if (!fiche(id)) return; const etaitMicro = dosObjet === 'micro'; if (etaitMicro) { dosObjet = 'guitare'; ecrireMem(MEM_DOS, 'guitare'); } const autre = etaitMicro || portee.id !== id; portee = autre ? { id, c: 0 } : { id, c: (portee.c + 1) % fiche(id).couleurs.length }; poserGuitare(); invite = null;
  if (autre && dedans === 'magasin') lacetVise += 0.36; }
function choisirFini(c) { const G = fiche(portee.id); if (c < 0 || c >= G.couleurs.length) return; portee = { id: portee.id, c }; poserGuitare(); }
function majFinis() {
  const z = $('#finis'), devant = !!(invite && invite.cle === 'g-' + portee.id && dedans === 'magasin' && !enTransit && fiche(portee.id).couleurs.length > 1); z.classList.toggle('visible', devant); if (!devant) return;
  const G = fiche(portee.id), r = $('#finis-pastilles'); r.innerHTML = '';
  G.couleurs.forEach((nom, i) => { const b = document.createElement('button'); b.className = 'pastille'; b.title = nom; b.setAttribute('aria-label', nom); b.style.background = G.pastilles[i]; b.setAttribute('aria-pressed', i === portee.c); b.onclick = () => choisirFini(i); r.appendChild(b); });
  $('#finis-nom').textContent = G.couleurs[portee.c];
}
{ let ouvert = false;
  const regler = () => { $('#guitare').classList.toggle('ferme', !ouvert); $('#ouvrir-guitare').classList.toggle('visible', !ouvert); $('#ouvrir-guitare').setAttribute('aria-expanded', ouvert); };
  $('#ouvrir-guitare').onclick = () => { ouvert = true; regler(); }; $('#replier-guitare').onclick = () => { ouvert = false; regler(); }; regler(); window.__village.replierGuitare = () => { if (ouvert) { ouvert = false; regler(); } }; }
const joueur = new THREE.Group(); joueur.position.set(DEPART[0], 0, DEPART[1]); joueur.rotation.y = Math.PI; scene.add(joueur);
let melangeur, actions = {}, actuelle = null, ramasse = 0;
{ const t = toile(128, 128, (g, S) => { const d = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); d.addColorStop(0, 'rgba(0,0,0,.62)'); d.addColorStop(0.55, 'rgba(0,0,0,.26)'); d.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = d; g.fillRect(0, 0, S, S); });
  const o = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0.7, polygonOffset: true, polygonOffsetFactor: -6 }));
  o.rotation.x = -Math.PI / 2; o.position.y = 0.035; o.renderOrder = 2; joueur.add(o); }
const HAUTEUR = 1.8;
function jouer(nom, fondu = 0.18) {
  if (actuelle === nom || !actions[nom]) return;
  const a = actions[nom]; a.reset().fadeIn(fondu).play(); if (actions[actuelle]) actions[actuelle].fadeOut(fondu); actuelle = nom;
}
const AVATARS = { casual: { fichier: 'modeles/bonhomme-casual.glb', habits: { White: 0xf3ede2, LightBlue: 0x2c4a7c, Red_Dark: 0xff7a3a, LightBrown: 0xc9a961 } },
  hoodie: { fichier: 'modeles/bonhomme-hoodie.glb', habits: { Purple: 0xc9772e, White: 0xf3ede2, LightBlue: 0x26365a } } };
let avatar = 'casual';
async function preparerAvatar(k) {
  const A = AVATARS[k], gltf = await new GLTFLoader().loadAsync(A.fichier);
  const m = gltf.scene; m.updateMatrixWorld(true); const b = new THREE.Box3();
  m.traverse((o) => { if (o.isSkinnedMesh) { o.computeBoundingBox(); b.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
  if (b.isEmpty()) b.setFromObject(m);
  const e = HAUTEUR / (b.max.y - b.min.y); m.scale.setScalar(e); m.position.y = -b.min.y * e;
  m.traverse((o) => { if (!o.isMesh) return; o.castShadow = true; o.frustumCulled = false;
    try { const g = toCreasedNormals(o.geometry, 1.15); if (g.attributes.position.count) o.geometry = g; } catch (_) {}
    o.material.roughness = 0.8; o.material.metalness = 0; o.material.flatShading = false; if (A.habits[o.material.name]) o.material.color.setHex(A.habits[o.material.name]); });
  A.modele = m; A.clips = gltf.animations; A.melangeur = new THREE.AnimationMixer(m); A.actions = {};
  const NOMS = { Idle_Neutral: 'idle', Walk: 'walk', Run: 'sprint', Interact: 'pick-up' };
  for (const c of gltf.animations) { const n = NOMS[c.name.split('|').pop()]; if (n) A.actions[n] = A.melangeur.clipAction(c); }
  if (A.actions['pick-up']) A.actions['pick-up'].setLoop(THREE.LoopOnce);
  preparerPourKits(A);
}
function mettreAvatar(k) {
  const A = AVATARS[k]; if (!A || !A.modele) return;
  for (const o of Object.values(AVATARS)) if (o.modele) { joueur.remove(o.modele); o.melangeur.stopAllAction(); }
  avatar = k; joueur.add(A.modele); melangeur = A.melangeur; actions = A.actions; actuelle = null; jouer('idle', 0);
  osTorse = A.modele.getObjectByName('Chest') || null; reposTorse = null; harnais.position.set(0, 0, 0); harnais.quaternion.identity(); if (harnais.parent) faireCourroie();
  majCarteKit();
}
document.querySelectorAll('#avatars .choix').forEach((b) => b.onclick = async () => { const k = b.dataset.avatar, A = AVATARS[k]; if (A && !A.modele) { if (A.attente) return; b.classList.add('attente'); A.attente = preparerAvatar(k); try { await A.attente; } catch (_) { A.attente = null; b.classList.remove('attente'); return; } b.classList.remove('attente'); } oterKit(); mettreAvatar(k); });
document.querySelectorAll('#dos-objet .choix').forEach((b) => b.onclick = () => mettreDos(b.dataset.dos));
async function chargerBonhomme() {
  await Promise.all((PUBLIC ? ['casual'] : Object.keys(AVATARS)).map(preparerAvatar));
  mettreAvatar('casual');
  dos.position.set(0.02, HAUTEUR * 0.63, -0.14); dos.rotation.set(0.11, 0, 0); dos.scale.setScalar(1.3); dosIn.rotation.set(0, Math.PI, -0.6); joueur.add(harnais); faireCourroie(); faireOmbreDos(); poserGuitare(); if (!SANS_KITS) { const k = lireMem(MEM_KIT); if (k && KITS.some((K) => K.id === k)) mettreKit(k, { guitare: false, muet: true }); } else $('#ou-guitare').textContent = 'Guitares : au magasin de musique.';
}
const MEM_KIT = 'village-musique.kit', OS_KITS = ['Head', 'Neck', 'Chest', 'Torso', 'Hips', 'UpperArmL', 'LowerArmL', 'WristL', 'UpperArmR', 'LowerArmR', 'WristR', 'UpperLegL', 'LowerLegL', 'UpperLegR', 'LowerLegR', 'FootL', 'FootR'];
let kit = null;
function preparerPourKits(A) {
  const m = A.modele; m.updateMatrix(); m.updateMatrixWorld(true); A.peaux = []; A.os = {}; A.pieces = []; let sq = null; const TL = new THREE.Matrix4();
  const v = new THREE.Vector3(), q = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], n = new THREE.Vector3(), e = new THREE.Vector3();
  m.traverse((o) => { if (!o.isSkinnedMesh) return; o.skeleton.update();
    if (!sq) { sq = o.skeleton; TL.copy(sq.bones[0].parent.matrixWorld); }
    const P = o.geometry.attributes.position, N = P.count, R0 = new Float32Array(N * 3), uv = new Float32Array(N * 2), nom = o.material.name, partie = /Head/.test(o.name + (o.parent ? o.parent.name : '')) ? 'tete' : /Legs|Feet/.test(o.name + (o.parent ? o.parent.name : '')) ? 'bas' : 'haut';
    for (let i = 0; i < N; i++) { v.fromBufferAttribute(P, i).applyMatrix4(TL); R0[i * 3] = v.x; R0[i * 3 + 1] = v.y; R0[i * 3 + 2] = v.z; }
    const couche = partie === 'bas' ? 'B' : nom === 'Skin' ? 'C' : 'A', tri = !o.geometry.index;
    for (let i = 0; i < N; i += 3) { let dosT = false;
      if (tri && i + 2 < N) { for (let k = 0; k < 3; k++) q[k].fromArray(R0, (i + k) * 3); n.subVectors(q[1], q[0]).cross(e.subVectors(q[2], q[0])); dosT = n.z < 0; }
      for (let k = 0; k < 3 && i + k < N; k++) { const x = R0[(i + k) * 3], y = R0[(i + k) * 3 + 1], z = R0[(i + k) * 3 + 2], d = tri ? dosT : z < 0; let U, V;
        if (couche === 'A') { U = Math.min(0.499, Math.max(0.001, (x + 1) / 4)) + (d ? 0.5 : 0); V = 0.5 + Math.min(0.499, Math.max(0.001, (y - 0.8) / 2)); }
        else if (couche === 'B') { U = Math.min(0.249, Math.max(0.001, (x + 0.5) / 4)) + (d ? 0.25 : 0); V = Math.min(0.499, Math.max(0.001, y / 2)); }
        else { U = 0.5 + Math.min(0.499, Math.max(0.001, (x + 1) / 4)); V = Math.min(0.499, Math.max(0.001, (y - 0.8) / 2)); }
        uv[(i + k) * 2] = U; uv[(i + k) * 2 + 1] = V; } }
    o.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    A.peaux.push({ o, nom, partie, mat: o.material, repos: R0 }); });
  const inv = new THREE.Matrix4().copy(TL).invert(); A.inv = inv; A.bind = {};
  for (const n of ['UpperArmR', 'LowerArmR', 'WristR', 'UpperLegL', 'LowerLegL', 'UpperLegR', 'LowerLegR']) { const o = m.getObjectByName(n); if (o) A.bind[n] = o.quaternion.clone(); }
  for (const nom of OS_KITS) { const os = m.getObjectByName(nom), i = sq ? sq.bones.indexOf(os) : -1; if (!os || i < 0) continue; const g = new THREE.Group(); g.matrixAutoUpdate = false; g.matrix.multiplyMatrices(sq.boneInverses[i], inv); os.add(g); A.os[nom] = g; }
}
function oterKit(muet) {
  if (!kit) return; const A = AVATARS.casual;
  for (const P of A.peaux) { P.o.material = P.mat; P.o.visible = true; }
  for (const o of A.pieces) { o.parent.remove(o); o.geometry.dispose(); } A.pieces = [];
  if (A.kitMats) { for (const m of A.kitMats) { if (m.map) m.map.dispose(); m.dispose(); } A.kitMats = null; }
  tenirMicro(null); kit = null; ecrireMem(MEM_KIT, null); if (!muet) { faireCourroie(); majCarteKit(); if (INT.magasin.majKits) INT.magasin.majKits(); }
}
function mettreKit(id, { guitare = true, muet = false } = {}) {
  const K = KITS.find((k) => k.id === id); if (!K) return; oterKit(true);
  if (avatar !== 'casual') mettreAvatar('casual'); const A = AVATARS.casual; if (!A.modele) return;
  const tex = faireAtlasKit(K, window.__village.modeLeger ? 1024 : 2048), mAtlas = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0 }), unis = new Map(); A.kitMats = [mAtlas];
  const uni = (c) => { if (!unis.has(c)) { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0 }); unis.set(c, m); A.kitMats.push(m); } return unis.get(c); };
  for (const P of A.peaux) { const r = K.matiere(P.nom, P.partie); if (r === 'cache') P.o.visible = false; else if (r === 'atlas') P.o.material = mAtlas; else if (r != null) P.o.material = uni(r); }
  const L = piecesKit(K);
  for (const [os, meshes] of Object.entries(L)) { const g = A.os[os]; if (!g) continue; for (const o of meshes) { o.userData.kit = true; o.frustumCulled = false; o.castShadow = true; g.add(o); A.pieces.push(o); } }
  kit = id; ecrireMem(MEM_KIT, id);
  if (K.micro) { dosObjet = 'micro'; ecrireMem(MEM_DOS, 'micro'); poserGuitare(); }
  else if (guitare && K.guitare) { const G = fiche(K.guitare[0]); if (G) { if (dosObjet === 'micro') { dosObjet = 'guitare'; ecrireMem(MEM_DOS, 'guitare'); } portee = { id: G.id, c: Math.max(0, G.couleurs.indexOf(K.guitare[1])) }; poserGuitare(); } }
  faireCourroie(); majCarteKit(); if (INT.magasin.majKits) INT.magasin.majKits();
  if (!muet) avis(`${esc(K.nom)} <span>· le kit est sur toi</span>`);
}
function essayerKit(id) { if (kit === id) { oterKit(); avis('Kit enlevé <span>· ta tenue de départ</span>'); } else mettreKit(id); joueur.rotation.y = lacet; ramasse = 0.6; invite = null; }
function majCarteKit() {
  const K = KITS.find((k) => k.id === kit); document.querySelectorAll('#avatars .choix').forEach((b) => b.setAttribute('aria-pressed', !K && b.dataset.avatar === avatar));
  const l = $('#mon-kit'); if (l) { l.hidden = !K; if (K) $('#mon-kit-nom').textContent = K.nom; }
}
{ const b = $('#oter-kit'); if (b) b.onclick = () => { oterKit(); }; }
const touches = new Set(); let manette = { x: 0, y: 0 }, aBouge = false;
addEventListener('keydown', (e) => {
  if (DESC.active) { if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); sauterDescente(); } return; }
  if (window.__pause) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  touches.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  if (e.key === 'Enter' && !e.repeat) { e.preventDefault(); if (lieuOuvert) fermerLieu(); else if (invite && !enTransit) invite.action(); }
  if (e.key === 'Escape') { fermerLieu(); $('#mortaise').classList.remove('ouvert'); }
});
addEventListener('keyup', (e) => touches.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
addEventListener('blur', () => touches.clear());
{
  const z = $('#manette'), b = z.querySelector('i'); let id = null;
  const bouger = (e) => { const r = z.getBoundingClientRect(), R0 = r.width / 2; let x = (e.clientX - r.left - R0) / R0, y = (e.clientY - r.top - R0) / R0;
    const d = Math.hypot(x, y); if (d > 1) { x /= d; y /= d; } manette = { x, y }; b.style.transform = `translate(${x * R0 * 0.6}px,${y * R0 * 0.6}px)`; };
  z.addEventListener('pointerdown', (e) => { id = e.pointerId; try { z.setPointerCapture(id); } catch (_) {} z.classList.add('actif'); $('#consigne').classList.add('cache'); bouger(e); e.preventDefault(); });
  z.addEventListener('pointermove', (e) => { if (e.pointerId === id) bouger(e); });
  const fin = (e) => { if (e.pointerId === id) { id = null; manette = { x: 0, y: 0 }; b.style.transform = ''; z.classList.remove('actif'); } };
  z.addEventListener('pointerup', fin); z.addEventListener('pointercancel', fin);
}
let lacet = 0, lacetVise = 0, glisse = null;
canvas.addEventListener('pointerdown', (e) => { glisse = { id: e.pointerId, x: e.clientX }; });
canvas.addEventListener('pointermove', (e) => { if (glisse && glisse.id === e.pointerId) { lacetVise -= (e.clientX - glisse.x) * 0.005; glisse.x = e.clientX; } });
addEventListener('pointerup', () => { glisse = null; }); addEventListener('pointercancel', () => { glisse = null; });
let procheDe = null, lieuOuvert = false;
let carteRepliee = null;
function majCarteRepliee() { const r = innerWidth < 1024 || (!!invite && !dedans); if (r === carteRepliee) return; carteRepliee = r; document.body.classList.toggle('carte-repliee', r); if (!r) $('#mortaise').classList.remove('ouvert'); }
function ouvrirLieu(k) {
  const L = PANNEAUX[k] || LIEUX[k]; if (!L || L.terrain) return;
  $('#fermer-lieu').textContent = dedans ? 'Fermer' : 'Retour au village';
  $('#lieu-sur').textContent = L.sur; $('#lieu-titre').textContent = L.nom; $('#lieu-texte').textContent = L.texte;
  const etat = (b) => (PUBLIC && (b === 'essai' || b === 'à venir') ? (ELEVE && k === 'biblio' ? '' : 'Bientôt') : b);
  $('#lieu-liste').innerHTML = L.liste.map(([a, b, c]) => `<li${c ? ` class="${c}"` : ''}><span>${esc(a)}</span><span>${esc(etat(b) || '')}</span></li>`).join('');
  $('#lieu-pied').textContent = L.pied || '';
  $('#lieu').classList.add('ouvert'); lieuOuvert = true; touches.clear(); $('#lieu article').scrollTop = 0; setTimeout(() => $('#fermer-lieu').focus({ preventScroll: true }), 80);
}
function fermerLieu() { $('#lieu').classList.remove('ouvert'); lieuOuvert = false; }
$('#fermer-lieu').onclick = fermerLieu;
$('#lieu').addEventListener('click', (e) => { if (e.target.id === 'lieu') fermerLieu(); });
$('#entrer').onclick = () => { if (invite && !enTransit) invite.action(); };
$('#sortir').onclick = () => sortir();
function allerA(k) {
  const L = LIEUX[k]; if (!L || dedans || enTransit) return;
  $('#voile').classList.add('noir'); $('#mortaise').classList.remove('ouvert');
  setTimeout(() => { const d = Math.hypot(L.porte[0] - L.x, L.porte[1] - L.z) || 1, ux = (L.porte[0] - L.x) / d, uz = (L.porte[1] - L.z) / d;
    joueur.position.set(L.porte[0] + ux * 1.2, 0, L.porte[1] + uz * 1.2); joueur.position.y = hauteurSol(joueur.position.x, joueur.position.z);
    joueur.rotation.y = Math.atan2(-ux, -uz); lacet = lacetVise = Math.atan2(ux, uz); camPos.set(0, 0, 0); $('#voile').classList.remove('noir'); }, 230);
}
let minuterieAvis; function avis(html) { const a = $('#avis'); a.innerHTML = html; a.classList.add('visible'); clearTimeout(minuterieAvis); minuterieAvis = setTimeout(() => a.classList.remove('visible'), 3200); }
const carte = $('#carte'), gc = carte.getContext('2d'), fondCarte = document.createElement('canvas'); fondCarte.width = fondCarte.height = 432;
const DEMI = R + 5, versCarte = (x, z) => [(x + DEMI) / (2 * DEMI) * 432, (z + DEMI) / (2 * DEMI) * 432];
function photoDuHaut() {
  const cam = new THREE.OrthographicCamera(-DEMI, DEMI, DEMI, -DEMI, 1, 500); cam.position.set(0, 250, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0);
  const brume = scene.fog, expo = renderer.toneMappingExposure, pr = renderer.getPixelRatio();
  scene.fog = null; joueur.visible = false; for (const m of MEDIATORS) m.groupe.visible = false; etoiles.visible = false; arbres.visible = false; ciel.visible = false; renderer.toneMappingExposure = 3.0;
  renderer.setPixelRatio(1); renderer.setSize(432, 432, false); renderer.render(scene, cam);
  fondCarte.getContext('2d').drawImage(renderer.domElement, 0, 0, 432, 432);
  scene.fog = brume; joueur.visible = true; for (const m of MEDIATORS) m.groupe.visible = true; etoiles.visible = true; arbres.visible = true; ciel.visible = true; renderer.toneMappingExposure = expo;
  { const g = fondCarte.getContext('2d'); g.fillStyle = 'rgba(4,8,18,.34)'; g.fillRect(0, 0, 432, 432); }
  renderer.setPixelRatio(pr); taille();
}
let survol = null;
function dessinerCarte() {
  gc.clearRect(0, 0, 432, 432); gc.drawImage(fondCarte, 0, 0);
  gc.textAlign = 'center'; gc.textBaseline = 'middle';
  for (const [k, L] of Object.entries(LIEUX)) {
    let [x, y] = versCarte(L.x, L.z); const actif = survol === k;
    gc.font = `600 ${actif ? 25 : 23}px Manrope, Arial, sans-serif`;
    if (L.etq) { x += L.etq[0]; y += L.etq[1]; }
    const t = L.nom.replace('Le magasin de musique', 'Le magasin').replace(NOM_STUDIO || 'Le studio', 'Le studio'), w = gc.measureText(t).width + 26;
    x = Math.max(w / 2 + 6, Math.min(432 - w / 2 - 6, x));
    gc.fillStyle = actif ? 'rgba(243,237,226,.96)' : 'rgba(3,5,10,.74)'; gc.beginPath(); gc.roundRect(x - w / 2, y - 20, w, 40, 20); gc.fill();
    gc.strokeStyle = L.terrain ? 'rgba(201,169,97,.5)' : 'rgba(201,169,97,.95)'; gc.lineWidth = 1.5; gc.stroke();
    gc.fillStyle = actif ? '#03050a' : (L.terrain ? '#bdb3a3' : '#f3ede2'); gc.fillText(t, x, y + 1);
  }
  const [jx, jy] = versCarte(joueur.position.x, joueur.position.z);
  gc.fillStyle = 'rgba(255,180,84,.3)'; gc.beginPath(); gc.arc(jx, jy, 22 + Math.sin(temps * 3) * 3, 0, 7); gc.fill();
  gc.fillStyle = '#ffb454'; gc.strokeStyle = '#03050a'; gc.lineWidth = 3.5; gc.beginPath(); gc.arc(jx, jy, 11, 0, 7); gc.fill(); gc.stroke();
}
function lieuSousPointeur(e) {
  const r = carte.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 432, y = (e.clientY - r.top) / r.height * 432; let mieux = null, dm = 62;
  for (const [k, L] of Object.entries(LIEUX)) { const [cx, cy] = versCarte(L.x, L.z), d = Math.hypot(cx - x, cy - y); if (d < dm) { dm = d; mieux = k; } }
  return mieux;
}
carte.addEventListener('pointermove', (e) => { survol = lieuSousPointeur(e); carte.style.cursor = survol ? 'pointer' : 'default'; });
carte.addEventListener('pointerleave', () => { survol = null; });
carte.addEventListener('click', (e) => { const k = lieuSousPointeur(e); if (k) allerA(k); });
$('#bouton-carte').onclick = () => $('#mortaise').classList.toggle('ouvert');
$('#fermer-carte').onclick = () => $('#mortaise').classList.remove('ouvert');
const eclat = new THREE.PointLight(0xffe9cf, 6, 6, 2); scene.add(eclat);
const contre = new THREE.PointLight(0xa9c8f2, 5, 4.2, 2); scene.add(contre);
const camPos = new THREE.Vector3(), cible = new THREE.Vector3(), rayon = new THREE.Raycaster(); let serre = 1;
function reglerCamera(dt, direct) {
  const portrait = innerHeight > innerWidth, p = joueur.position;
  const recul = portrait ? 9.4 : 7.8, haut = portrait ? 4.8 : 3.7, avant = portrait ? 6 : 7, viseY = portrait ? 3.0 : 2.5;
  if (window.__village.figer) return;
  if (dedans) { reglerCameraDedans(dt, direct, portrait); return; }
  lacet += (lacetVise - lacet) * Math.min(1, dt * 8);
  const sx = Math.sin(lacet), cz = Math.cos(lacet), v = new THREE.Vector3(p.x + sx * recul, p.y + haut, p.z + cz * recul);
  if (direct || camPos.lengthSq() === 0) camPos.copy(v); else camPos.lerp(v, Math.min(1, dt * 5));
  camera.position.copy(camPos);
  { const tete = new THREE.Vector3(p.x, p.y + 1.7, p.z), d = camPos.clone().sub(tete), n = d.length(); d.normalize(); rayon.set(tete, d); rayon.far = n; let pres = n;
    for (const g of cacheurs) { const h = rayon.intersectObject(g, true); if (h.length && h[0].distance < pres) pres = h[0].distance; }
    serre += ((pres < n ? Math.max(1.4, pres - 0.45) / n : 1) - serre) * Math.min(1, dt * (pres < n ? 14 : 3)); if (direct) serre = pres < n ? Math.max(1.4, pres - 0.45) / n : 1;
    if (serre < 0.995) { camera.position.copy(tete).addScaledVector(d, n * serre); camera.position.y += (1 - serre) * 1.1; } }
  cible.set(p.x - sx * avant, p.y + viseY, p.z - cz * avant); camera.lookAt(cible);
  camera.fov = portrait ? 62 : 52; camera.updateProjectionMatrix();
  eclat.position.set(p.x + sx * 1.8, p.y + 2.6, p.z + cz * 1.8); contre.position.set(p.x - sx * 1.6, p.y + 2.9, p.z - cz * 1.6);
  lune.position.set(p.x - 24, 60, p.z + 20); lune.target.position.set(p.x, 0, p.z);
  etoiles.position.set(camPos.x, 0, camPos.z);
  for (const [s, y] of halosLoin) { const dx = s.position.x - camPos.x, dz = s.position.z - camPos.z; s.position.y = y - K * (dx * dx + dz * dz); }
}
function reglerCameraDedans(dt, direct, portrait) {
  const I = INT[dedans], ox = I.o[0], oz = I.o[1], p = joueur.position, pr = I.cadreForce || (invite && invite.cadre) || (I.pano && I.cadrePano) || (innerWidth / innerHeight < 0.8 && I.portrait ? I.portrait : null), recul = pr ? pr.recul : 5.5, haut = pr ? pr.haut : 2.4;
  if (I.vueEcran && I.ecran) { const Ec = I.ecran, asp = innerWidth / innerHeight, etroit = asp < 0.75, tv = Math.tan(25 * Math.PI / 180), dist = Math.max(Ec.w / (etroit ? 0.88 : 0.78) / (2 * tv * asp), Ec.h / 0.8 / (2 * tv)), bas = etroit ? dist * Math.tan(5 * Math.PI / 180) : 0;
    camPos.set(ox + Ec.x, Y0 + Ec.y, Math.min(oz + Ec.z + dist, oz + I.p / 2 - 0.6)); camera.position.copy(camPos); camera.fov = 50; camera.near = 0.1; camera.updateProjectionMatrix(); camera.lookAt(ox + Ec.x, Y0 + Ec.y - bas, oz + Ec.z);
    eclat.position.set(p.x, p.y + 2.4, p.z + 1.8); contre.position.set(p.x, p.y + 2.7, p.z - 1.6); lune.position.set(ox + I.lune[0], Y0 + I.lune[1], oz + I.lune[2]); lune.target.position.set(ox, Y0, oz); etoiles.position.set(camPos.x, 0, camPos.z); return; }
  lacet += (lacetVise - lacet) * Math.min(1, dt * 8);
  const sx = Math.sin(lacet), cz = Math.cos(lacet), v = new THREE.Vector3(p.x + sx * recul, p.y + haut, p.z + cz * recul);
  if (I.rayon) { const dx = v.x - ox, dz = v.z - oz, d = Math.hypot(dx, dz); let plus = I.camLibre || 0;
    if (!plus) for (const a of (I.percees || [0])) { const c = (dx * Math.sin(a) + dz * Math.cos(a)) / Math.max(d, 0.01); if (c > 0) plus = Math.max(plus, 3.4 * Math.min(1, c * 1.6)); }
    const m = I.rayon - 0.75 + plus; if (d > m) { v.x = ox + dx / d * m; v.z = oz + dz / d * m; } }
  else { const mx = I.l / 2 - (I.marge || 0) - 0.55, mz = I.p / 2 - (I.marge || 0) - 0.55; v.x = Math.max(ox - mx, Math.min(ox + mx, v.x)); v.z = Math.max(oz - mz, Math.min(oz + (I.pano ? I.p / 2 - 0.7 : I.p / 2 + 3.6), v.z)); }
  serre = Math.min(1, Math.hypot(v.x - p.x, v.z - p.z) / recul); v.y = Math.min(v.y - (1 - serre) * 0.55, p.y + I.h - 0.5);
  if (direct || camPos.lengthSq() === 0) camPos.copy(v); else camPos.lerp(v, Math.min(1, dt * 5));
  camera.position.copy(camPos); camera.fov = pr ? pr.fov : portrait ? 60 : 56; camera.updateProjectionMatrix();
  let dx = p.x - camPos.x, dz = p.z - camPos.z; const d = Math.hypot(dx, dz); if (d < 0.4) { dx = -sx; dz = -cz; } else { dx /= d; dz /= d; }
  const demi = camera.fov / 2 * Math.PI / 180, pente = pr && pr.pente != null ? pr.pente : Math.min(0.34, Math.max(0.04, Math.atan2(camPos.y - p.y, Math.max(d, 0.6)) - 0.6 * demi));
  cible.set(camPos.x + dx * 6, camPos.y - Math.tan(pente) * 6, camPos.z + dz * 6); camera.lookAt(cible);
  { let pres = 0;
    if (I.rayon) { const cx = camPos.x - ox, cz2 = camPos.z - oz, rr = I.rayon - 0.8, c0 = cx * cx + cz2 * cz2 - rr * rr; if (c0 > 0) { const b = cx * dx + cz2 * dz, disc = b * b - c0; if (disc > 0 && b < 0) pres = -b - Math.sqrt(disc); } }
    else { const lim = oz + I.p / 2 - (I.marge || 0) - 0.8; if (camPos.z > lim && dz < -0.15) pres = (camPos.z - lim) / -dz; }
    let pente2 = pente; if (pres > 0) { const maxi = Math.atan2(camPos.y - p.y, pres + 0.3) - demi - 0.012; if (maxi < pente2) { pente2 = maxi; cible.set(camPos.x + dx * 6, camPos.y - Math.tan(pente2) * 6, camPos.z + dz * 6); camera.lookAt(cible); } }
    camera.near = pres > 0 ? Math.max(0.1, Math.min(d - 1.3, pres * Math.cos(pente2) + (camPos.y - p.y) * Math.sin(pente2) + 0.12)) : 0.1; camera.updateProjectionMatrix(); }
  if (I.arche) { const cx = camPos.x - ox, cz3 = camPos.z - oz, rc = Math.hypot(cx, cz3); I.arche.visible = !(rc > I.rayon - 0.9 && (cx * Math.sin(I.percees[1]) + cz3 * Math.cos(I.percees[1])) / rc > 0.6); }
  if (I.lettrage) I.lettrage.visible = !portrait;
  eclat.position.set(p.x + sx * 1.8, p.y + 2.4, p.z + cz * 1.8); contre.position.set(p.x - sx * 1.6, p.y + 2.7, p.z - cz * 1.6);
  lune.position.set(ox + I.lune[0], Y0 + I.lune[1], oz + I.lune[2]); lune.target.position.set(ox + (I.luneVise ? I.luneVise[0] : 0), Y0, oz + (I.luneVise ? I.luneVise[1] : 0));
  etoiles.position.set(camPos.x, 0, camPos.z);
  if (I.faisceau) I.faisceau.rotation.y = Math.atan2(camPos.x - ox - I.faisceau.position.x, camPos.z - oz - I.faisceau.position.z);
}
function preparerCacheurs() {}
function effacerCeQuiCache() {}
const horloge = new THREE.Clock(); const dir = new THREE.Vector3();
function collisions(p) {
  const r = 0.42;
  if (dedans) { const I = INT[dedans], ox = I.o[0], oz = I.o[1];
    for (const b of I.boites) { const cx = Math.max(b.x1, Math.min(p.x, b.x2)), cz = Math.max(b.z1, Math.min(p.z, b.z2)); const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
      if (d < r) { if (d > 1e-5) { p.x = cx + dx / d * r; p.z = cz + dz / d * r; } else { const g = [p.x - b.x1, b.x2 - p.x, p.z - b.z1, b.z2 - p.z], i = g.indexOf(Math.min(...g)); if (i === 0) p.x = b.x1 - r; if (i === 1) p.x = b.x2 + r; if (i === 2) p.z = b.z1 - r; if (i === 3) p.z = b.z2 + r; } } }
    for (const c of I.ronds) { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + r; if (d < m && d > 1e-5) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; } }
    if (I.rayon) { const dx = p.x - ox, dz = p.z - oz, d = Math.hypot(dx, dz), m = I.rayon - 0.3 - r; if (d > m) { p.x = ox + dx / d * m; p.z = oz + dz / d * m; } }
    else { const mx = I.l / 2 - (I.marge || 0) - r, mz = I.p / 2 - (I.marge || 0) - r; p.x = Math.max(ox - mx, Math.min(ox + mx, p.x)); p.z = Math.max(oz - mz, Math.min(oz + mz, p.z)); }
    return; }
  for (const b of boites) { const cx = Math.max(b.x1, Math.min(p.x, b.x2)), cz = Math.max(b.z1, Math.min(p.z, b.z2)); let dx = p.x - cx, dz = p.z - cz; const d = Math.hypot(dx, dz);
    if (d < r) { if (d > 1e-5) { p.x = cx + dx / d * r; p.z = cz + dz / d * r; } else { const g = [p.x - b.x1, b.x2 - p.x, p.z - b.z1, b.z2 - p.z], i = g.indexOf(Math.min(...g)); if (i === 0) p.x = b.x1 - r; if (i === 1) p.x = b.x2 + r; if (i === 2) p.z = b.z1 - r; if (i === 3) p.z = b.z2 + r; } } }
  for (const c of ronds) { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + r; if (d < m && d > 1e-5) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; } }
  let d = Math.hypot(p.x, p.z);
  if (d > 9.3 && d < 10.9 && Math.abs(Math.atan2(p.x, p.z)) > OUV - 0.045) { const v = d < 9.95 ? 9.3 : 10.9; p.x *= v / d; p.z *= v / d; }
  d = Math.hypot(p.x, p.z); const max = R - 1.6; if (d > max) { p.x *= max / d; p.z *= max / d; }
}
let temps = 0;
function logique(dt) {
  temps += dt; const t = temps;
  let ix = 0, iz = 0;
  if (!lieuOuvert && !enTransit && !window.__village.immobile && !(dedans && INT[dedans].vueEcran)) {
    if (touches.has('w') || touches.has('z') || touches.has('ArrowUp')) iz -= 1;
    if (touches.has('s') || touches.has('ArrowDown')) iz += 1;
    if (touches.has('a') || touches.has('q') || touches.has('ArrowLeft')) ix -= 1;
    if (touches.has('d') || touches.has('ArrowRight')) ix += 1;
    ix += manette.x; iz += manette.y;
  }
  const force = Math.min(1, Math.hypot(ix, iz));
  const court = touches.has('Shift') || Math.hypot(manette.x, manette.y) > 0.9;
  if (ramasse > 0) ramasse -= dt;
  if (assis && force > 0.12) seLever();
  if (force > 0.12 && ramasse <= 0 && !assis) {
    if (!glisse) { lacetVise -= Math.max(-1, Math.min(1, ix)) * 0.85 * dt; lacet += (lacetVise - lacet) * Math.min(1, dt * 8); }
    const a = Math.atan2(ix, iz) + lacet;
    dir.set(Math.sin(a), 0, Math.cos(a));
    const vit = (court ? 7.4 : 3.5) * (court ? 1 : Math.max(0.55, force));
    joueur.position.x += dir.x * vit * dt; joueur.position.z += dir.z * vit * dt; collisions(joueur.position);
    let d = Math.atan2(dir.x, dir.z) - joueur.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); joueur.rotation.y += d * Math.min(1, dt * 12);
    jouer(court ? 'sprint' : 'walk');
    if (!aBouge) { aBouge = true; $('#aide').classList.add('cache'); $('#consigne').classList.add('cache'); }
  } else if (ramasse <= 0) jouer('idle');
  if (assis) { joueur.position.x = assis.S.x; joueur.position.z = assis.S.z; joueur.rotation.y = assis.S.face; }
  joueur.position.y += (hauteurSol(joueur.position.x, joueur.position.z) - joueur.position.y) * Math.min(1, dt * 14);
  if (melangeur) melangeur.update(dt);
  appliquerPoseV20();
  suivreTorse(); majMurProche();
  if (dedans && INT[dedans].pano) { const I = INT[dedans]; if (force > 0.12 || glisse) I.pano = null; else { I.pano.t += dt; lacet = lacetVise = PANO(I.pano.t); if (I.pano.t >= PANO_DUREE) { I.pano = null; lacet = lacetVise = 0; } } }
  if (dedans) { const I = INT[dedans]; if (I.mixers) for (const m of I.mixers) m.update(dt); if (I.respire) for (const f of I.respire) f(t); }
  if (!dedans) for (const f of VIVANTS19) f(t);
  if (!dedans) MEDIATORS.forEach((m, i) => { if (m.trouve) return;
    m.groupe.rotation.y = t * 1.6 + i; m.groupe.position.y = hauteurSol(m.x, m.z) + 1.15 + Math.sin(t * 2.2 + i) * 0.12;
    if (Math.hypot(joueur.position.x - m.x, joueur.position.z - m.z) < 1.15) {
      m.trouve = true; montrerMediator(m); ramasse = 0.9; jouer('pick-up', 0.1); ecrireMem(MEM_MEDIATORS, MEDIATORS.map((q, k) => (q.trouve ? k : -1)).filter((k) => k >= 0));
      majCompteur(); avis(`Médiator trouvé <span>· ${nbMediators()} sur ${MEDIATORS.length}</span>`);
    } });
  let proche = null, inv = null;
  if (dedans) { const I = INT[dedans]; let dm = 1e9;
    for (const pt of I.points) { if (pt.cache && pt.cache()) continue; const d = Math.hypot(joueur.position.x - pt.x, joueur.position.z - pt.z); if (d < pt.r && d < dm) { dm = d; inv = pt; } } }
  else { for (const [k, L] of Object.entries(LIEUX)) { if (L.terrain) continue; if (Math.hypot(joueur.position.x - L.porte[0], joueur.position.z - L.porte[1]) < 2.3) proche = k; }
    if (proche) { const k = proche; inv = { cle: 'porte-' + k, texte: 'Entrer · ' + LIEUX[k].nom, action: () => entrer(k) }; }
    else { const q = PORTES_CHANT.find((P) => Math.hypot(joueur.position.x - P.x, joueur.position.z - P.z) < P.r); if (q) inv = q.invite; }
    if (assis) inv = { cle: 'se-lever', texte: 'Se lever', action: seLever };
    else if (!inv) { let dm = 1.15; for (const S of SIEGES) { const d = Math.hypot(joueur.position.x - S.x, joueur.position.z - S.z); if (d < dm) { dm = d; inv = { cle: 'siege-' + S.id, texte: 'S’asseoir', action: () => sAsseoir(S) }; } } } }
  procheDe = proche;
  if ((inv && inv.cle) !== (invite && invite.cle)) { invite = inv; $('#entrer').classList.toggle('visible', !!inv); $('#entrer').classList.toggle('muet', !!(inv && inv.muet)); if (inv) $('#entrer-texte').textContent = inv.texte;
    document.body.classList.toggle('invite', !!inv); document.body.classList.toggle('pres-arche', !!(inv && inv.cadre)); document.body.classList.remove('salle-ouverte'); if (inv && inv.cadre && window.__village.replierGuitare) window.__village.replierGuitare(); majFinis(); majCarteRepliee(); }
}
const leger = (() => {
  const veut = new URLSearchParams(location.search).get('leger'), veutPalier = +new URLSearchParams(location.search).get('palier') || 0, MEM = 'village-musique.leger', DERNIER = 5, SEUIL = 28;
  const PR0 = renderer.getPixelRatio(), CARTE0 = lune.shadow.mapSize.x;
  const reglage = (n) => ({ pr: Math.min(PR0, n >= 5 ? 0.65 : n >= 4 ? 0.8 : n >= 1 ? 1 : PR0), carte: n >= 1 ? Math.min(CARTE0, 1024) : CARTE0, cadence: n >= 1 ? 2 : 1, petites: n < 2, portes: n < 2, flou: n < 3, ombres: n < 5 });
  const E = { niveau: 0, r: reglage(0), transition: false, auto: false, ips: null, cadence: 1, forcer: 0, n: 0, froid: 0, verdict: false, longue: 0, journal: [] };
  const F = { n: 0, t: 0, nl: 0, tl: 0, mauvaises: 0, bonnes: 0, repos: 0 };
  const groupes = () => ({ petites: [...MEDIATORS.map((m) => m.lampe), contre, ...scene.children.filter((o) => o.isSpotLight)], portes: lampesDehors.filter((l) => !(l.position.x === 0 && Math.abs(l.position.z) < 10)) });
  const fondre = (ms, f) => new Promise((ok) => { const t0 = performance.now(); const pas = () => { const k = Math.min(1, (performance.now() - t0) / ms); f(k); if (k < 1) requestAnimationFrame(pas); else ok(); }; pas(); });
  async function appliquer(n, direct = false) {
    n = Math.max(0, Math.min(DERNIER, Math.round(n) || 0)); if (E.transition || n === E.niveau) return; E.transition = true; E.longue = 0;
    try { const a = E.r, r = reglage(n), G = groupes(), t0 = performance.now();
      const eteindre = [...(a.petites && !r.petites ? G.petites : []), ...(a.portes && !r.portes ? G.portes : [])].filter((l) => l.visible);
      const rallumer = [...(!a.petites && r.petites ? G.petites : []), ...(!a.portes && r.portes ? G.portes : [])], ombres = a.ombres !== r.ombres;
      for (const l of rallumer) l.visible = true;
      if (eteindre.length || ombres) {
        const changer = () => { for (const l of eteindre) l.visible = false; if (ombres) lune.castShadow = r.ombres; }, remettre = () => { for (const l of eteindre) l.visible = true; if (ombres) lune.castShadow = a.ombres; };
        if (direct) changer();
        else { let ou; do { ou = dedans; await preparerMatieres(changer, remettre, () => scene.children.filter((o) => o.visible)); } while (ou !== dedans || enTransit);
          const f = eteindre.map((l) => l.intensity); await fondre(900, (k) => eteindre.forEach((l, i) => { l.intensity = f[i] * (1 - k); }));
          changer(); eteindre.forEach((l, i) => { l.intensity = f[i]; }); }
      }
      if (!direct && E.verdict && (eteindre.length || rallumer.length || ombres)) froidir();
      if (a.flou !== r.flou) { if (r.flou) bloom.enabled = true;
        if (!direct) await fondre(700, (k) => { flouLeger = r.flou ? k : 1 - k; bloom.strength = flouBase * flouLeger; });
        flouLeger = r.flou ? 1 : 0; bloom.strength = flouBase * flouLeger; bloom.enabled = r.flou; }
      if (a.carte !== r.carte) { lune.shadow.mapSize.set(r.carte, r.carte); if (lune.shadow.map) { lune.shadow.map.dispose(); lune.shadow.map = null; } E.forcer = 3; }
      E.cadence = r.cadence; renderer.shadowMap.autoUpdate = r.cadence === 1;
      if (a.pr !== r.pr) { renderer.setPixelRatio(r.pr); composer.setPixelRatio(r.pr); taille(); }
      E.r = r; E.niveau = n; window.__village.modeLeger = n >= 2; E.journal.push({ palier: n, ipsAvant: E.ips, ms: Math.round(performance.now() - t0), plusLongueImageMs: Math.round(E.longue * 1000), a: Math.round(performance.now()) });
      if (!direct && E.auto && !E.verdict && n >= DERNIER) { E.verdict = true; froidir(); }
    } finally { E.transition = false; F.n = F.t = F.nl = F.tl = 0; F.mauvaises = F.bonnes = 0; F.repos = 1.5; }
  }
  function froidir() { for (const I of Object.values(INT)) I.chaud = false; window.__village.chaud = false; E.froid = performance.now(); rechauffer(); }
  function image(dt) {
    if (E.cadence > 1) { renderer.shadowMap.needsUpdate = E.forcer > 0 || enTransit || ++E.n % E.cadence === 0; if (E.forcer > 0) E.forcer--; }
    if (E.transition) E.longue = Math.max(E.longue, dt);
    if (!E.auto || E.transition || E.niveau >= DERNIER) return;
    if (DESC.active || enTransit || document.visibilityState !== 'visible' || (E.verdict && !(window.__village.chaud || performance.now() - E.froid > 60000))) { F.n = F.t = F.nl = F.tl = 0; return; }
    if (F.repos > 0) { F.repos -= dt; return; }
    F.n++; F.t += dt; if (dt > 0.35) { F.nl++; F.tl += dt; }
    if (F.t < 1.25) return;
    const ips = F.n / F.t, sans = F.n > F.nl ? (F.n - F.nl) / (F.t - F.tl) : 0, figee = F.nl > 0; F.n = F.t = F.nl = F.tl = 0;
    if (figee && sans >= SEUIL) return;
    E.ips = Math.round(ips * 10) / 10; if (ips < SEUIL) { F.mauvaises++; F.bonnes = 0; } else { F.bonnes++; F.mauvaises = 0; }
    if (F.mauvaises >= 2) { F.mauvaises = 0; try { localStorage.setItem(MEM, String(E.niveau + 1)); } catch (_) {} appliquer(E.niveau + 1); }
    else if (!E.verdict && F.bonnes >= 2) { E.verdict = true; froidir(); }
  }
  function depart() {
    let n = 0; E.auto = veut === 'auto' || (veut == null && !navigator.webdriver);
    if (veut === '0') { try { localStorage.removeItem(MEM); } catch (_) {} }
    else if (veut === '1') n = DERNIER;
    else if (veutPalier) n = veutPalier;
    else { try { n = Math.max(0, (+localStorage.getItem(MEM) || 0) - 1); } catch (_) {} }
    if (n) appliquer(n, true);
    E.verdict = !E.auto || n >= DERNIER;
  }
  return { image, depart, regler: appliquer, etat: () => ({ niveau: E.niveau, auto: E.auto, verdict: E.verdict, ips: E.ips, transition: E.transition, ...E.r, ratioDePixels: renderer.getPixelRatio(), flouActif: bloom.enabled, ombresPortees: lune.castShadow, carteOmbre: lune.shadow.mapSize.x, journal: E.journal }) };
})();
function image() {
  if (window.__pause) { horloge.getDelta(); touches.clear(); setTimeout(() => requestAnimationFrame(image), 200); return; }
  const brut = horloge.getDelta(), dt = Math.min(brut, 0.05);
  leger.image(brut);
  if (DESC.active) descendre(dt); else { logique(dt); reglerCamera(dt); effacerCeQuiCache(dt); dessinerCarte(); placerEtiquettes(); }
  for (const h of tousHalos) h.visible = h.getWorldPosition(vHalo).distanceToSquared(camera.position) > 2.2;
  composer.render(); if (dedans === 'cinema') INT.cinema.apresRendu();
  requestAnimationFrame(image);
}
function taille() {
  renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); majCarteRepliee();
}
addEventListener('resize', taille);
const QS = new URLSearchParams(location.search), MEM_DESCENTE = 'village-musique.descente';
const DESC = { active: false, t: 0, pret: false, sauter: false, derive: 0, figee: null, voile: false, DUREE: 8.4, PALIER: 0.45, F0: 36 };
function veutDescente() {
  if (QS.get('descente') === '0' || QS.get('essai') === '1') return false;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (QS.get('descente') === '1') return true;
  try { return !localStorage.getItem(MEM_DESCENTE); } catch (_) { return true; }
}
const lisse = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * u * (u * (u * 6 - 15) + 10); };
const etoilesLoin = (() => { const n = 1600, p = new Float32Array(n * 3), r = alea(17);
  for (let i = 0; i < n; i++) { const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u); p.set([Math.cos(a) * s * 1800, u * 1800, Math.sin(a) * s * 1800], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfdcf0, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  pts.frustumCulled = false; pts.visible = false; scene.add(pts); return pts; })();
const lueurMonde = (() => {
  const t = toile(256, 256, (g, S) => { const c = S / 2, d = g.createRadialGradient(c, c, 0, c, c, c);
    d.addColorStop(0, 'rgba(255,176,96,.5)'); d.addColorStop(0.6, 'rgba(255,166,88,.42)'); d.addColorStop(0.66, 'rgba(255,150,74,.2)'); d.addColorStop(0.8, 'rgba(120,80,60,.06)'); d.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = d; g.fillRect(0, 0, S, S); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0, fog: false, blending: THREE.AdditiveBlending }));
  s.position.set(0, -90, 0); s.scale.set(300, 300, 1); s.visible = false; scene.add(s); return s; })();
const basVillage = ciel.material.uniforms.bas.value.clone(), basEspace = new THREE.Color(0x05080f);
const FP = new THREE.Vector3(), FT = new THREE.Vector3(); let FF = 52;
function poseDescente(t) {
  reglerCamera(0, true); FP.copy(camera.position); FT.copy(cible); FF = camera.fov;
  const asp = innerWidth / innerHeight, tv = Math.tan(DESC.F0 / 2 * Math.PI / 180), demi = Math.min(tv, tv * asp), h0 = 84 / (0.36 * demi);
  const eh = lisse(t), ea = lisse(t / 0.6), et = lisse((t - 0.3) / 0.7);
  const h = Math.exp(Math.log(h0) * (1 - eh) + Math.log(FP.y) * eh), rF = Math.hypot(FP.x, FP.z), azF = Math.atan2(FP.x, FP.z);
  const wf = lisse((t - 0.5) / 0.14);
  const r = 0.05 * h0 * (1 - eh) + rF * eh + wf * Math.max(0, h - FP.y) * 1.4, az = azF + (2.6 + DESC.derive) * (1 - ea);
  camera.position.set(Math.sin(az) * r, h, Math.cos(az) * r); camPos.copy(camera.position);
  cible.set(FT.x * et, FT.y * et - 4 * (1 - et), FT.z * et);
  camera.fov = DESC.F0 + (FF - DESC.F0) * eh; camera.near = Math.max(0.1, h * 0.03); camera.far = t >= 1 ? 600 : 2600; camera.updateProjectionMatrix();
  if (wf > 0) {
    const p = joueur.position, vx = cible.x - camPos.x, vz = cible.z - camPos.z, hv = Math.hypot(vx, vz) || 1e-6, th = Math.atan2(cible.y - camPos.y, hv);
    const fi = Math.atan2(p.y - camPos.y, Math.max(0.3, Math.hypot(p.x - camPos.x, p.z - camPos.z))), m = 0.84 * camera.fov / 2 * Math.PI / 180;
    const th2 = th + wf * (Math.min(th, fi + m) - th);
    if (th2 !== th) cible.set(camPos.x + vx / hv * 10 * Math.cos(th2), camPos.y + 10 * Math.sin(th2), camPos.z + vz / hv * 10 * Math.cos(th2));
  }
  camera.lookAt(cible);
  const espace = lisse((h - 30) / 170);
  scene.fog.density = 0.0085 * (1 - lisse((h - 22) / 120)); ciel.material.uniforms.bas.value.copy(basVillage).lerp(basEspace, espace);
  etoilesLoin.material.opacity = 0.8 * lisse((h - 60) / 220); etoilesLoin.visible = etoilesLoin.material.opacity > 0.01; etoilesLoin.position.copy(camera.position);
  etoiles.material.opacity = 0.65 * (1 - espace); etoiles.position.set(camPos.x, 0, camPos.z);
  lueurMonde.material.opacity = lisse((h - 80) / 300); lueurMonde.visible = lueurMonde.material.opacity > 0.01;
  const p = joueur.position; lune.position.set((p.x - 24) * eh - 24 * (1 - eh), 60, (p.z + 20) * eh + 20 * (1 - eh)); lune.target.position.set(p.x * eh, 0, p.z * eh);
  for (const [sp, y] of halosLoin) { const dx = sp.position.x - camPos.x, dz = sp.position.z - camPos.z; sp.position.y = y - K * (dx * dx + dz * dz); }
  const o = t < 0.3 ? 0 : t < 0.4 ? (t - 0.3) / 0.1 : t < 0.56 ? 1 : t < 0.64 ? (0.64 - t) / 0.08 : 0; $('#titre-descente').style.opacity = o.toFixed(3);
}
function descendre(dt) {
  if (DESC.figee == null && !DESC.voile) {
    if (DESC.sauter && DESC.pret) finirDescente(true);
    else { let t = DESC.t + dt / DESC.DUREE; if (!DESC.pret && t > DESC.PALIER) { t = DESC.PALIER; DESC.derive += dt * 0.12; } DESC.t = Math.min(1, t); }
  }
  if (!DESC.active) return;
  poseDescente(DESC.figee ?? DESC.t);
  if (DESC.pret) { if (melangeur) melangeur.update(dt); appliquerPoseV20(); suivreTorse(); }
  if (DESC.figee == null && DESC.t >= 1 && !DESC.voile) finirDescente(false);
}
function finirDescente(viaVoile) {
  const fin = () => { DESC.t = 1; poseDescente(1); DESC.active = false; DESC.figee = null; camera.near = 0.1; camera.far = 600; camera.updateProjectionMatrix();
    scene.fog.density = 0.0085; ciel.material.uniforms.bas.value.copy(basVillage); etoiles.material.opacity = 0.65; etoilesLoin.visible = false; lueurMonde.visible = false;
    $('#titre-descente').style.opacity = 0; touches.clear(); document.body.classList.remove('descente'); try { localStorage.setItem(MEM_DESCENTE, '1'); } catch (_) {} reglerCamera(0, true); };
  if (!viaVoile) { fin(); return; }
  DESC.voile = true; $('#voile').classList.add('noir');
  setTimeout(() => { fin(); requestAnimationFrame(() => requestAnimationFrame(() => { $('#voile').classList.remove('noir'); DESC.voile = false; })); }, 260);
}
function sauterDescente() { if (DESC.active && DESC.figee == null) DESC.sauter = true; }
addEventListener('pointerdown', () => { if (DESC.active) sauterDescente(); }, true);
$('#passer').onclick = sauterDescente;
let boucle = false; const demarrer = () => { if (!boucle) { boucle = true; requestAnimationFrame(image); } };
async function preparerMatieres(changer, remettre, racines) {
  const progs = new Set(), objets = []; let i = 0;
  changer(); try { for (const r of racines()) r.traverse((o) => { if (o.material) objets.push(o); }); } finally { remettre(); }
  while (i < objets.length) {
    const t = performance.now(); changer(); renderer.setRenderTarget(composer.readBuffer);
    scene.traverse = (f) => { do f(objets[i++]); while (i < objets.length && performance.now() - t < 5); };
    try { renderer.compile(scene, camera).forEach((m) => { const q = renderer.properties.get(m).currentProgram; if (q) progs.add(q); }); } catch (_) { i = objets.length; }
    finally { delete scene.traverse; renderer.setRenderTarget(null); remettre(); }
    await new Promise((r) => setTimeout(r, 34));
  }
  await new Promise((ok) => { const t0 = performance.now(); const voir = () => { let pret = true; for (const q of progs) { try { if (!q.isReady()) { pret = false; break; } } catch (_) {} }
    if (pret || performance.now() - t0 > 15000) ok(); else setTimeout(voir, 80); }; setTimeout(voir, 80); });
}
let rechauffe = 0;
async function rechauffer() {
  const moi = ++rechauffe;
  for (const k of Object.keys(INT)) { const I = INT[k]; if (I.chaud || (I.construire && !I.bati)) continue;
    while (enTransit || window.__pause) await new Promise((r) => setTimeout(r, 400));
    if (moi !== rechauffe) return;
    let vus = []; const montrer = () => { vus = Object.values(INT).map((J) => [J, J.groupe.visible]); for (const [J] of vus) J.groupe.visible = J === I; }, cacher = () => { for (const [J, v] of vus) J.groupe.visible = v; };
    await preparerMatieres(montrer, cacher, () => [I.groupe, joueur]);
    if (moi !== rechauffe) return;
    I.chaud = true; tic('chaud : ' + k); await new Promise((r) => setTimeout(r, 250)); }
  if (moi === rechauffe) window.__village.chaud = true; }
(async () => {
  DESC.active = veutDescente();
  if (DESC.active) { document.body.classList.add('descente'); poseDescente(0); demarrer(); requestAnimationFrame(() => $('#chargement').classList.add('fini')); }
  const pSpectacles = fetch('capsules/capsules.json').then((r) => (r.ok ? r.json() : [])).then((L) => Array.isArray(L) && L.some((c) => c && typeof c.groupe === 'string' && c.groupe.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === PORTES.spectacles.groupe.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase())).catch(() => false);
  tic('modules lus'); [police] = await Promise.all([new FontLoader().loadAsync('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/droid/droid_serif_bold.typeface.json'), chargerBonhomme(), document.fonts.ready]);
  await Promise.all([document.fonts.load('600 40px Spectral'), document.fonts.load('700 40px Manrope'), document.fonts.load('600 40px Manrope'), document.fonts.load('500 40px Manrope')]).catch(() => {});
  window.__village.spectacles = await pSpectacles;
  tic('fichiers reçus'); faireEcole(); faireBiblio(); faireChapeau(); tic('trois bâtiments'); faireDecor(); tic('décor'); faireMagasin(); faireCinema(); faireChant();  tic('magasin, cinéma (dehors)'); faireInterieurs(); tic('intérieurs'); preparerCacheurs(); leger.depart();
  majCompteur(); majCarteRepliee(); photoDuHaut(); tic('photo de la carte');
  if (DESC.active) { poseDescente(DESC.figee ?? DESC.t); composer.render(); DESC.pret = true; }
  else { reglerCamera(0, true); DESC.pret = true; $('#chargement').classList.add('fini'); demarrer(); }
  tic('prêt'); if (leger.etat().verdict) setTimeout(rechauffer, 1500);
})().catch((e) => { $('#chargement p').textContent = 'Le village n’a pas pu charger.'; $('#chargement').classList.remove('fini'); document.body.classList.remove('descente'); console.error(e); });
Object.assign(window.__village, { tenirMicro, MAIN, poserBrasMicro, sAsseoir, seLever, SIEGES, faireMicroChant, MICROS_CHANT, faireChanteurKit, get assis() { return assis; }, mettreDos, faireChanteuse, personneFigee, ARCHETYPES, MICROS, faireMicro, FC, FEU, CHANT, PORTE_ANNEXE, ouvrirLieu, fermerLieu, PORTES, OUTILS, POSTES_STUDIO, AVATARS, KITS, mettreKit, oterKit, GUITARES, MEDIATORS, harnais, mettreAvatar, prendreGuitare, choisirFini, boites, ronds, allerDansSalle, joueur, LIEUX, INT, Y0, allerA, entrer, sortir, passer, PUBLIC, bloom, tousHalos, camera, dos, R, scene, chapeau, renderer, composer, lune, eclat, contre, leger, lampesDehors,
  viser: (l) => { lacet = lacetVise = l; },
  majCarteRepliee, descente: { etat: () => ({ active: DESC.active, t: DESC.t, pret: DESC.pret, figee: DESC.figee, sauter: DESC.sauter, near: camera.near, far: camera.far, fov: camera.fov, cam: camera.position.toArray(), corps: document.body.classList.contains('descente') }), figer: (t) => { DESC.figee = t; }, lacher: () => { DESC.figee = null; }, placer: (t) => { DESC.t = t; }, sauter: sauterDescente }, simuler: (secondes) => { for (let i = 0; i < secondes * 60; i++) logique(1 / 60); reglerCamera(1, true); camera.updateMatrixWorld(); effacerCeQuiCache(1); },
  etat: () => ({ kit, x: joueur.position.x, y: joueur.position.y, z: joueur.position.z, anim: actuelle, proche: procheDe, mediatorTrouve: nbMediators() > 0, mediators: nbMediators(), lieuOuvert, portee: { ...portee }, guitare: dosIn.children[0] ? { ...dosIn.children[0].userData } : null, lisere: !!(dosIn.children[0] && dosIn.children[0].children.some((o) => o.material === matLisere)), finisVisibles: $('#finis').classList.contains('visible'), avatar, serre, dedans, enTransit, invite: invite ? invite.texte : null, titrePanneau: $('#lieu-titre').textContent }) });
