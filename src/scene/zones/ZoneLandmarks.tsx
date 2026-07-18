import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { ZONES, type ZoneId } from '../../game/worldConfig'
import { sampleRouteFrame } from '../route'
import { ZONE_VISUALS } from './zoneVisuals'

type Vec3 = [number, number, number]

function zoneProgress(zoneId: ZoneId, localProgress: number) {
  const zone = ZONES.find((candidate) => candidate.id === zoneId)
  if (!zone) throw new Error(`Unknown landmark realm: ${zoneId}`)
  return THREE.MathUtils.lerp(
    zone.start,
    zone.end,
    THREE.MathUtils.clamp(localProgress, 0, 1),
  )
}

const LANDMARK_AT = {
  garden: zoneProgress('garden', 0.55),
  citadel: zoneProgress('citadel', 0.54),
  reef: zoneProgress('reef', 0.55),
  jungle: zoneProgress('jungle', 0.55),
  moonflowerExit: zoneProgress('jungle', 0.94),
  desert: zoneProgress('desert', 0.53),
  toytown: zoneProgress('toytown', 0.47),
  clockflowerFinale: zoneProgress('toytown', 0.91),
  aurora: zoneProgress('aurora', 0.55),
  dinosaur: zoneProgress('dinosaur', 0.54),
  carnival: zoneProgress('carnival', 0.53),
  melody: zoneProgress('melody', 0.54),
  spaceport: zoneProgress('spaceport', 0.53),
  storybook: zoneProgress('storybook', 0.56),
} as const

const LANDMARK_VISIBLE_RADIUS = 0.047
const TRANSITION_VISIBLE_RADIUS = 0.027

function routeAnchor(progress: number, lift = 0) {
  const frame = sampleRouteFrame(progress)
  const position = frame.position.clone().addScaledVector(frame.up, lift)
  return {
    position: [position.x, position.y, position.z] as Vec3,
    yaw: Math.atan2(-frame.right.z, frame.right.x),
  }
}

function makePetalGeometry(width = 0.72, height = 1.5) {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(-width, height * 0.25, -width * 0.72, height * 0.78, 0, height)
  shape.bezierCurveTo(width * 0.72, height * 0.78, width, height * 0.25, 0, 0)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelSize: 0.04,
    bevelThickness: 0.04,
    bevelSegments: 2,
    curveSegments: 10,
  })
  geometry.computeVertexNormals()
  return geometry
}

function makeStarGeometry(outer = 1, inner = 0.44) {
  const shape = new THREE.Shape()
  for (let i = 0; i < 10; i += 1) {
    const angle = Math.PI / 2 + (i / 10) * Math.PI * 2
    const radius = i % 2 ? inner : outer
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.18,
    bevelEnabled: true,
    bevelSize: 0.08,
    bevelThickness: 0.07,
    bevelSegments: 2,
  })
  geometry.center()
  return geometry
}

function GardenBloomGate({ paused }: { paused?: boolean }) {
  const anchor = useMemo(() => routeAnchor(LANDMARK_AT.garden), [])
  const bloom = useRef<THREE.Group>(null)
  const archGeometries = useMemo(() => {
    return [-0.24, 0.24].map((zOffset, index) => {
      const points = [
        new THREE.Vector3(-6.3, 0, zOffset),
        new THREE.Vector3(-5.5, 3.7, zOffset + 0.2),
        new THREE.Vector3(-2.4, 7.1, zOffset - 0.1),
        new THREE.Vector3(0, 8.4 + index * 0.25, zOffset),
        new THREE.Vector3(2.4, 7.1, zOffset + 0.1),
        new THREE.Vector3(5.5, 3.7, zOffset - 0.2),
        new THREE.Vector3(6.3, 0, zOffset),
      ]
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 72, index ? 0.26 : 0.38, 8, false)
    })
  }, [])
  const petal = useMemo(() => makePetalGeometry(0.78, 1.7), [])

  useFrame(({ clock }) => {
    if (!paused && bloom.current) bloom.current.rotation.y = Math.sin(clock.elapsedTime * 0.25) * 0.08
  })

  return (
    <group position={anchor.position} rotation-y={anchor.yaw}>
      {archGeometries.map((geometry, index) => (
        <mesh key={index} geometry={geometry} castShadow>
          <meshStandardMaterial
            color={index ? '#789166' : '#55775b'}
            emissive={index ? '#365a43' : '#294e42'}
            emissiveIntensity={0.13}
            roughness={0.72}
            metalness={0.01}
          />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 6.15, 1.7, 0]} rotation-y={side * 0.42}>
          <group ref={side === 1 ? bloom : undefined} rotation-z={side * -0.34}>
            {Array.from({ length: 7 }, (_, index) => {
              const angle = (index / 7) * Math.PI * 2
              return (
                <mesh
                  key={index}
                  geometry={petal}
                  rotation={[0.25, 0, angle]}
                  scale={1.05 + (index % 2) * 0.18}
                  castShadow
                >
                  <meshStandardMaterial
                    color={index % 2 ? '#f0a8c4' : '#c49ad0'}
                    emissive={index % 2 ? '#9a526f' : '#745080'}
                    emissiveIntensity={0.24}
                    side={THREE.DoubleSide}
                    roughness={0.46}
                  />
                </mesh>
              )
            })}
            <mesh position={[0, 0.15, 0.16]}>
              <sphereGeometry args={[0.52, 18, 12]} />
              <meshStandardMaterial color="#ffe69b" emissive="#e8944e" emissiveIntensity={0.62} roughness={0.34} />
            </mesh>
          </group>
        </group>
      ))}
      {[-4.8, 4.8].map((x) => (
        <pointLight key={x} position={[x, 2.5, 0]} color="#72e5ca" intensity={1.4} distance={8} decay={2} />
      ))}
    </group>
  )
}

