import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import {
  HOME_MEADOW_REVEAL_START,
  ROUTE_END_PROGRESS,
} from '../../game/worldConfig'
import { sampleRouteFrame } from '../route'

type Vec3 = [number, number, number]

type HomeMeadowFinaleProps = {
  progress: number
  paused?: boolean
}

const TREE_SPECS: readonly { position: Vec3; scale: number; tint: number }[] = [
  { position: [-19, -0.2, 25], scale: 1.05, tint: 0 },
  { position: [20, -0.1, 22], scale: 1.2, tint: 1 },
  { position: [-29, 0.1, 8], scale: 1.34, tint: 2 },
  { position: [31, -0.2, 4], scale: 1.12, tint: 0 },
  { position: [-23, 0.1, -13], scale: 1.18, tint: 1 },
  { position: [25, 0.2, -17], scale: 1.3, tint: 2 },
  { position: [-38, 0.4, -32], scale: 1.55, tint: 0 },
  { position: [39, 0.3, -35], scale: 1.48, tint: 1 },
  { position: [-48, 0.8, 36], scale: 1.68, tint: 2 },
  { position: [49, 0.6, 34], scale: 1.58, tint: 0 },
  { position: [-54, 1.2, -8], scale: 1.85, tint: 1 },
  { position: [55, 1.1, -5], scale: 1.78, tint: 2 },
]

const HILL_SPECS: readonly { position: Vec3; scale: Vec3; color: string }[] = [
  { position: [-49, -9, -62], scale: [27, 13, 23], color: '#68a95e' },
  { position: [-16, -11, -75], scale: [34, 16, 26], color: '#7dbb68' },
  { position: [22, -10, -73], scale: [31, 15, 24], color: '#6bab60' },
  { position: [53, -9, -58], scale: [26, 13, 22], color: '#86bd68' },
  { position: [-68, -8, -24], scale: [25, 12, 24], color: '#75ad62' },
  { position: [69, -8, -28], scale: [28, 13, 25], color: '#6ca45d' },
]

function meadowHeight(x: number, z: number) {
  const clearingDistance = Math.hypot(x * 0.92, z * 0.72)
  const clearing = THREE.MathUtils.smoothstep(clearingDistance, 15, 34)
  const rolling =
    Math.sin(x * 0.105) * 0.75 +
    Math.cos(z * 0.072 + x * 0.028) * 0.68 +
    Math.sin((x - z) * 0.045) * 0.38
  const outerRise = Math.max(0, Math.abs(x) - 43) * 0.085
  return -0.78 + rolling * clearing + outerRise
}

