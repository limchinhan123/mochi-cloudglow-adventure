import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { CollectibleStop } from '../../game/learningCurriculum'
import type { ObstacleStop } from '../../game/worldConfig'
import { LANE_WIDTH, sampleRouteFrame } from '../route'
import { AnswerTokenModel } from './ShapeTrailObjects'
import { ZONE_VISUALS } from './zoneVisuals'

type Vec3 = [number, number, number]

function makeLeafGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(0, -0.72)
  shape.bezierCurveTo(-0.62, -0.28, -0.54, 0.48, 0, 0.92)
  shape.bezierCurveTo(0.54, 0.48, 0.62, -0.28, 0, -0.72)
  return new THREE.ShapeGeometry(shape, 10)
}

export function WorldCollectible({
  stop,
  progress,
  lane,
  collected,
  onCollect,
  paused,
}: {
  stop: CollectibleStop
  progress: number
  lane: number
  collected: boolean
  onCollect: (id: string) => boolean | void
  paused?: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const fired = useRef(false)
  const base = useMemo(() => {
    const frame = sampleRouteFrame(stop.progress)
    const position = frame.position
      .clone()
      .addScaledVector(frame.right, stop.lane * LANE_WIDTH)
      .addScaledVector(frame.up, stop.elevated ? 5.05 : 2.55)
    return {
      position,
      yaw: Math.atan2(-frame.right.z, frame.right.x),
    }
  }, [stop.lane, stop.progress])

  useEffect(() => {
    if (!collected) fired.current = false
  }, [collected])

  useFrame(({ clock }) => {
    if (group.current && !paused) {
      group.current.position.y =
        base.position.y + Math.sin(clock.elapsedTime * 1.9 + stop.progress * 37) * 0.2
      group.current.rotation.y = base.yaw + Math.sin(clock.elapsedTime * 0.7 + stop.lane) * 0.08
    }
    if (fired.current && Math.abs(lane - stop.lane) >= 0.62) fired.current = false
    if (
      !paused &&
      !collected &&
      !fired.current &&
      Math.abs(progress - stop.progress) < 0.012 &&
      Math.abs(lane - stop.lane) < 0.62
    ) {
      fired.current = true
      onCollect(stop.id)
    }
  })

  if (collected) return null
  const nearPlayer = Math.abs(progress - stop.progress) < 0.07
  return (
    <group
      ref={group}
      position={[base.position.x, base.position.y, base.position.z]}
      rotation-y={base.yaw}
      onClick={(event) => {
        event.stopPropagation()
        if (nearPlayer && !fired.current) {
          fired.current = true
          onCollect(stop.id)
        }
      }}
    >
      <AnswerTokenModel stop={stop} />
    </group>
  )
}

function FriendlyEyes({ position = [0, 0, 0.76] as Vec3, scale = 1 }: { position?: Vec3; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {[-0.2, 0.2].map((x) => (
        <group key={x} position-x={x}>
          <mesh>
            <sphereGeometry args={[0.13, 12, 8]} />
            <meshBasicMaterial color="#fffdf7" />
          </mesh>
          <mesh position={[0, 0, 0.1]}>
            <sphereGeometry args={[0.062, 10, 7]} />
            <meshBasicMaterial color="#263044" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Puffbug() {
  return (
    <group>
      {[
        [-0.46, 0, 0],
        [0.46, 0.02, 0],
        [0, 0.2, 0.04],
      ].map((position, index) => (
        <mesh key={index} position={position as Vec3} scale={[0.72, 0.62, 0.62]} castShadow>
          <icosahedronGeometry args={[1, 2]} />
          <meshStandardMaterial color="#f4eee1" roughness={0.92} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.8, 0.1, -0.05]} rotation-z={side * 0.42} scale={[0.62, 0.24, 0.09]}>
          <sphereGeometry args={[1, 16, 10]} />
          <meshPhysicalMaterial color="#d9fff0" transparent opacity={0.7} roughness={0.2} />
        </mesh>
      ))}
      <FriendlyEyes position={[0, 0.16, 0.58]} />
      <mesh position={[0, -0.06, 0.69]} rotation-z={Math.PI / 2}>
        <torusGeometry args={[0.11, 0.025, 6, 12, Math.PI]} />
        <meshBasicMaterial color="#75536f" />
      </mesh>
    </group>
  )
}

function LeafGate() {
  const leaf = useMemo(makeLeafGeometry, [])
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position-x={side * 0.46} rotation-z={side * -0.55}>
          <mesh geometry={leaf} scale={[1.1, 1.35, 1]} castShadow>
            <meshStandardMaterial
              color={side < 0 ? '#5d8b55' : '#3e745b'}
              emissive="#245f4c"
              emissiveIntensity={0.15}
              side={THREE.DoubleSide}
              roughness={0.7}
            />
          </mesh>
          <mesh position={[0, -0.82, -0.02]}>
            <cylinderGeometry args={[0.06, 0.09, 1.1, 7]} />
            <meshStandardMaterial color="#294b35" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.9, -0.05]}>
        <sphereGeometry args={[0.18, 12, 8]} />
        <meshStandardMaterial color="#f6c9dd" emissive="#d06d98" emissiveIntensity={0.28} />
      </mesh>
    </group>
  )
}

function CloudSheep() {
  const puffs: Vec3[] = [[-0.48, 0, 0], [0.45, 0.02, 0], [0, 0.27, 0], [0, -0.2, 0.08]]
  return (
    <group>
      {puffs.map((position, index) => (
        <mesh key={index} position={position} scale={[0.68, 0.58, 0.58]} castShadow>
          <icosahedronGeometry args={[1, 2]} />
          <meshStandardMaterial color="#e9efff" roughness={0.96} />
        </mesh>
      ))}
      <mesh position={[0, 0.05, 0.62]} scale={[0.54, 0.48, 0.32]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#59627e" roughness={0.74} />
      </mesh>
      <FriendlyEyes position={[0, 0.16, 0.91]} scale={0.8} />
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.5, 0.24, 0.56]} rotation-y={side * 0.35}>
          <torusGeometry args={[0.22, 0.07, 7, 14, Math.PI * 1.35]} />
          <meshStandardMaterial color="#f5d590" metalness={0.15} roughness={0.45} />
        </mesh>
      ))}
    </group>
  )
}

