/** Pièces du modèle 3D (noms des nœuds dans public/maison.glb) */
export type PartId = 'Objet012' | 'Objet013' | 'Rectangle005' | 'Rectangle006' | 'Rectangle007'
export type Vec3 = [number, number, number]

export const PART_IDS: PartId[] = ['Objet012', 'Objet013', 'Rectangle005', 'Rectangle007', 'Rectangle006']

/** Carte d'astuce affichée sous le titre d'une étape, avec un lien externe optionnel */
export interface Tip {
  title: string
  text: string
  link?: { label: string; href: string }
}

export interface Step {
  title: string
  subtitle: string
  items?: Tip[]
  /** Pièce posée à cette étape (mise en avant) */
  active: PartId | null
  /** Pièces déjà posées à leur place (cumulatif) */
  placed: PartId[]
  /** Orientation de la maison (radians, axe Y) */
  rotY: number
  /**
   * Inclinaison (radians, axe X) pour présenter une face pile en face de la caméra.
   * Quand elle est définie, la maison arrête de se balancer pour garder la vue alignée.
   */
  tiltX?: number
  celebrate?: boolean
}

export const PART_LABELS: Record<PartId, string> = {
  Objet012: 'Dénicher le bien',
  Objet013: 'RDV avec un conseiller',
  Rectangle005: 'Le prêt',
  Rectangle007: 'L’offre de prêt',
  Rectangle006: 'Débloquer les fonds',
}

const upTo = (n: number) => PART_IDS.slice(0, n)