function CitadelTower({
  position,
  height,
  scale = 1,
}: {
  position: Vec3
  height: number
  scale?: number
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position-y={-1.15} scale={[2.7, 1.05, 2.15]} castShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#596985" flatShading roughness={0.72} metalness={0.08} />
      </mesh>
      <mesh position-y={height * 0.5} castShadow>
        <cylinderGeometry args={[0.72, 1.45, height, 7, 5]} />
        <meshStandardMaterial color="#8295b8" roughness={0.48} metalness={0.18} />
      </mesh>
      <mesh position-y={height + 1.3} castShadow>
        <coneGeometry args={[1.18, 3.2, 7, 2]} />
        <meshStandardMaterial
          color="#b7cbeb"
          emissive="#5e8bc9"
          emissiveIntensity={0.18}
          roughness={0.34}
          metalness={0.26}
        />
      </mesh>
      {[0.3, 0.56, 0.8].map((heightRatio) => (
        <mesh key={heightRatio} position-y={height * heightRatio} rotation-x={Math.PI / 2}>
          <torusGeometry args={[1.08, 0.08, 6, 24]} />
          <meshStandardMaterial color="#d7ecff" emissive="#6eaeeb" emissiveIntensity={0.48} />
        </mesh>
      ))}
      <mesh position-y={height + 3.1} scale={[0.09, 1.3, 0.09]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial color="#fff0a7" emissive="#b6b7ff" emissiveIntensity={0.72} />
      </mesh>
    </group>
  )
}

function StarwindCitadel({ paused }: { paused?: boolean }) {
  const anchor = useMemo(() => routeAnchor(LANDMARK_AT.citadel, -1.2), [])
  const halo = useRef<THREE.Group>(null)
  const star = useMemo(() => makeStarGeometry(1, 0.43), [])
  const ribbonGeometries = useMemo(
    () =>
      [-1, 1].map((side) =>
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(side * 15, 8, -5),
            new THREE.Vector3(side * 9, 12, -2),
            new THREE.Vector3(side * 4.8, 10.5, 1),
            new THREE.Vector3(side * 7.2, 7.8, 5),
          ]),
          48,
          0.09,
          6,
          false,
        ),
      ),
    [],
  )

  useFrame(({ clock }) => {
    if (!paused && halo.current) halo.current.rotation.z = clock.elapsedTime * 0.13
  })

  return (
    <group position={anchor.position} rotation-y={anchor.yaw}>
      <CitadelTower position={[-13, 0, 0]} height={13} scale={1.08} />
      <CitadelTower position={[-8, 1.8, -5]} height={8.5} scale={0.78} />
      <CitadelTower position={[13.5, 0.8, 1]} height={16} scale={1.15} />
      <CitadelTower position={[8.5, 2.5, -5]} height={9.4} scale={0.82} />
      <group ref={halo} position={[0, 13.5, 0]}>
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[4.6, 0.22, 8, 64]} />
          <meshStandardMaterial color="#bde8ff" emissive="#6e91e7" emissiveIntensity={0.8} metalness={0.25} />
        </mesh>
        {Array.from({ length: 5 }, (_, index) => {
          const angle = (index / 5) * Math.PI * 2
          return (
            <mesh key={index} geometry={star} position={[Math.cos(angle) * 4.6, Math.sin(angle) * 4.6, 0]} scale={0.62}>
              <meshStandardMaterial color="#fff1a7" emissive="#829ef0" emissiveIntensity={0.7} metalness={0.3} />
            </mesh>
          )
        })}
      </group>
      {ribbonGeometries.map((geometry, index) => (
        <mesh key={index} geometry={geometry}>
          <meshBasicMaterial
            color={index ? '#d7bfff' : '#a8edff'}
            transparent
            opacity={0.52}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

function CoralTree({ position, side = 1, scale = 1 }: { position: Vec3; side?: number; scale?: number }) {
  const branches = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const angle = (index / 6) * Math.PI * 2
      const height = 3.2 + (index % 3) * 0.8
      const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(Math.sin(angle) * 0.35, height * 0.42, Math.cos(angle) * 0.3),
        new THREE.Vector3(Math.sin(angle) * (1.2 + index * 0.08), height, Math.cos(angle) * 1.05),
      ]
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 28, 0.16 - index * 0.008, 7, false)
    })
  }, [])
  return (
    <group position={position} scale={[scale * side, scale, scale]}>
      <mesh position-y={1.8} castShadow>
        <cylinderGeometry args={[0.36, 0.68, 3.8, 8, 4]} />
        <meshStandardMaterial color="#b65770" roughness={0.68} />
      </mesh>
      {branches.map((geometry, index) => (
        <mesh key={index} geometry={geometry} position-y={3.2} castShadow>
          <meshStandardMaterial
            color={index % 2 ? '#f0a064' : '#dc6882'}
            emissive={index % 2 ? '#7a5535' : '#6e3156'}
            emissiveIntensity={0.2}
            roughness={0.58}
          />
        </mesh>
      ))}
    </group>
  )
}