function BellRibbon() {
  const ribbon = useMemo(() => {
    const points = [
      new THREE.Vector3(-0.65, -0.9, 0),
      new THREE.Vector3(0.42, -0.35, 0.08),
      new THREE.Vector3(-0.28, 0.28, -0.05),
      new THREE.Vector3(0.52, 0.9, 0),
    ]
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 30, 0.08, 6, false)
  }, [])
  return (
    <group>
      <mesh geometry={ribbon}>
        <meshStandardMaterial color="#b8dfff" emissive="#6a92de" emissiveIntensity={0.3} />
      </mesh>
      {[-0.72, 0, 0.72].map((y, index) => (
        <group key={y} position={[index % 2 ? 0.35 : -0.35, y, 0.05]}>
          <mesh rotation-x={Math.PI} castShadow>
            <coneGeometry args={[0.27, 0.42, 12, 1, true]} />
            <meshStandardMaterial color="#f6d98c" emissive="#8db9ef" emissiveIntensity={0.35} side={THREE.DoubleSide} />
          </mesh>
          <mesh position-y={-0.23}>
            <sphereGeometry args={[0.075, 10, 7]} />
            <meshStandardMaterial color="#fff9c9" emissive="#f5ca6b" emissiveIntensity={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function BubbleJelly() {
  const tentacles = useMemo(
    () =>
      [-0.48, -0.16, 0.16, 0.48].map((x, index) =>
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(x, -0.05, 0),
            new THREE.Vector3(x + Math.sin(index) * 0.18, -0.55, 0.08),
            new THREE.Vector3(x - Math.cos(index) * 0.2, -1.05, -0.04),
          ]),
          18,
          0.035,
          5,
          false,
        ),
      ),
    [],
  )
  return (
    <group position-y={0.28}>
      <mesh scale={[0.9, 0.58, 0.9]} castShadow>
        <sphereGeometry args={[1, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color="#75e6dd"
          emissive="#3ab3b4"
          emissiveIntensity={0.45}
          transparent
          opacity={0.72}
          roughness={0.18}
          side={THREE.DoubleSide}
        />
      </mesh>
      {tentacles.map((geometry, index) => (
        <mesh key={index} geometry={geometry}>
          <meshStandardMaterial color={index % 2 ? '#ffd189' : '#f48aa1'} emissive="#337d86" emissiveIntensity={0.25} />
        </mesh>
      ))}
      <FriendlyEyes position={[0, 0.15, 0.8]} scale={0.86} />
    </group>
  )
}

function ClamPuff() {
  return (
    <group>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[0, side * 0.32, 0]}
          rotation-x={side * 0.45}
          scale={[1.05, 0.5, 0.75]}
          castShadow
        >
          <sphereGeometry args={[1, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={side > 0 ? '#f0959f' : '#d66e88'} roughness={0.42} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, 0.06, 0.56]}>
        <sphereGeometry args={[0.38, 18, 14]} />
        <meshPhysicalMaterial color="#fff8db" emissive="#74dfd3" emissiveIntensity={0.5} clearcoat={1} />
      </mesh>
      <FriendlyEyes position={[0, 0.11, 0.9]} scale={0.62} />
    </group>
  )
}

function CurlingVine() {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= 24; i += 1) {
      const t = i / 24
      const angle = t * Math.PI * 2.4
      points.push(new THREE.Vector3(Math.sin(angle) * (0.78 - t * 0.24), t * 2 - 1, Math.cos(angle) * 0.28))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, 0.13, 7, false)
  }, [])
  const leaf = useMemo(makeLeafGeometry, [])
  return (
    <group>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color="#2f6950" emissive="#1c745f" emissiveIntensity={0.18} roughness={0.7} />
      </mesh>
      {[-0.65, 0.25, 0.72].map((y, index) => (
        <mesh key={y} geometry={leaf} position={[index % 2 ? 0.45 : -0.42, y, 0]} rotation-z={index % 2 ? -0.85 : 0.85} scale={0.56}>
          <meshStandardMaterial color="#57936b" emissive="#245d4e" emissiveIntensity={0.22} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

function Seedpod() {
  const leaf = useMemo(makeLeafGeometry, [])
  return (
    <group>
      {[-0.38, 0, 0.38].map((x, index) => (
        <mesh key={x} position={[x, index === 1 ? 0.18 : 0, 0]} scale={[0.36, 0.92, 0.38]} castShadow>
          <sphereGeometry args={[1, 18, 12]} />
          <meshStandardMaterial
            color={index === 1 ? '#9b75bd' : '#6d5b9a'}
            emissive="#3ca982"
            emissiveIntensity={0.35}
            roughness={0.46}
          />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={leaf} position={[side * 0.64, 0.34, -0.05]} rotation-z={side * -1.05} scale={0.58}>
          <meshStandardMaterial color="#4f8962" side={THREE.DoubleSide} />
        </mesh>
      ))}
      <FriendlyEyes position={[0, 0.18, 0.48]} scale={0.7} />
    </group>
  )
}

function TumbleStar() {
  const spikes = [
    { position: [0, 1.02, -0.06] as Vec3, rotation: 0.04, color: '#d88f5f' },
    { position: [0.7, 0.76, -0.08] as Vec3, rotation: -0.72, color: '#e5a86e' },
    { position: [1.02, 0.04, -0.04] as Vec3, rotation: -1.5, color: '#c97c58' },
    { position: [0.76, -0.64, -0.08] as Vec3, rotation: -2.22, color: '#e4a36b' },
    { position: [-0.72, -0.62, -0.08] as Vec3, rotation: 2.22, color: '#d68a5d' },
    { position: [-1.02, 0.08, -0.04] as Vec3, rotation: 1.5, color: '#e3a26d' },
    { position: [-0.68, 0.77, -0.08] as Vec3, rotation: 0.72, color: '#c97c58' },
  ]

  return (
    <group scale={0.86} position-y={0.08}>
      <mesh scale={[0.9, 0.86, 0.68]} castShadow>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#b96f52" roughness={0.96} metalness={0} />
      </mesh>

      {spikes.map((spike, index) => (
        <mesh
          key={index}
          position={spike.position}
          rotation-z={spike.rotation}
          scale={[0.8, 1, 0.72]}
          castShadow
        >
          <coneGeometry args={[0.29, 0.72, 7]} />
          <meshStandardMaterial color={spike.color} roughness={0.94} metalness={0} />
        </mesh>
      ))}

      <mesh position={[-0.42, 0.38, 0.65]} rotation-z={-0.24} scale={[0.28, 0.22, 0.06]}>
        <circleGeometry args={[1, 16]} />
        <meshStandardMaterial color="#e6b37e" roughness={1} />
      </mesh>
      <mesh position={[-0.42, 0.38, 0.69]} rotation-z={-0.24}>
        <torusGeometry args={[0.22, 0.022, 5, 18]} />
        <meshBasicMaterial color="#7e4d45" />
      </mesh>

      <FriendlyEyes position={[0, 0.1, 0.7]} scale={0.86} />
      <mesh position={[0, -0.16, 0.79]} rotation-z={Math.PI / 2}>
        <torusGeometry args={[0.11, 0.024, 6, 12, Math.PI]} />
        <meshBasicMaterial color="#70494a" />
      </mesh>

      <mesh position={[0, -0.72, -0.12]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.07, 0.07, 1.45, 8]} />
        <meshStandardMaterial color="#715a55" roughness={0.85} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.68, -0.72, 0.05]}>
          <mesh>
            <torusGeometry args={[0.3, 0.105, 8, 20]} />
            <meshStandardMaterial color="#5f5354" roughness={0.88} />
          </mesh>
          <mesh position-z={0.015}>
            <cylinderGeometry args={[0.105, 0.105, 0.13, 10]} />
            <meshStandardMaterial color="#e0ad70" roughness={0.72} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function PrismWhirl() {
  return (
    <group>
      {[0, 1, 2, 3, 4].map((index) => {
        const angle = (index / 5) * Math.PI * 2
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * 0.7, Math.sin(angle) * 0.7, 0]}
            rotation={[angle * 0.2, angle, angle]}
            scale={[0.28, 0.66, 0.28]}
            castShadow
          >
            <octahedronGeometry args={[1, 0]} />
            <meshPhysicalMaterial
              color={index % 2 ? '#ffc979' : '#a8e4df'}
              emissive={index % 2 ? '#d87354' : '#4a9fa0'}
              emissiveIntensity={0.3}
              roughness={0.22}
              clearcoat={0.8}
            />
          </mesh>
        )
      })}
      <mesh scale={0.5} castShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#f4e2b2" emissive="#e59d72" emissiveIntensity={0.24} roughness={0.4} />
      </mesh>
      <FriendlyEyes position={[0, 0.02, 0.52]} scale={0.62} />
    </group>
  )
}

function ToyBlocks() {
  return (
    <group position-y={-0.06}>
      {[
        { position: [-0.48, -0.34, 0] as Vec3, color: '#e88ba6', rotation: -0.12 },
        { position: [0.46, -0.3, -0.05] as Vec3, color: '#75cdb6', rotation: 0.1 },
        { position: [0, 0.44, 0.02] as Vec3, color: '#efc76e', rotation: 0.04 },
      ].map((block, index) => (
        <mesh key={index} position={block.position} rotation-z={block.rotation} castShadow>
          <boxGeometry args={[0.9, 0.82, 0.62, 2, 2, 2]} />
          <meshPhysicalMaterial color={block.color} roughness={0.46} clearcoat={0.34} />
        </mesh>
      ))}
      <FriendlyEyes position={[0, 0.48, 0.38]} scale={0.66} />
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.48, -0.83, 0.02]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.22, 0.08, 8, 18]} />
          <meshStandardMaterial color="#544a70" roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

