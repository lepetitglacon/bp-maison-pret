import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { PartId, Vec3 } from './steps'

const projected = new THREE.Vector3()
const PHASES: Record<PartId, number> = { floor: 0, front: 1.3, left: 2.1, right: 3.4, back: 4.2, roof: 5.1 }
const ACCENT = new THREE.Color('#1e8fe0')
const GOLD = new THREE.Color('#9fd0ff')
const { damp } = THREE.MathUtils

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
  celebrate: boolean
  onSelect: (id: PartId) => void
  children: (mats: THREE.MeshStandardMaterial[]) => ReactNode
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
  celebrate,
  onSelect,
  children,
}: PartProps) {
  const ref = useRef<THREE.Group>(null)
  const anchor = useRef<THREE.Object3D>(null)
  const container = useThree((s) => s.gl.domElement.parentElement)
  const [tag, setTag] = useState<HTMLDivElement | null>(null)
  const [hovered, setHovered] = useState(false)
  const anim = useRef({ explode: placed ? 0 : 1, hover: 0, highlight: 0, opacity: 1, bounceAt: -10, bounce: false, landed: placed })

  const mats = useMemo(
    () =>
      colors.map((c) => {
        const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0.02 })
        m.userData.base = new THREE.Color(c)
        return m
      }),
    [colors],
  )

  // Étiquette DOM positionnée à chaque frame par projection du point d'ancrage 3D
  useEffect(() => {
    if (!container) return
    const el = document.createElement('div')
    el.className = 'tag'
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

    a.explode = damp(a.explode, placed ? 0 : 1, 3.5, dt)
    // Petit rebond au moment où la pièce s'emboîte à sa place
    if (!placed) a.landed = false
    else if (!a.landed && a.explode < 0.04) {
      a.landed = true
      a.bounceAt = t
    }
    a.hover = damp(a.hover, hovered ? 1 : 0, 10, dt)
    a.highlight = damp(a.highlight, active ? 1 : hovered ? 0.45 : 0, 6, dt)
    a.opacity = damp(a.opacity, placed ? 1 : 0.55, 5, dt)

    const since = t - a.bounceAt
    const bounce = since < 2 ? Math.exp(-since * 4) * Math.sin(since * 18) * 0.22 : 0
    const out = a.hover * 0.12 + bounce
    const bob = Math.sin(t * 1.6 + phase) * 0.08 * a.explode // les pièces en attente flottent

    g.position.set(
      base[0] + explode.pos[0] * a.explode + push[0] * out,
      base[1] + explode.pos[1] * a.explode + push[1] * out + bob,
      base[2] + explode.pos[2] * a.explode + push[2] * out,
    )
    g.rotation.set(explode.rot[0] * a.explode, explode.rot[1] * a.explode, explode.rot[2] * a.explode)

    const pulse = 0.5 + 0.5 * Math.sin(t * 3)
    for (const m of mats) {
      m.color.copy(m.userData.base as THREE.Color).lerp(ACCENT, a.highlight * 0.7)
      if (celebrate) {
        m.emissive.copy(GOLD)
        m.emissiveIntensity = 0.08 + 0.1 * pulse
      } else {
        m.emissive.copy(ACCENT)
        m.emissiveIntensity = a.highlight * (0.18 + 0.12 * pulse)
      }
      m.opacity = a.opacity
      m.transparent = a.opacity < 0.99
      m.depthWrite = !m.transparent
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
    if (e.delta > 8) return // c'était un glisser pour tourner, pas un clic
    anim.current.bounce = true
    onSelect(id)
  }

  return (
    <group
      ref={ref}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
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
