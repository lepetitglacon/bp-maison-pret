import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Scene, type SceneMode } from './Scene'
import { StepCarousel } from './StepCarousel'
import { STEPS, WELCOME_STEP, stepIndexForPart, type PartId } from './steps'

/** Durée (ms) pendant laquelle le panneau bleu grandit vers le panneau des étapes */
const SHEET_GROW = 550
/** Passage du bleu au blanc, pendant l'agrandissement (ms) */
const SHEET_FADE = 380
const SHEET_FADE_DELAY = 150

export default function App() {
  const [mode, setMode] = useState<SceneMode>('welcome')
  const [index, setIndex] = useState(0)
  /** Début de l'arrivée des pièces (secondes, performance.now) */
  const [introAt, setIntroAt] = useState<number | null>(null)
  /** Le bouton "Découvrir" est en train de partir vers le bas */
  const [leaving, setLeaving] = useState(false)
  /** Les cartes de la première étape jouent leur animation d'entrée */
  const [entering, setEntering] = useState(false)
  const timers = useRef<number[]>([])
  const sheetRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const step = mode === 'welcome' ? WELCOME_STEP : STEPS[index]

  const onSelectPart = useCallback(
    (id: PartId) => {
      if (mode === 'welcome') return
      const i = stepIndexForPart(id)
      if (i >= 0) setIndex(i)
    },
    [mode],
  )

  useEffect(() => {
    if (mode !== 'steps') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(STEPS.length - 1, i + 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // Transition page de garde → étapes, en une seule séquence :
  // 1. le bouton glisse vers le bas ;
  // 2. le panneau bleu (le même élément) grandit jusqu'à la taille du panneau des étapes, puis devient blanc ;
  // 3. la carte de l'étape s'affiche, puis ses sous-cartes arrivent vite, l'une après l'autre.
  const discover = () => {
    if (leaving) return
    setLeaving(true)
    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))
    later(() => {
      const sheet = sheetRef.current
      const animateHeight = !!sheet && !matchMedia('(prefers-reduced-motion: reduce)').matches
      const from = sheet?.offsetHeight ?? 0
      // Le bleu passe au blanc pendant que le panneau grandit, pour préparer l'arrivée de la carte
      const fade = `background-color ${SHEET_FADE}ms ease ${SHEET_FADE_DELAY}ms`
      if (sheet) sheet.style.transition = fade

      flushSync(() => {
        setIndex(0)
        setMode('steps')
        setLeaving(false)
        setEntering(true)
        setIntroAt(performance.now() / 1000)
      })

      if (sheet && animateHeight) {
        const to = sheet.offsetHeight
        sheet.style.height = `${from}px`
        sheet.style.alignSelf = 'end' // en desktop (grille), le panneau grandit depuis le bas de sa cellule
        void sheet.offsetHeight // applique la hauteur de départ avant de lancer la transition
        sheet.style.transition = `height ${SHEET_GROW}ms cubic-bezier(0.65, 0, 0.25, 1), ${fade}`
        sheet.style.height = `${to}px`
      }
      later(() => {
        if (!sheet) return
        sheet.style.height = ''
        sheet.style.transition = ''
        sheet.style.alignSelf = ''
      }, SHEET_GROW + 500)
      later(() => setEntering(false), 1700)
    }, 300)
  }

  const goHome = () => {
    setIntroAt(null)
    setMode('welcome')
  }

  return (
    <main className={`app app--${mode}${leaving ? ' is-leaving' : ''}${entering ? ' is-entering' : ''}`}>
      {mode === 'welcome' ? (
        <header className="welcome-top">
          <h1 className="headline">
            Comprendre
            <br />
            mon projet
            <br />
            <span>immobilier</span>
          </h1>
        </header>
      ) : (
        <header className="top">
          <button className="home" onClick={goHome} aria-label="Retour à l’accueil">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M4 11.5 12 5l8 6.5V20h-5.5v-5h-5v5H4z" />
            </svg>
          </button>
          <p className="top__title">Les différentes étapes</p>
          <span className="top__count">
            {index + 1}/{STEPS.length}
          </span>
        </header>
      )}

      {/* Le canvas couvre toute l'app (il ne se redimensionne jamais pendant les transitions) ;
          .stage n'est qu'un emplacement : la caméra y centre la maison. */}
      <Scene step={step} mode={mode} introAt={introAt} onSelect={onSelectPart} frameRef={stageRef} />

      <div className="stage" ref={stageRef}>
        {mode === 'steps' && <p className="hint">Faites tourner la maison · Touchez une pièce</p>}
      </div>

      {/* Un seul panneau pour les deux écrans : c'est lui qui se transforme pendant la transition */}
      <section className={`sheet sheet--${mode}`} ref={sheetRef}>
        {mode === 'welcome' ? (
          <div className="welcome-bottom">
            <button className="cta" onClick={discover}>
              Découvrir
            </button>
            <p className="signature">
              BANQUE POPULAIRE <span>+X</span>
              <small>BOURGOGNE FRANCHE-COMTÉ</small>
            </p>
          </div>
        ) : (
          <StepCarousel steps={STEPS} index={index} onChange={setIndex} />
        )}
      </section>
    </main>
  )
}