function ReefJelly({ position, scale = 1, paused }: { position: Vec3; scale?: number; paused?: boolean }) {
  const group = useRef<THREE.Group>(null)
  const tentacles = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const x = (index - 3) * 0.38
        return new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(x, -0.25, 0),
            new THREE.Vector3(x + Math.sin(index) * 0.35, -2.4, Math.cos(index) * 0.24),
            new THREE.Vector3(x - Math.cos(index) * 0.28, -4.8, Math.sin(index) * 0.32),
          ]),
          28,
          0.055,
          5,
          false,
        )
      }),
    [],
  )

  useFrame(({ clock }) => {
    if (!paused && group.current) {
      group.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.55 + position[0]) * 0.42
      group.current.rotation.y = Math.sin(clock.elapsedTime * 0.18) * 0.16
    }
  })

  return (
    <group ref={group} position={position} scale={scale}>
      <mesh scale={[2.8, 1.35, 2.8]}>
        <sphereGeometry args={[1, 30, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color="#65e0d6"
          emissive="#257e91"
          emissiveIntensity={0.48}
          transparent
          opacity={0.56}
          roughness={0.12}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position-y={0.03}>
        <torusGeometry args={[2.35, 0.13, 8, 48]} />
        <meshBasicMaterial color="#ffe28d" transparent opacity={0.72} toneMapped={false} />
      </mesh>
      {tentacles.map((geometry, index) => (
        <mesh key={index} geometry={geometry}>
          <meshStandardMaterial color={index % 2 ? '#ffd083' : '#f17f9b'} emissive="#206f79" emissiveIntensity={0.34} />
        </mesh>
      ))}
    </group>
  )
}

function BubbleField() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const count = 34
  useLayoutEffect(() => {
    if (!mesh.current) return
    const dummy = new THREE.Object3D()
    for (let index = 0; index < count; index += 1) {
      const angle = index * 2.399
      const radius = 6 + (index % 8) * 1.65
      dummy.position.set(Math.cos(angle) * radius, (index % 11) * 1.15 - 2, Math.sin(angle) * radius * 0.5)
      dummy.scale.setScalar(0.12 + (index % 5) * 0.055)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(index, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 10, 7]} />
      <meshPhysicalMaterial color="#b7fff5" transparent opacity={0.42} roughness={0.08} depthWrite={false} />
    </instancedMesh>
  )
}

function LanternReef({ paused }: { paused?: boolean }) {
  const anchor = useMemo(() => routeAnchor(LANDMARK_AT.reef, -1), [])
  return (
    <group position={anchor.position} rotation-y={anchor.yaw}>
      <CoralTree position={[-10.5, 0, -2]} scale={1.2} />
      <CoralTree position={[-14.5, -1, 4]} scale={0.88} />
      <CoralTree position={[10.8, 0, 1]} side={-1} scale={1.3} />
      <CoralTree position={[15, -1.2, -4]} side={-1} scale={0.92} />
      <ReefJelly position={[-8.8, 11, -5]} scale={0.82} paused={paused} />
      <ReefJelly position={[9.5, 14.2, 2]} scale={1.08} paused={paused} />
      <ReefJelly position={[0, 17, -8]} scale={0.7} paused={paused} />
      <BubbleField />
    </group>
  )
}

function MoonLeaf({ position, rotation, scale = 1 }: { position: Vec3; rotation: Vec3; scale?: number }) {
  const geometry = useMemo(() => makePetalGeometry(0.9, 2.2), [])
  return (
    <mesh geometry={geometry} position={position} rotation={rotation} scale={scale} castShadow>
      <meshStandardMaterial
        color="#315f4c"
        emissive="#1f6a58"
        emissiveIntensity={0.2}
        roughness={0.65}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function MoonvineWilds({ paused }: { paused?: boolean }) {
  const anchor = useMemo(() => routeAnchor(LANDMARK_AT.jungle), [])
  const fruits = useRef<THREE.Group>(null)
  const arches = useMemo(() => {
    return [-1, 1].map((side) => {
      const points = [
        new THREE.Vector3(side * 8, -1, 0),
        new THREE.Vector3(side * 7, 4.5, 0.2),
        new THREE.Vector3(side * 4, 9.5, -0.2),
        new THREE.Vector3(0, 11.2, 0),
      ]
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 62, 0.48, 9, false)
    })
  }, [])

  useFrame(({ clock }) => {
    if (!paused && fruits.current) fruits.current.rotation.y = Math.sin(clock.elapsedTime * 0.22) * 0.08
  })

  return (
    <group position={anchor.position} rotation-y={anchor.yaw}>
      {arches.map((geometry, index) => (
        <mesh key={index} geometry={geometry} castShadow>
          <meshStandardMaterial color={index ? '#244c3b' : '#193c38'} roughness={0.76} />
        </mesh>
      ))}
      {[
        [-7.5, 3.4, 0, -0.5],
        [-5.6, 7.2, 0, -0.9],
        [7.5, 3.4, 0, 0.5],
        [5.6, 7.2, 0, 0.9],
      ].map(([x, y, z, rz], index) => (
        <MoonLeaf key={index} position={[x, y, z]} rotation={[0.2, 0, rz]} scale={1.25 + (index % 2) * 0.25} />
      ))}
      <group ref={fruits}>
        {[
          [-6.8, 5.6, 0.4],
          [-3.6, 9.4, 0.1],
          [3.8, 9.2, -0.1],
          [6.9, 5.5, 0.3],
        ].map((position, index) => (
          <group key={index} position={position as Vec3}>
            <mesh scale={[0.48, 0.68, 0.48]}>
              <sphereGeometry args={[1, 18, 12]} />
              <meshStandardMaterial
                color={index % 2 ? '#9873bd' : '#718ec4'}
                emissive="#55dba7"
                emissiveIntensity={0.72}
                roughness={0.32}
              />
            </mesh>
            <pointLight color="#7aefbd" intensity={1.25} distance={6} decay={2} />
          </group>
        ))}
      </group>
      {[-12, 12].map((x, index) => (
        <group key={x} position={[x, 0, -2]}>
          <mesh position-y={2.2} castShadow>
            <cylinderGeometry args={[0.72, 1.1, 4.5, 9]} />
            <meshStandardMaterial color="#173633" roughness={0.84} />
          </mesh>
          {Array.from({ length: 7 }, (_, leafIndex) => {
            const angle = (leafIndex / 7) * Math.PI * 2
            return (
              <MoonLeaf
                key={leafIndex}
                position={[Math.cos(angle) * 1.4, 4.2 + Math.sin(angle) * 0.4, Math.sin(angle) * 1.4]}
                rotation={[0.2, angle, angle]}
                scale={1.3}
              />
            )
          })}
        </group>
      ))}
    </group>
  )
}

function MoonflowerPassage({ paused }: { paused?: boolean }) {
  const anchor = useMemo(() => routeAnchor(LANDMARK_AT.moonflowerExit), [])
  const flower = useRef<THREE.Group>(null)
  const center = useRef<THREE.Mesh>(null)
  const petal = useMemo(() => makePetalGeometry(0.92, 2.35), [])
  const rootArches = useMemo(() => {
    return ([-1, 1] as const).flatMap((side) =>
      [0, 1].map((strand) => {
        const z = strand * 0.42 - 0.2
        const points = [
          new THREE.Vector3(side * (6.6 + strand * 0.38), -0.2, z),
          new THREE.Vector3(side * 6.1, 4.2, z + side * 0.18),
          new THREE.Vector3(side * 3.9, 8.3, z - side * 0.12),
          new THREE.Vector3(side * 1.4, 10.2, z),
          new THREE.Vector3(0, 10.7 + strand * 0.3, z * 0.5),
        ]
        return new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points, false, 'centripetal'),
          64,
          strand === 0 ? 0.42 : 0.24,
          8,
          false,
        )
      }),
    )
  }, [])
  const hangingRoots = useMemo(
    () =>
      [-5.4, -3.5, 3.5, 5.4].map((x, index) =>
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(x, 5.2 + (index % 2) * 1.5, -0.1),
            new THREE.Vector3(x + Math.sin(index) * 0.55, 3.7, 0.12),
            new THREE.Vector3(x - Math.cos(index) * 0.35, 2.2 - (index % 2) * 0.5, -0.08),
          ]),
          28,
          0.09,
          6,
          false,
        ),
      ),
    [],
  )

  useFrame(({ clock }) => {
    if (paused) return
    if (flower.current) {
      flower.current.rotation.z = Math.sin(clock.elapsedTime * 0.24) * 0.035
      const breathe = 1 + Math.sin(clock.elapsedTime * 0.82) * 0.025
      flower.current.scale.setScalar(breathe)
    }
    if (center.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 1.35) * 0.08
      center.current.scale.setScalar(pulse)
    }
  })

  return (
    <group position={anchor.position} rotation-y={anchor.yaw}>
      {rootArches.map((geometry, index) => (
        <mesh key={index} geometry={geometry} castShadow>
          <meshStandardMaterial
            color={index % 2 ? '#4d7b5e' : '#285146'}
            emissive={index % 2 ? '#285f4a' : '#174c43'}
            emissiveIntensity={0.34}
            roughness={0.7}
          />
        </mesh>
      ))}
      {hangingRoots.map((geometry, index) => (
        <mesh key={index} geometry={geometry}>
          <meshStandardMaterial
            color="#5b8060"
            emissive="#2f7459"
            emissiveIntensity={0.38}
            roughness={0.74}
          />
        </mesh>
      ))}

      <group ref={flower} position={[0, 10.75, 0.18]}>
        {Array.from({ length: 11 }, (_, index) => {
          const angle = (index / 11) * Math.PI * 2
          const alternatingScale = index % 2 ? 1.62 : 1.9
          return (
            <mesh
              key={index}
              geometry={petal}
              rotation-z={angle - Math.PI / 2}
              scale={[alternatingScale, alternatingScale, 1]}
              castShadow
            >
              <meshStandardMaterial
                color={index % 2 ? '#c4a5e0' : '#d9c6ef'}
                emissive={index % 2 ? '#66539a' : '#7d6db2'}
                emissiveIntensity={0.62}
                side={THREE.DoubleSide}
                roughness={0.38}
              />
            </mesh>
          )
        })}
        <mesh ref={center} position={[0, 0, 0.28]}>
          <dodecahedronGeometry args={[1.18, 2]} />
          <meshStandardMaterial
            color="#d9ffd9"
            emissive="#6cf0b7"
            emissiveIntensity={1.2}
            roughness={0.24}
          />
        </mesh>
        <mesh position={[0, 0, 0.35]} scale={2.4}>
          <sphereGeometry args={[1, 18, 12]} />
          <meshBasicMaterial
            color="#92ffd0"
            transparent
            opacity={0.09}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>

      {[-5.8, 5.8].map((x, index) => (
        <group key={x} position={[x, 1.2, 0]}>
          {Array.from({ length: 4 }, (_, leafIndex) => (
            <MoonLeaf
              key={leafIndex}
              position={[
                (leafIndex % 2 ? 1 : -1) * (0.35 + leafIndex * 0.16),
                leafIndex * 0.72,
                -0.2 + leafIndex * 0.1,
              ]}
              rotation={[0.16, index ? -0.35 : 0.35, (index ? -1 : 1) * (0.72 + leafIndex * 0.16)]}
              scale={0.82 + leafIndex * 0.12}
            />
          ))}
        </group>
      ))}

      <pointLight color="#91f6c5" intensity={2.8} distance={19} decay={2} position={[0, 9.8, 2]} />
    </group>
  )
}

