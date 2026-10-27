import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import * as THREE from 'three'
import { House } from './House'
import { Twinkles } from './Twinkles'
import { shineUniforms } from './shine'
import { advanceIdleTime, getIdleTime, motion } from './motion'
import { STEPS, type PartId, type Step } from './steps'

const { damp, clamp } = THREE.MathUtils
const TAU = Math.PI * 2

export type SceneMode = 'welcome' | 'steps'

interface SceneProps {
  step: Step
  mode: SceneMode
  introAt: number | null
  onSelect: (id: PartId) => void
  /** Emplacement de la zone 3D dans la page : la caméra y centre la maison */
  frameRef: React.RefObject<HTMLElement | null>
  /** Description de la scène pour les lecteurs d'écran */
  label: string
}

/** Maison flottante, orientable au doigt / à la souris avec inertie. */
function FloatingHouse({ step, mode, introAt, onSelect }: Omit<SceneProps, 'frameRef' | 'label'>) {
  const outer = useRef<THREE.Group>(null)
  const spin = useRef<THREE.Group>(null)
  const gl = useThree((s) => s.gl)
  const ctrl = useRef({
    rot: step.rotY,
    target: step.rotY,
    vel: 0,
    tilt: 0,
    tiltTarget: 0,
    pose: 0, // inclinaison imposée par l'étape (step.tiltX), lissée
    sway: 1, // amplitude du balancement / flottement (coupé quand une étape demande une vue fixe)
    fast: false, // rotation accélérée (tour final)
    dragging: false,
    lastX: 0,
    lastY: 0,
  })
  const prevIndex = useRef(-1)

  // À chaque étape, on tourne vers l'angle prévu, toujours dans le même sens :
  // en avançant la maison tourne dans le sens horaire (angle décroissant), en reculant elle revient.
  useEffect(() => {
    const c = ctrl.current
    const index = STEPS.indexOf(step)
    const forward = index >= prevIndex.current
    prevIndex.current = index
    const turns = (c.target - step.rotY) / TAU
    const EPS = 0.02 // déjà (quasiment) à l'angle voulu : on ne fait pas de tour
    c.target = step.rotY + TAU * (forward ? Math.floor(turns + EPS) : Math.ceil(turns - EPS))
    // Dernière étape : un tour complet rapide en plus, pour marquer la fin du parcours
    c.fast = !!step.celebrate && forward
    if (c.fast) c.target -= TAU
    c.vel = 0
  }, [step])

  useEffect(() => {
    const el = gl.domElement
    const c = ctrl.current
    const down = (e: PointerEvent) => {
      c.dragging = true
      c.lastX = e.clientX
      c.lastY = e.clientY
      c.vel = 0
    }
    const move = (e: PointerEvent) => {
      if (!c.dragging) return
      const dx = e.clientX - c.lastX
      const dy = e.clientY - c.lastY
      c.lastX = e.clientX
      c.lastY = e.clientY
      c.vel = dx * 0.009
      c.target += c.vel
      c.tiltTarget = clamp(c.tiltTarget + dy * 0.004, -0.25, 0.45)
    }
    const up = () => {
      c.dragging = false
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [gl])

  useFrame((_, dt) => {
    const c = ctrl.current
    const t = getIdleTime()
    if (!c.dragging) {
      if (mode === 'welcome' && !motion.paused) c.target -= dt * 0.35 // la page de garde tourne doucement toute seule, même sens
      c.target += c.vel
      c.vel *= Math.pow(0.04, dt) // inertie
      c.tiltTarget = damp(c.tiltTarget, 0, 1.5, dt)
    }
    c.rot = damp(c.rot, c.target, c.fast ? 7 : 5, dt)
    c.tilt = damp(c.tilt, c.tiltTarget, 6, dt)
    c.pose = damp(c.pose, step.tiltX ?? 0, 3, dt)
    c.sway = damp(c.sway, step.tiltX === undefined ? 1 : 0, 3, dt)

    if (spin.current) {
      spin.current.rotation.y = c.rot + Math.sin(t * 0.45) * 0.06 * c.sway
      spin.current.rotation.x = c.tilt + c.pose
    }
    if (outer.current) {
      // Flottement doux
      outer.current.position.y = Math.sin(t * 1.1) * 0.12 * c.sway
      outer.current.rotation.z = Math.sin(t * 0.7) * 0.025 * c.sway
      outer.current.rotation.x = Math.cos(t * 0.6) * 0.02 * c.sway
    }
  })

  return (
    <group ref={outer}>
      <group ref={spin}>
        <House step={step} interactive={mode === 'steps'} introAt={introAt} onSelect={onSelect} />
        {/* mini "+X" autour de la maison, dans le même repère : ils tournent avec elle */}
        <Twinkles active={!!step.celebrate} />
      </group>
    </group>
  )
}

/** Fait avancer le temps des mouvements au repos (figé quand les animations sont en pause) */
function IdleClock() {
  useFrame((_, dt) => advanceIdleTime(dt), -1)
  return null
}

/** Allume / éteint l'effet shiny de la maison et fait avancer son balayage */
function ShineDriver({ active }: { active: boolean }) {
  useFrame((_, dt) => {
    // en pause, le balayage lumineux s'éteint
    shineUniforms.uShine.value = damp(shineUniforms.uShine.value, active && !motion.paused ? 1 : 0, 3, dt)
    shineUniforms.uShineTime.value = getIdleTime()
  })
  return null
}

/** Éclairage d'ambiance réaliste généré localement (pas de fichier HDR à télécharger) */
function StudioEnvironment() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.55
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return null
}

/** Caméra qui glisse vers la position de chaque étape, adaptée au format de la zone 3D. */
// Position caméra (avant zoom) : plus proche sur la page de garde, où la maison est assemblée
const CAMERA: Record<SceneMode, [number, number, number]> = {
  welcome: [0, 1, 5.3],
  steps: [0, 1.5, 8.4],
}

function CameraRig({ mode, frameRef }: { mode: SceneMode; frameRef: React.RefObject<HTMLElement | null> }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const look = useRef(new THREE.Vector3())
  // Cadrage lissé : décalage de vue (px) et recul, pour suivre la zone 3D sans à-coup
  const frame = useRef<{ x: number; y: number; zoom: number } | null>(null)

  useFrame((_, dt) => {
    // Le canvas couvre toute l'app et ne change pas de taille : on cadre la maison au centre
    // de la zone 3D (l'emplacement .stage), qui, elle, bouge pendant les transitions.
    const canvas = gl.domElement.getBoundingClientRect()
    const zone = frameRef.current?.getBoundingClientRect() ?? canvas
    const W = size.width
    const H = size.height
    const zoneH = Math.max(1, zone.height)
    const target = {
      x: W / 2 - (zone.left - canvas.left + zone.width / 2),
      y: H / 2 - (zone.top - canvas.top + zoneH / 2),
      // plus la zone est étroite/haute, plus on recule ; et on compense sa hauteur réelle à l'écran
      zoom: clamp(1.45 / (zone.width / zoneH), 1.5, 2.6) * (H / zoneH),
    }
    const f = (frame.current ??= { ...target })
    f.x = damp(f.x, target.x, 6, dt)
    f.y = damp(f.y, target.y, 6, dt)
    f.zoom = damp(f.zoom, target.zoom, 6, dt)
    camera.setViewOffset(W, H, f.x, f.y, W, H)

    const [x, y, z] = CAMERA[mode]
    camera.position.x = damp(camera.position.x, x, 2.5, dt)
    camera.position.y = damp(camera.position.y, y * f.zoom, 2.5, dt)
    camera.position.z = damp(camera.position.z, z * f.zoom, 2.5, dt)
    look.current.set(0, 0, 0)
    camera.lookAt(look.current)
  })
  return null
}

export function Scene({ step, mode, introAt, onSelect, frameRef, label }: SceneProps) {
  return (
    <Canvas
      className="scene"
      role="img"
      aria-label={label}
      dpr={[1, 2]}
      shadows="percentage"
      gl={{ toneMappingExposure: 1.15 }}
      camera={{ position: [0, 2.2, 8], fov: 38 }}
      onPointerMissed={() => (document.body.style.cursor = '')}
    >
      <IdleClock />
      <StudioEnvironment />
      {/* Lumière principale de biais, en hauteur : elle porte les ombres (toit sur les murs, fond des "+X") */}
      <hemisphereLight args={['#ffffff', '#8aa5d6', 0.35]} />
      <directionalLight
        // écartée de l'axe de la caméra : une face vue de face ne renvoie plus le reflet de la lumière
        position={[-7, 6, 2.5]}
        intensity={2.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={4}
      >
        <orthographicCamera attach="shadow-camera" args={[-6, 6, 6, -6, 0.5, 25]} />
      </directionalLight>
      {/* Contre-jour bleuté pour détacher les arêtes */}
      <directionalLight position={[5, 4, -5]} intensity={1} color="#8fd2ff" />
      <CameraRig mode={mode} frameRef={frameRef} />
      <Suspense fallback={null}>
        <FloatingHouse step={step} mode={mode} introAt={introAt} onSelect={onSelect} />
      </Suspense>
      <ContactShadows position={[0, -2.6, 0]} opacity={0.3} scale={12} blur={2.8} far={5} color="#13255d" />
      {/* Dernière étape : la maison devient "shiny" (les mini "+X" sont dans FloatingHouse) */}
      <ShineDriver active={!!step.celebrate} />
    </Canvas>
  )
}
