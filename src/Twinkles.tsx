import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useHouseParts } from './House'
import type { PartId } from './steps'

/** Les deux faces "+X" du modèle, réutilisées en miniature, avec leurs couleurs */
const LOGOS: { id: PartId; color: string }[] = [
  { id: 'Rectangle005', color: '#13255d' },
  { id: 'Rectangle007', color: '#05ACEB' },
]
/** Nombre de mini "+X" par face */
const PER_LOGO = 22
/** Taille des miniatures par rapport à la vraie face */
const MINI = 0.11
/** Coquille autour de la maison où elles flottent : rayon min / max, et hauteur */
const R_MIN = 2.3
const R_MAX = 3.6
const HEIGHT = 3.2
const { damp } = THREE.MathUtils

const tmp = new THREE.Object3D()

interface Twinkle {
  pos: THREE.Vector3
  axis: THREE.Vector3
  spin: number
  phase: number
  speed: number
  size: number
}

/** Positions tout autour de la maison, jamais à l'intérieur (coquille entre R_MIN et R_MAX) */
function scatter(count: number): Twinkle[] {
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2
    const r = R_MIN + Math.random() * (R_MAX - R_MIN)
    return {
      pos: new THREE.Vector3(Math.cos(angle) * r, (Math.random() - 0.4) * HEIGHT, Math.sin(angle) * r),
      axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
      spin: (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 1.2),
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.6,
      size: 0.7 + Math.random() * 0.6,
    }
  })
}

function LogoSwarm({ geometry, color, active }: { geometry: THREE.BufferGeometry; color: string; active: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const material = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.35,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
      side: THREE.DoubleSide,
    })
    return m
  }, [color])
  const items = useMemo(() => scatter(PER_LOGO), [])
  const appear = useRef(0)
  const q = useMemo(() => new THREE.Quaternion(), [])

  useFrame(({ clock }, dt) => {
    const m = mesh.current
    if (!m) return
    appear.current = damp(appear.current, active ? 1 : 0, active ? 3 : 6, dt)
    m.visible = appear.current > 0.01
    if (!m.visible) return
    const t = clock.elapsedTime
    items.forEach((it, i) => {
      tmp.position.set(
        it.pos.x + Math.sin(t * it.speed * 0.6 + it.phase) * 0.15,
        it.pos.y + Math.sin(t * it.speed + it.phase) * 0.25,
        it.pos.z + Math.cos(t * it.speed * 0.5 + it.phase) * 0.15,
      )
      // rotation libre en 3D : on voit le relief et la tranche des mini "+X"
      tmp.quaternion.copy(q.setFromAxisAngle(it.axis, it.phase + t * it.spin))
      const twinkle = 0.75 + 0.25 * Math.sin(t * 2 * it.speed + it.phase)
      tmp.scale.setScalar(MINI * it.size * twinkle * appear.current)
      tmp.updateMatrix()
      m.setMatrixAt(i, tmp.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={mesh} args={[geometry, material, PER_LOGO]} frustumCulled={false} castShadow />
}

/**
 * Mini "+X" (les deux faces du modèle en tout petit) qui flottent autour de la maison,
 * dans la même scène qu'elle : ils tournent avec la maison quand on la fait pivoter.
 */
export function Twinkles({ active }: { active: boolean }) {
  const parts = useHouseParts()
  const geometries = useMemo(
    () =>
      LOGOS.map(({ id, color }) => {
        const part = parts.find((p) => p.id === id)
        return part ? { id, color, geometry: part.geometry.clone().center() } : null
      }).filter((x) => x !== null),
    [parts],
  )
  return (
    <group>
      {geometries.map((g) => (
        <LogoSwarm key={g.id} geometry={g.geometry} color={g.color} active={active} />
      ))}
    </group>
  )
}