function SunRayCrown() {
  const rays = useRef<THREE.InstancedMesh>(null)
  const count = 12
  useLayoutEffect(() => {
    if (!rays.current) return
    const dummy = new THREE.Object3D()
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2
      dummy.position.set(Math.cos(angle) * 5.5, Math.sin(angle) * 5.5, 0)
      dummy.rotation.set(0, 0, angle - Math.PI / 2)
      dummy.scale.set(0.24, index % 2 ? 0.82 : 1.18, 0.2)
      dummy.updateMatrix()
      rays.current.setMatrixAt(index, dummy.matrix)
      rays.current.setColorAt(index, new THREE.Color(index % 2 ? '#ff9b78' : '#ffe39a'))
    }
    rays.current.instanceMatrix.needsUpdate = true
    if (rays.current.instanceColor) rays.current.instanceColor.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={rays} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 0.28]} />
      <meshStandardMaterial color="#ffffff" emissive="#d98b58" emissiveIntensity={0.28} roughness={0.34} />
    </instancedMesh>
  )
}

function PrismShardField() {
  const shards = useRef<THREE.InstancedMesh>(null)
  const count = 26
  useLayoutEffect(() => {
    if (!shards.current) return
    const dummy = new THREE.Object3D()
    const palette = ['#ffe194', '#74ded8', '#ff947e', '#f7c7c0']
    for (let index = 0; index < count; index += 1) {
      const side = index % 2 ? -1 : 1
      const column = Math.floor(index / 2)
      const x = side * (7.4 + (column % 4) * 1.65)
      const z = ((column * 3) % 9 - 4) * 1.45
      const height = 1.2 + (column % 5) * 0.36
      dummy.position.set(x, height * 0.72 - 0.15, z)
      dummy.rotation.set(side * 0.08, column * 0.73, side * (0.05 + (column % 3) * 0.035))
      dummy.scale.set(0.75 + (column % 3) * 0.12, height, 0.72 + (column % 2) * 0.14)
      dummy.updateMatrix()
      shards.current.setMatrixAt(index, dummy.matrix)
      shards.current.setColorAt(index, new THREE.Color(palette[index % palette.length]))
    }
    shards.current.instanceMatrix.needsUpdate = true
    if (shards.current.instanceColor) shards.current.instanceColor.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={shards} args={[undefined, undefined, count]} castShadow>
      <coneGeometry args={[0.48, 2.3, 5, 1]} />
      <meshPhysicalMaterial
        color="#ffffff"
        emissive="#629f99"
        emissiveIntensity={0.18}
        clearcoat={0.72}
        clearcoatRoughness={0.24}
        metalness={0.04}
        roughness={0.28}
      />
    </instancedMesh>
  )
}

function SunbeamPrismDesert({ paused }: { paused?: boolean }) {
  const anchor = useMemo(() => routeAnchor(LANDMARK_AT.desert, -0.4), [])
  const halo = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!paused && halo.current) halo.current.rotation.z = clock.elapsedTime * 0.055
  })
  return (
    <group position={anchor.position} rotation-y={anchor.yaw}>
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[side * 8.4, 0, 0]}>
          <mesh position-y={0.15} scale={[3.8, 1.15, 3.2]} castShadow receiveShadow>
            <dodecahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color={side < 0 ? '#cf8268' : '#dfa06d'} roughness={0.78} flatShading />
          </mesh>
          <mesh position={[side * 0.35, 3.55, 0]} scale={[1.8, 4.15, 1.65]} castShadow>
            <coneGeometry args={[1, 2, 5, 2]} />
            <meshPhysicalMaterial
              color={side < 0 ? '#76d7cf' : '#f6c06f'}
              emissive={side < 0 ? '#327f80' : '#b86c47'}
              emissiveIntensity={0.2}
              clearcoat={0.66}
              clearcoatRoughness={0.22}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[-side * 2.2, 2.1, -1.8]} rotation-z={side * 0.18} scale={[0.9, 2.15, 0.9]} castShadow>
            <coneGeometry args={[1, 2, 5, 1]} />
            <meshStandardMaterial color="#ff9a7e" emissive="#9b4e4d" emissiveIntensity={0.17} roughness={0.34} />
          </mesh>
        </group>
      ))}
      <PrismShardField />
      <group ref={halo} position={[0, 11.2, 0.2]}>
        <SunRayCrown />
        <mesh>
          <torusGeometry args={[4.25, 0.34, 10, 72]} />
          <meshPhysicalMaterial
            color="#ffe6a1"
            emissive="#ec9d56"
            emissiveIntensity={0.65}
            clearcoat={0.52}
            roughness={0.28}
          />
        </mesh>
        <mesh position-z={-0.12}>
          <circleGeometry args={[3.55, 48]} />
          <meshBasicMaterial
            color="#ffd48a"
            transparent
            opacity={0.26}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 0, 0.16]} scale={[1.45, 1.45, 0.48]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#fff0b6" emissive="#ef9b58" emissiveIntensity={0.82} roughness={0.28} />
        </mesh>
      </group>
    </group>
  )
}

