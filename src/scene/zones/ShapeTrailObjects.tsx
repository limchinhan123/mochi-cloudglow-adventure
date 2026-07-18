import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { CollectibleStop } from '../../game/learningCurriculum'
import { SHAPE_DEFINITIONS, type CloudglowLane, type ShapeId } from '../../game/worldConfig'
import type { ShapeFeedback } from '../../game/useShapeTrail'
import { LANE_WIDTH, sampleRouteFrame } from '../route'

const SHAPE_GEOMETRIES = new Map<ShapeId, THREE.ExtrudeGeometry>()
const scaleTarget = new THREE.Vector3()

function regularPolygon(sides: number, radius = 1, rotation = Math.PI / 2) {
  const shape = new THREE.Shape()
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + (index / sides) * Math.PI * 2
    const point = [Math.cos(angle) * radius, Math.sin(angle) * radius] as const
    if (index === 0) shape.moveTo(point[0], point[1])
    else shape.lineTo(point[0], point[1])
  }
  shape.closePath()
  return shape
}

function polygon(points: readonly (readonly [number, number])[]) {
  const shape = new THREE.Shape()
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  })
  shape.closePath()
  return shape
}

function makeShapePath(shapeId: ShapeId) {
  if (shapeId === 'circle' || shapeId === 'oval') {
    const shape = new THREE.Shape()
    const xRadius = shapeId === 'oval' ? 0.76 : 0.94
    const yRadius = shapeId === 'oval' ? 1.08 : 0.94
    shape.absellipse(0, 0, xRadius, yRadius, 0, Math.PI * 2, false)
    return shape
  }
  if (shapeId === 'triangle') return regularPolygon(3, 1, Math.PI / 2)
  if (shapeId === 'square') {
    return polygon([[-0.82, -0.82], [0.82, -0.82], [0.82, 0.82], [-0.82, 0.82]])
  }
  if (shapeId === 'rectangle') {
    return polygon([[-1.06, -0.66], [1.06, -0.66], [1.06, 0.66], [-1.06, 0.66]])
  }
  if (shapeId === 'rhombus') {
    // A true rhombus: vertical and horizontal diagonals are visibly unequal.
    return polygon([[0, 1.12], [0.72, 0], [0, -1.12], [-0.72, 0]])
  }
  if (shapeId === 'star') {
    const shape = new THREE.Shape()
    for (let index = 0; index < 10; index += 1) {
      const angle = Math.PI / 2 + (index / 10) * Math.PI * 2
      const radius = index % 2 === 0 ? 1.04 : 0.46
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      if (index === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    }
    shape.closePath()
    return shape
  }
  if (shapeId === 'heart') {
    const shape = new THREE.Shape()
    shape.moveTo(0, -0.95)
    shape.bezierCurveTo(-0.2, -0.65, -1.05, -0.12, -0.98, 0.54)
    shape.bezierCurveTo(-0.91, 1.11, -0.2, 1.15, 0, 0.68)
    shape.bezierCurveTo(0.2, 1.15, 0.91, 1.11, 0.98, 0.54)
    shape.bezierCurveTo(1.05, -0.12, 0.2, -0.65, 0, -0.95)
    return shape
  }
  if (shapeId === 'semicircle') {
    const shape = new THREE.Shape()
    shape.moveTo(-1, -0.42)
    shape.absarc(0, -0.42, 1, Math.PI, 0, true)
    shape.lineTo(-1, -0.42)
    shape.closePath()
    return shape
  }
  if (shapeId === 'pentagon') return regularPolygon(5, 1, Math.PI / 2)
  if (shapeId === 'hexagon') return regularPolygon(6, 1, 0)
  if (shapeId === 'octagon') return regularPolygon(8, 1, Math.PI / 8)
  if (shapeId === 'heptagon') return regularPolygon(7, 1, Math.PI / 2)
  if (shapeId === 'nonagon') return regularPolygon(9, 1, Math.PI / 2)
  if (shapeId === 'decagon') return regularPolygon(10, 1, Math.PI / 10)
  if (shapeId === 'trapezium') {
    return polygon([[-1, -0.72], [1, -0.72], [0.58, 0.72], [-0.58, 0.72]])
  }
  if (shapeId === 'kite') {
    return polygon([[0, 1.12], [0.72, 0.18], [0, -1.05], [-0.72, 0.18]])
  }
  if (shapeId === 'crescent') {
    const shape = new THREE.Shape()
    shape.absarc(0, 0, 1, Math.PI * 0.28, Math.PI * 1.72, false)
    shape.absarc(0.38, 0, 0.82, Math.PI * 1.62, Math.PI * 0.38, true)
    shape.closePath()
    return shape
  }
  return polygon([[-1, -0.72], [0.58, -0.72], [1, 0.72], [-0.58, 0.72]])
}

function getShapeGeometry(shapeId: ShapeId) {
  const existing = SHAPE_GEOMETRIES.get(shapeId)
  if (existing) return existing
  const geometry = new THREE.ExtrudeGeometry(makeShapePath(shapeId), {
    depth: 0.28,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.075,
    bevelThickness: 0.075,
    curveSegments: 20,
  })
  geometry.center()
  geometry.computeVertexNormals()
  SHAPE_GEOMETRIES.set(shapeId, geometry)
  return geometry
}

export interface ShapeTokenModelProps {
  shapeId: ShapeId
  elevated?: boolean
  feedbackResult?: 'wrong' | 'pending' | 'correct' | null
  assisted?: boolean
}

function SolidShape({ shapeId, color }: { shapeId: ShapeId; color: string }) {
  const material = (
    <meshPhysicalMaterial
      color={color}
      emissive={color}
      emissiveIntensity={0.3}
      roughness={0.24}
      metalness={0.08}
      clearcoat={0.78}
      clearcoatRoughness={0.16}
    />
  )
  if (shapeId === 'sphere') return <mesh castShadow><sphereGeometry args={[0.92, 28, 20]} />{material}</mesh>
  if (shapeId === 'cube') return <mesh castShadow rotation={[0.12, 0.42, 0.08]}><boxGeometry args={[1.55, 1.55, 1.55, 3, 3, 3]} />{material}</mesh>
  if (shapeId === 'cone') return <mesh castShadow><coneGeometry args={[0.9, 1.8, 28, 3]} />{material}</mesh>
  if (shapeId === 'cylinder') return <mesh castShadow><cylinderGeometry args={[0.78, 0.78, 1.72, 28, 3]} />{material}</mesh>
  if (shapeId === 'pyramid') return <mesh castShadow rotation-y={Math.PI / 4}><coneGeometry args={[1, 1.82, 4, 3]} />{material}</mesh>
  return <mesh castShadow rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.86, 0.86, 1.72, 3, 3]} />{material}</mesh>
}

