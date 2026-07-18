import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ZoneId } from '../game/worldConfig'
import { sampleRoute, sampleRouteFrame } from './route'
import { CLOUDGLOW } from './theme'
import type { SkyReachPose } from './SkyReachDirector'
import {
  MOCHI_BODY_SEGMENTS,
  MOCHI_RADIAL_SEGMENTS,
  MOCHI_ZONE_MOTION,
  MochiSpine,
  type MochiMotionProfile,
  type MochiSpineMotion,
} from './MochiSpine'

export interface MochiProps {
  progress: number
  lane: number
  collected: number
  paused?: boolean
  progressRef?: MutableRefObject<number>
  speedMultiplier?: number
  zoneId?: ZoneId
  magicPulse?: number
  obstaclePulse?: number
  skyReachPoseRef?: MutableRefObject<SkyReachPose>
}

type MochiShader = {
  uniforms: Record<string, { value: unknown }>
  vertexShader: string
  fragmentShader: string
}

const BODY_RADIUS = 0.74
const TAU = Math.PI * 2
const BODY_FLOWER_DISTANCES = [5.58, 3.72] as const

const BODY_CURVE = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(0.08, 0.54, 11.8),
    new THREE.Vector3(-0.28, 0.62, 10.45),
    new THREE.Vector3(0.34, 0.66, 8.9),
    new THREE.Vector3(0.5, 0.68, 7.25),
    new THREE.Vector3(-0.34, 0.7, 5.7),
    new THREE.Vector3(-0.48, 0.73, 4.18),
    new THREE.Vector3(0.25, 0.79, 2.82),
    new THREE.Vector3(0.36, 0.91, 1.78),
    new THREE.Vector3(-0.08, 1.18, 0.86),
    new THREE.Vector3(0, 1.49, 0.22),
  ],
  false,
  'centripetal',
  0.5,
)

const MOUTH_CURVE = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-0.65, -0.31, -1.075),
    new THREE.Vector3(-0.34, -0.38, -1.125),
    new THREE.Vector3(0, -0.405, -1.145),
    new THREE.Vector3(0.34, -0.38, -1.125),
    new THREE.Vector3(0.65, -0.31, -1.075),
  ],
  false,
  'centripetal',
  0.5,
)

function smooth01(value: number) {
  const clamped = THREE.MathUtils.clamp(value, 0, 1)
  return clamped * clamped * (3 - 2 * clamped)
}

function createBodyGeometry() {
  const geometry = new THREE.TubeGeometry(
    BODY_CURVE,
    MOCHI_BODY_SEGMENTS,
    BODY_RADIUS,
    MOCHI_RADIAL_SEGMENTS,
    false,
  )
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute
  const point = new THREE.Vector3()
  const direction = new THREE.Vector3()

  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index)
    direction.fromBufferAttribute(normal, index)

    const alongBody = uv.getX(index)
    const tailTaper = 0.035 + 0.965 * smooth01(alongBody / 0.23)
    point.addScaledVector(direction, BODY_RADIUS * (tailTaper - 1))
    position.setXYZ(index, point.x, point.y, point.z)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.85, 5.6), 8.6)
  geometry.name = 'Mochi continuous tapered body'
  return geometry
}

function createHeadGeometry() {
  const geometry = new THREE.SphereGeometry(1, 52, 38)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const point = new THREE.Vector3()

  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index)
    const originalX = point.x
    const originalY = point.y
    const originalZ = point.z
    const front = smooth01((-originalZ + 0.12) / 1.12)
    const equator = 1 - Math.abs(originalY)
    const cheek = front * smooth01((0.76 - Math.abs(originalY)) / 0.76)

    point.x = originalX * (1.06 + equator * 0.1 + cheek * 0.12)
    point.y = originalY * (0.84 + front * 0.055) + front * equator * 0.035
    point.z = originalZ * (1.01 + equator * 0.08) - cheek * 0.095

    if (point.y < -0.42) {
      point.y = -0.42 + (point.y + 0.42) * 0.72
    }

    position.setXYZ(index, point.x, point.y, point.z)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  geometry.name = 'Mochi sculpted head'
  return geometry
}

