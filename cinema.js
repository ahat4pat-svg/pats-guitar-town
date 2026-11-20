import { PUBLIC } from './config.js';
import { PORTES } from './portes.js';
const ESSAI = !PUBLIC && new URLSearchParams(location.search).get('essai') === '1';
const SOURCE = 'capsules/capsules.json';
const MEM_MODE = 'village-musique.cinema-mode', MEM_YT = 'village-musique.youtube', MAX_YT = 40;
const $ = (q) => document.querySelector(q);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sansAccents = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const V = () => (window.__village && window.__village.cinema) || null;
const ICONE = { lecture: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="#03050A" d="M4 2.2v11.6L13.5 8z"/></svg>', pause: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="#03050A" d="M3.5 2.5h3.2v11H3.5zM9.3 2.5h3.2v11H9.3z"/></svg>' };
export const idYoutube = (u) => { const m = /(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})(?![\w-])/.exec(String(u || '')); return m ? m[1] : null; };
export const duree = (d) => { if (d == null || d === '') return ''; if (typeof d === 'number' && isFinite(d)) { const s = Math.max(0, Math.round(d)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`; } return String(d).trim(); };
export const secondes = (d) => { if (typeof d === 'number' && isFinite(d)) return d; const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/.exec(String(d || '').trim()); return m ? (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) : 0; };
let ouvert = false, liste = [], toutes = [], visibles = [], ignorees = [], enCours = null, jeu = null, finYoutube = 0, porte = 'cours';
const estSpectacle = (c) => !!c.groupe && sansAccents(c.groupe) === sansAccents(PORTES.spectacles.groupe);
let mode = (() => { try { return localStorage.getItem(MEM_MODE) === 'grand' ? 'grand' : 'ecran'; } catch (_) { return 'ecran'; } })();
const video = document.createElement('video'); video.id = 'cine-video'; video.playsInline = true; video.preload = 'metadata';
$('#cine-reserve').append(video);
class ErreurListe extends Error { constructor(detail) { super(detail); this.detail = detail; } }
function verifier(d) {
  if (!Array.isArray(d)) throw new ErreurListe('');
  const bonnes = [], mauvaises = [];
  d.forEach((c, i) => {
    const titre = c && typeof c.titre === 'string' ? c.titre.trim() : '', yt = c && idYoutube(c.youtube), fichier = c && typeof c.fichier === 'string' ? c.fichier.trim() : '';
    if (!titre || (!yt && !fichier)) { mauvaises.push(i + 1); return; }
    bonnes.push({ titre, youtube: yt ? String(c.youtube).trim() : '', yt, fichier: yt ? '' : fichier, duree: duree(c.duree), sec: secondes(c.duree), vignette: typeof c.vignette === 'string' ? c.vignette.trim() : '', groupe: typeof c.groupe === 'string' ? c.groupe.trim() : '', cherche: sansAccents(titre + ' ' + (c.groupe || '')) });
  });
  return [bonnes, mauvaises];
}
async function lire() {
  const arret = new AbortController(), minuterie = setTimeout(() => arret.abort(), 6000);
  try {
    const r = await fetch(SOURCE, { cache: 'no-store', signal: arret.signal });
    if (r.status === 404) return [[], []];
    if (!r.ok) throw new ErreurListe('');
    const texte = (await r.text()).replace(/^﻿/, '');
    if (!texte.trim()) return [[], []];
    let d; try { d = JSON.parse(texte); }
    catch (e) { const m = /position (\d+)/.exec(e.message), ligne = m ? texte.slice(0, +m[1]).split('\n').length : 0;
      throw new ErreurListe(''); }
    return verifier(d);
  } catch (e) { if (e instanceof ErreurListe) throw e; throw new ErreurListe(''); }
  finally { clearTimeout(minuterie); }
}
const majAffiches = () => { if (V()) V().affiches(toutes.filter((c) => c.vignette && !estSpectacle(c)).slice(0, 2).map((c) => c.vignette)); };
function vue(nom) { $('#cinema').dataset.vue = nom; const lecture = nom === 'lecture', f = $('#cine-fermer'); f.textContent = lecture ? '✕' : 'Revenir à la salle'; f.setAttribute('aria-label', 'Revenir à la salle'); f.title = lecture ? 'Revenir à la salle' : ''; }
function entete(c) { $('#cinema').dataset.porte = porte; $('#cine-sur').textContent = 'Le cinéma' + (c ? ' · ' + PORTES[porte].nom : '') + (c && c.groupe && porte === 'cours' ? ' · ' + c.groupe : ''); $('#cine-titre').textContent = c ? c.titre : PORTES[porte].nom; }
function montrerListe() {
  const n = sansAccents($('#cine-cherche').value.trim()); $('#cine-efface').hidden = !$('#cine-cherche').value;
  visibles = n ? liste.filter((c) => c.cherche.includes(n)) : liste;
  const mot = porte === 'spectacles' ? ' spectacle' : ' capsule', nb = liste.length + mot + (liste.length > 1 ? 's' : ''), pl = ignorees.length > 1;
  $('#cine-compte').textContent = n ? visibles.length + ' sur ' + liste.length : nb;
  $('#cine-ignorees').hidden = PUBLIC || !ignorees.length;
  $('#cine-ignorees').textContent = '';
  const groupes = porte === 'cours' && liste.some((c) => c.groupe); let h = '', avant = null;
  const ordre = groupes ? [...new Set(visibles.map((c) => c.groupe))].flatMap((g) => visibles.filter((c) => c.groupe === g)) : visibles;
  visibles = ordre;
  ordre.forEach((c, i) => {
    if (groupes && c.groupe !== avant) { avant = c.groupe; h += `<li class="groupe">${esc(c.groupe || 'Autres')}</li>`; }
    h += `<li><button data-i="${i}">${c.vignette ? `<img src="${esc(c.vignette)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<i aria-hidden="true">▶</i>'}<b>${esc(c.titre)}</b><span>${esc(c.duree)}</span></button></li>`;
  });
  $('#cine-liste').innerHTML = h || '<li class="vide">Rien ne correspond à cette recherche.</li>'; $('#cine-liste').scrollTop = 0;
}
export async function ouvrir(p = 'cours') {
  if (ouvert) return;
  porte = PORTES[p] ? p : 'cours';
  arreterLecture(); ouvert = true; window.__pause = true;
  entete(null); $('#cine-cherche').value = ''; vue('attente'); $('#cinema').classList.add('ouvert');
  if (porte === 'youtube') { $('#yt-lien').value = ''; avisYoutube(''); montrerYoutube(); vue('youtube'); (matchMedia('(pointer:coarse)').matches ? $('#cine-fermer') : $('#yt-lien')).focus({ preventScroll: true }); return; }
  try {
    const [bonnes, mauvaises] = await lire(); if (!ouvert) return;
    toutes = bonnes; liste = bonnes.filter((c) => estSpectacle(c) === (porte === 'spectacles')); ignorees = porte === 'cours' ? mauvaises : []; majAffiches();
    if (!liste.length && !ignorees.length) { $('#cine-vide-spectacles').textContent = PORTES.spectacles.vide;  vue('vide'); $('#cine-fermer').focus({ preventScroll: true }); return; }
    $('#cine-champ').hidden = liste.length <= 12;
    montrerListe(); vue('liste'); (liste.length > 12 && !matchMedia('(pointer:coarse)').matches ? $('#cine-cherche') : $('#cine-liste button') || $('#cine-fermer')).focus({ preventScroll: true });
  } catch (e) {
    if (!ouvert) return; $('#cine-erreur-detail').textContent = e.detail || ''; vue('erreur'); $('#cine-reessayer').focus({ preventScroll: true });
  }
}
function cacherPanneau() { $('#cinema').classList.remove('ouvert'); ouvert = false; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }
export function fermer() {
  const jouait = !!jeu; arreterLecture(); cacherPanneau(); vue('attente'); window.__pause = false;
  if (V()) V().baisser(false, !jouait);
}
export function arreter() { if (!ouvert && !jeu) return; arreterLecture(); cacherPanneau(); vue('attente'); window.__pause = false; if (V()) V().baisser(false, true); }
function arreterLecture() {
  clearTimeout(finYoutube);
  video.pause(); if (video.getAttribute('src')) { video.removeAttribute('src'); video.load(); } video.controls = false; $('#cine-reserve').append(video);
  $('#cine-scene').innerHTML = ''; $('#cine-cadre-ecran').innerHTML = ''; $('#cine-cadre-ecran').hidden = true; $('#cine-barre').hidden = true;
  if (V()) { V().montrer(null); V().vue(false); }
  jeu = null; enCours = null;
}
const ORIGINE_YT = 'https://www.youtube-nocookie.com';
const cadreYoutube = (c) => { const f = document.createElement('iframe'); f.title = c.titre; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.referrerPolicy = 'strict-origin-when-cross-origin';
  f.src = ORIGINE_YT + '/embed/' + c.yt + '?' + (c.liste ? 'list=' + c.liste + '&' : '') + 'autoplay=1&rel=0&playsinline=1&enablejsapi=1&origin=' + encodeURIComponent(location.origin);
  f.addEventListener('load', () => { try { f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), ORIGINE_YT); } catch (_) {} });
  return f; };
