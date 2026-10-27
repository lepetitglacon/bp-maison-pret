import { useEffect, useRef, useState } from 'react'
import type { Step } from './steps'

interface StepCarouselProps {
  steps: Step[]
  index: number
  onChange: (index: number) => void
}

/** Icône "lien externe" (flèche qui sort d'un carré) */
function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden focusable="false">
      <path
        d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Écart entre deux cartes sur le cylindre : une "chambre" du barillet */
const GAP = 24
/** Rotation du barillet : démarre tout de suite et ralentit en arrivant (pas de temps mort) */
const TURN = 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)'

/**
 * Barillet de revolver : les cartes sont posées sur les faces d'un cylindre qui tourne
 * autour de l'axe vertical. Le barillet ne boucle pas : seules la carte courante et ses
 * voisines directes sont visibles.
 */
function cardStyle(offset: number, count: number, width: number, hidden: boolean, dragging: boolean): React.CSSProperties {
  const step = 360 / count
  const radius = (width + GAP) / 2 / Math.tan(Math.PI / count)
  const d = Math.abs(offset)
  return {
    transform: `translateZ(${-radius}px) rotateY(${offset * step}deg) translateZ(${radius}px)`,
    opacity: hidden || d > 1.2 ? 0 : 1 - d * 0.35,
    // une carte masquée pendant un saut disparaît tout de suite (pas de fondu qui traîne)
    transition: dragging ? 'none' : `${TURN}, opacity ${hidden ? 0.08 : 0.4}s`,
    pointerEvents: d > 0.5 ? 'none' : undefined,
  }
}

/** Au relâché : vitesse (px/ms) d'un "coup sec" qui fait passer à la carte voisine, même sur un geste court */
const FLICK_SPEED = 0.35
/** Au relâché : part de la largeur au-delà de laquelle un glissement lent passe aussi à la carte voisine */
const SLIDE_RATIO = 0.33
/** Cumul de molette / trackpad horizontal (px) pour changer de carte, et délai entre deux changements */
const WHEEL_STEP = 40
const WHEEL_COOLDOWN = 450
/** Durée de la rotation lors d'un saut de plusieurs cartes (doit suivre TURN) */
const JUMP_MS = 550