function ToyTower({
  position,
  height,
  color,
  accent,
  scale = 1,
}: {
  position: Vec3
  height: number
  color: string
  accent: string
  scale?: number
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position-y={height * 0.42} castShadow receiveShadow>
        <boxGeometry args={[3.2, height * 0.84, 3.2, 2, 4, 2]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.02} />
      </mesh>
      <mesh position-y={height * 0.87} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[2.55, 3.3, 4, 1]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.12} roughness={0.54} />
      </mesh>
      {[0.28, 0.54, 0.72].map((ratio, index) => (
        <mesh key={ratio} position={[0, height * ratio, 1.64]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.34 + index * 0.03, 0.34 + index * 0.03, 0.16, 16]} />
          <meshStandardMaterial color={index % 2 ? '#fff1d7' : '#71b6b0'} emissive="#866148" emissiveIntensity={0.13} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

function ToyBlockField() {
  const blocks = useRef<THREE.InstancedMesh>(null)
  const roofs = useRef<THREE.InstancedMesh>(null)
  const count = 20
  useLayoutEffect(() => {
    if (!blocks.current || !roofs.current) return
    const dummy = new THREE.Object3D()
    const colors = ['#d85f6e', '#5aa59f', '#e1aa55', '#7891bf', '#f2e4c7']
    for (let index = 0; index < count; index += 1) {
      const side = index % 2 ? -1 : 1
      const row = Math.floor(index / 2)
      const x = side * (7.2 + (row % 4) * 2.05)
      const z = ((row * 5) % 11 - 5) * 1.35
      const height = 1.1 + (row % 4) * 0.52
      dummy.position.set(x, height * 0.55 - 0.2, z)
      dummy.rotation.set(0, row * 0.37, 0)
      dummy.scale.set(1.2 + (row % 2) * 0.34, height, 1.08 + (row % 3) * 0.18)
      dummy.updateMatrix()
      blocks.current.setMatrixAt(index, dummy.matrix)
      blocks.current.setColorAt(index, new THREE.Color(colors[index % colors.length]))

      dummy.position.set(x, height + 0.32, z)
      dummy.rotation.set(0, row * 0.37 + Math.PI / 4, 0)
      dummy.scale.set(0.9, 0.72, 0.9)
      dummy.updateMatrix()
      roofs.current.setMatrixAt(index, dummy.matrix)
      roofs.current.setColorAt(index, new THREE.Color(colors[(index + 2) % colors.length]))
    }
    blocks.current.instanceMatrix.needsUpdate = true
    roofs.current.instanceMatrix.needsUpdate = true
    if (blocks.current.instanceColor) blocks.current.instanceColor.needsUpdate = true
    if (roofs.current.instanceColor) roofs.current.instanceColor.needsUpdate = true
  }, [])
  return (
    <group>
      <instancedMesh ref={blocks} args={[undefined, undefined, count]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.72} metalness={0.01} />
      </instancedMesh>
      <instancedMesh ref={roofs} args={[undefined, undefined, count]} castShadow>
        <coneGeometry args={[1, 1.1, 4, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.58} metalness={0.03} />
      </instancedMesh>
    </group>
  )
}

function HeroGear({
  position,
  scale,
  color,
  speed,
  paused,
}: {
  position: Vec3
  scale: number
  color: string
  speed: number
  paused?: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const teeth = useRef<THREE.InstancedMesh>(null)
  const count = 10
  useLayoutEffect(() => {
    if (!teeth.current) return
    const dummy = new THREE.Object3D()
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2
      dummy.position.set(Math.cos(angle) * 1.7, Math.sin(angle) * 1.7, 0)
      dummy.rotation.set(0, 0, angle)
      dummy.scale.set(0.58, 0.22, 0.34)
      dummy.updateMatrix()
      teeth.current.setMatrixAt(index, dummy.matrix)
    }
    teeth.current.instanceMatrix.needsUpdate = true
  }, [])
  useFrame((_, delta) => {
    if (!paused && group.current) group.current.rotation.z += delta * speed
  })
  return (
    <group ref={group} position={position} scale={scale}>
      <mesh>
        <torusGeometry args={[1.25, 0.26, 8, 36]} />
        <meshStandardMaterial color={color} emissive="#8a6641" emissiveIntensity={0.18} roughness={0.38} metalness={0.3} />
      </mesh>
      <instancedMesh ref={teeth} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} emissive="#8a6641" emissiveIntensity={0.14} roughness={0.4} metalness={0.28} />
      </instancedMesh>
    </group>
  )
}

function PennantLine() {
  const pennants = useRef<THREE.InstancedMesh>(null)
  const count = 11
  useLayoutEffect(() => {
    if (!pennants.current) return
    const dummy = new THREE.Object3D()
    const colors = ['#e56571', '#61aaa4', '#e2b058', '#7793c2']
    for (let index = 0; index < count; index += 1) {
      const x = (index - (count - 1) / 2) * 1.08
      dummy.position.set(x, -Math.cos((index / (count - 1)) * Math.PI) * 0.42, 0)
      dummy.rotation.set(0, 0, Math.PI)
      dummy.scale.set(0.66, 0.94, 0.42)
      dummy.updateMatrix()
      pennants.current.setMatrixAt(index, dummy.matrix)
      pennants.current.setColorAt(index, new THREE.Color(colors[index % colors.length]))
    }
    pennants.current.instanceMatrix.needsUpdate = true
    if (pennants.current.instanceColor) pennants.current.instanceColor.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={pennants} args={[undefined, undefined, count]} castShadow>
      <coneGeometry args={[0.5, 1.05, 3, 1]} />
      <meshStandardMaterial color="#ffffff" roughness={0.82} side={THREE.DoubleSide} />
    </instancedMesh>
  )
}

function ClockworkToyTown({ paused }: { paused?: boolean }) {
  const anchor = useMemo(() => routeAnchor(LANDMARK_AT.toytown, -0.5), [])
  return (
    <group position={anchor.position} rotation-y={anchor.yaw}>
      <ToyBlockField />
      <ToyTower position={[-11.5, 0, 0]} height={8.5} color="#cf5f6d" accent="#f0b95f" scale={0.94} />
      <ToyTower position={[-7.7, 0.4, -4]} height={6.4} color="#5ba7a1" accent="#f3e6c9" scale={0.76} />
      <ToyTower position={[11.2, 0.2, 1]} height={9.4} color="#7590bf" accent="#d96570" />
      <ToyTower position={[7.5, 0.8, -4.2]} height={6.8} color="#e0a856" accent="#5ba7a1" scale={0.8} />
      <HeroGear position={[-6.8, 7.8, 0.4]} scale={1.15} color="#f5d28a" speed={0.18} paused={paused} />
      <HeroGear position={[7, 8.8, 0.6]} scale={1.4} color="#f1c777" speed={-0.13} paused={paused} />
      <group position={[0, 10.2, 0.4]}>
        <mesh scale={[6.3, 0.05, 0.05]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#f5e3c4" roughness={0.72} />
        </mesh>
        <PennantLine />
      </group>
    </group>
  )
}

function ClockflowerFace({ paused }: { paused?: boolean }) {
  const flower = useRef<THREE.Group>(null)
  const hands = useRef<THREE.Group>(null)
  const petals = useRef<THREE.InstancedMesh>(null)
  const petal = useMemo(() => makePetalGeometry(0.72, 1.85), [])
  const count = 12
  useLayoutEffect(() => {
    if (!petals.current) return
    const dummy = new THREE.Object3D()
    const colors = ['#df6673', '#f0b861', '#5ba9a1', '#8398c7']
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2
      dummy.position.set(0, 0, 0)
      dummy.rotation.set(0, 0, angle - Math.PI / 2)
      dummy.scale.setScalar(index % 2 ? 1.48 : 1.7)
      dummy.updateMatrix()
      petals.current.setMatrixAt(index, dummy.matrix)
      petals.current.setColorAt(index, new THREE.Color(colors[index % colors.length]))
    }
    petals.current.instanceMatrix.needsUpdate = true
    if (petals.current.instanceColor) petals.current.instanceColor.needsUpdate = true
  }, [count])
  useFrame(({ clock }) => {
    if (paused) return
    if (flower.current) flower.current.rotation.z = Math.sin(clock.elapsedTime * 0.24) * 0.025
    if (hands.current) hands.current.rotation.z = -clock.elapsedTime * 0.16
  })
  return (
    <group ref={flower}>
      <instancedMesh ref={petals} args={[petal, undefined, count]} castShadow>
        <meshStandardMaterial color="#ffffff" emissive="#80545b" emissiveIntensity={0.22} roughness={0.46} side={THREE.DoubleSide} />
      </instancedMesh>
      <mesh position-z={0.22} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[2.55, 2.55, 0.58, 36, 1]} />
        <meshStandardMaterial color="#fff0d5" emissive="#b8874b" emissiveIntensity={0.18} roughness={0.42} metalness={0.12} />
      </mesh>
      <mesh position-z={0.55}>
        <torusGeometry args={[2.05, 0.14, 8, 40]} />
        <meshStandardMaterial color="#d8a753" emissive="#8a633d" emissiveIntensity={0.2} roughness={0.32} metalness={0.32} />
      </mesh>
      <group ref={hands} position-z={0.73}>
        <mesh position-y={0.72} scale={[0.13, 0.78, 0.09]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#6e4b50" roughness={0.42} />
        </mesh>
        <mesh position-x={0.52} rotation-z={Math.PI / 2} scale={[0.12, 0.55, 0.09]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#6e4b50" roughness={0.42} />
        </mesh>
      </group>
      <mesh position-z={0.82}>
        <sphereGeometry args={[0.28, 16, 10]} />
        <meshStandardMaterial color="#e5b35e" emissive="#8d653b" emissiveIntensity={0.2} metalness={0.25} roughness={0.32} />
      </mesh>
    </group>
  )
}

function ClockflowerMusicBoxFinale({ paused }: { paused?: boolean }) {
  const anchor = useMemo(() => routeAnchor(LANDMARK_AT.clockflowerFinale, -0.6), [])
  const key = useRef<THREE.Group>(null)
  const archGeometries = useMemo(
    () =>
      ([-1, 1] as const).map((side) =>
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(side * 6.4, 0, 0),
            new THREE.Vector3(side * 6.2, 4.8, 0),
            new THREE.Vector3(side * 4.3, 8.8, 0),
            new THREE.Vector3(0, 11.1, 0),
          ]),
          56,
          0.34,
          8,
          false,
        ),
      ),
    [],
  )
  useFrame(({ clock }) => {
    if (!paused && key.current) key.current.rotation.z = Math.sin(clock.elapsedTime * 0.38) * 0.08
  })
  return (
    <group position={anchor.position} rotation-y={anchor.yaw}>
      {archGeometries.map((geometry, index) => (
        <mesh key={index} geometry={geometry} castShadow>
          <meshStandardMaterial
            color={index ? '#f0c66f' : '#f5e4c2'}
            emissive={index ? '#8e6842' : '#8c7161'}
            emissiveIntensity={0.16}
            roughness={0.46}
            metalness={index ? 0.22 : 0.05}
          />
        </mesh>
      ))}
      <ToyTower position={[-7.6, 0, 0.4]} height={9.2} color="#cf5f6d" accent="#f0b95f" scale={1.05} />
      <ToyTower position={[7.6, 0, 0.4]} height={9.2} color="#5ba7a1" accent="#7590bf" scale={1.05} />
      <group position={[0, 11.15, 0.25]} scale={1.22}>
        <ClockflowerFace paused={paused} />
      </group>
      <group ref={key} position={[0, 17.1, 0.2]}>
        <mesh position-y={-1.1}>
          <cylinderGeometry args={[0.18, 0.18, 2.4, 10]} />
          <meshStandardMaterial color="#d6a34f" emissive="#795b3b" emissiveIntensity={0.18} roughness={0.34} metalness={0.3} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position-x={side * 0.92}>
            <torusGeometry args={[0.72, 0.18, 8, 30]} />
            <meshStandardMaterial color="#e5b965" emissive="#7e6040" emissiveIntensity={0.18} roughness={0.32} metalness={0.32} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

type ExtendedZoneId = 'aurora' | 'dinosaur' | 'carnival' | 'melody' | 'spaceport' | 'storybook'

function AuroraSnowglobeLandmark() {
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position-x={side * 6.2}>
          {Array.from({ length: 5 }, (_, index) => (
            <mesh key={index} position={[side * index * 0.34, 1.1 + index * 1.22, index * -0.18]} rotation-z={side * (0.18 + index * 0.07)} castShadow>
              <octahedronGeometry args={[1.25 - index * 0.08, 0]} />
              <meshPhysicalMaterial color={index % 2 ? '#c7eaff' : '#e2ccff'} emissive="#9edfff" emissiveIntensity={0.26} roughness={0.16} metalness={0.1} clearcoat={0.9} transparent opacity={0.9} />
            </mesh>
          ))}
        </group>
      ))}
      {[0, 1, 2].map((index) => (
        <mesh key={index} position-y={6.1} rotation-x={Math.PI / 2} rotation-y={index * 0.42}>
          <torusGeometry args={[5.4 - index * 0.56, 0.12, 8, 64]} />
          <meshBasicMaterial color={index === 1 ? '#f6d1ff' : '#bfefff'} transparent opacity={0.48 - index * 0.08} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {Array.from({ length: 18 }, (_, index) => {
        const angle = (index / 18) * Math.PI * 2
        const radius = 2.2 + (index % 4) * 1.1
        return (
          <mesh key={index} position={[Math.cos(angle) * radius, 3 + (index % 6) * 0.9, Math.sin(angle) * 1.6]}>
            <sphereGeometry args={[0.08 + (index % 3) * 0.035, 8, 6]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
        )
      })}
    </group>
  )
}

function DinosaurFernLandmark() {
  return (
    <group>
      <group position={[0, 2.2, 1.4]} rotation-y={-0.12}>
        <mesh scale={[2.9, 1.55, 1.25]} castShadow>
          <sphereGeometry args={[1, 28, 18]} />
          <meshPhysicalMaterial color="#7fc58c" roughness={0.48} clearcoat={0.25} />
        </mesh>
        {Array.from({ length: 5 }, (_, index) => (
          <mesh key={index} position={[1.7 + index * 0.5, 1 + index * 0.74, 0]} rotation-z={-0.55 + index * 0.035} castShadow>
            <capsuleGeometry args={[0.52 - index * 0.04, 1.05, 8, 16]} />
            <meshStandardMaterial color="#79bc83" roughness={0.5} />
          </mesh>
        ))}
        <mesh position={[4.05, 4.5, 0]} scale={[1.18, 0.92, 0.9]} castShadow>
          <sphereGeometry args={[1, 24, 16]} />
          <meshPhysicalMaterial color="#83c990" roughness={0.44} clearcoat={0.3} />
        </mesh>
        {[-0.34, 0.34].map((z) => (
          <group key={z} position={[4.72, 4.72, z]} rotation-y={Math.PI / 2}>
            <mesh><sphereGeometry args={[0.18, 12, 8]} /><meshBasicMaterial color="#fff9e9" /></mesh>
            <mesh position-z={0.13}><sphereGeometry args={[0.085, 10, 7]} /><meshBasicMaterial color="#32464b" /></mesh>
          </group>
        ))}
        {[-1.65, 0.95].map((x) => (
          <group key={x} position={[x, -1.7, 0]}>
            {[-0.48, 0.48].map((z) => (
              <mesh key={z} position-z={z}><capsuleGeometry args={[0.32, 1.45, 6, 12]} /><meshStandardMaterial color="#69a978" roughness={0.56} /></mesh>
            ))}
          </group>
        ))}
      </group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 6, 0, -0.4]}>
          {Array.from({ length: 7 }, (_, index) => (
            <mesh key={index} position={[side * (index % 2) * 0.5, 1.2 + index * 0.48, 0]} rotation-z={side * (0.3 + index * 0.06)} scale={[0.5, 1.45, 0.18]}>
              <sphereGeometry args={[1, 14, 8]} />
              <meshStandardMaterial color={index % 2 ? '#75a967' : '#4e8c67'} roughness={0.7} />
            </mesh>
          ))}
          {[0, 1, 2].map((index) => (
            <mesh key={index} position={[side * (1.2 + index * 0.78), 0.65, index * 0.25]} scale={[0.72, 0.9, 0.72]} castShadow>
              <sphereGeometry args={[1, 18, 12]} />
              <meshPhysicalMaterial color={index % 2 ? '#f4d69a' : '#e8b98b'} roughness={0.42} clearcoat={0.28} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function CandyCarnivalLandmark({ animated }: { animated: RefObject<THREE.Group | null> }) {
  return (
    <group>
      <group ref={animated} position-y={4.4}>
        <mesh position-y={3.1} castShadow><coneGeometry args={[5.2, 2.5, 18, 3]} /><meshPhysicalMaterial color="#f08aaa" roughness={0.3} clearcoat={0.5} /></mesh>
        <mesh position-y={1.2}><cylinderGeometry args={[0.28, 0.34, 5.8, 16]} /><meshStandardMaterial color="#f5d27c" metalness={0.2} roughness={0.34} /></mesh>
        {Array.from({ length: 8 }, (_, index) => {
          const angle = (index / 8) * Math.PI * 2
          return (
            <group key={index} position={[Math.cos(angle) * 3.45, 0, Math.sin(angle) * 2.4]} rotation-y={-angle}>
              <mesh position-y={0.4}><cylinderGeometry args={[0.09, 0.09, 4.4, 8]} /><meshStandardMaterial color="#fff0bd" metalness={0.18} /></mesh>
              <mesh position-y={-1.2} scale={[0.95, 0.65, 0.55]} castShadow><sphereGeometry args={[1, 20, 12]} /><meshPhysicalMaterial color={index % 2 ? '#7fd2c3' : '#f4a3bd'} roughness={0.32} clearcoat={0.5} /></mesh>
            </group>
          )
        })}
      </group>
      {[-1, 1].map((side) => (
        <group key={side} position-x={side * 6.6}>
          <mesh position-y={3.4}><cylinderGeometry args={[0.18, 0.26, 6.8, 12]} /><meshStandardMaterial color="#f6dfb0" /></mesh>
          <mesh position-y={7} rotation-z={side * -0.12} castShadow><torusGeometry args={[1.8, 0.52, 12, 42]} /><meshPhysicalMaterial color={side > 0 ? '#79d4c4' : '#f19ab7'} emissive={side > 0 ? '#3f9c96' : '#b45678'} emissiveIntensity={0.18} roughness={0.3} clearcoat={0.56} /></mesh>
        </group>
      ))}
    </group>
  )
}

function MelodyMountainLandmark({ animated }: { animated: RefObject<THREE.Group | null> }) {
  return (
    <group>
      <group position-y={0.25}>
        {Array.from({ length: 13 }, (_, index) => (
          <mesh key={index} position={[(index - 6) * 0.9, 0.48 + Math.abs(index - 6) * 0.08, 0]} scale={[0.82, 0.32, 2.2]} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshPhysicalMaterial color={index % 2 ? '#f7ead0' : '#f9f5e9'} roughness={0.34} clearcoat={0.34} />
          </mesh>
        ))}
      </group>
      <group ref={animated} position={[0, 6.2, 0]}>
        {[-3.8, 0, 3.8].map((x, index) => (
          <group key={x} position-x={x} scale={1 + index * 0.08}>
            <mesh position-y={1.8} rotation-z={index === 1 ? -0.18 : 0.14}><cylinderGeometry args={[0.18, 0.18, 5, 10]} /><meshStandardMaterial color="#5c6e88" metalness={0.25} roughness={0.32} /></mesh>
            <mesh position={[index === 1 ? 0.85 : -0.82, -0.4, 0]}><sphereGeometry args={[0.82, 20, 14]} /><meshPhysicalMaterial color={index === 1 ? '#ee8fab' : '#f2c86f'} roughness={0.28} clearcoat={0.52} /></mesh>
            {index === 1 && <mesh position={[0.85, 3.95, 0]} rotation-z={-0.6}><cylinderGeometry args={[0.13, 0.13, 1.75, 8]} /><meshStandardMaterial color="#5c6e88" /></mesh>}
          </group>
        ))}
      </group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 6.4, 1.1, 0]}>
          <mesh scale={[1.6, 1.2, 1.25]} castShadow><cylinderGeometry args={[1, 1.18, 1.8, 28]} /><meshPhysicalMaterial color={side > 0 ? '#73c8b9' : '#e9879f'} roughness={0.36} clearcoat={0.38} /></mesh>
          <mesh position-y={1.05} rotation-x={Math.PI / 2}><circleGeometry args={[1.6, 28]} /><meshStandardMaterial color="#f3d88b" roughness={0.48} /></mesh>
        </group>
      ))}
    </group>
  )
}

function BubbleSpaceportLandmark({ animated }: { animated: RefObject<THREE.Group | null> }) {
  return (
    <group>
      <group ref={animated} position-y={6.8}>
        {[
          { position: [-4.6, 1.6, 0] as Vec3, color: '#f3a2b2', size: 1.75 },
          { position: [0, 3.2, -1.2] as Vec3, color: '#ac9fe2', size: 2.2 },
          { position: [4.8, 0.8, 0.4] as Vec3, color: '#7ed4d1', size: 1.5 },
        ].map((planet, index) => (
          <group key={index} position={planet.position}>
            <mesh castShadow><sphereGeometry args={[planet.size, 30, 20]} /><meshPhysicalMaterial color={planet.color} roughness={0.28} clearcoat={0.62} /></mesh>
            <mesh rotation-x={Math.PI / 2 + index * 0.28} rotation-y={index * 0.4}><torusGeometry args={[planet.size * 1.45, 0.12, 8, 48]} /><meshBasicMaterial color="#fff0b3" transparent opacity={0.64} toneMapped={false} /></mesh>
          </group>
        ))}
      </group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 6.2, 2.6, 0]} rotation-z={side * -0.08}>
          <mesh scale={[1.05, 2.4, 1.05]} castShadow><capsuleGeometry args={[0.8, 2.4, 10, 20]} /><meshPhysicalMaterial color="#f4f0e8" roughness={0.3} metalness={0.12} clearcoat={0.55} /></mesh>
          <mesh position-y={2.15}><coneGeometry args={[0.88, 1.8, 22]} /><meshPhysicalMaterial color={side > 0 ? '#ef8c9e' : '#79cfc5'} roughness={0.3} clearcoat={0.5} /></mesh>
          {[-0.62, 0.62].map((x) => <mesh key={x} position={[x, -1.4, 0]} rotation-z={x * -0.4}><coneGeometry args={[0.48, 1.5, 12]} /><meshStandardMaterial color="#f2bb69" emissive="#d96f4e" emissiveIntensity={0.28} /></mesh>)}
        </group>
      ))}
    </group>
  )
}