function createTongueGeometry() {
  const tongue = new THREE.Shape()
  tongue.moveTo(-0.07, 0.025)
  tongue.lineTo(0.07, 0.025)
  tongue.lineTo(0.055, -0.18)
  tongue.lineTo(0.14, -0.31)
  tongue.lineTo(0.025, -0.275)
  tongue.lineTo(0, -0.47)
  tongue.lineTo(-0.025, -0.275)
  tongue.lineTo(-0.14, -0.31)
  tongue.lineTo(-0.055, -0.18)
  tongue.closePath()
  const geometry = new THREE.ShapeGeometry(tongue, 4)
  geometry.name = 'Mochi forked tongue'
  return geometry
}

function createScaleMaterial(withBelly: boolean) {
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(CLOUDGLOW.rose),
    roughness: withBelly ? 0.38 : 0.34,
    metalness: 0,
    clearcoat: 0.24,
    clearcoatRoughness: 0.42,
    sheen: 0.26,
    sheenColor: new THREE.Color(CLOUDGLOW.roseHighlight),
    sheenRoughness: 0.66,
    iridescence: 0.025,
    iridescenceIOR: 1.25,
    iridescenceThicknessRange: [90, 210],
    emissive: new THREE.Color(CLOUDGLOW.roseShadow),
    emissiveIntensity: 0.012,
  })

  material.defines = { ...material.defines, USE_UV: '' }
  material.customProgramCacheKey = () => `mochi-scales-${withBelly ? 'body' : 'head'}-v2`
  material.onBeforeCompile = (shader) => {
    const mochiShader = shader as MochiShader
    mochiShader.uniforms.uMochiTime = { value: 0 }
    mochiShader.uniforms.uMochiHappy = { value: 0 }
    mochiShader.uniforms.uMochiRose = { value: new THREE.Color(CLOUDGLOW.rose) }
    mochiShader.uniforms.uMochiHighlight = { value: new THREE.Color(CLOUDGLOW.roseHighlight) }
    mochiShader.uniforms.uMochiShadow = { value: new THREE.Color(CLOUDGLOW.roseShadow) }
    mochiShader.uniforms.uMochiBelly = { value: new THREE.Color(CLOUDGLOW.blush) }

    mochiShader.vertexShader = mochiShader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vMochiUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMochiUv = uv;')

    mochiShader.fragmentShader = mochiShader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uMochiTime;
uniform float uMochiHappy;
uniform vec3 uMochiRose;
uniform vec3 uMochiHighlight;
uniform vec3 uMochiShadow;
uniform vec3 uMochiBelly;
varying vec2 vMochiUv;`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
float mochiRow = floor(vMochiUv.y * ${withBelly ? '30.0' : '34.0'});
vec2 mochiGrid = vec2(
  vMochiUv.x * ${withBelly ? '82.0' : '48.0'} + mod(mochiRow, 2.0) * 0.5,
  vMochiUv.y * ${withBelly ? '30.0' : '34.0'}
);
vec2 mochiCell = fract(mochiGrid) - 0.5;
float mochiOval = length(mochiCell * vec2(1.0, 1.24));
float mochiScaleOuter = 1.0 - smoothstep(0.37, 0.49, mochiOval);
float mochiScaleInner = 1.0 - smoothstep(0.20, 0.38, mochiOval);
float mochiScaleRim = clamp(mochiScaleOuter - mochiScaleInner, 0.0, 1.0);
float mochiShimmer = 0.5 + 0.5 * sin(
  uMochiTime * 1.25 + vMochiUv.x * 31.0 + vMochiUv.y * 13.0
);
vec3 mochiRose = mix(uMochiRose, uMochiHighlight, mochiScaleInner * (0.035 + 0.04 * mochiShimmer));
mochiRose = mix(mochiRose, uMochiShadow, mochiScaleRim * 0.09);
float mochiBellyDistance = min(vMochiUv.y, 1.0 - vMochiUv.y);
float mochiBellyMask = 0.0;
float mochiPlatePhase = fract(vMochiUv.x * 28.0);
float mochiPlateEdge = 1.0 - smoothstep(0.035, 0.105, min(mochiPlatePhase, 1.0 - mochiPlatePhase));
vec3 mochiBelly = mix(uMochiBelly, uMochiHighlight, 0.14 + mochiShimmer * 0.04);
mochiBelly = mix(mochiBelly, uMochiShadow, mochiPlateEdge * 0.11);
diffuseColor.rgb = mix(mochiRose, mochiBelly, mochiBellyMask);
diffuseColor.rgb = mix(diffuseColor.rgb, uMochiHighlight, uMochiHappy * (0.08 + mochiShimmer * 0.04));`,
      )

    material.userData.mochiShader = mochiShader
  }

  return material
}

