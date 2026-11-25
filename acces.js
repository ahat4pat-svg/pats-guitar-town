// Le cadenas des cours est le même pour la guitare et pour le chant.
// Un item marqué « essai » ou « à venir » s'affiche « Bientôt » dans la version publique
// (voir ouvrirLieu). Aucun nom d'élève n'est écrit ici : Patrick ajoutera les fiches.

export const FICHES_ELEVES = [];
let actif = null;

// Le calendrier (ou un autre module) désigne l'élève en cours sans modifier les salles.
export function definirEleveActif(id) { actif = id || null; }
export function eleveActif() { return actif; }

// Sans fiche, ou sans élève désigné, les deux volets restent ouverts — comme les cours de guitare aujourd'hui.
// Une fiche : { id, nom, cours: 'guitare' | 'chant' | 'les-deux' } ou cours: ['guitare', 'chant'].
export function coursOuvert(cours) {
  if (!cours || !FICHES_ELEVES.length || !actif) return true;
  const f = FICHES_ELEVES.find((e) => e && (e.id === actif || e.nom === actif));
  if (!f || f.cours == null) return true;
  const c = f.cours;
  if (c === 'les-deux') return true;
  if (Array.isArray(c)) return c.includes(cours);
  return c === cours;
}