function BubbleTrain() {
  return (
    <group position-y={-0.08}>
      <mesh position={[0, -0.08, 0]} scale={[0.9, 0.58, 0.62]} castShadow>
        <sphereGeometry args={[1, 20, 14]} />
        <meshPhysicalMaterial color="#79d8d1" roughness={0.26} clearcoat={0.72} />
      </mesh>
      <mesh position={[-0.42, 0.54, -0.04]} scale={[0.42, 0.52, 0.42]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#f0b070" emissive="#9d6f55" emissiveIntensity={0.16} roughness={0.4} />
      </mesh>
      <mesh position={[0.52, 0.26, 0]} rotation-z={-Math.PI / 2}>
        <cylinderGeometry args={[0.2, 0.28, 0.82, 12]} />
        <meshStandardMaterial color="#e98ba8" roughness={0.38} />
      </mesh>
      <FriendlyEyes position={[0.34, 0.02, 0.62]} scale={0.66} />
      {[-0.52, 0.45].map((x) => (
        <mesh key={x} position={[x, -0.62, 0.14]} rotation-y={Math.PI / 2}>
          <torusGeometry args={[0.27, 0.09, 8, 20]} />
          <meshStandardMaterial color="#625676" metalness={0.12} roughness={0.42} />
        </mesh>
      ))}
      {[0, 1, 2].map((index) => (
        <mesh key={index} position={[-0.55 + index * -0.18, 0.96 + index * 0.34, -0.08]}>
          <sphereGeometry args={[0.17 + index * 0.04, 14, 10]} />
          <meshPhysicalMaterial color="#e5fbff" transparent opacity={0.64} roughness={0.08} />
        </mesh>
      ))}
    </group>
  )
}

function ObstacleForm({ kind }: { kind: ObstacleStop['kind'] }) {
  if (kind === 'puffbug') return <Puffbug />
  if (kind === 'leaf-gate') return <LeafGate />
  if (kind === 'cloud-sheep') return <CloudSheep />
  if (kind === 'bell-ribbon') return <BellRibbon />
  if (kind === 'bubble-jelly') return <BubbleJelly />
  if (kind === 'clam-puff') return <ClamPuff />
  if (kind === 'curling-vine') return <CurlingVine />
  if (kind === 'seedpod') return <Seedpod />
  if (kind === 'tumble-star') return <TumbleStar />
  if (kind === 'prism-whirl') return <PrismWhirl />
  if (kind === 'toy-blocks') return <ToyBlocks />
  return <BubbleTrain />
}

const targetScale = new THREE.Vector3()

export function FriendlyObstacle({
  stop,
  progress,
  lane,
  hit,
  onContact,
  paused,
}: {
  stop: ObstacleStop
  progress: number
  lane: number
  hit: boolean
  onContact: (id: string) => void
  paused?: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const fired = useRef(false)
  const base = useMemo(() => {
    const frame = sampleRouteFrame(stop.progress)
    const position = frame.position
      .clone()
      .addScaledVector(frame.right, stop.lane * LANE_WIDTH)
      .addScaledVector(frame.up, 1.48)
    return { position, yaw: Math.atan2(-frame.right.z, frame.right.x) }
  }, [stop.lane, stop.progress])

  useEffect(() => {
    if (!hit) fired.current = false
  }, [hit])

  useFrame(({ clock }, delta) => {
    if (!group.current) return
    if (!paused) {
      group.current.position.y =
        base.position.y +
        Math.sin(clock.elapsedTime * 1.35 + stop.progress * 41) * 0.13 +
        (hit ? 0.7 : 0)
      group.current.rotation.y = base.yaw + Math.sin(clock.elapsedTime * 0.55 + stop.progress * 8) * 0.12
      group.current.rotation.z = THREE.MathUtils.damp(group.current.rotation.z, hit ? 0.24 : 0, 6, delta)
      targetScale.setScalar(hit ? 0.72 : 1)
      group.current.scale.lerp(targetScale, 1 - Math.exp(-delta * 6))
    }
    if (
      !paused &&
      !hit &&
      !fired.current &&
      Math.abs(progress - stop.progress) < 0.011 &&
      Math.abs(lane - stop.lane) < 0.58
    ) {
      fired.current = true
      onContact(stop.id)
    }
  })

  const visual = ZONE_VISUALS[stop.zoneId]
  return (
    <group ref={group} position={[base.position.x, base.position.y, base.position.z]} rotation-y={base.yaw}>
      <mesh rotation-x={-Math.PI / 2} position-y={-1.18}>
        <ringGeometry args={[0.78, 1.06, 30]} />
        <meshBasicMaterial
          color={visual.accent}
          transparent
          opacity={hit ? 0.08 : 0.24}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <ObstacleForm kind={stop.kind} />
    </group>
  )
}