function makeMeadowGeometry() {
  const geometry = new THREE.PlaneGeometry(154, 164, 44, 48)
  geometry.rotateX(-Math.PI / 2)
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(positions.count * 3)
  const low = new THREE.Color('#5d9d55')
  const mid = new THREE.Color('#78b965')
  const high = new THREE.Color('#9bcc72')
  const color = new THREE.Color()

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index)
    const z = positions.getZ(index)
    const y = meadowHeight(x, z)
    positions.setY(index, y)
    const variation = Math.sin(x * 0.31 + z * 0.17) * 0.5 + 0.5
    color.copy(low).lerp(mid, 0.42 + variation * 0.32)
    if (y > 0.35) color.lerp(high, Math.min(0.72, (y - 0.35) * 0.16))
    colors[index * 3] = color.r
    colors[index * 3 + 1] = color.g
    colors[index * 3 + 2] = color.b
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function makeMeadowPathGeometry() {
  const lengthSegments = 28
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const pathStart = new THREE.Color('#a8c984')
  const pathEnd = new THREE.Color('#8eb874')
  const color = new THREE.Color()

  for (let segment = 0; segment <= lengthSegments; segment += 1) {
    const amount = segment / lengthSegments
    const z = THREE.MathUtils.lerp(15, -51, amount)
    const centerX = Math.sin(amount * Math.PI * 1.45) * amount * 2.4
    const halfWidth = THREE.MathUtils.lerp(5, 2.15, amount)
    for (let sideIndex = 0; sideIndex < 2; sideIndex += 1) {
      const side = sideIndex ? 1 : -1
      const edgeRuffle = Math.sin(segment * 1.73 + side * 0.8) * 0.16 * amount
      const x = centerX + side * (halfWidth + edgeRuffle)
      const y = meadowHeight(x, z) + 0.07
      positions.push(x, y, z)
      color.copy(pathStart).lerp(pathEnd, amount * 0.82)
      colors.push(color.r, color.g, color.b)
    }
    if (segment < lengthSegments) {
      const base = segment * 2
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function MeadowTree({ position, scale, tint }: { position: Vec3; scale: number; tint: number }) {
  const leafColors = ['#4d985a', '#64aa5e', '#82b968'] as const
  const highlightColors = ['#79b968', '#8ac66e', '#6fb363'] as const
  const terrainY = meadowHeight(position[0], position[2])
  return (
    <group position={[position[0], terrainY + position[1], position[2]]} scale={scale}>
      <mesh position-y={2.25} castShadow receiveShadow>
        <cylinderGeometry args={[0.34, 0.62, 4.7, 9, 3]} />
        <meshStandardMaterial color="#8a6651" roughness={0.86} />
      </mesh>
      <mesh position={[-0.52, 3.15, 0]} rotation-z={-0.64} castShadow>
        <cylinderGeometry args={[0.18, 0.28, 2.2, 8]} />
        <meshStandardMaterial color="#8a6651" roughness={0.86} />
      </mesh>
      <mesh position={[0.62, 3.45, -0.1]} rotation-z={0.72} castShadow>
        <cylinderGeometry args={[0.16, 0.26, 2.1, 8]} />
        <meshStandardMaterial color="#8a6651" roughness={0.86} />
      </mesh>
      {[
        [-1.35, 4.65, 0.15, 1.65],
        [0, 5.35, -0.25, 2.05],
        [1.45, 4.75, 0.1, 1.72],
        [-0.3, 6.5, 0.05, 1.45],
      ].map(([x, y, z, size], index) => (
        <mesh key={index} position={[x, y, z]} scale={[size, size * 0.84, size]} castShadow>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial
            color={index === 3 ? highlightColors[tint] : leafColors[tint]}
            emissive="#39784a"
            emissiveIntensity={0.045}
            roughness={0.82}
            flatShading
          />
        </mesh>
      ))}
    </group>
  )
}

function MeadowFlowers() {
  const stems = useRef<THREE.InstancedMesh>(null)
  const petals = useRef<THREE.InstancedMesh>(null)
  const centers = useRef<THREE.InstancedMesh>(null)
  const flowers = useMemo(() => {
    let seed = 0x7a91d
    const random = () => {
      seed = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      seed ^= seed + Math.imul(seed ^ (seed >>> 7), 61 | seed)
      return ((seed ^ (seed >>> 14)) >>> 0) / 4_294_967_296
    }
    return Array.from({ length: 64 }, (_, index) => {
      const side = index % 2 ? -1 : 1
      const x = side * (9 + random() * 48)
      const z = -45 + random() * 88
      return {
        x,
        z,
        height: 0.34 + random() * 0.38,
        color: ['#f28eae', '#ffd477', '#f5b2d6', '#8fd6c1'][index % 4],
        rotation: random() * Math.PI,
      }
    })
  }, [])

  useLayoutEffect(() => {
    if (!stems.current || !petals.current || !centers.current) return
    const object = new THREE.Object3D()
    const color = new THREE.Color()
    flowers.forEach((flower, flowerIndex) => {
      const y = meadowHeight(flower.x, flower.z)
      object.position.set(flower.x, y + flower.height * 0.5, flower.z)
      object.rotation.set(0, flower.rotation, 0)
      object.scale.set(0.055, flower.height, 0.055)
      object.updateMatrix()
      stems.current?.setMatrixAt(flowerIndex, object.matrix)

      object.position.set(flower.x, y + flower.height + 0.04, flower.z)
      object.rotation.set(0, flower.rotation, 0)
      object.scale.set(0.14, 0.11, 0.14)
      object.updateMatrix()
      centers.current?.setMatrixAt(flowerIndex, object.matrix)

      for (let petalIndex = 0; petalIndex < 5; petalIndex += 1) {
        const angle = flower.rotation + (petalIndex / 5) * Math.PI * 2
        object.position.set(
          flower.x + Math.cos(angle) * 0.19,
          y + flower.height + 0.04,
          flower.z + Math.sin(angle) * 0.19,
        )
        object.rotation.set(0, -angle, 0)
        object.scale.set(0.2, 0.075, 0.12)
        object.updateMatrix()
        const instanceIndex = flowerIndex * 5 + petalIndex
        petals.current?.setMatrixAt(instanceIndex, object.matrix)
        petals.current?.setColorAt(instanceIndex, color.set(flower.color))
      }
    })
    stems.current.instanceMatrix.needsUpdate = true
    centers.current.instanceMatrix.needsUpdate = true
    petals.current.instanceMatrix.needsUpdate = true
    if (petals.current.instanceColor) petals.current.instanceColor.needsUpdate = true
  }, [flowers])

  return (
    <group>
      <instancedMesh ref={stems} args={[undefined, undefined, flowers.length]} castShadow>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial color="#4d8b51" roughness={0.84} />
      </instancedMesh>
      <instancedMesh ref={petals} args={[undefined, undefined, flowers.length * 5]} castShadow>
        <sphereGeometry args={[1, 10, 6]} />
        <meshStandardMaterial color="#ffffff" roughness={0.58} />
      </instancedMesh>
      <instancedMesh ref={centers} args={[undefined, undefined, flowers.length]} castShadow>
        <sphereGeometry args={[1, 10, 6]} />
        <meshStandardMaterial color="#ffe69a" emissive="#d69a48" emissiveIntensity={0.16} roughness={0.5} />
      </instancedMesh>
    </group>
  )
}

function MeadowGrassTufts() {
  const grass = useRef<THREE.InstancedMesh>(null)
  const blades = useMemo(() => {
    let seed = 0x4c71b
    const random = () => {
      seed = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      seed ^= seed + Math.imul(seed ^ (seed >>> 7), 61 | seed)
      return ((seed ^ (seed >>> 14)) >>> 0) / 4_294_967_296
    }
    return Array.from({ length: 72 }, (_, clump) => {
      const side = clump % 2 ? -1 : 1
      const x = side * (6.8 + random() * 53)
      const z = -48 + random() * 96
      return Array.from({ length: 3 }, (_, blade) => ({
        x: x + (blade - 1) * 0.16,
        z: z + Math.sin(blade * 2.1) * 0.13,
        height: 0.28 + random() * 0.3,
        rotation: random() * Math.PI * 2,
        color: ['#4f9751', '#6aa95a', '#7db966'][(clump + blade) % 3],
      }))
    }).flat()
  }, [])

  useLayoutEffect(() => {
    if (!grass.current) return
    const object = new THREE.Object3D()
    const color = new THREE.Color()
    blades.forEach((blade, index) => {
      const y = meadowHeight(blade.x, blade.z)
      object.position.set(blade.x, y + blade.height * 0.5, blade.z)
      object.rotation.set(0, blade.rotation, Math.sin(blade.rotation) * 0.12)
      object.scale.set(0.72, blade.height / 0.48, 0.72)
      object.updateMatrix()
      grass.current?.setMatrixAt(index, object.matrix)
      grass.current?.setColorAt(index, color.set(blade.color))
    })
    grass.current.instanceMatrix.needsUpdate = true
    if (grass.current.instanceColor) grass.current.instanceColor.needsUpdate = true
  }, [blades])

  return (
    <instancedMesh ref={grass} args={[undefined, undefined, blades.length]} castShadow>
      <coneGeometry args={[0.07, 0.48, 5]} />
      <meshStandardMaterial color="#ffffff" roughness={0.88} />
    </instancedMesh>
  )
}

function HomecomingArch() {
  const archGeometries = useMemo(
    () => [-0.18, 0.18].map((zOffset, index) => new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-6.2, 0, zOffset),
        new THREE.Vector3(-5.6, 3.7, zOffset),
        new THREE.Vector3(-2.9, 6.8, zOffset + 0.12),
        new THREE.Vector3(0, 7.8 + index * 0.16, zOffset),
        new THREE.Vector3(2.9, 6.8, zOffset - 0.12),
        new THREE.Vector3(5.6, 3.7, zOffset),
        new THREE.Vector3(6.2, 0, zOffset),
      ]),
      64,
      index ? 0.18 : 0.3,
      8,
      false,
    )),
    [],
  )
  const blossoms = [
    [-5.7, 3.7], [-4.5, 5.5], [-2.8, 6.9], [-0.9, 7.7],
    [1.2, 7.6], [3.2, 6.6], [4.9, 5.1], [5.8, 3.2],
  ] as const
  return (
    <group position={[0, meadowHeight(0, 13), 13]}>
      {archGeometries.map((geometry, index) => (
        <mesh key={index} geometry={geometry} castShadow>
          <meshStandardMaterial color={index ? '#78a969' : '#4f8756'} roughness={0.78} />
        </mesh>
      ))}
      {blossoms.map(([x, y], index) => (
        <group key={index} position={[x, y, index % 2 ? 0.28 : -0.22]} rotation-z={index * 0.7}>
          {Array.from({ length: 5 }, (_, petal) => {
            const angle = (petal / 5) * Math.PI * 2
            return (
              <mesh key={petal} position={[Math.cos(angle) * 0.38, Math.sin(angle) * 0.38, 0]} scale={[0.38, 0.22, 0.16]} castShadow>
                <sphereGeometry args={[1, 12, 8]} />
                <meshStandardMaterial color={index % 3 === 0 ? '#ffd68a' : index % 2 ? '#f4a5c0' : '#fff0c0'} roughness={0.5} />
              </mesh>
            )
          })}
          <mesh scale={0.22}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color="#fff0a1" emissive="#d79b4c" emissiveIntensity={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function MeadowButterflies({ paused }: { paused?: boolean }) {
  const group = useRef<THREE.Group>(null)
  const butterflies = useMemo(
    () => Array.from({ length: 10 }, (_, index) => ({
      position: [
        (index % 2 ? -1 : 1) * (8 + (index % 5) * 5.4),
        2.1 + (index % 3) * 0.8,
        23 - index * 5.4,
      ] as Vec3,
      color: ['#ffd277', '#ee91b0', '#82c9d0'][index % 3],
      rotation: index * 0.73,
    })),
    [],
  )
  useFrame(({ clock }) => {
    if (!paused && group.current) {
      group.current.position.y = Math.sin(clock.elapsedTime * 0.82) * 0.28
      group.current.rotation.y = Math.sin(clock.elapsedTime * 0.18) * 0.05
    }
  })
  return (
    <group ref={group}>
      {butterflies.map((butterfly, index) => (
        <group key={index} position={butterfly.position} rotation-y={butterfly.rotation}>
          {[-1, 1].map((side) => (
            <mesh key={side} position-x={side * 0.2} rotation-y={side * 0.58} scale={[0.34, 0.22, 0.16]}>
              <sphereGeometry args={[1, 12, 8]} />
              <meshBasicMaterial color={butterfly.color} transparent opacity={0.78} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

export function HomeMeadowFinale({ progress, paused }: HomeMeadowFinaleProps) {
  const frame = useMemo(() => sampleRouteFrame(ROUTE_END_PROGRESS), [])
  const terrain = useMemo(makeMeadowGeometry, [])
  const path = useMemo(makeMeadowPathGeometry, [])
  const position = useMemo<Vec3>(
    () => [frame.position.x, frame.position.y, frame.position.z],
    [frame.position.x, frame.position.y, frame.position.z],
  )
  const yaw = useMemo(
    () => Math.atan2(-frame.right.z, frame.right.x),
    [frame.right.x, frame.right.z],
  )
  const motes = useRef<THREE.Points>(null)
  const moteGeometry = useMemo(() => {
    const points = new Float32Array(96 * 3)
    for (let index = 0; index < 96; index += 1) {
      const angle = index * 2.39996
      const radius = 9 + (index % 16) * 3.1
      points[index * 3] = Math.cos(angle) * radius
      points[index * 3 + 1] = 1.4 + (index % 9) * 0.72
      points[index * 3 + 2] = Math.sin(angle) * radius - 4
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3))
    return geometry
  }, [])
  const reveal = THREE.MathUtils.smoothstep(
    progress,
    HOME_MEADOW_REVEAL_START,
    ROUTE_END_PROGRESS,
  )

  useFrame(({ clock }) => {
    if (!paused && motes.current) {
      motes.current.rotation.y = clock.elapsedTime * 0.018
      motes.current.position.y = Math.sin(clock.elapsedTime * 0.34) * 0.18
    }
  })

  return (
    <group position={position} rotation-y={yaw}>
      <mesh geometry={terrain} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.91} metalness={0} />
      </mesh>
      <mesh geometry={path} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.92} />
      </mesh>

      {HILL_SPECS.map((hill, index) => (
        <mesh key={index} position={hill.position} scale={hill.scale} castShadow receiveShadow>
          <sphereGeometry args={[1, 28, 16]} />
          <meshStandardMaterial color={hill.color} roughness={0.94} />
        </mesh>
      ))}
      {TREE_SPECS.map((tree, index) => <MeadowTree key={index} {...tree} />)}
      <MeadowGrassTufts />
      <MeadowFlowers />
      <HomecomingArch />
      <MeadowButterflies paused={paused} />

      <group position={[36, 31, -73]}>
        <mesh scale={5.2}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshBasicMaterial color="#fff0a8" transparent opacity={0.84 * reveal} toneMapped={false} />
        </mesh>
        <pointLight color="#ffe5a1" intensity={1.3 * reveal} distance={72} decay={2} />
      </group>

      <points ref={motes} geometry={moteGeometry}>
        <pointsMaterial
          color="#fff4bb"
          size={0.2}
          transparent
          opacity={0.58 * reveal}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  )
}