const lumieres = (etat) => { if (jeu && V()) V().baisser(etat, jeu === 'grand'); };
export function etatYoutube(n) { if (!enCours || !enCours.yt) return; if (n === 1) lumieres(true); else if (n === 2) lumieres('pause'); else if (n === 0) { clearTimeout(finYoutube); lumieres(false); } }
addEventListener('message', (e) => { if (!/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(e.origin) || !enCours || !enCours.yt) return;
  let d = e.data; try { if (typeof d === 'string') d = JSON.parse(d); } catch (_) { return; }
  const n = d && d.info && (typeof d.info === 'number' ? d.info : d.info.playerState); if (typeof n === 'number') etatYoutube(n);
  const t = d && d.info && d.info.videoData && d.info.videoData.title; if (t && enCours.perso && !enCours.liste) nommerLien(enCours.perso, t); });
function majBarre() { const b = $('#cine-jouer'), yt = !!(enCours && enCours.yt); b.hidden = yt; b.innerHTML = video.paused ? ICONE.lecture : ICONE.pause; b.setAttribute('aria-label', video.paused ? 'Lecture' : 'Pause'); }
function suivreEcran() { if (jeu !== 'ecran' || !enCours || !enCours.yt || !V()) return; const r = V().rect(), s = $('#cine-cadre-ecran').style;
  s.left = r.x + 'px'; s.top = r.y + 'px'; s.width = r.w + 'px'; s.height = r.h + 'px'; requestAnimationFrame(suivreEcran); }
