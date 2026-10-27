/**
 * Mouvements "au repos" de la 3D (rotation automatique de l'accueil, flottement, balancement,
 * mini "+X", balayage lumineux) : ils s'arrêtent quand `paused` est vrai.
 * Les animations déclenchées par l'utilisateur (changement d'étape, emboîtement) restent jouées.
 * (WCAG 2.2.2 : tout mouvement automatique doit pouvoir être mis en pause.)
 */
export const motion = {
  paused: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
}

/** Temps qui n'avance que lorsque les mouvements au repos sont actifs */
let idleTime = 0
export function advanceIdleTime(dt: number) {
  if (!motion.paused) idleTime += dt
  return idleTime
}
export const getIdleTime = () => idleTime
