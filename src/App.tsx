import { useCallback, useEffect, useState } from 'react'
import { Scene } from './Scene'
import { StepCarousel } from './StepCarousel'
import { STEPS, stepIndexForPart, type PartId } from './steps'

export default function App() {
  const [index, setIndex] = useState(0)
  const step = STEPS[index]

  const onSelectPart = useCallback((id: PartId) => {
    const i = stepIndexForPart(id)
    if (i >= 0) setIndex(i)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(STEPS.length - 1, i + 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <main className="app">
      <header className="top">
        <div className="top__inner">
          <h1>
            Le prêt immobilier, <em>pièce par pièce</em>
          </h1>
          <span className="top__count">
            Étape {index + 1}/{STEPS.length}
          </span>
        </div>
        <div className="progress" aria-hidden>
          <span style={{ width: `${((index + 1) / STEPS.length) * 100}%` }} />
        </div>
      </header>

      <div className="stage">
        <Scene step={step} onSelect={onSelectPart} />
        <p className="hint">Faites tourner la maison · Touchez une pièce</p>
      </div>

      <StepCarousel steps={STEPS} index={index} onChange={setIndex} />

      <p className="disclaimer">Informations générales, non contractuelles.</p>
    </main>
  )
}