export const STEPS: Step[] = [
  {
    title: 'Préparer votre projet',
    subtitle: 'Calculer votre enveloppe',
    items: [
      { title: 'Le montant de votre apport personnel', text: 'Estimer l’épargne que vous pouvez consacrer à votre projet' },
      {
        title: 'Lister les dépenses associées au projet',
        text: 'Frais de notaire, travaux, ameublement, ...',
        link: { label: 'Estimer les frais de notaire', href: 'https://www.notaires.fr/' },
      },
      {
        title: 'Réaliser une simulation de votre capacité d’emprunt',
        text: 'Adapter votre mensualité de prêt à vos revenus',
        link: { label: 'Simulateurs de l’ANIL', href: 'https://www.anil.org/' },
      },
    ],
    // toutes les pièces sont encore éparpillées : la première se pose à l'étape suivante
    active: null,
    placed: [],
    rotY: 0.5,
  },
  {
    title: 'Dénicher le bien',
    subtitle: 'Trouver le logement qui vous correspond',
    items: [
      {
        title: 'Comparer les prix du quartier',
        text: 'Consultez les ventes réalisées autour du bien pour juger si son prix est cohérent.',
        link: { label: 'Prix des ventes (DVF)', href: 'https://app.dvf.etalab.gouv.fr/' },
      },
      {
        title: 'Vérifier les risques du terrain',
        text: 'Inondation, sols argileux, pollution : regardez les risques connus à l’adresse du bien.',
        link: { label: 'Géorisques', href: 'https://www.georisques.gouv.fr/' },
      },
      {
        title: 'Lire les diagnostics',
        text: 'DPE, amiante, électricité : ils peuvent révéler des travaux à prévoir dans votre budget.',
      },
    ],
    active: 'Objet012',
    placed: upTo(1),
    rotY: 0.5,
  },
  {
    title: 'Prendre RDV avec un conseiller',
    subtitle: 'Présenter votre projet immobilier',
    items: [
      {
        title: 'Préparer vos justificatifs',
        text: 'Pièce d’identité, derniers bulletins de salaire, avis d’imposition et relevés de comptes.',
      },
      {
        title: 'Présenter un budget clair',
        text: 'Apport, revenus, charges en cours : un dossier lisible facilite l’étude de votre demande.',
      },
      {
        title: 'Venir avec vos questions',
        text: 'Durée, mensualité, modulation des échéances, remboursement anticipé…',
      },
    ],
    active: 'Objet013',
    placed: upTo(2),
    rotY: -0.5,
  },
  {
    title: 'Le conseiller s’occupe du prêt',
    subtitle: 'Préparer le financement',
    items: [
      {
        title: 'Comparer avec le TAEG',
        text: 'Il regroupe intérêts, assurance et frais : c’est le bon indicateur pour comparer des offres.',
      },
      {
        title: 'Choisir votre assurance emprunteur',
        text: 'Vous pouvez choisir un autre contrat que celui proposé, à garanties équivalentes.',
        link: { label: 'Vos droits sur Service-Public', href: 'https://www.service-public.fr/' },
      },
      {
        title: 'La garantie du prêt',
        text: 'Caution ou hypothèque : votre conseiller vous propose la garantie adaptée à votre projet.',
      },
    ],
    active: 'Rectangle005',
    placed: upTo(3),
    rotY: 0.5 + Math.PI, // on montre l'autre côté de la maison
  },
  {
    title: 'Obtenir et accepter l’offre de prêt',
    subtitle: 'Valider les conditions du prêt',
    items: [
      {
        title: '10 jours de réflexion',
        text: 'Vous ne pouvez pas accepter l’offre avant le 11e jour qui suit sa réception.',
      },
      {
        title: 'Relire l’offre en détail',
        text: 'Montant, taux, durée, assurance, garanties : tout doit correspondre à ce qui a été convenu.',
      },
      {
        title: 'La condition suspensive',
        text: 'Si le prêt est refusé, l’achat est annulé et la somme versée au compromis vous est rendue.',
        link: { label: 'En savoir plus (ANIL)', href: 'https://www.anil.org/' },
      },
    ],
    active: 'Rectangle007',
    placed: upTo(4),
    rotY: 0.5,
  },
  {
    title: 'Débloquer les fonds',
    subtitle: 'Finaliser le financement',
    items: [
      {
        title: 'Versement au notaire',
        text: 'Les fonds du prêt sont versés directement au notaire, en vue de la signature.',
      },
      {
        title: 'Préparer votre apport',
        text: 'Apport et frais de notaire doivent être disponibles sur votre compte avant la signature.',
        link: { label: 'Frais de notaire', href: 'https://www.notaires.fr/' },
      },
      {
        title: 'Achat dans le neuf',
        text: 'Les fonds sont débloqués progressivement, au fil de l’avancement du chantier.',
      },
    ],
    active: 'Rectangle006', // le toit vient compléter la maison
    placed: PART_IDS,
    // Côté bleu foncé. Les deux panneaux "+X" sont en miroir : leurs X sont décalés de 0,76
    // en largeur pour 2,15 de profondeur. On se place dans l'axe qui traverse les deux X
    // (lacet atan(0,76 / 2,15) ≈ 0,34) et on incline la face vers la caméra, qui est ~10° plus haut.
    rotY: Math.PI - 0.34,
    tiltX: -0.21,
  },
  {
    title: 'Signer l’acte de vente',
    subtitle: 'Concrétiser votre projet',
    items: [
      {
        title: 'Visiter le bien une dernière fois',
        text: 'Vérifiez qu’il est dans l’état prévu au compromis et bien libéré.',
      },
      {
        title: 'Signer chez le notaire',
        text: 'Vous devenez propriétaire et repartez avec les clés de votre logement.',
      },
      {
        title: 'Assurer votre logement',
        text: 'L’assurance habitation doit être active au plus tard le jour de la remise des clés.',
        link: { label: 'Vos obligations sur Service-Public', href: 'https://www.service-public.fr/' },
      },
    ],
    active: null,
    placed: PART_IDS,
    rotY: 0.5,
    celebrate: true,
  },
]

/** État "page de garde" : maison complète, rien de mis en avant */
export const WELCOME_STEP: Step = {
  title: '',
  subtitle: '',
  active: null,
  placed: PART_IDS,
  rotY: 0.5,
}

export const stepIndexForPart = (id: PartId) => STEPS.findIndex((s) => s.active === id)
