import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js'
import { Part } from './Part'
import { PART_IDS, PART_LABELS, type PartId, type Step, type Vec3 } from './steps'

const MODEL_URL = '/maison.glb'

// Couleurs du prototype BPBFC
const COLORS: Record<PartId, string[]> = {
  Objet012: ['#13255d'],
  Objet013: ['#05ACEB'],
  Rectangle005: ['#13255d'],
  Rectangle006: ['#279be0'],
  Rectangle007: ['#05ACEB'],
}

/** Distance de base des pièces en attente depuis leur place */
const SPREAD = 1.4
/** Éloignement maximal (début du parcours) ; les pièces se rapprochent au fil des étapes */
const WAIT_FAR = 2.2
/** Au-delà de cet angle entre deux faces, l'arête reste vive (pas de normale lissée) */
const CREASE_ANGLE = Math.PI / 6
/** Une pièce dont l'épaisseur est sous ce ratio de sa plus grande dimension est un "panneau" */
const PANEL_RATIO = 0.35
/** Réduction de la zone de survol invisible d'un panneau (dans son plan) */
const HIT_SHRINK = 0.86

/** Matériau qui ne dessine rien : sert uniquement à capter le survol / le clic */
const HIT_MATERIAL = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })

export interface PartData {
  id: PartId
  geometry: THREE.BufferGeometry
  /** Plan invisible qui bouche les trous d'un panneau (le "+X") pour le survol */
  hitArea: THREE.BufferGeometry | null
  explode: { pos: Vec3; rot: Vec3 }
  push: Vec3
  labelOffset: Vec3
}

/**
 * Charge maison.glb, remet le modèle (exporté en Z-up) à l'endroit, le centre,
 * et calcule pour chaque pièce sa direction d'éclatement depuis le centre de la maison.
 */
export function useHouseParts(): PartData[] {
  const { scene } = useGLTF(MODEL_URL)
  return useMemo(() => {
    const geos = new Map<PartId, THREE.BufferGeometry>()
    scene.updateMatrixWorld(true)
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh || !PART_IDS.includes(mesh.name as PartId)) return
      const g = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld)
      g.rotateX(-Math.PI / 2)
      // Le GLB n'a pas de normales et partage ses sommets entre faces : un simple
      // computeVertexNormals lisse les arêtes vives (ombrage baveux, "bosses").
      geos.set(mesh.name as PartId, toCreasedNormals(g, CREASE_ANGLE))
    })

    const bounds = new THREE.Box3()
    geos.forEach((g) => {
      g.computeBoundingBox()
      bounds.union(g.boundingBox!)
    })
    const center = bounds.getCenter(new THREE.Vector3())

    return PART_IDS.filter((id) => geos.has(id)).map((id) => {
      const g = geos.get(id)!
      g.translate(-center.x, -center.y, -center.z)
      g.computeBoundingBox()
      const c = g.boundingBox!.getCenter(new THREE.Vector3())
      const size = g.boundingBox!.getSize(new THREE.Vector3())
      const isPanel = Math.min(size.x, size.y, size.z) < Math.max(size.x, size.y, size.z) * PANEL_RATIO
      // Légèrement plus petit que le panneau, pour ne pas capter le survol dans le creux des angles
      const thin = Math.min(size.x, size.y, size.z)
      const shrink = (v: number) => (v === thin ? v : v * HIT_SHRINK)
      const hitArea = isPanel
        ? new THREE.BoxGeometry(shrink(size.x), shrink(size.y), shrink(size.z)).translate(c.x, c.y, c.z)
        : null
      const dir = c.lengthSq() < 0.01 ? new THREE.Vector3(0, 1, 0) : c.clone().normalize()
      // On limite la descente pour que les pièces ne passent pas sous le sol
      const pos = new THREE.Vector3(dir.x, Math.max(dir.y, -0.12), dir.z).multiplyScalar(SPREAD)
      return {
        id,
        geometry: g,
        hitArea,
        explode: { pos: pos.toArray() as Vec3, rot: [dir.z * 0.35, 0.25, -dir.x * 0.35] },
        push: dir.toArray() as Vec3,
        labelOffset: [c.x, g.boundingBox!.max.y + 0.25, c.z],
      }
    })
  }, [scene])
}

useGLTF.preload(MODEL_URL)

interface HouseProps {
  step: Step
  /** Survol / clic sur les pièces (désactivé sur la page de garde) */
  interactive: boolean
  /** Début de l'intro des étapes (secondes, performance.now), ou null */
  introAt: number | null
  onSelect: (id: PartId) => void
}

/** À l'arrivée sur les étapes, la maison se désosse presque d'un coup, pendant la transition du panneau */
const INTRO_FIRST = 0.05
const INTRO_GAP = 0.06

export function House({ step, interactive, introAt, onSelect }: HouseProps) {
  const parts = useHouseParts()
  // Les pièces en attente partent de loin et se rapprochent à chaque pièce posée
  const remaining = PART_IDS.length - step.placed.length
  const spread = 1 + ((WAIT_FAR - 1) * Math.max(0, remaining - 1)) / (PART_IDS.length - 1)
  return (
    <group>
      {parts.map((p, i) => (
        <Part
          key={p.id}
          id={p.id}
          label={PART_LABELS[p.id]}
          base={[0, 0, 0]}
          explode={p.explode}
          push={p.push}
          labelOffset={p.labelOffset}
          colors={COLORS[p.id]}
          placed={step.placed.includes(p.id)}
          active={step.active === p.id}
          interactive={interactive}
          spread={spread}
          intro={introAt === null ? null : { at: introAt, delay: INTRO_FIRST + i * INTRO_GAP }}
          onSelect={onSelect}
        >
          {([m]) => (
            <>
              <mesh geometry={p.geometry} material={m} castShadow receiveShadow />
              {p.hitArea && <mesh geometry={p.hitArea} material={HIT_MATERIAL} />}
            </>
          )}
        </Part>
      ))}
    </group>
  )
}