export function jouer(c, ou = mode, depuis = 0) {
  if (!c) return; arreterLecture(); enCours = c; jeu = ou === 'ecran' && V() ? 'ecran' : 'grand'; entete(c);
  if (c.fichier) { video.src = c.fichier; if (depuis > 0) video.addEventListener('loadedmetadata', () => { try { video.currentTime = depuis; } catch (_) {} }, { once: true }); }
  if (jeu === 'grand') {
    ouvert = true; window.__pause = true; $('#cinema').classList.add('ouvert'); vue('lecture');
    if (c.fichier) { video.controls = true; $('#cine-scene').append(video); } else $('#cine-scene').append(cadreYoutube(c));
    if (V()) V().baisser(true, true);
    $('#cine-vers-ecran').hidden = !V();
  } else {
    cacherPanneau(); window.__pause = false; V().vue(true); V().baisser(true);
    if (c.fichier) { video.controls = false; V().montrer(video); }
    else { $('#cine-cadre-ecran').append(cadreYoutube(c)); $('#cine-cadre-ecran').hidden = false; requestAnimationFrame(suivreEcran); }
    $('#cine-barre-titre').textContent = c.titre; $('#cine-barre').hidden = false;
  }
  if (c.yt && c.sec > 0) finYoutube = setTimeout(() => etatYoutube(0), (c.sec + 8) * 1000);
  if (c.fichier) video.play().catch(() => {}).finally(majBarre); majBarre();
}
function basculer() { if (!enCours) return; const c = enCours, t = c.fichier ? video.currentTime : 0; mode = jeu === 'grand' ? 'ecran' : 'grand'; try { localStorage.setItem(MEM_MODE, mode); } catch (_) {} jouer(c, mode, t); }
function retourListe() { arreterLecture(); if (V()) V().baisser(false, true); ouvert = false; ouvrir(porte); }
function pauseOuLecture() { if (!enCours || !enCours.fichier) return; if (video.paused) video.play().catch(() => {}); else video.pause(); }
for (const ev of ['play', 'pause', 'ended']) video.addEventListener(ev, () => { majBarre(); lumieres(video.ended ? false : video.paused ? 'pause' : true); });
video.addEventListener('error', () => { if (!enCours || !enCours.fichier || !video.getAttribute('src')) return; const c = enCours; arreterLecture(); if (V()) V().baisser(false, true);
  ouvert = true; window.__pause = true; $('#cinema').classList.add('ouvert'); entete(c); $('#cine-erreur-detail').textContent = ''; vue('erreur'); });
