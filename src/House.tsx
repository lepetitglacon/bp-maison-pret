import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Part } from './Part'
import { PART_LABELS, type PartId, type Step } from './steps'

// Dimensions de la maison
const W = 2.6 // largeur (x)
const D = 2.0 // profondeur (z)
const H = 1.5 // hauteur des murs
const T = 0.12 // épaisseur des murs
const R = 0.95 // hauteur du faîtage

const WALL = ['#f7f8fc']
const FLOOR = ['#c9d3ea', '#9db4e6']
const ROOF = ['#253a8f', '#e6ebf6']

const glass = new THREE.MeshStandardMaterial({ color: '#8fc3ff', roughness: 0.15, metalness: 0.1, emissive: '#bfe0ff', emissiveIntensity: 0.25 })
const wood = new THREE.MeshStandardMaterial({ color: '#14205e', roughness: 0.7 })
const frame = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 })

function Window({ position, size = [0.5, 0.45], rotY = 0 }: { position: [number, number, number]; size?: [number, number]; rotY?: number }) {
  return (
    <group position={position} rotation-y={rotY}>
      <mesh material={frame}>
        <boxGeometry args={[size[0] + 0.08, size[1] + 0.08, T + 0.02]} />
      </mesh>
      <mesh material={glass} position-z={0.001}>
        <boxGeometry args={[size[0], size[1], T + 0.04]} />
      </mesh>
      <mesh material={frame}>
        <boxGeometry args={[0.03, size[1], T + 0.05]} />
      </mesh>
      <mesh material={frame}>
        <boxGeometry args={[size[0], 0.03, T + 0.05]} />
      </mesh>
    </group>
  )
}

interface HouseProps {
  step: Step
  onSelect: (id: PartId) => void
}

export function House({ step, onSelect }: HouseProps) {
  const gableGeo = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-D / 2, 0)
    s.lineTo(D / 2, 0)
    s.lineTo(0, R)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false })
    g.translate(0, 0, -T / 2)
    return g
  }, [])

  const pitch = Math.atan(R / (D / 2))
  const paneLen = Math.hypot(D / 2, R) + 0.28

  const common = (id: PartId) => ({
    id,
    label: PART_LABELS[id],
    placed: step.placed.includes(id),
    active: step.active === id,
    celebrate: !!step.celebrate,
    onSelect,
  })

  return (
    <group position-y={-0.9}>
      {/* Fondations */}
      <Part
        {...common('floor')}
        base={[0, -0.12, 0]}
        explode={{ pos: [0, -0.85, 0], rot: [0.12, 0, 0] }}
        push={[0, -1, 0]}
        labelOffset={[0, -0.45, D / 2 + 0.3]}
        colors={FLOOR}
      >
        {([stone, grass]) => (
          <>
            <RoundedBox args={[W + 0.5, 0.24, D + 0.5]} radius={0.06} material={stone} />
            <RoundedBox args={[W + 1.2, 0.08, D + 1.2]} radius={0.04} position-y={-0.14} material={grass} />
          </>
        )}
      </Part>

      {/* Mur 1 — façade avant */}
      <Part
        {...common('front')}
        base={[0, H / 2, D / 2 - T / 2]}
        explode={{ pos: [0, 0.15, 1.5], rot: [0.38, 0, 0] }}
        push={[0, 0, 1]}
        labelOffset={[0, H / 2 + 0.3, 0.2]}
        colors={WALL}
      >
        {([m]) => (
          <>
            <RoundedBox args={[W, H, T]} radius={0.03} material={m} />
            <mesh material={wood} position={[-0.6, -H / 2 + 0.45, 0.02]}>
              <boxGeometry args={[0.46, 0.9, T]} />
            </mesh>
            <mesh material={frame} position={[-0.45, -H / 2 + 0.45, T / 2 + 0.03]}>
              <sphereGeometry args={[0.03, 12, 12]} />
            </mesh>
            <Window position={[0.55, 0.12, 0]} />
          </>
        )}
      </Part>

      {/* Mur 4 — arrière */}
      <Part
        {...common('back')}
        base={[0, H / 2, -D / 2 + T / 2]}
        explode={{ pos: [0, 0.15, -1.5], rot: [-0.38, 0, 0] }}
        push={[0, 0, -1]}
        labelOffset={[0, H / 2 + 0.3, -0.2]}
        colors={WALL}
      >
        {([m]) => (
          <>
            <RoundedBox args={[W, H, T]} radius={0.03} material={m} />
            <Window position={[-0.6, 0.12, 0]} />
            <Window position={[0.6, 0.12, 0]} />
          </>
        )}
      </Part>

      {/* Mur 2 — gauche */}
      <Part
        {...common('left')}
        base={[-W / 2 + T / 2, H / 2, 0]}
        explode={{ pos: [-1.5, 0.15, 0], rot: [0, 0, 0.38] }}
        push={[-1, 0, 0]}
        labelOffset={[-0.2, H / 2 + 0.3, 0]}
        colors={WALL}
      >
        {([m]) => (
          <>
            <RoundedBox args={[T, H, D - 2 * T]} radius={0.03} material={m} />
            <Window position={[0, 0.12, 0]} rotY={Math.PI / 2} size={[0.6, 0.5]} />
          </>
        )}
      </Part>

      {/* Mur 3 — droite */}
      <Part
        {...common('right')}
        base={[W / 2 - T / 2, H / 2, 0]}
        explode={{ pos: [1.5, 0.15, 0], rot: [0, 0, -0.38] }}
        push={[1, 0, 0]}
        labelOffset={[0.2, H / 2 + 0.3, 0]}
        colors={WALL}
      >
        {([m]) => (
          <>
            <RoundedBox args={[T, H, D - 2 * T]} radius={0.03} material={m} />
            <Window position={[0, 0.12, -0.35]} rotY={Math.PI / 2} size={[0.38, 0.5]} />
            <Window position={[0, 0.12, 0.35]} rotY={Math.PI / 2} size={[0.38, 0.5]} />
          </>
        )}
      </Part>

      {/* Toit */}
      <Part
        {...common('roof')}
        base={[0, H, 0]}
        explode={{ pos: [0, 1.35, 0], rot: [0, 0.3, 0] }}
        push={[0, 1, 0]}
        labelOffset={[0, R + 0.55, 0]}
        colors={ROOF}
      >
        {([tile, gable]) => (
          <>
            <RoundedBox
              args={[W + 0.3, 0.1, paneLen]}
              radius={0.03}
              position={[0, R / 2 + 0.05, D / 4]}
              rotation-x={pitch}
              material={tile}
            />
            <RoundedBox
              args={[W + 0.3, 0.1, paneLen]}
              radius={0.03}
              position={[0, R / 2 + 0.05, -D / 4]}
              rotation-x={-pitch}
              material={tile}
            />
            <mesh geometry={gableGeo} position-x={-W / 2 + T / 2} rotation-y={Math.PI / 2} material={gable} />
            <mesh geometry={gableGeo} position-x={W / 2 - T / 2} rotation-y={Math.PI / 2} material={gable} />
            <mesh position={[0.7, R * 0.7, -0.3]} material={tile}>
              <boxGeometry args={[0.26, 0.6, 0.26]} />
            </mesh>
          </>
        )}
      </Part>
    </group>
  )
}