function StorybookHarborLandmark({ animated }: { animated: RefObject<THREE.Group | null> }) {
  return (
    <group>
      <group ref={animated} position-y={3.4}>
        <mesh position={[-2.8, 0, 0]} rotation={[0.08, 0.14, -0.24]} scale={[5.8, 0.32, 4.3]} castShadow><boxGeometry args={[1, 1, 1]} /><meshPhysicalMaterial color="#fff0c8" roughness={0.52} clearcoat={0.18} /></mesh>
        <mesh position={[2.8, 0, 0]} rotation={[0.08, -0.14, 0.24]} scale={[5.8, 0.32, 4.3]} castShadow><boxGeometry args={[1, 1, 1]} /><meshPhysicalMaterial color="#fff4d8" roughness={0.52} clearcoat={0.18} /></mesh>
        <mesh position-y={-0.15} scale={[0.3, 0.5, 4.2]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#c78a6f" roughness={0.5} /></mesh>
        {[-1, 1].flatMap((side) => [0, 1, 2].map((line) => (
          <mesh key={`${side}-${line}`} position={[side * 2.8, 0.24, -1.35 + line * 1.2]} rotation={[Math.PI / 2, 0, side * 0.24]} scale={[1.75, 0.045, 1]}>
            <planeGeometry args={[1, 1]} /><meshBasicMaterial color={line === 0 ? '#df9b88' : '#89ad9d'} transparent opacity={0.6} />
          </mesh>
        )))}
      </group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 6.5, 2.6, 0]} rotation-z={side * -0.05}>
          <mesh scale={[0.62, 4.6, 0.62]} castShadow><cylinderGeometry args={[1, 1, 1, 6]} /><meshStandardMaterial color={side > 0 ? '#7eb8ae' : '#e58d9c'} roughness={0.4} /></mesh>
          <mesh position-y={3.05}><coneGeometry args={[0.68, 1.6, 6]} /><meshPhysicalMaterial color="#f0c56f" roughness={0.34} clearcoat={0.3} /></mesh>
        </group>
      ))}
      {[-4, 0, 4].map((x, index) => (
        <group key={x} position={[x, 0.5, 3.2]} rotation-y={index * 0.4 - 0.4}>
          <mesh rotation-x={Math.PI / 2} rotation-z={Math.PI / 4} scale={[1.4, 1.4, 1]}><coneGeometry args={[1, 0.14, 3]} /><meshPhysicalMaterial color={index % 2 ? '#f5d9a3' : '#d6ebdf'} roughness={0.5} /></mesh>
        </group>
      ))}
    </group>
  )
}

