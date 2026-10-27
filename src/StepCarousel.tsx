import { useRef, useState } from 'react'
import type { Step } from './steps'

interface StepCarouselProps {
  steps: Step[]
  index: number
  onChange: (index: number) => void
}

/** Cartes qu'on fait glisser latéralement (doigt ou souris) pour changer d'étape. */
export function StepCarousel({ steps, index, onChange }: StepCarouselProps) {
  const [dragX, setDragX] = useState(0)
  const drag = useRef<{ startX: number; startY: number; id: number; horizontal: boolean | null } | null>(null)
  const viewport = useRef<HTMLDivElement>(null)

  const go = (i: number) => onChange(Math.max(0, Math.min(steps.length - 1, i)))

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { startX: e.clientX, startY: e.clientY, id: e.pointerId, horizontal: null }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (d.horizontal === null && Math.hypot(dx, dy) > 6) {
      d.horizontal = Math.abs(dx) > Math.abs(dy)
      if (d.horizontal) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
    if (!d.horizontal) return
    // Résistance aux extrémités
    const atEdge = (index === 0 && dx > 0) || (index === steps.length - 1 && dx < 0)
    setDragX(atEdge ? dx * 0.3 : dx)
  }

  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (!d?.horizontal) return
    const width = viewport.current?.offsetWidth ?? 400
    const threshold = Math.min(80, width * 0.2)
    if (dragX < -threshold) go(index + 1)
    else if (dragX > threshold) go(index - 1)
    setDragX(0)
  }

  return (
    <section className="panel" aria-roledescription="carrousel" aria-label="Étapes du prêt immobilier">
      <div
        className={`viewport${dragX !== 0 ? ' is-dragging' : ''}`}
        ref={viewport}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="track" style={{ transform: `translateX(calc(${-index * 100}% + ${dragX}px))` }}>
          {steps.map((s, i) => (
            <article
              key={s.title}
              className={`card${i === index ? ' is-current' : ''}`}
              aria-hidden={i !== index}
              aria-label={`Étape ${i + 1} sur ${steps.length}`}
            >
              <p className="kicker">
                <span className="kicker__num">{String(i + 1).padStart(2, '0')}</span>
                {s.kicker}
              </p>
              <h2>{s.title}</h2>
              <p className="text">{s.text}</p>
              <ul className="facts">
                {s.facts.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>

      <nav className="controls">
        <button className="arrow" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Étape précédente">
          ←
        </button>
        <div className="dots" role="tablist">
          {steps.map((s, i) => (
            <button
              key={s.title}
              role="tab"
              aria-selected={i === index}
              aria-label={s.title}
              className={`dot${i === index ? ' is-active' : ''}${i < index ? ' is-done' : ''}`}
              onClick={() => go(i)}
            />
          ))}
        </div>
        <button className="arrow" onClick={() => go(index + 1)} disabled={index === steps.length - 1} aria-label="Étape suivante">
          →
        </button>
      </nav>
    </section>
  )
}