/** Cartes 3D qu'on fait glisser latéralement (doigt ou souris) pour changer d'étape. */
export function StepCarousel({ steps, index, onChange }: StepCarouselProps) {
  const [dragX, setDragX] = useState(0)
  const drag = useRef<{
    startX: number
    startY: number
    id: number
    horizontal: boolean | null
    /** derniers points du geste, pour mesurer la vitesse au moment du relâché */
    samples: { x: number; t: number }[]
  } | null>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const wheel = useRef({ acc: 0, lockedUntil: 0 })

  const [width, setWidth] = useState(360)
  const go = (i: number) => onChange(Math.max(0, Math.min(steps.length - 1, i)))

  // Saut de plusieurs cartes (frise numérotée) : on ne montre que la carte qui part et celle qui arrive
  const shownIndex = useRef(index)
  const jump = useRef<{ from: number; to: number } | null>(null)
  const [, rerender] = useState(0)
  if (shownIndex.current !== index) {
    jump.current = Math.abs(index - shownIndex.current) > 1 ? { from: shownIndex.current, to: index } : null
    shownIndex.current = index
  }
  useEffect(() => {
    if (!jump.current) return
    const t = window.setTimeout(() => {
      jump.current = null
      rerender((n) => n + 1)
    }, JUMP_MS)
    return () => clearTimeout(t)
  }, [index])

  // Le rayon du barillet dépend de la largeur des cartes
  useEffect(() => {
    const el = viewport.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.offsetWidth || 360))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Sécurité tactile : dès que le geste est horizontal, on bloque l'événement tactile natif,
  // sinon le navigateur du téléphone peut le récupérer (glisser à droite = "page précédente")
  // et annuler le swipe vers l'arrière.
  useEffect(() => {
    const el = viewport.current
    if (!el) return
    const onTouchMove = (e: TouchEvent) => {
      if (drag.current?.horizontal) e.preventDefault()
    }
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMove)
  }, [])

  // Glissement horizontal au trackpad / molette inclinable
  useEffect(() => {
    const el = viewport.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault()
      const w = wheel.current
      if (performance.now() < w.lockedUntil) return
      w.acc += e.deltaX
      if (Math.abs(w.acc) >= WHEEL_STEP) {
        onChange(Math.max(0, Math.min(steps.length - 1, index + (w.acc > 0 ? 1 : -1))))
        w.acc = 0
        w.lockedUntil = performance.now() + WHEEL_COOLDOWN
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [index, onChange, steps.length])

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) return // un lien reste un lien
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      id: e.pointerId,
      horizontal: null,
      samples: [{ x: e.clientX, t: e.timeStamp }],
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (d.horizontal === null && Math.hypot(dx, dy) > 6) {
      d.horizontal = Math.abs(dx) > Math.abs(dy)
      if (d.horizontal) {
        const el = e.currentTarget as HTMLElement
        try {
          if (!el.hasPointerCapture(e.pointerId)) el.setPointerCapture(e.pointerId)
        } catch {
          // pointeur déjà relâché ou inconnu : le geste continue sans capture
        }
      }
    }
    if (!d.horizontal) return
    d.samples.push({ x: e.clientX, t: e.timeStamp })
    d.samples = d.samples.filter((p) => e.timeStamp - p.t < 100)
    // Les cartes suivent le doigt (avec résistance aux extrémités)
    const atEdge = (index === 0 && dx > 0) || (index === steps.length - 1 && dx < 0)
    setDragX(atEdge ? dx * 0.3 : dx)
  }

  // Fin du geste. Sur mobile le navigateur peut l'annuler (pointercancel) : l'événement porte
  // alors une position souvent à 0, qui faisait toujours "avancer". On se fie donc uniquement
  // aux positions réellement suivies pendant le geste.
  const endGesture = () => {
    const d = drag.current
    drag.current = null
    setDragX(0)
    if (!d?.horizontal) return
    const last = d.samples[d.samples.length - 1]
    if (!last) return
    const dx = last.x - d.startX
    // Vitesse sur les 100 dernières ms : un coup sec en fin de geste compte, même s'il est court
    const recent = d.samples.filter((p) => last.t - p.t < 100)
    const first = recent[0]
    const speed = (last.x - first.x) / Math.max(1, last.t - first.t)
    if (Math.abs(speed) > FLICK_SPEED) go(index + (speed < 0 ? 1 : -1))
    else if (Math.abs(dx) > width * SLIDE_RATIO) go(index + (dx < 0 ? 1 : -1))
    // sinon : petit glissement lent, la carte revient en place
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    if (d && d.id === e.pointerId && d.horizontal) d.samples.push({ x: e.clientX, t: e.timeStamp })
    endGesture()
  }


  const dragging = dragX !== 0

  return (
    <div className="panel" aria-roledescription="carrousel" aria-label="Étapes du projet immobilier">
      <div
        className={`viewport${dragging ? ' is-dragging' : ''}`}
        ref={viewport}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={endGesture}
      >
        <div className="track">
          {steps.map((s, i) => (
            <article
              key={s.title}
              className={`card${i === index ? ' is-current' : ''}`}
              style={cardStyle(
                i - index + dragX / width,
                steps.length,
                width,
                !!jump.current && i !== jump.current.from && i !== jump.current.to,
                dragging,
              )}
              aria-hidden={i !== index}
              // cartes non affichées : ni focus clavier, ni lecteur d'écran (elles défilent, donc
              // Chrome les rendrait sinon atteignables à la tabulation)
              inert={i !== index}
              aria-label={`Étape ${i + 1} sur ${steps.length}`}
            >
              <p className="kicker">
                Étape {i + 1} sur {steps.length}
              </p>
              <h2>{s.title}</h2>
              <p className="subtitle">{s.subtitle}</p>
              {s.items && (
                <div className="items">
                  {s.items.map((tip, k) => (
                    <div className="item" key={tip.title} style={{ '--i': k } as React.CSSProperties}>
                      <h3>{tip.title}</h3>
                      <p>{tip.text}</p>
                      {tip.link && (
                        <a
                          className="item__link"
                          href={tip.link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {tip.link.label}
                          <ExternalIcon />
                          <span className="sr-only"> (nouvel onglet)</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>

      <nav className="controls" aria-label="Navigation entre les étapes">
        <button className="arrow" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Étape précédente">
          ←
        </button>
        <div className="nodes">
          {steps.map((s, i) => (
            <button
              key={s.title}
              aria-current={i === index ? 'step' : undefined}
              aria-label={`Étape ${i + 1} : ${s.title}`}
              className={`node${i === index ? ' is-current' : ''}${i < index ? ' is-done' : ''}`}
              onClick={() => go(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button className="arrow" onClick={() => go(index + 1)} disabled={index === steps.length - 1} aria-label="Étape suivante">
          →
        </button>
      </nav>
    </div>
  )
}
