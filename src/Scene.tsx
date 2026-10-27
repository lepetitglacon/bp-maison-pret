import { useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { House } from './House'
import type { PartId, Step } from './steps'

const { damp, clamp } = THREE.MathUtils
const TAU = Math.PI * 2

interface SceneProps {
  step: Step
  onSelect: (id: PartId) => void
}

/** Maison flottante, orientable au doigt / à la souris avec inertie. */
function FloatingHouse({ step, onSelect }: SceneProps) {
  const outer = useRef<THREE.Group>(null)
  const spin = useRef<THREE.Group>(null)
  const gl = useThree((s) => s.gl)
  const ctrl = useRef({ rot: step.rotY, target: step.rotY, vel: 0, tilt: 0, tiltTarget: 0, dragging: false, lastX: 0, lastY: 0 })

  // À chaque étape, on tourne vers l'angle prévu (par le chemin le plus court)
  useEffect(() => {
    const c = ctrl.current
    c.target = step.rotY + TAU * Math.round((c.target - step.rotY) / TAU)
    if (step.celebrate) c.target += TAU // petit tour sur soi-même pour fêter ça
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

  useFrame(({ clock }, dt) => {
    const c = ctrl.current
    const t = clock.elapsedTime
    if (!c.dragging) {
      c.target += c.vel
      c.vel *= Math.pow(0.04, dt) // inertie
      c.tiltTarget = damp(c.tiltTarget, 0, 1.5, dt)
    }
    c.rot = damp(c.rot, c.target, 5, dt)
    c.tilt = damp(c.tilt, c.tiltTarget, 6, dt)

    if (spin.current) {
      spin.current.rotation.y = c.rot + Math.sin(t * 0.45) * 0.06
      spin.current.rotation.x = c.tilt
    }
    if (outer.current) {
      // Flottement doux
      outer.current.position.y = Math.sin(t * 1.1) * 0.12
      outer.current.rotation.z = Math.sin(t * 0.7) * 0.025
      outer.current.rotation.x = Math.cos(t * 0.6) * 0.02
    }
  })

  return (
    <group ref={outer}>
      <group ref={spin}>
        <House step={step} onSelect={onSelect} />
      </group>
    </group>
  )
}

/** Caméra qui glisse vers la position de chaque étape, adaptée au format de la zone 3D. */
function CameraRig({ step }: { step: Step }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const look = useRef(new THREE.Vector3())

  useFrame((_, dt) => {
    // Plus la zone 3D est étroite/haute, plus on recule pour garder la maison éclatée dans le cadre
    const aspect = size.width / size.height
    const zoom = clamp(1.45 / aspect, 1.5, 2.6)
    const [x, y, z] = step.cam
    const lookY = step.lookY ?? 0

    camera.position.x = damp(camera.position.x, x, 2.5, dt)
    camera.position.y = damp(camera.position.y, y * zoom + lookY, 2.5, dt)
    camera.position.z = damp(camera.position.z, z * zoom, 2.5, dt)
    look.current.set(0, damp(look.current.y, lookY, 2.5, dt), 0)
    camera.lookAt(look.current)
  })
  return null
}

export function Scene({ step, onSelect }: SceneProps) {
  return (
    <Canvas
      className="scene"
      dpr={[1, 2]}
      camera={{ position: [0, 2.2, 8], fov: 38 }}
      onPointerMissed={() => (document.body.style.cursor = '')}
    >
      <hemisphereLight args={['#ffffff', '#3a5bd0', 1.2]} />
      <directionalLight position={[5, 8, 5]} intensity={1.8} />
      <directionalLight position={[-6, 3, -4]} intensity={0.7} color="#8fb8ff" />
      <CameraRig step={step} />
      <FloatingHouse step={step} onSelect={onSelect} />
      <ContactShadows position={[0, -2.05, 0]} opacity={0.45} scale={10} blur={2.6} far={4} color="#050d3a" />
      {step.celebrate && <Sparkles count={60} scale={[6, 4, 6]} size={4} speed={0.5} color="#ffffff" />}
    </Canvas>
  )
}
