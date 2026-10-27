export type PartId = 'floor' | 'front' | 'back' | 'left' | 'right' | 'roof'
export type Vec3 = [number, number, number]

export interface Step {
  kicker: string
  title: string
  text: string
  facts: string[]
  /** Pièce mise en avant à cette étape */
  active: PartId | null
  /** Pièces déjà posées à leur place (cumulatif) */
  placed: PartId[]
  /** Orientation de la maison (radians, axe Y) */
  rotY: number
  /** Position caméra */
  cam: Vec3
  /** Hauteur visée par la caméra */
  lookY?: number
  celebrate?: boolean
}

const HALF_PI = Math.PI / 2

export const PART_LABELS: Record<PartId, string> = {
  floor: 'Fondations · Capacité',
  front: 'Mur 1 · Apport',
  left: 'Mur 2 · Comparer',
  right: 'Mur 3 · Dossier',
  back: 'Mur 4 · Assurance',
  roof: 'Toit · Offre de prêt',
}

export const STEPS: Step[] = [
  {
    kicker: 'Introduction',
    title: 'Un prêt, c’est comme une maison',
    text: 'Des fondations, quatre murs et un toit : chaque étape du crédit immobilier en est une pièce. Faites glisser pour la construire, pièce par pièce.',
    facts: ['≈ 3 à 4 mois du compromis aux clés'],
    active: null,
    placed: [],
    rotY: 0.55,
    cam: [0, 2.2, 8],
  },
  {
    kicker: 'Fondations',
    title: 'Votre capacité d’emprunt',
    text: 'Tout repose dessus. Les banques limitent le taux d’endettement à 35 % de vos revenus nets, assurance comprise, sur 25 ans maximum.',
    facts: ['35 % d’endettement max', '25 ans (27 dans le neuf)', 'Reste à vivre'],
    active: 'floor',
    placed: ['floor'],
    rotY: 0.55,
    cam: [0, 0.6, 8.6],
    lookY: -0.35,
  },
  {
    kicker: 'Mur 1',
    title: 'L’apport personnel',
    text: 'Visez au moins 10 % du prix : il couvre les frais de notaire et de garantie, rassure la banque et améliore votre taux.',
    facts: ['≈ 10 % du prix', 'Notaire : 7–8 % ancien', '2–3 % neuf'],
    active: 'front',
    placed: ['floor', 'front'],
    rotY: 0.3,
    cam: [0, 2.2, 8.4],
  },
  {
    kicker: 'Mur 2',
    title: 'Simuler & comparer',
    text: 'Comparez les offres de plusieurs banques, seul ou via un courtier. Le bon indicateur n’est pas le taux nominal, mais le TAEG.',
    facts: ['TAEG = taux + assurance + frais', 'Courtier', 'Négociation'],
    active: 'left',
    placed: ['floor', 'front', 'left'],
    rotY: HALF_PI - 0.35,
    cam: [0, 2.2, 8.4],
  },
  {
    kicker: 'Mur 3',
    title: 'Le dossier & l’accord de principe',
    text: 'Pièces d’identité, 3 derniers bulletins de salaire, 2 avis d’imposition, 3 mois de relevés et le compromis. La banque répond par un accord de principe.',
    facts: ['Condition suspensive ≥ 30 j', 'Souvent 45 à 60 j'],
    active: 'right',
    placed: ['floor', 'front', 'left', 'right'],
    rotY: -HALF_PI + 0.35,
    cam: [0, 2.2, 8.4],
  },
  {
    kicker: 'Mur 4',
    title: 'Assurance & garantie',
    text: 'L’assurance emprunteur protège en cas de décès ou d’invalidité ; vous pouvez en changer à tout moment (loi Lemoine). La garantie, elle, protège la banque : caution ou hypothèque.',
    facts: ['Délégation d’assurance', 'Caution', 'Hypothèque / IPPD'],
    active: 'back',
    placed: ['floor', 'front', 'left', 'right', 'back'],
    rotY: Math.PI + 0.35,
    cam: [0, 2.2, 8.4],
  },
  {
    kicker: 'Le toit',
    title: 'L’offre de prêt',
    text: 'La banque émet l’offre officielle, qui couvre tout le projet. Un délai de réflexion légal s’impose : impossible de l’accepter avant le 11ᵉ jour.',
    facts: ['10 jours de réflexion', 'Valable 30 jours min.'],
    active: 'roof',
    placed: ['floor', 'front', 'left', 'right', 'back', 'roof'],
    rotY: 0.6,
    cam: [0, 4.4, 7.8],
    lookY: 0.75,
  },
  {
    kicker: 'Signature',
    title: 'Chez le notaire',
    text: 'La maison est complète. Vous signez l’acte authentique, la banque débloque les fonds auprès du notaire… et vous recevez les clés.',
    facts: ['Acte authentique', 'Déblocage des fonds', 'Remise des clés'],
    active: null,
    placed: ['floor', 'front', 'left', 'right', 'back', 'roof'],
    rotY: 0.55,
    cam: [0, 2.2, 8],
  },
  {
    kicker: 'Et après',
    title: 'Bienvenue chez vous',
    text: 'Vous remboursez par mensualités. Vous pourrez renégocier, faire racheter le crédit ou rembourser par anticipation (indemnités plafonnées).',
    facts: ['Mensualités', 'Remboursement anticipé', 'Renégociation'],
    active: null,
    placed: ['floor', 'front', 'left', 'right', 'back', 'roof'],
    rotY: 0.55,
    cam: [0, 1.8, 7.4],
    celebrate: true,
  },
]

export const stepIndexForPart = (id: PartId) => STEPS.findIndex((s) => s.active === id)