export function ShapeTokenModel({
  shapeId,
  elevated = false,
  feedbackResult = null,
  assisted = false,
}: ShapeTokenModelProps) {
  const definition = SHAPE_DEFINITIONS[shapeId]
  const geometry = definition.dimension === '2d' ? getShapeGeometry(shapeId) : null
  const isCorrect = feedbackResult === 'correct'
  const isWrong = feedbackResult === 'wrong'
  const isPending = feedbackResult === 'pending'

  return (
    <group scale={elevated ? 1.08 : 0.94}>
      <mesh scale={isCorrect ? 1.7 : 1.45}>
        <sphereGeometry args={[1, 18, 12]} />
        <meshBasicMaterial
          color={isWrong ? '#dff3d7' : definition.color}
          transparent
          opacity={isCorrect || isPending ? 0.2 : assisted ? 0.17 : 0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {geometry ? (
        <>
          <mesh geometry={geometry} position-z={-0.08} scale={1.08}>
            <meshStandardMaterial color="#f7e7b8" roughness={0.54} metalness={0.08} />
          </mesh>
          <mesh geometry={geometry} castShadow>
            <meshPhysicalMaterial
              color={definition.color}
              emissive={definition.color}
              emissiveIntensity={isCorrect || isPending ? 0.72 : assisted ? 0.46 : isWrong ? 0.08 : 0.22}
              roughness={0.28}
              metalness={0.08}
              clearcoat={0.72}
              clearcoatRoughness={0.18}
            />
          </mesh>
        </>
      ) : (
        <SolidShape shapeId={shapeId} color={definition.color} />
      )}

      <mesh rotation-x={-Math.PI / 2} position-y={-1.24}>
        <cylinderGeometry args={[0.72, 0.92, 0.24, 18]} />
        <meshStandardMaterial
          color={elevated ? '#d9d0f5' : '#54745f'}
          emissive={definition.color}
          emissiveIntensity={isCorrect ? 0.48 : 0.1}
          roughness={0.68}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={-1.1}>
        <torusGeometry args={[0.68, 0.075, 8, 28]} />
        <meshStandardMaterial color="#fff0b0" emissive={definition.color} emissiveIntensity={0.34} />
      </mesh>

      {elevated && (
        <group position-y={-1.42}>
          <mesh scale={[0.12, 0.58, 0.12]}>
            <cylinderGeometry args={[1, 1.25, 1, 8]} />
            <meshStandardMaterial color="#8178ad" emissive={definition.color} emissiveIntensity={0.16} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.62, 0.16, 0]} rotation-z={side * -0.52} scale={[0.58, 0.18, 0.08]}>
              <sphereGeometry args={[1, 16, 8]} />
              <meshPhysicalMaterial color="#f8e9c4" transparent opacity={0.8} roughness={0.32} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

const NUMBER_TEXTURES = new Map<number, THREE.CanvasTexture>()

function getNumberTexture(value: number) {
  const existing = NUMBER_TEXTURES.get(value)
  if (existing) return existing
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (context) {
    context.clearRect(0, 0, 256, 256)
    context.fillStyle = '#fff7d7'
    context.beginPath()
    context.arc(128, 128, 106, 0, Math.PI * 2)
    context.fill()
    context.strokeStyle = '#e5b86c'
    context.lineWidth = 12
    context.stroke()
    context.fillStyle = '#3d5360'
    context.font = '900 150px ui-rounded, system-ui, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(String(value), 128, 137)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  NUMBER_TEXTURES.set(value, texture)
  return texture
}

function NumberTokenModel({
  value,
  elevated = false,
  feedbackResult = null,
  assisted = false,
}: {
  value: number
  elevated?: boolean
  feedbackResult?: 'wrong' | 'pending' | 'correct' | null
  assisted?: boolean
}) {
  const texture = useMemo(() => getNumberTexture(value), [value])
  const glow = feedbackResult === 'wrong' ? '#c7e9d5' : '#ffc86b'
  return (
    <group scale={elevated ? 1.08 : 0.96}>
      <mesh scale={feedbackResult === 'correct' ? 1.75 : 1.48}>
        <sphereGeometry args={[1, 18, 12]} />
        <meshBasicMaterial color={glow} transparent opacity={assisted ? 0.2 : 0.11} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh scale={[1.02, 1.08, 0.38]} castShadow>
        <sphereGeometry args={[1, 28, 18]} />
        <meshPhysicalMaterial color="#f0a76f" emissive="#d98864" emissiveIntensity={0.22} roughness={0.26} clearcoat={0.76} clearcoatRoughness={0.16} />
      </mesh>
      <mesh position-z={0.4} scale={1.02}>
        <planeGeometry args={[1.82, 1.82]} />
        <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={-1.24}>
        <cylinderGeometry args={[0.72, 0.92, 0.24, 18]} />
        <meshStandardMaterial color={elevated ? '#d9d0f5' : '#54745f'} emissive={glow} emissiveIntensity={0.12} roughness={0.68} />
      </mesh>
    </group>
  )
}

export function AnswerTokenModel({
  stop,
  feedbackResult = null,
  assisted = false,
}: {
  stop: CollectibleStop
  feedbackResult?: 'wrong' | 'pending' | 'correct' | null
  assisted?: boolean
}) {
  return stop.kind === 'shape-token' ? (
    <ShapeTokenModel shapeId={stop.shapeId} elevated={stop.elevated} feedbackResult={feedbackResult} assisted={assisted} />
  ) : (
    <NumberTokenModel value={stop.numberValue} elevated={stop.elevated} feedbackResult={feedbackResult} assisted={assisted} />
  )
}

interface ShapeChoiceProps {
  stop: CollectibleStop
  progress: number
  activeChallengeId: string | null
  feedback: ShapeFeedback | null
  assistStopId: string | null
  paused: boolean
  onChoose: (stopId: string, lane: CloudglowLane) => void
}

function ShapeChoice({
  stop,
  progress,
  activeChallengeId,
  feedback,
  assistStopId,
  paused,
  onChoose,
}: ShapeChoiceProps) {
  const group = useRef<THREE.Group>(null)
  const base = useMemo(() => {
    const frame = sampleRouteFrame(stop.progress)
    const position = frame.position
      .clone()
      .addScaledVector(frame.right, stop.lane * LANE_WIDTH)
      .addScaledVector(frame.up, stop.elevated ? 5.05 : 2.55)
    return { position, yaw: Math.atan2(-frame.right.z, frame.right.x) }
  }, [stop.elevated, stop.lane, stop.progress])

  const ownsFeedback = Boolean(
    feedback &&
    feedback.challengeId === stop.challengeId &&
    feedback.lane === stop.lane &&
    feedback.answerKey === stop.answerKey,
  )
  const feedbackResult = ownsFeedback ? feedback?.result ?? null : null
  const rowSucceeded = Boolean(
    feedback?.challengeId === stop.challengeId && feedback.result === 'correct',
  )

  useFrame(({ clock }, delta) => {
    if (!group.current || paused) return
    const time = clock.elapsedTime
    const wrongWobble = feedbackResult === 'wrong' ? Math.sin(time * 16) * 0.1 : 0
    const correctLift = feedbackResult === 'correct' ? 0.34 : 0
    group.current.position.y =
      base.position.y + Math.sin(time * 1.65 + stop.progress * 43) * 0.14 + correctLift
    group.current.rotation.y = base.yaw + Math.sin(time * 0.7 + stop.lane) * 0.08
    group.current.rotation.z = THREE.MathUtils.damp(
      group.current.rotation.z,
      wrongWobble,
      9,
      delta,
    )
    const scalar = feedbackResult === 'correct' ? 1.22 : rowSucceeded ? 0.78 : feedbackResult === 'wrong' ? 0.92 : 1
    scaleTarget.setScalar(scalar)
    group.current.scale.lerp(scaleTarget, 1 - Math.exp(-delta * 8))
  })

  const canChoose =
    Math.abs(progress - stop.progress) < 0.024 &&
    activeChallengeId === stop.challengeId

  return (
    <group
      ref={group}
      position={[base.position.x, base.position.y, base.position.z]}
      rotation-y={base.yaw}
      onPointerUp={(event) => {
        event.stopPropagation()
        if (canChoose) onChoose(stop.id, stop.lane)
      }}
    >
      <AnswerTokenModel
        stop={stop}
        feedbackResult={feedbackResult}
        assisted={assistStopId === stop.id}
      />
    </group>
  )
}

export interface ShapeTrailObjectsProps {
  progress: number
  stops: readonly CollectibleStop[]
  completedChallengeIds: ReadonlySet<string>
  activeChallengeId: string | null
  feedback: ShapeFeedback | null
  assistStopId: string | null
  onChoose: (stopId: string, lane: CloudglowLane) => void
  paused?: boolean
}

export function ShapeTrailObjects({
  progress,
  stops,
  completedChallengeIds,
  activeChallengeId,
  feedback,
  assistStopId,
  onChoose,
  paused = false,
}: ShapeTrailObjectsProps) {
  return (
    <group>
      {stops.map((stop) =>
        (!completedChallengeIds.has(stop.challengeId) ||
          (feedback?.challengeId === stop.challengeId && feedback?.result === 'correct')) &&
        Math.abs(stop.progress - progress) < 0.024 ? (
          <ShapeChoice
            key={stop.id}
            stop={stop}
            progress={progress}
            activeChallengeId={activeChallengeId}
            feedback={feedback}
            assistStopId={assistStopId}
            paused={paused}
            onChoose={onChoose}
          />
        ) : null,
      )}
    </group>
  )
}