export function lienYoutube(texte) {
  let s = String(texte || '').trim(); if (!s) return { erreur: 'vide' };
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  let u; try { u = new URL(s); } catch (_) { return { erreur: 'forme' }; }
  const hote = u.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  if (!['youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(hote)) return { erreur: 'ailleurs' };
  const ID = /^[\w-]{11}$/, LISTE = /^[\w-]{12,64}$/, l = u.searchParams.get('list') || '', liste = LISTE.test(l) ? l : '';
  let v = ''; if (hote === 'youtu.be') v = u.pathname.split('/')[1] || ''; else if (u.pathname === '/watch') v = u.searchParams.get('v') || ''; else { const m = /^\/(?:shorts|embed|live)\/([\w-]+)/.exec(u.pathname); if (m) v = m[1]; }
  if (!ID.test(v) || v === 'videoseries') v = '';
  if (!v && !liste) return { erreur: 'forme' };
  return v ? { yt: v, liste, cle: v + (liste ? '+' + liste : ''), adresse: 'https://youtu.be/' + v + (liste ? '?list=' + liste : '') } : { yt: 'videoseries', liste, cle: '+' + liste, adresse: 'https://www.youtube.com/playlist?list=' + liste };
}
const AVIS_YT = { vide: 'Colle d’abord un lien YouTube dans la case.', ailleurs: 'Ce lien ne vient pas de YouTube. Ici, on joue seulement des vidéos et des listes de lecture YouTube.',
  forme: 'Ce lien YouTube n’est pas reconnu. Les formes qui marchent : youtube.com/watch?v=…, youtu.be/…, youtube.com/shorts/…, youtube.com/playlist?list=…' };
const lireLiens = () => { try { const d = JSON.parse(localStorage.getItem(MEM_YT)); return Array.isArray(d) ? d.map((x) => ({ ...lienYoutube(x && x.adresse), nom: x && typeof x.nom === 'string' ? x.nom.slice(0, 140) : '' })).filter((x) => !x.erreur).slice(0, MAX_YT) : []; } catch (_) { return []; } };
const ecrireLiens = (L) => { try { localStorage.setItem(MEM_YT, JSON.stringify(L.slice(0, MAX_YT))); } catch (_) {} };
const nomLien = (x) => (x.nom ? x.nom : x.yt === 'videoseries' ? 'Liste de lecture' : x.liste ? 'Vidéo, dans une liste de lecture' : 'Vidéo');
function avisYoutube(t) { const a = $('#yt-avis'); a.textContent = t; a.hidden = !t; }
function montrerYoutube() { const L = lireLiens(); $('#yt-rien').hidden = !!L.length;
  $('#yt-liste').innerHTML = L.map((x, i) => `<li><button class="rejouer" data-i="${i}"><i aria-hidden="true">▶</i><span><b>${esc(nomLien(x))}</b><small>${esc(x.adresse.replace(/^https:\/\/(www\.)?/, ''))}</small></span></button><button class="enlever" data-i="${i}" aria-label="Enlever ce lien" title="Enlever ce lien">✕</button></li>`).join(''); }
function nommerLien(cle, titre) { const L = lireLiens(), x = L.find((q) => q.cle === cle); if (!x || x.nom) return; x.nom = String(titre).slice(0, 140); ecrireLiens(L); if (enCours && enCours.perso === cle) { enCours.titre = x.nom; if (jeu === 'grand') $('#cine-titre').textContent = x.nom; else $('#cine-barre-titre').textContent = x.nom; } }
const capsuleDe = (x) => ({ titre: nomLien(x), yt: x.yt, liste: x.liste || '', perso: x.cle, fichier: '', youtube: x.adresse, groupe: '', duree: '', sec: 0, vignette: '' });
export function jouerLien(texte) { const r = lienYoutube(texte); if (r.erreur) { avisYoutube(AVIS_YT[r.erreur]); return r; }
  const L = lireLiens(), deja = L.find((q) => q.cle === r.cle), x = deja || { cle: r.cle, yt: r.yt, liste: r.liste, adresse: r.adresse, nom: '' };
  ecrireLiens([x, ...L.filter((q) => q.cle !== r.cle)]); avisYoutube(''); porte = 'youtube'; jouer(capsuleDe(x)); return r; }
$('#yt-forme').onsubmit = (e) => { e.preventDefault(); const r = jouerLien($('#yt-lien').value); if (r.erreur) $('#yt-lien').focus({ preventScroll: true }); };
$('#yt-lien').oninput = () => avisYoutube('');
$('#yt-liste').onclick = (e) => { const b = e.target.closest('button[data-i]'); if (!b) return; const L = lireLiens(), x = L[+b.dataset.i]; if (!x) return;
  if (b.classList.contains('enlever')) { ecrireLiens(L.filter((q) => q.cle !== x.cle)); montrerYoutube(); ($('#yt-liste .rejouer') || $('#yt-lien')).focus({ preventScroll: true }); } else jouerLien(x.adresse); };
$('#cine-fermer').onclick = fermer;
$('#cine-retour').onclick = retourListe;
$('#cine-reessayer').onclick = () => { ouvert = false; ouvrir(porte); };
$('#cine-cherche').oninput = montrerListe;
$('#cine-efface').onclick = () => { $('#cine-cherche').value = ''; montrerListe(); $('#cine-cherche').focus({ preventScroll: true }); };
$('#cine-liste').onclick = (e) => { const b = e.target.closest('button[data-i]'); if (b) jouer(visibles[+b.dataset.i]); };
$('#cine-vers-ecran').onclick = basculer;
$('#cine-jouer').onclick = pauseOuLecture;
$('#cine-barre-liste').onclick = retourListe;
$('#cine-barre-grand').onclick = basculer;
$('#cine-barre-fermer').onclick = fermer;
addEventListener('keydown', (e) => {
  if (!ouvert && jeu !== 'ecran') return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); if (jeu) retourListe(); else fermer(); return; }
  if (jeu === 'ecran') { if (e.key === ' ') { e.preventDefault(); pauseOuLecture(); } e.stopImmediatePropagation(); }
}, true);
{ let essais = 0; const t = setInterval(() => { if (!V() && ++essais < 240) return; clearInterval(t); if (!V()) return; lire().then(([b]) => { toutes = b; majAffiches(); }).catch(() => {}); }, 500); }
window.__cinema = { ouvrir, fermer, arreter, jouer, idYoutube, duree, secondes, verifier, etatYoutube, lienYoutube, jouerLien, nommerLien, liens: lireLiens, PORTES, SOURCE, ESSAI,
  etat: () => ({ porte, avis: $('#yt-avis').textContent, ouvert, vue: $('#cinema').dataset.vue, jeu, mode, total: liste.length, visibles: visibles.length, ignorees: [...ignorees], titre: $('#cine-titre').textContent, sur: $('#cine-sur').textContent,
    enCours: enCours ? enCours.titre : null, temps: video.currentTime, enPause: video.paused, fini: video.ended, src: video.getAttribute('src'), largeurVideo: video.videoWidth,
    cadre: (document.querySelector('#cine-scene iframe, #cine-cadre-ecran iframe') || { src: null }).src, barre: !$('#cine-barre').hidden, pause: window.__pause === true }) };
