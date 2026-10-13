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
  /** Fiche du catalogue montrant le même exercice (id free-exercise-db) : la recherche du catalogue renvoie vers la fiche complète. */
  catalog?: string
}

export const DEMOS: Record<string, Demo> = {
  'sl-balance': { photos: false, video: 'single leg balance exercise ankle proprioception' },
  'tibialis-raise': { photos: false, video: 'tibialis raise against wall' },
  'calf-raise-warm': { photos: true, note: 'Version sur haltère ; à l’échauffement, sur une marche au poids du corps.', video: 'calf raise on step soleus gastrocnemius' },
  'sl-glute-bridge': { photos: true, video: 'single leg glute bridge', catalog: 'Single_Leg_Glute_Bridge' },
  'banded-walk': { photos: true, note: 'Élastique au-dessus des genoux.', video: 'banded lateral walk glute medius', catalog: 'Monster_Walk' },
  'spanish-squat': { photos: false, video: 'spanish squat isometric patellar tendon' },
  'db-rdl': { photos: true, note: 'Photo à la barre ; même mouvement aux haltères.', video: 'dumbbell romanian deadlift form', catalog: 'Romanian_Deadlift' },
  bulgarian: { photos: true, note: 'Photo à la barre ; aux haltères, buste incliné ~20°.', video: 'bulgarian split squat glute focus forward lean', catalog: 'Split_Squat_with_Dumbbells' },
  'leg-curl': { photos: true, note: 'Photo à deux jambes ; fais-le une jambe à la fois.', video: 'single leg seated leg curl', catalog: 'Seated_Leg_Curl' },
  'nordic-curl': { photos: true, note: 'Photo : « glute-ham raise » au poids du corps, même mouvement. Descends le plus lentement possible, hanches tendues.', video: 'nordic hamstring curl beginner', catalog: 'Natural_Glute_Ham_Raise' },
  'hip-abduction': { photos: true, video: 'hip abduction machine glute medius', catalog: 'Thigh_Abductor' },
  'standing-calf': { photos: true, note: 'Photo à deux jambes ; fais-le sur une jambe, haltère côté travail.', video: 'single leg standing calf raise dumbbell', catalog: 'Standing_Dumbbell_Calf_Raise' },
  'sl-rdl': { photos: true, note: 'Photo au kettlebell ; même mouvement à l’haltère.', video: 'single leg romanian deadlift dumbbell', catalog: 'Kettlebell_One-Legged_Deadlift' },
  'hip-thrust': { photos: true, note: 'Photo à deux jambes ; version une jambe, haltère sur la hanche.', video: 'single leg hip thrust bench', catalog: 'Barbell_Hip_Thrust' },
  'leg-press-high': { photos: true, note: 'Photo à deux jambes ; un seul pied, haut sur la plateforme.', video: 'single leg leg press high foot placement', catalog: 'Leg_Press' },
  'step-down': { photos: false, video: 'eccentric step down knee control' },
  'copenhagen-plank': { photos: true, note: 'Base : planche latérale. Au Copenhague, le pied du haut est posé sur un banc.', video: 'copenhagen plank adductor' },
  'soleus-raise': { photos: true, video: 'seated soleus raise dumbbell', catalog: 'Dumbbell_Seated_One-Leg_Calf_Raise' },
  'sl-calf-raise': { photos: true, note: 'Sur une jambe, main au mur pour l’équilibre.', video: 'single leg calf raise on step', catalog: 'Calf_Raise_On_A_Dumbbell' },
  // Bibliothèque (data/extras.ts)
  'goblet-squat': { photos: true, video: 'goblet squat form', catalog: 'Goblet_Squat' },
  'bw-squat': { photos: true, video: 'bodyweight squat form', catalog: 'Bodyweight_Squat' },
  'reverse-lunge': { photos: true, video: 'dumbbell reverse lunge', catalog: 'Dumbbell_Rear_Lunge' },
  'step-up': { photos: true, video: 'dumbbell step up knee', catalog: 'Dumbbell_Step_Ups' },
  'leg-extension': { photos: true, note: 'Photo à une jambe : alterne les côtés.', video: 'single leg extension machine', catalog: 'Single-Leg_Leg_Extension' },
  'wall-sit': { photos: false, video: 'wall sit isometric knee' },
  'jump-squat': { photos: true, video: 'jump squat landing mechanics', catalog: 'Freehand_Jump_Squat' },
  plank: { photos: true, video: 'forearm plank form', catalog: 'Plank' },
  'side-plank': { photos: true, video: 'side plank form', catalog: 'Side_Bridge' },
  'dead-bug': { photos: true, video: 'dead bug exercise', catalog: 'Dead_Bug' },
  'bird-dog': { photos: false, video: 'bird dog exercise' },
  'push-up': { photos: true, video: 'push up form', catalog: 'Pushups' },
  'db-row': { photos: true, video: 'bent over dumbbell row', catalog: 'Bent_Over_Two-Dumbbell_Row' },
  'db-press': { photos: true, video: 'seated dumbbell shoulder press', catalog: 'Dumbbell_Shoulder_Press' },
  'power-hike': { photos: true, note: 'Pente 12-15 %, sans tenir les barres.', video: 'incline treadmill power hiking trail', catalog: 'Walking_Treadmill' },
  // Bibliothèque : ajouts
  'glute-bridge': { photos: true, video: 'glute bridge form', catalog: 'Butt_Lift_Bridge' },
  'ball-leg-curl': { photos: true, video: 'stability ball hamstring curl', catalog: 'Ball_Leg_Curl' },
  'kb-swing': { photos: true, note: 'Photo à une main ; commence à deux mains.', video: 'kettlebell swing hip hinge', catalog: 'One-Arm_Kettlebell_Swings' },
  'back-extension': { photos: true, video: '45 degree back extension glutes', catalog: 'Hyperextensions_Back_Extensions' },
  'glute-kickback': { photos: true, video: 'quadruped glute kickback', catalog: 'Glute_Kickback' },
  'walking-lunge': { photos: true, video: 'walking lunge form', catalog: 'Bodyweight_Walking_Lunge' },
  'lateral-lunge': { photos: true, note: 'Photo à la barre ; fais-la au poids du corps ou haltère contre la poitrine.', video: 'lateral lunge form', catalog: 'Barbell_Side_Split_Squat' },
  'hip-adduction': { photos: true, video: 'hip adduction machine', catalog: 'Thigh_Adductor' },
  'jump-rope': { photos: true, video: 'jump rope basics for runners', catalog: 'Rope_Jumping' },
  'lateral-bound': { photos: true, video: 'lateral bound skater jump', catalog: 'Lateral_Bound' },
  'box-jump': { photos: true, video: 'box jump landing technique', catalog: 'Front_Box_Jump' },
  'pallof-press': { photos: true, video: 'pallof press anti rotation', catalog: 'Pallof_Press' },
  'knee-raise': { photos: true, video: 'captains chair knee raise', catalog: 'Knee_Hip_Raise_On_Parallel_Bars' },
  'farmer-walk': { photos: true, note: 'Photo avec poignées de fermier ; même geste avec 2 haltères lourds.', video: 'farmers walk dumbbells' },
  'mountain-climber': { photos: true, video: 'mountain climbers form', catalog: 'Mountain_Climbers' },
  superman: { photos: true, video: 'superman exercise lower back', catalog: 'Superman' },
  'lat-pulldown': { photos: true, video: 'lat pulldown form', catalog: 'Wide-Grip_Lat_Pulldown' },
  'inverted-row': { photos: true, video: 'inverted row smith machine', catalog: 'Inverted_Row' },
  'db-bench': { photos: true, video: 'dumbbell bench press form', catalog: 'Dumbbell_Bench_Press' },
  'leg-swings': { photos: true, video: 'leg swings warm up runners', catalog: 'Front_Leg_Raises' },
  'hip-flexion-band': { photos: true, video: 'banded hip flexion march', catalog: 'Hip_Flexion_with_Band' },
}

/** Fiche du catalogue → exercice de la bibliothèque (fiche complète). */
export const LIBRARY_OF_CATALOG: Record<string, string> = Object.fromEntries(
  Object.entries(DEMOS)
    .filter(([, d]) => d.catalog)
    .map(([id, d]) => [d.catalog!, id]),
)

export const videoUrl = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