function Flower({
  position,
  rotation = [0, 0, 0],
  scale = 1,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {Array.from({ length: 5 }, (_, index) => {
        const angle = (index / 5) * Math.PI * 2
        return (
          <mesh
            key={angle}
            castShadow
            position={[Math.cos(angle) * 0.22, Math.sin(angle) * 0.22, 0]}
            rotation={[0, 0, angle - Math.PI / 2]}
            scale={[0.115, 0.25, 0.065]}
          >
            <sphereGeometry args={[1, 18, 12]} />
            <meshPhysicalMaterial
              color="#ffd5e4"
              roughness={0.42}
              clearcoat={0.28}
              sheen={0.3}
              sheenColor={CLOUDGLOW.roseHighlight}
            />
          </mesh>
        )
      })}
      <mesh castShadow position={[0, 0, 0.055]} scale={[0.14, 0.14, 0.09]}>
        <sphereGeometry args={[1, 18, 12]} />
        <meshStandardMaterial color={CLOUDGLOW.gold} roughness={0.35} emissive={CLOUDGLOW.gold} emissiveIntensity={0.12} />
      </mesh>
    </group>
  )
}

export function Mochi({
  progress,
  lane,
  collected,
  paused = false,
  progressRef,
  speedMultiplier = 1,
  zoneId = 'garden',
  magicPulse = 0,
  obstaclePulse = 0,
  skyReachPoseRef,
}: MochiProps) {
  const rootRef = useRef<THREE.Group>(null)
  const animatedRef = useRef<THREE.Group>(null)
  const headAnchorRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Group>(null)
  const tongueRef = useRef<THREE.Mesh>(null)
  const eyeRefs = useRef<Array<THREE.Group | null>>([])
  const bodyFlowerRefs = useRef<Array<THREE.Group | null>>([])
  const animationTime = useRef(0)
  const lanePosition = useRef(lane)
  const previousCollected = useRef(collected)
  const cheer = useRef(0)
  const magicReaction = useRef(0)
  const obstacleReaction = useRef(0)
  const previousMagicPulse = useRef(magicPulse)
  const previousObstaclePulse = useRef(obstaclePulse)
  const drivePhase = useRef(0)
  const previousProgress = useRef(progressRef?.current ?? progress)
  const hasTravelSample = useRef(false)
  const initialProgress = useRef(progress)
  const initialLane = useRef(lane)
  const motionState = useRef<MochiMotionProfile>({ ...MOCHI_ZONE_MOTION[zoneId] })
  const spineMotion = useRef<MochiSpineMotion>({
    ...MOCHI_ZONE_MOTION[zoneId],
    phase: 0,
    time: 0,
    magic: 0,
    obstacle: 0,
    reachLift: 0,
    reachCoil: 0,
    reachUpright: 0,
  })

  const bodyGeometry = useMemo(createBodyGeometry, [])
  const headGeometry = useMemo(createHeadGeometry, [])
  const tongueGeometry = useMemo(createTongueGeometry, [])
  const bodyMaterial = useMemo(() => createScaleMaterial(true), [])
  const headMaterial = useMemo(() => createScaleMaterial(false), [])
  const targetPosition = useMemo(() => new THREE.Vector3(), [])
  const targetQuaternion = useMemo(() => new THREE.Quaternion(), [])
  const orientationMatrix = useMemo(() => new THREE.Matrix4(), [])
  const backward = useMemo(() => new THREE.Vector3(), [])
  const previousRootPosition = useMemo(() => new THREE.Vector3(), [])
  const headCenter = useMemo(() => new THREE.Vector3(), [])
  const headBack = useMemo(() => new THREE.Vector3(), [])
  const headUp = useMemo(() => new THREE.Vector3(), [])
  const headRight = useMemo(() => new THREE.Vector3(), [])
  const localBack = useMemo(() => new THREE.Vector3(0, 0, 1), [])
  const localUp = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  const headOrientationMatrix = useMemo(() => new THREE.Matrix4(), [])
  const headTargetQuaternion = useMemo(() => new THREE.Quaternion(), [])
  const flowerPosition = useMemo(() => new THREE.Vector3(), [])
  const flowerTangent = useMemo(() => new THREE.Vector3(), [])
  const flowerUp = useMemo(() => new THREE.Vector3(), [])
  const spine = useMemo(() => new MochiSpine(), [])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (root) {
      const routeFrame = sampleRouteFrame(initialProgress.current)
      sampleRoute(initialProgress.current, initialLane.current, targetPosition).addScaledVector(routeFrame.up, 0.34)
      backward.copy(routeFrame.tangent).multiplyScalar(-1)
      orientationMatrix.makeBasis(routeFrame.right, routeFrame.up, backward)
      root.position.copy(targetPosition)
      root.quaternion.setFromRotationMatrix(orientationMatrix)
      spine.reset(root.position, backward)
      spine.advance(root.position, root.quaternion, spineMotion.current)
      spine.deformTubeGeometry(bodyGeometry, BODY_RADIUS)
      previousRootPosition.copy(root.position)
      hasTravelSample.current = true
    }
  }, [backward, bodyGeometry, orientationMatrix, previousRootPosition, spine, targetPosition])

  useEffect(() => {
    return () => {
      bodyGeometry.dispose()
      headGeometry.dispose()
      tongueGeometry.dispose()
      bodyMaterial.dispose()
      headMaterial.dispose()
    }
  }, [bodyGeometry, bodyMaterial, headGeometry, headMaterial, tongueGeometry])

  useFrame((_, delta) => {
    const root = rootRef.current
    const animated = animatedRef.current
    const headAnchor = headAnchorRef.current
    const head = headRef.current
    if (!root || !animated || !headAnchor || !head) return

    const safeDelta = Math.min(delta, 1 / 20)
    if (!paused) animationTime.current += safeDelta
    const time = animationTime.current
    const liveProgress = THREE.MathUtils.clamp(progressRef?.current ?? progress, 0, 0.995)
    const restarted = liveProgress < previousProgress.current - 0.04
    previousProgress.current = liveProgress
    const speedVigor = Math.pow(THREE.MathUtils.clamp(speedMultiplier, 0.7, 5.2), 0.18)

    lanePosition.current = THREE.MathUtils.damp(
      lanePosition.current,
      lane,
      8.2 * speedVigor,
      safeDelta,
    )
    const routeFrame = sampleRouteFrame(liveProgress)
    sampleRoute(liveProgress, lanePosition.current, targetPosition).addScaledVector(routeFrame.up, 0.34)
    backward.copy(routeFrame.tangent).multiplyScalar(-1)
    orientationMatrix.makeBasis(routeFrame.right, routeFrame.up, backward)
    targetQuaternion.setFromRotationMatrix(orientationMatrix)

    if (restarted) {
      root.position.copy(targetPosition)
      root.quaternion.copy(targetQuaternion)
      spine.reset(root.position, backward)
      previousRootPosition.copy(root.position)
      drivePhase.current = 0
      hasTravelSample.current = true
    } else {
      const positionBlend = 1 - Math.exp(-11 * speedVigor * safeDelta)
      const rotationBlend = 1 - Math.exp(-13 * safeDelta)
      root.position.lerp(targetPosition, positionBlend)
      root.quaternion.slerp(targetQuaternion, rotationBlend)
    }

    const targetMotion = MOCHI_ZONE_MOTION[zoneId]
    const currentMotion = motionState.current
    const zoneBlend = 1 - Math.exp(-1.85 * safeDelta)
    currentMotion.lateralAmplitude = THREE.MathUtils.lerp(
      currentMotion.lateralAmplitude,
      targetMotion.lateralAmplitude,
      zoneBlend,
    )
    currentMotion.wavelength = THREE.MathUtils.lerp(currentMotion.wavelength, targetMotion.wavelength, zoneBlend)
    currentMotion.verticalAmplitude = THREE.MathUtils.lerp(
      currentMotion.verticalAmplitude,
      targetMotion.verticalAmplitude,
      zoneBlend,
    )
    currentMotion.compression = THREE.MathUtils.lerp(currentMotion.compression, targetMotion.compression, zoneBlend)
    currentMotion.phaseScale = THREE.MathUtils.lerp(currentMotion.phaseScale, targetMotion.phaseScale, zoneBlend)
    currentMotion.verticalRate = THREE.MathUtils.lerp(currentMotion.verticalRate, targetMotion.verticalRate, zoneBlend)
    currentMotion.headStability = THREE.MathUtils.lerp(
      currentMotion.headStability,
      targetMotion.headStability,
      zoneBlend,
    )

    if (hasTravelSample.current) {
      const travelled = Math.min(root.position.distanceTo(previousRootPosition), 0.28)
      if (!paused && !restarted) {
        drivePhase.current +=
          travelled * (TAU / currentMotion.wavelength) * currentMotion.phaseScale * speedVigor
      }
    } else {
      hasTravelSample.current = true
    }
    previousRootPosition.copy(root.position)

    if (collected > previousCollected.current) cheer.current = 1
    previousCollected.current = collected
    if (magicPulse !== previousMagicPulse.current) {
      if (magicPulse > 0) magicReaction.current = 1
      previousMagicPulse.current = magicPulse
    }
    if (obstaclePulse !== previousObstaclePulse.current) {
      if (obstaclePulse > 0) obstacleReaction.current = 1
      previousObstaclePulse.current = obstaclePulse
    }

    const reactionDelta = paused ? 0 : safeDelta
    cheer.current = THREE.MathUtils.damp(cheer.current, 0, 2.9, reactionDelta)
    magicReaction.current = THREE.MathUtils.damp(magicReaction.current, 0, 3.4, reactionDelta)
    obstacleReaction.current = THREE.MathUtils.damp(obstacleReaction.current, 0, 4.6, reactionDelta)
    const happyReaction = Math.max(cheer.current, magicReaction.current)
    const skyReach = skyReachPoseRef?.current
    const reachLift = skyReach?.lift ?? 0
    const reachCoil = skyReach?.coil ?? 0
    const reachUpright = skyReach?.upright ?? 0
    const reachSquash = skyReach?.squash ?? 0
    const reachGlow = skyReach?.glow ?? 0
    const expressiveJoy = Math.max(happyReaction, reachGlow * 0.92)

    const activeSpineMotion = spineMotion.current
    activeSpineMotion.lateralAmplitude =
      currentMotion.lateralAmplitude * (0.96 + speedVigor * 0.04) * (1 - obstacleReaction.current * 0.1)
    activeSpineMotion.wavelength = currentMotion.wavelength
    activeSpineMotion.verticalAmplitude = currentMotion.verticalAmplitude
    activeSpineMotion.compression = currentMotion.compression
    activeSpineMotion.phaseScale = currentMotion.phaseScale
    activeSpineMotion.verticalRate = currentMotion.verticalRate
    activeSpineMotion.headStability = currentMotion.headStability
    activeSpineMotion.phase = drivePhase.current
    activeSpineMotion.time = time
    activeSpineMotion.magic = happyReaction
    activeSpineMotion.obstacle = obstacleReaction.current
    activeSpineMotion.reachLift = reachLift
    activeSpineMotion.reachCoil = reachCoil
    activeSpineMotion.reachUpright = reachUpright

    spine.advance(root.position, root.quaternion, activeSpineMotion)
    spine.deformTubeGeometry(bodyGeometry, BODY_RADIUS)

    spine.sample(0, headCenter, headBack, headUp)
    headBack.lerp(localBack, currentMotion.headStability).normalize()
    headRight.crossVectors(localUp, headBack).normalize()
    headUp.crossVectors(headBack, headRight).normalize()
    headOrientationMatrix.makeBasis(headRight, headUp, headBack)
    headTargetQuaternion.setFromRotationMatrix(headOrientationMatrix)
    headAnchor.position
      .copy(headCenter)
      .addScaledVector(headUp, 0.74)
      .addScaledVector(headBack, -0.37)
    headAnchor.quaternion.slerp(headTargetQuaternion, 1 - Math.exp(-10.5 * safeDelta))

    for (let index = 0; index < BODY_FLOWER_DISTANCES.length; index += 1) {
      const flower = bodyFlowerRefs.current[index]
      if (!flower) continue
      spine.sample(BODY_FLOWER_DISTANCES[index], flowerPosition, flowerTangent, flowerUp)
      flower.position.copy(flowerPosition).addScaledVector(flowerUp, BODY_RADIUS * 1.08)
      flower.rotation.z = THREE.MathUtils.damp(
        flower.rotation.z,
        -flowerTangent.x * 0.22,
        8,
        safeDelta,
      )
    }

    const breath = Math.sin(time * 2.15) * 0.5 + 0.5
    const widthScale = 1 + reachSquash * 0.075 - reachUpright * 0.022
    const heightScale = 1 - reachSquash * 0.09 + reachUpright * 0.035
    animated.scale.set(
      (1 - breath * 0.0025) * widthScale,
      (1 + breath * 0.0045 + expressiveJoy * 0.012) * heightScale,
      (1 - breath * 0.0025) * widthScale,
    )
    animated.position.y =
      Math.sin(time * 2.15) * 0.009 + expressiveJoy * 0.065 - obstacleReaction.current * 0.035
    animated.rotation.z =
      Math.sin(time * 1.18) * 0.0035 + Math.sin((skyReach?.elapsed ?? 0) * 7.2) * reachSquash * 0.012

    head.rotation.y =
      1.08 + Math.sin(time * 0.76) * 0.065 + expressiveJoy * 0.055 - obstacleReaction.current * 0.045
    head.rotation.x =
      Math.sin(time * 0.93 + 0.8) * 0.018 - expressiveJoy * 0.05 - reachUpright * 0.045 + reachSquash * 0.035 + obstacleReaction.current * 0.035
    head.rotation.z =
      Math.sin(time * 1.07) * 0.018 + obstacleReaction.current * 0.025 + Math.sin((skyReach?.elapsed ?? 0) * 4.8) * reachGlow * 0.01

    const blinkClock = time % 4.85
    const blinkWave = blinkClock > 4.47 && blinkClock < 4.7
      ? Math.sin(((blinkClock - 4.47) / 0.23) * Math.PI)
      : 0
    const eyeOpen = skyReach?.active
      ? Math.max(0.94 + reachGlow * 0.06, 1 - blinkWave * 0.925)
      : Math.max(0.075, 1 - blinkWave * 0.925)
    eyeRefs.current.forEach((eye) => eye?.scale.set(1, eyeOpen, 1))

    const tongueClock = (time + 1.1) % 5.9
    const tongueFlick = tongueClock < 0.52 ? Math.sin((tongueClock / 0.52) * Math.PI) : 0
    if (tongueRef.current) {
      const visibleFlick = tongueFlick * (1 - reachUpright * 0.88)
      tongueRef.current.scale.y = 0.46 + visibleFlick * 0.72
      tongueRef.current.rotation.z = Math.sin(time * 10.5) * visibleFlick * 0.07
    }

    const shimmer = 0.012 + expressiveJoy * 0.11
    bodyMaterial.emissiveIntensity = shimmer
    headMaterial.emissiveIntensity = shimmer * 1.08
    const bodyShader = bodyMaterial.userData.mochiShader as MochiShader | undefined
    if (bodyShader) {
      bodyShader.uniforms.uMochiTime.value = time
      bodyShader.uniforms.uMochiHappy.value = expressiveJoy
    }
    const headShader = headMaterial.userData.mochiShader as MochiShader | undefined
    if (headShader) {
      headShader.uniforms.uMochiTime.value = time
      headShader.uniforms.uMochiHappy.value = expressiveJoy
    }
  })

  return (
    <group ref={rootRef} name="Mochi" frustumCulled={false}>
      <group ref={animatedRef}>
        <mesh geometry={bodyGeometry} material={bodyMaterial} castShadow receiveShadow />

        <group
          ref={(node) => {
            bodyFlowerRefs.current[0] = node
          }}
          position={[0.26, 1.39, 5.85]}
        >
          <Flower position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0.18]} scale={0.58} />
        </group>
        <group
          ref={(node) => {
            bodyFlowerRefs.current[1] = node
          }}
          position={[-0.34, 1.42, 3.92]}
        >
          <Flower position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, -0.22]} scale={0.46} />
        </group>

        <group ref={headAnchorRef} position={[0, 2.23, -0.15]}>
          <group ref={headRef} scale={0.88}>
            <mesh geometry={headGeometry} material={headMaterial} castShadow receiveShadow />

          {([-1, 1] as const).map((side, index) => (
            <group
              key={side}
              position={side === -1 ? [-1.02, 0.2, 0.02] : [0.62, 0.2, -0.66]}
              rotation={[0, side === -1 ? Math.PI - 1.02 : 0.14, 0]}
            >
              <mesh castShadow scale={[0.455, 0.535, 0.105]}>
                <sphereGeometry args={[1, 30, 22]} />
                <meshPhysicalMaterial
                  color={CLOUDGLOW.roseShadow}
                  roughness={0.38}
                  clearcoat={0.38}
                />
              </mesh>
              <group
                ref={(node) => {
                  eyeRefs.current[index] = node
                }}
              >
                <mesh castShadow position={[0, 0, -0.062]} scale={[0.375, 0.45, 0.12]}>
                  <sphereGeometry args={[1, 30, 22]} />
                  <meshPhysicalMaterial color="#fff4f7" roughness={0.22} clearcoat={0.7} clearcoatRoughness={0.2} />
                </mesh>
                <mesh position={[0, -0.005, -0.145]} scale={[0.265, 0.335, 0.12]}>
                  <sphereGeometry args={[1, 28, 20]} />
                  <meshPhysicalMaterial
                    color={CLOUDGLOW.orchid}
                    roughness={0.2}
                    clearcoat={0.78}
                    clearcoatRoughness={0.15}
                  />
                </mesh>
                <mesh position={[0, -0.02, -0.215]} scale={[0.145, 0.235, 0.085]}>
                  <sphereGeometry args={[1, 24, 18]} />
                  <meshPhysicalMaterial color={CLOUDGLOW.plum} roughness={0.16} clearcoat={0.9} />
                </mesh>
                <mesh position={[-0.075, 0.115, -0.277]} scale={[0.052, 0.072, 0.028]}>
                  <sphereGeometry args={[1, 16, 12]} />
                  <meshBasicMaterial color="#fffef7" toneMapped={false} />
                </mesh>
                <mesh position={[0.055, 0.035, -0.284]} scale={[0.025, 0.034, 0.018]}>
                  <sphereGeometry args={[1, 12, 10]} />
                  <meshBasicMaterial color="#fff6de" toneMapped={false} />
                </mesh>
              </group>
            </group>
          ))}

          {([-1, 1] as const).map((side) => (
            <mesh
              key={`nostril-${side}`}
              position={[side * 0.225, -0.085, -1.145]}
              rotation={[0.2, 0, side * 0.08]}
              scale={[0.055, 0.075, 0.026]}
            >
              <sphereGeometry args={[1, 18, 12]} />
              <meshStandardMaterial color={CLOUDGLOW.plum} roughness={0.52} />
            </mesh>
          ))}

          <mesh castShadow>
            <tubeGeometry args={[MOUTH_CURVE, 28, 0.024, 8, false]} />
            <meshStandardMaterial color="#743452" roughness={0.48} />
          </mesh>
          <mesh
            ref={tongueRef}
            geometry={tongueGeometry}
            position={[0, -0.39, -1.17]}
            scale={[1, 0.46, 1]}
            castShadow
          >
            <meshPhysicalMaterial
              color="#f18caf"
              emissive="#8d365d"
              emissiveIntensity={0.06}
              roughness={0.3}
              clearcoat={0.42}
              side={THREE.DoubleSide}
            />
          </mesh>

            <Flower position={[-0.73, 0.62, -0.14]} rotation={[0.22, -0.54, -0.32]} scale={0.62} />
          </group>
        </group>
      </group>
    </group>
  )
}

export default Mochi