function ExtendedRealmLandmark({ zoneId, paused }: { zoneId: ExtendedZoneId; paused?: boolean }) {
  const at = LANDMARK_AT[zoneId]
  const anchor = useMemo(() => routeAnchor(at), [at])
  const animated = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!paused && animated.current) {
      animated.current.rotation.y = Math.sin(clock.elapsedTime * 0.32 + at * 12) * 0.08
      animated.current.position.y += Math.sin(clock.elapsedTime * 0.7 + at * 20) * 0.0015
    }
  })
  return (
    <group position={anchor.position} rotation-y={anchor.yaw}>
      {zoneId === 'aurora' && <AuroraSnowglobeLandmark />}
      {zoneId === 'dinosaur' && <DinosaurFernLandmark />}
      {zoneId === 'carnival' && <CandyCarnivalLandmark animated={animated} />}
      {zoneId === 'melody' && <MelodyMountainLandmark animated={animated} />}
      {zoneId === 'spaceport' && <BubbleSpaceportLandmark animated={animated} />}
      {zoneId === 'storybook' && <StorybookHarborLandmark animated={animated} />}
    </group>
  )
}

function TransitionCrown({
  at,
  color,
  accent,
  paused,
}: {
  at: number
  color: string
  accent: string
  paused?: boolean
}) {
  const anchor = useMemo(() => routeAnchor(at, 7.5), [at])
  const group = useRef<THREE.Group>(null)
  const star = useMemo(() => makeStarGeometry(0.72, 0.36), [])
  useFrame(({ clock }) => {
    if (!paused && group.current) group.current.rotation.z = clock.elapsedTime * 0.08 + at * 5
  })
  return (
    <group ref={group} position={anchor.position} rotation-y={anchor.yaw}>
      {[3.8, 4.35, 4.9].map((radius, index) => (
        <mesh key={radius} rotation-x={Math.PI / 2 + index * 0.12} rotation-y={index * 0.45}>
          <torusGeometry args={[radius, 0.08 + index * 0.025, 6, 56]} />
          <meshBasicMaterial
            color={index === 1 ? accent : color}
            transparent
            opacity={0.34 - index * 0.06}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
      {Array.from({ length: 5 }, (_, index) => {
        const angle = (index / 5) * Math.PI * 2
        return (
          <mesh key={index} geometry={star} position={[Math.cos(angle) * 4.35, Math.sin(angle) * 4.35, 0]} scale={0.52}>
            <meshBasicMaterial color={accent} transparent opacity={0.65} toneMapped={false} />
          </mesh>
        )
      })}
    </group>
  )
}

export function ZoneLandmarks({ progress, paused }: { progress: number; paused?: boolean }) {
  return (
    <group>
      {Math.abs(progress - LANDMARK_AT.garden) < LANDMARK_VISIBLE_RADIUS && <GardenBloomGate paused={paused} />}
      {Math.abs(progress - LANDMARK_AT.citadel) < LANDMARK_VISIBLE_RADIUS && <StarwindCitadel paused={paused} />}
      {Math.abs(progress - LANDMARK_AT.reef) < LANDMARK_VISIBLE_RADIUS && <LanternReef paused={paused} />}
      {Math.abs(progress - LANDMARK_AT.jungle) < LANDMARK_VISIBLE_RADIUS && <MoonvineWilds paused={paused} />}
      {Math.abs(progress - LANDMARK_AT.moonflowerExit) < LANDMARK_VISIBLE_RADIUS && <MoonflowerPassage paused={paused} />}
      {Math.abs(progress - LANDMARK_AT.desert) < LANDMARK_VISIBLE_RADIUS && <SunbeamPrismDesert paused={paused} />}
      {Math.abs(progress - LANDMARK_AT.toytown) < LANDMARK_VISIBLE_RADIUS && <ClockworkToyTown paused={paused} />}
      {Math.abs(progress - LANDMARK_AT.clockflowerFinale) < LANDMARK_VISIBLE_RADIUS && <ClockflowerMusicBoxFinale paused={paused} />}
      {(['aurora', 'dinosaur', 'carnival', 'melody', 'spaceport', 'storybook'] as const).map((zoneId) =>
        Math.abs(progress - LANDMARK_AT[zoneId]) < LANDMARK_VISIBLE_RADIUS ? (
          <ExtendedRealmLandmark key={zoneId} zoneId={zoneId} paused={paused} />
        ) : null,
      )}

      {ZONES.slice(1).map((zone, index) => {
        const previous = ZONES[index]
        return Math.abs(progress - zone.start) < TRANSITION_VISIBLE_RADIUS ? (
          <TransitionCrown
            key={zone.id}
            at={zone.start}
            color={ZONE_VISUALS[previous.id].glow}
            accent={ZONE_VISUALS[zone.id].collectible}
            paused={paused}
          />
        ) : null
      })}
    </group>
  )
}
