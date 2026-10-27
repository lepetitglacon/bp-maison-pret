import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { PartId, Vec3 } from './steps'
import { addShine } from './shine'
import { getIdleTime } from './motion'

const projected = new THREE.Vector3()
const PHASES: Record<PartId, number> = { Objet012: 0, Objet013: 1.3, Rectangle005: 2.1, Rectangle007: 3.4, Rectangle006: 4.2 }
// Lueur de la pièce active (même teinte que le prototype)
const GLOW = new THREE.Color('#0a5fa8')
const WHITE = new THREE.Color('#ffffff')
const { damp } = THREE.MathUtils
/** Distance (part de la position d'attente) à laquelle la pièce s'aligne avant de s'emboîter */
const ALIGN_GAP = 0.14
/** Vitesse de l'enclenchement final (part de la position d'attente par seconde) : très rapide = "sec" */
const SNAP_SPEED = 3.5
/** On s'enclenche dès qu'on est à cette distance de l'alignement (sans attendre la fin de l'approche) */
const SNAP_FROM = 0.1

interface PartProps {
  id: PartId
  label: string
  base: Vec3
  explode: { pos: Vec3; rot: Vec3 }
  /** Direction vers laquelle la pièce "sort" au survol / au toucher */
  push: Vec3
  labelOffset: Vec3
  colors: string[]
  /** Pièce posée à sa place ; sinon elle flotte éclatée, en attente */
  placed: boolean
  active: boolean
  interactive: boolean
  /** Éloignement de la position d'attente (multiple de `explode.pos`) */
  spread: number
  /**
   * Intro : à partir de l'instant `at` (secondes, performance.now), la pièce reste dans
   * la maison pendant `delay` secondes puis rejoint lentement sa position d'attente.
   */
  intro: { at: number; delay: number } | null
  onSelect: (id: PartId) => void
  children: (mats: THREE.MeshPhysicalMaterial[]) => ReactNode
}

export function Part({
  id,
  label,
  base,
  explode,
  push,
  labelOffset,
  colors,
  placed,
  active,
  interactive,
  spread,
  intro,
  onSelect,
  children,
}: PartProps) {
  const ref = useRef<THREE.Group>(null)
  const anchor = useRef<THREE.Object3D>(null)
  const container = useThree((s) => s.gl.domElement.parentElement)
  const [tag, setTag] = useState<HTMLDivElement | null>(null)
  const [hoveredRaw, setHovered] = useState(false)
  const hovered = interactive && hoveredRaw
  const anim = useRef({ explode: placed ? 0 : 1, hover: 0, highlight: 0, bounceAt: -10, bounce: false, snapped: placed, turn: placed ? 0 : 1 })

  const mats = useMemo(
    () =>
      colors.map((c) => {
        const m = new THREE.MeshPhysicalMaterial({
          color: c,
          // Satiné : de la brillance sur les arêtes, sans qu'une face plate face caméra "blanchisse"
          roughness: 0.5,
          metalness: 0,
          clearcoat: 0.25,
          clearcoatRoughness: 0.35,
          envMapIntensity: 0.8,
          side: THREE.DoubleSide,
        })
        m.userData.base = new THREE.Color(c)
        addShine(m) // effet "shiny" de la dernière étape
        return m
      }),
    [colors],
  )

  // Étiquette DOM positionnée à chaque frame par projection du point d'ancrage 3D
  useEffect(() => {
    if (!container) return
    const el = document.createElement('div')
    el.className = 'tag'
    el.setAttribute('aria-hidden', 'true') // décoratif : l'étape est déjà annoncée par le carrousel
    container.appendChild(el)
    setTag(el)
    return () => el.remove()
  }, [container])

  useEffect(() => {
    if (!tag) return
    tag.textContent = label
    tag.classList.toggle('tag--active', active)
    tag.classList.toggle('is-visible', active || hovered)
  }, [tag, label, active, hovered])

  useFrame(({ clock, camera, size }, dt) => {
    const g = ref.current
    if (!g) return
    const t = clock.elapsedTime
    const phase = PHASES[id]
    const a = anim.current
    if (a.bounce) {
      a.bounce = false
      a.bounceAt = t
    }

    // Intro : les pièces quittent la maison quasi instantanément, en léger décalé
    const sinceIntro = intro ? performance.now() / 1000 - intro.at : Infinity
    const holding = !!intro && sinceIntro < intro.delay
    const leaving = !!intro && sinceIntro < intro.delay + 0.8
    if (placed && !holding) {
      // Emboîtement en deux temps : la pièce vient doucement s'aligner juste devant sa place,
      // puis s'enclenche d'un coup sec (sans rebond).
      if (a.snapped) a.explode = 0
      else if (a.explode > ALIGN_GAP + SNAP_FROM) a.explode = damp(a.explode, ALIGN_GAP, 3.2, dt)
      else {
        a.explode = Math.max(0, a.explode - dt * SNAP_SPEED)
        a.snapped = a.explode === 0
      }
    } else {
      a.snapped = false
      a.explode = damp(a.explode, holding ? 0 : spread, leaving ? 7 : 2.2, dt)
    }
    // L'orientation se redresse pendant l'approche, pour que la pièce arrive bien alignée
    a.turn = damp(a.turn, placed ? 0 : Math.min(a.explode, 1.4), 5, dt)
    a.hover = damp(a.hover, hovered ? 1 : 0, 10, dt)
    a.highlight = damp(a.highlight, active ? 1 : hovered ? 0.45 : 0, 6, dt)

    const since = t - a.bounceAt
    // petite impulsion au clic, vite amortie
    const bounce = since < 1 ? Math.exp(-since * 9) * Math.sin(since * 20) * 0.08 : 0
    const out = a.hover * 0.12 + bounce
    const away = Math.min(a.explode, 1.4)
    const idle = getIdleTime() // s'arrête quand les animations sont en pause
    const bob = Math.sin(idle * 1.6 + phase) * 0.08 * away // les pièces en attente flottent

    g.position.set(
      base[0] + explode.pos[0] * a.explode + push[0] * out,
      base[1] + explode.pos[1] * a.explode + push[1] * out + bob,
      base[2] + explode.pos[2] * a.explode + push[2] * out,
    )
    g.rotation.set(explode.rot[0] * a.turn, explode.rot[1] * a.turn, explode.rot[2] * a.turn)

    const pulse = 0.5 + 0.5 * Math.sin(idle * 3)
    for (const m of mats) {
      m.color.copy(m.userData.base as THREE.Color).lerp(WHITE, a.hover * 0.1)
      m.emissive.copy(GLOW)
      m.emissiveIntensity = a.highlight * (0.45 + 0.35 * pulse)
    }

    if (tag && anchor.current) {
      projected.setFromMatrixPosition(anchor.current.matrixWorld).project(camera)
      const x = ((projected.x + 1) / 2) * size.width
      const y = ((1 - projected.y) / 2) * size.height
      tag.style.left = `${x}px`
      tag.style.top = `${y}px`
    }
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (!interactive || e.delta > 8) return // c'était un glisser pour tourner, pas un clic
    anim.current.bounce = true
    onSelect(id)
  }

  return (
    <group
      ref={ref}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        if (interactive) document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = ''
      }}
      onPointerUp={(e) => {
        if (e.pointerType === 'touch') setHovered(false)
      }}
      onClick={handleClick}
    >
      {children(mats)}
      <object3D ref={anchor} position={labelOffset} />
    </group>
  )
}
