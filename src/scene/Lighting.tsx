import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ROUTE_CHUNK_COUNT, sampleRouteFrame } from './route'
import { QUALITY } from './theme'
import { blendColor, blendNumber, getZoneBlend } from './zones/zoneVisuals'

type CloudglowLightingProps = {
  /** Optional for future callers. App currently relies on camera-route inference. */
  progress?: number
}

const ROUTE_LOOKUP_SEGMENTS = ROUTE_CHUNK_COUNT * 8
const ROUTE_LOOKUP = Array.from({ length: ROUTE_LOOKUP_SEGMENTS + 1 }, (_, index) => ({
  progress: index / ROUTE_LOOKUP_SEGMENTS,
  point: sampleRouteFrame(index / ROUTE_LOOKUP_SEGMENTS).position,
}))

function nearestRouteProgress(position: THREE.Vector3) {
  let nearest = 0
  let nearestDistance = Number.POSITIVE_INFINITY
  for (const sample of ROUTE_LOOKUP) {
    const distance = sample.point.distanceToSquared(position)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearest = sample.progress
    }
  }
  return nearest
}

const colorScratch = new THREE.Color()

export function CloudglowLighting({ progress }: CloudglowLightingProps = {}) {
  const camera = useThree((state) => state.camera)
  const hemisphere = useRef<THREE.HemisphereLight>(null)
  const ambient = useRef<THREE.AmbientLight>(null)
  const key = useRef<THREE.DirectionalLight>(null)
  const fill = useRef<THREE.DirectionalLight>(null)
  const rim = useRef<THREE.DirectionalLight>(null)
  const accent = useRef<THREE.PointLight>(null)
  const smoothedProgress = useRef(progress ?? 0)
  const shadowSize = useMemo(
    () =>
      typeof window !== 'undefined' &&
      (window.innerWidth < 820 || window.matchMedia('(pointer: coarse)').matches)
        ? QUALITY.mobileShadowMap
        : QUALITY.desktopShadowMap,
    [],
  )

  useFrame((_, delta) => {
    const inferred = progress ?? nearestRouteProgress(camera.position)
    smoothedProgress.current = THREE.MathUtils.damp(
      smoothedProgress.current,
      inferred,
      4.5,
      delta,
    )
    const currentProgress = smoothedProgress.current
    const blend = getZoneBlend(currentProgress)
    const frame = sampleRouteFrame(currentProgress)

    if (hemisphere.current) {
      hemisphere.current.color.copy(blendColor(blend, 'hemiSky', colorScratch))
      hemisphere.current.groundColor.copy(blendColor(blend, 'hemiGround', colorScratch))
      hemisphere.current.intensity = THREE.MathUtils.damp(
        hemisphere.current.intensity,
        blendNumber(blend, 'hemiIntensity'),
        3,
        delta,
      )
    }
    if (ambient.current) {
      ambient.current.color.copy(blendColor(blend, 'fill', colorScratch))
      ambient.current.intensity = THREE.MathUtils.damp(
        ambient.current.intensity,
        blendNumber(blend, 'ambientIntensity'),
        3,
        delta,
      )
    }
    if (key.current) {
      key.current.color.copy(blendColor(blend, 'key', colorScratch))
      key.current.intensity = THREE.MathUtils.damp(
        key.current.intensity,
        blendNumber(blend, 'sunIntensity'),
        3,
        delta,
      )
      key.current.position
        .copy(frame.position)
        .addScaledVector(frame.right, 22)
        .addScaledVector(frame.up, 32)
        .addScaledVector(frame.tangent, -12)
      key.current.target.position.copy(frame.position).addScaledVector(frame.tangent, 8)
      key.current.target.updateMatrixWorld(true)
    }
    if (fill.current) {
      fill.current.color.copy(blendColor(blend, 'fill', colorScratch))
      fill.current.intensity = THREE.MathUtils.damp(
        fill.current.intensity,
        blendNumber(blend, 'fillIntensity'),
        3,
        delta,
      )
      fill.current.position
        .copy(frame.position)
        .addScaledVector(frame.right, -18)
        .addScaledVector(frame.up, 9)
        .addScaledVector(frame.tangent, 5)
      fill.current.target.position.copy(frame.position).addScaledVector(frame.tangent, 4)
      fill.current.target.updateMatrixWorld(true)
    }
    if (rim.current) {
      rim.current.color.copy(blendColor(blend, 'glow', colorScratch))
      rim.current.intensity = THREE.MathUtils.damp(
        rim.current.intensity,
        blendNumber(blend, 'rimIntensity'),
        3,
        delta,
      )
      rim.current.position
        .copy(frame.position)
        .addScaledVector(frame.right, -14)
        .addScaledVector(frame.up, 18)
        .addScaledVector(frame.tangent, -20)
      rim.current.target.position.copy(frame.position).addScaledVector(frame.tangent, 3)
      rim.current.target.updateMatrixWorld(true)
    }
    if (accent.current) {
      accent.current.color.copy(blendColor(blend, 'glow', colorScratch))
      accent.current.position
        .copy(frame.position)
        .addScaledVector(frame.right, -4.5)
        .addScaledVector(frame.up, 5)
        .addScaledVector(frame.tangent, 10)
      accent.current.intensity = blendNumber(blend, 'accentIntensity')
    }
  }, -30)

  return (
    <>
      <hemisphereLight ref={hemisphere} args={['#ffe1c2', '#355e58', 0.92]} />
      <ambientLight ref={ambient} color="#aae8d7" intensity={0.56} />
      <directionalLight
        ref={key}
        castShadow
        color="#ffe2b5"
        intensity={2.42}
        position={[22, 34, 12]}
        shadow-bias={-0.00018}
        shadow-normalBias={0.035}
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
        shadow-camera-left={-36}
        shadow-camera-right={36}
        shadow-camera-top={36}
        shadow-camera-bottom={-36}
        shadow-camera-near={1}
        shadow-camera-far={105}
      />
      <directionalLight ref={fill} color="#aae8d7" intensity={0.72} position={[-18, 9, 4]} />
      <directionalLight ref={rim} color="#8aefd1" intensity={0.58} position={[-14, 18, -20]} />
      <pointLight ref={accent} color="#8aefd1" intensity={1.7} distance={22} decay={2} />
    </>
  )
}
