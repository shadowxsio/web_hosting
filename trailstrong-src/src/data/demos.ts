/**
 * Démos visuelles : paires de photos départ / fin (free-exercise-db, domaine
 * public — Unlicense) embarquées dans public/demos/ et lues en boucle façon GIF,
 * + recherche vidéo YouTube pour chaque exercice.
 */
export interface Demo {
  /** Photos disponibles : public/demos/{id}-0.webp et -1.webp. */
  photos: boolean
  /** Précision si la photo montre une variante. */
  note?: string
  /** Requête de recherche vidéo (en anglais : bien plus de résultats). */
  video: string
}

export const DEMOS: Record<string, Demo> = {
  'sl-balance': { photos: false, video: 'single leg balance exercise ankle proprioception' },
  'tibialis-raise': { photos: false, video: 'tibialis raise against wall' },
  'calf-raise-warm': { photos: true, note: 'Version sur haltère ; à l’échauffement, sur une marche au poids du corps.', video: 'calf raise on step soleus gastrocnemius' },
  'sl-glute-bridge': { photos: true, video: 'single leg glute bridge' },
  'banded-walk': { photos: true, note: 'Élastique au-dessus des genoux.', video: 'banded lateral walk glute medius' },
  'spanish-squat': { photos: false, video: 'spanish squat isometric patellar tendon' },
  'db-rdl': { photos: true, note: 'Photo à la barre ; même mouvement aux haltères.', video: 'dumbbell romanian deadlift form' },
  bulgarian: { photos: true, note: 'Photo à la barre ; aux haltères, buste incliné ~20°.', video: 'bulgarian split squat glute focus forward lean' },
  'leg-curl': { photos: true, note: 'Photo à deux jambes ; fais-le une jambe à la fois.', video: 'single leg seated leg curl' },
  'nordic-curl': { photos: false, video: 'nordic hamstring curl beginner' },
  'hip-abduction': { photos: true, video: 'hip abduction machine glute medius' },
  'standing-calf': { photos: true, note: 'Photo à deux jambes ; fais-le sur une jambe, haltère côté travail.', video: 'single leg standing calf raise dumbbell' },
  'sl-rdl': { photos: true, note: 'Photo au kettlebell ; même mouvement à l’haltère.', video: 'single leg romanian deadlift dumbbell' },
  'hip-thrust': { photos: true, note: 'Photo à deux jambes ; version une jambe, haltère sur la hanche.', video: 'single leg hip thrust bench' },
  'leg-press-high': { photos: true, note: 'Photo à deux jambes ; un seul pied, haut sur la plateforme.', video: 'single leg leg press high foot placement' },
  'step-down': { photos: false, video: 'eccentric step down knee control' },
  'copenhagen-plank': { photos: true, note: 'Base : planche latérale. Au Copenhague, le pied du haut est posé sur un banc.', video: 'copenhagen plank adductor' },
  'soleus-raise': { photos: true, video: 'seated soleus raise dumbbell' },
  'sl-calf-raise': { photos: true, note: 'Sur une jambe, main au mur pour l’équilibre.', video: 'single leg calf raise on step' },
  'power-hike': { photos: true, note: 'Pente 12-15 %, sans tenir les barres.', video: 'incline treadmill power hiking trail' },
}

export const videoUrl = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
