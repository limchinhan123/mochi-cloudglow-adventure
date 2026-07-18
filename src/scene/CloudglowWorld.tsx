import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  WORLD_OBSTACLES,
  type ZoneId,
} from '../game/worldConfig'
import {
  LANE_WIDTH,
  ROUTE_CHUNK_COUNT,
  sampleRouteFrame,
} from './route'
import { ZoneLandmarks } from './zones/ZoneLandmarks'
import { FriendlyObstacle } from './zones/WorldObjects'
import {
  ZONE_VISUALS,
  blendColor,
  blendNumber,
  getZoneBlend,
  zoneIdAt,
} from './zones/zoneVisuals'

export type CloudglowWorldProps = {
  progress: number
  lane: number
  /** Optional until App adopts the expanded world interaction contract. */
  onObstacleContact?: (id: string) => void
  /** Optional until App adopts the expanded world interaction contract. */
  obstacleHitIds?: ReadonlySet<string>
  paused?: boolean
}

type Vec3 = [number, number, number]

type IslandSpec = {
  progress: number
  position: Vec3
  rotationY: number
  radius: number
  depth: number
  stretch: number
  seed: number
  zoneId: ZoneId
  pathSide: -1 | 1
  waterfall?: boolean
}

type IslandCrownKind = 'bloom' | 'crystal' | 'prism' | 'toy'

type ZoneRenderProfile = {
  roadScale: number
  leafWidth: number
  leafLength: number
  leafPower: number
  leafWave: number
  leafLengthVariance: number
  leafCount: number
  grassCount: number
  grassHeightVariance: number
  crownKind: IslandCrownKind
  bloomCount: number
  crownScale: number
  cloudPearl: string
  cloudOpacity: number
  rockMetalness: number
  capMetalness: number
  islandEmissive: number
  capEmissive: number
  rimEmissive: number
  rootCount: number
  rootThickness: number
  rootSegments: number
  rootRoughness: number
  rootMetalness: number
  moteSize: number
  moteUsesCollectible: boolean
}

/**
 * Every realm must opt into a complete rendering profile. `satisfies` makes a
 * newly added ZoneId a compile error instead of silently inheriting Garden.
 */
const ZONE_RENDER_PROFILES = {
  garden: {
    roadScale: 2.48,
    leafWidth: 0.48,
    leafLength: 1.8,
    leafPower: 0.72,
    leafWave: 0,
    leafLengthVariance: 1.15,
    leafCount: 17,
    grassCount: 30,
    grassHeightVariance: 0.48,
    crownKind: 'bloom',
    bloomCount: 3,
    crownScale: 0.92,
    cloudPearl: '#e9f1f5',
    cloudOpacity: 0.2,
    rockMetalness: 0.01,
    capMetalness: 0.01,
    islandEmissive: 0.15,
    capEmissive: 0.13,
    rimEmissive: 0.16,
    rootCount: 5,
    rootThickness: 0.12,
    rootSegments: 6,
    rootRoughness: 0.86,
    rootMetalness: 0.01,
    moteSize: 0.1,
    moteUsesCollectible: false,
  },
  citadel: {
    roadScale: 2.7,
    leafWidth: 0.34,
    leafLength: 1.8,
    leafPower: 1.25,
    leafWave: 0,
    leafLengthVariance: 1.15,
    leafCount: 10,
    grassCount: 9,
    grassHeightVariance: 0.48,
    crownKind: 'crystal',
    bloomCount: 0,
    crownScale: 0.92,
    cloudPearl: '#e9f1f5',
    cloudOpacity: 0.2,
    rockMetalness: 0.08,
    capMetalness: 0.08,
    islandEmissive: 0.09,
    capEmissive: 0.08,
    rimEmissive: 0.1,
    rootCount: 4,
    rootThickness: 0.11,
    rootSegments: 5,
    rootRoughness: 0.5,
    rootMetalness: 0.15,
    moteSize: 0.1,
    moteUsesCollectible: true,
  },
  reef: {
    roadScale: 2.2,
    leafWidth: 0.68,
    leafLength: 1.65,
    leafPower: 0.72,
    leafWave: 0.05,
    leafLengthVariance: 1.15,
    leafCount: 17,
    grassCount: 18,
    grassHeightVariance: 0.48,
    crownKind: 'bloom',
    bloomCount: 3,
    crownScale: 0.92,
    cloudPearl: '#70c9cb',
    cloudOpacity: 0.13,
    rockMetalness: 0.01,
    capMetalness: 0.01,
    islandEmissive: 0.09,
    capEmissive: 0.08,
    rimEmissive: 0.1,
    rootCount: 5,
    rootThickness: 0.12,
    rootSegments: 6,
    rootRoughness: 0.86,
    rootMetalness: 0.01,
    moteSize: 0.18,
    moteUsesCollectible: false,
  },
  jungle: {
    roadScale: 2.48,
    leafWidth: 0.56,
    leafLength: 2.2,
    leafPower: 0.72,
    leafWave: 0,
    leafLengthVariance: 1.65,
    leafCount: 24,
    grassCount: 24,
    grassHeightVariance: 0.8,
    crownKind: 'bloom',
    bloomCount: 4,
    crownScale: 1.2,
    cloudPearl: '#63708b',
    cloudOpacity: 0.2,
    rockMetalness: 0.01,
    capMetalness: 0.01,
    islandEmissive: 0.09,
    capEmissive: 0.08,
    rimEmissive: 0.1,
    rootCount: 7,
    rootThickness: 0.13,
    rootSegments: 6,
    rootRoughness: 0.86,
    rootMetalness: 0.01,
    moteSize: 0.12,
    moteUsesCollectible: false,
  },
  desert: {
    roadScale: 2.62,
    leafWidth: 0.29,
    leafLength: 2.05,
    leafPower: 1.35,
    leafWave: 0.015,
    leafLengthVariance: 1.2,
    leafCount: 14,
    grassCount: 14,
    grassHeightVariance: 0.55,
    crownKind: 'prism',
    bloomCount: 0,
    crownScale: 0.98,
    cloudPearl: '#f4d7b6',
    cloudOpacity: 0.16,
    rockMetalness: 0.02,
    capMetalness: 0.02,
    islandEmissive: 0.11,
    capEmissive: 0.1,
    rimEmissive: 0.13,
    rootCount: 4,
    rootThickness: 0.09,
    rootSegments: 5,
    rootRoughness: 0.75,
    rootMetalness: 0.03,
    moteSize: 0.12,
    moteUsesCollectible: true,
  },
  toytown: {
    roadScale: 2.56,
    leafWidth: 0.5,
    leafLength: 1.4,
    leafPower: 0.62,
    leafWave: 0.035,
    leafLengthVariance: 0.95,
    leafCount: 10,
    grassCount: 10,
    grassHeightVariance: 0.42,
    crownKind: 'toy',
    bloomCount: 0,
    crownScale: 0.94,
    cloudPearl: '#ead6de',
    cloudOpacity: 0.18,
    rockMetalness: 0.03,
    capMetalness: 0.02,
    islandEmissive: 0.1,
    capEmissive: 0.09,
    rimEmissive: 0.12,
    rootCount: 4,
    rootThickness: 0.1,
    rootSegments: 5,
    rootRoughness: 0.68,
    rootMetalness: 0.08,
    moteSize: 0.11,
    moteUsesCollectible: true,
  },
  aurora: {
    roadScale: 2.62, leafWidth: 0.34, leafLength: 1.72, leafPower: 1.18, leafWave: 0.02,
    leafLengthVariance: 1.05, leafCount: 12, grassCount: 12, grassHeightVariance: 0.42,
    crownKind: 'crystal', bloomCount: 0, crownScale: 1.05, cloudPearl: '#eefaff', cloudOpacity: 0.24,
    rockMetalness: 0.12, capMetalness: 0.1, islandEmissive: 0.14, capEmissive: 0.15,
    rimEmissive: 0.18, rootCount: 4, rootThickness: 0.09, rootSegments: 6,
    rootRoughness: 0.48, rootMetalness: 0.16, moteSize: 0.12, moteUsesCollectible: true,
  },
  dinosaur: {
    roadScale: 2.55, leafWidth: 0.62, leafLength: 2.28, leafPower: 0.7, leafWave: 0.02,
    leafLengthVariance: 1.55, leafCount: 24, grassCount: 28, grassHeightVariance: 0.86,
    crownKind: 'bloom', bloomCount: 4, crownScale: 1.15, cloudPearl: '#e8f3dc', cloudOpacity: 0.19,
    rockMetalness: 0.01, capMetalness: 0.01, islandEmissive: 0.11, capEmissive: 0.1,
    rimEmissive: 0.14, rootCount: 7, rootThickness: 0.13, rootSegments: 6,
    rootRoughness: 0.88, rootMetalness: 0.01, moteSize: 0.11, moteUsesCollectible: false,
  },
  carnival: {
    roadScale: 2.68, leafWidth: 0.48, leafLength: 1.48, leafPower: 0.62, leafWave: 0.045,
    leafLengthVariance: 0.92, leafCount: 13, grassCount: 12, grassHeightVariance: 0.42,
    crownKind: 'toy', bloomCount: 0, crownScale: 1.04, cloudPearl: '#fff0f5', cloudOpacity: 0.22,
    rockMetalness: 0.04, capMetalness: 0.03, islandEmissive: 0.13, capEmissive: 0.12,
    rimEmissive: 0.16, rootCount: 4, rootThickness: 0.1, rootSegments: 5,
    rootRoughness: 0.64, rootMetalness: 0.08, moteSize: 0.13, moteUsesCollectible: true,
  },
  melody: {
    roadScale: 2.58, leafWidth: 0.43, leafLength: 1.76, leafPower: 0.78, leafWave: 0.055,
    leafLengthVariance: 1.12, leafCount: 16, grassCount: 18, grassHeightVariance: 0.54,
    crownKind: 'bloom', bloomCount: 3, crownScale: 1.0, cloudPearl: '#eaf2e8', cloudOpacity: 0.19,
    rockMetalness: 0.05, capMetalness: 0.04, islandEmissive: 0.11, capEmissive: 0.1,
    rimEmissive: 0.15, rootCount: 5, rootThickness: 0.1, rootSegments: 6,
    rootRoughness: 0.7, rootMetalness: 0.05, moteSize: 0.12, moteUsesCollectible: true,
  },
  spaceport: {
    roadScale: 2.72, leafWidth: 0.3, leafLength: 1.62, leafPower: 1.28, leafWave: 0.03,
    leafLengthVariance: 1.0, leafCount: 10, grassCount: 8, grassHeightVariance: 0.38,
    crownKind: 'prism', bloomCount: 0, crownScale: 1.06, cloudPearl: '#e5e6ff', cloudOpacity: 0.21,
    rockMetalness: 0.16, capMetalness: 0.14, islandEmissive: 0.16, capEmissive: 0.15,
    rimEmissive: 0.2, rootCount: 4, rootThickness: 0.08, rootSegments: 5,
    rootRoughness: 0.42, rootMetalness: 0.2, moteSize: 0.14, moteUsesCollectible: true,
  },
  storybook: {
    roadScale: 2.56, leafWidth: 0.5, leafLength: 1.66, leafPower: 0.68, leafWave: 0.035,
    leafLengthVariance: 1.08, leafCount: 17, grassCount: 17, grassHeightVariance: 0.5,
    crownKind: 'toy', bloomCount: 0, crownScale: 1.0, cloudPearl: '#f1e8dc', cloudOpacity: 0.2,
    rockMetalness: 0.02, capMetalness: 0.02, islandEmissive: 0.12, capEmissive: 0.11,
    rimEmissive: 0.15, rootCount: 5, rootThickness: 0.1, rootSegments: 6,
    rootRoughness: 0.72, rootMetalness: 0.04, moteSize: 0.11, moteUsesCollectible: false,
  },
} satisfies Record<ZoneId, ZoneRenderProfile>

const EMPTY_HITS: ReadonlySet<string> = new Set()
const NO_OBSTACLE_CONTACT = () => undefined
const UP = new THREE.Vector3(0, 1, 0)
const ACTIVE_ROAD_CHUNK_RADIUS = 2.35 / ROUTE_CHUNK_COUNT
const PINNED_ROAD_SPAN = 4 / ROUTE_CHUNK_COUNT
const ISLAND_VISIBLE_RADIUS = 0.075
const CLOUD_VISIBLE_RADIUS = 0.085
const ROADSIDE_VISIBLE_RADIUS = 0.052

function hash(value: number) {
  return Math.abs(Math.sin(value * 12.9898 + 78.233) * 43758.5453) % 1
}

function roadHalfWidth(t: number) {
  const blend = getZoneBlend(t)
  const from = ZONE_RENDER_PROFILES[blend.from.id]
  const to = ZONE_RENDER_PROFILES[blend.to.id]
  const roadScale = THREE.MathUtils.lerp(from.roadScale, to.roadScale, blend.amount)
  return (
    LANE_WIDTH * roadScale +
    Math.sin(t * Math.PI * 10.2) * 0.2 +
    Math.sin(t * Math.PI * 27.7 + 0.8) * 0.08
  )
}

function routeSurfacePoint(t: number, lateral: number, lift = 0) {
  const clamped = THREE.MathUtils.clamp(t, 0, 1)
  const frame = sampleRouteFrame(clamped)
  const edgeRuffle =
    Math.pow(Math.abs(lateral), 5) *
    (Math.sin(clamped * 108 + lateral * 3.1) * 0.12 +
      Math.sin(clamped * 41 - lateral) * 0.07)
  const crown = (1 - lateral * lateral) * 0.17
  return frame.position.clone()
    .addScaledVector(frame.right, lateral * (roadHalfWidth(clamped) + edgeRuffle))
    .addScaledVector(frame.up, crown + lift)
}

function buildRoadTopGeometry(start: number, end: number) {
  const lengthSegments = 36
  const widthSegments = 8
  const positions: number[] = []
  const colors: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const center = new THREE.Color()
  const edge = new THREE.Color()
  const working = new THREE.Color()

  for (let z = 0; z <= lengthSegments; z += 1) {
    const localT = z / lengthSegments
    const t = THREE.MathUtils.lerp(start, end, localT)
    const blend = getZoneBlend(t)
    blendColor(blend, 'roadCenter', center)
    blendColor(blend, 'roadEdge', edge)

    for (let x = 0; x <= widthSegments; x += 1) {
      const lateral = (x / widthSegments) * 2 - 1
      const point = routeSurfacePoint(t, lateral)
      point.addScaledVector(
        sampleRouteFrame(t).up,
        Math.sin(t * 510 + lateral * 7) * 0.025 +
          Math.sin(t * 178 - lateral * 11) * 0.032,
      )
      positions.push(point.x, point.y, point.z)

      const centerLight = 1 - Math.pow(Math.abs(lateral), 1.36)
      const mottling = (hash(z * 17.3 + x * 3.7 + start * 997) - 0.5) * 0.13
      working.copy(edge).lerp(center, 0.22 + centerLight * 0.72)
      working.offsetHSL(mottling * 0.08, mottling * 0.06, mottling * 0.16)
      colors.push(working.r, working.g, working.b)
      uvs.push(x / widthSegments, t * 30)
    }
  }

  for (let z = 0; z < lengthSegments; z += 1) {
    for (let x = 0; x < widthSegments; x += 1) {
      const row = widthSegments + 1
      const a = z * row + x
      const b = a + 1
      const c = a + row
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function buildRoadSkirtGeometry(start: number, end: number) {
  const segments = 36
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const upper = new THREE.Color()
  const lower = new THREE.Color()

  for (let index = 0; index <= segments; index += 1) {
    const t = THREE.MathUtils.lerp(start, end, index / segments)
    const blend = getZoneBlend(t)
    blendColor(blend, 'roadEdge', upper)
    blendColor(blend, 'rockBottom', lower)
    const leftTop = routeSurfacePoint(t, -1, -0.02)
    const rightTop = routeSurfacePoint(t, 1, -0.02)
    const frame = sampleRouteFrame(t)
    const thickness = 0.92 + Math.sin(t * Math.PI * 28) * 0.14
    const leftBottom = leftTop.clone().addScaledVector(frame.up, -thickness)
    const rightBottom = rightTop.clone().addScaledVector(frame.up, -thickness)

    ;[leftTop, leftBottom, rightTop, rightBottom].forEach((point, pointIndex) => {
      positions.push(point.x, point.y, point.z)
      const color = pointIndex % 2 === 0 ? upper : lower
      colors.push(color.r, color.g, color.b)
    })
  }

  for (let index = 0; index < segments; index += 1) {
    const a = index * 4
    const b = (index + 1) * 4
    indices.push(a, b, a + 1, b, b + 1, a + 1)
    indices.push(a + 2, a + 3, b + 2, b + 2, a + 3, b + 3)
    indices.push(a + 1, b + 1, a + 3, b + 1, b + 3, a + 3)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function buildRoadTextures() {
  const size = 512
  const colorCanvas = document.createElement('canvas')
  const bumpCanvas = document.createElement('canvas')
  colorCanvas.width = colorCanvas.height = size
  bumpCanvas.width = bumpCanvas.height = size
  const colorContext = colorCanvas.getContext('2d')!
  const bumpContext = bumpCanvas.getContext('2d')!
  const colorImage = colorContext.createImageData(size, size)
  const bumpImage = bumpContext.createImageData(size, size)
  let state = 0x6d2b79f5
  const random = () => {
    state = Math.imul(state ^ (state >>> 15), state | 1)
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61)
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4
      const broad = Math.sin(x * 0.043) * 4 + Math.sin(y * 0.029 + x * 0.012) * 6
      const fine = (random() - 0.5) * 20
      const value = THREE.MathUtils.clamp(214 + broad + fine, 170, 246)
      colorImage.data[index] = value
      colorImage.data[index + 1] = value * 1.01
      colorImage.data[index + 2] = value * 0.98
      colorImage.data[index + 3] = 255
      const height = THREE.MathUtils.clamp(142 + broad * 1.2 + fine * 1.8, 70, 225)
      bumpImage.data[index] = height
      bumpImage.data[index + 1] = height
      bumpImage.data[index + 2] = height
      bumpImage.data[index + 3] = 255
    }
  }
  colorContext.putImageData(colorImage, 0, 0)
  bumpContext.putImageData(bumpImage, 0, 0)
  colorContext.globalAlpha = 0.2
  colorContext.strokeStyle = '#eef0dc'
  colorContext.lineCap = 'round'
  for (let index = 0; index < 12; index += 1) {
    const y = (index / 12) * size + 18
    colorContext.lineWidth = index % 3 === 0 ? 2.1 : 0.9
    colorContext.beginPath()
    colorContext.moveTo(size * 0.5, y)
    colorContext.bezierCurveTo(size * 0.24, y + 34, size * 0.16, y + 54, -20, y + 80)
    colorContext.moveTo(size * 0.5, y)
    colorContext.bezierCurveTo(size * 0.76, y + 34, size * 0.84, y + 54, size + 20, y + 80)
    colorContext.stroke()
  }
  colorContext.globalAlpha = 1

  const colorMap = new THREE.CanvasTexture(colorCanvas)
  const bumpMap = new THREE.CanvasTexture(bumpCanvas)
  colorMap.colorSpace = THREE.SRGBColorSpace
  for (const texture of [colorMap, bumpMap]) {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = 8
    texture.needsUpdate = true
  }
  return { colorMap, bumpMap }
}

function makeEdgeVineCurve(side: -1 | 1, strand: number, start: number, end: number) {
  const points: THREE.Vector3[] = []
  const phase = (strand / 3) * Math.PI * 2
  for (let index = 0; index <= 46; index += 1) {
    const t = THREE.MathUtils.lerp(start, end, index / 46)
    const frame = sampleRouteFrame(t)
    const braid = Math.sin(t * Math.PI * 94 + phase)
    const overUnder = Math.cos(t * Math.PI * 94 + phase)
    points.push(
      frame.position
        .clone()
        .addScaledVector(frame.right, side * (roadHalfWidth(t) + 0.14) + braid * 0.25)
        .addScaledVector(frame.up, 0.23 + overUnder * 0.18),
    )
  }
  return new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.35)
}

function addTubeColors(
  geometry: THREE.BufferGeometry,
  start: number,
  end: number,
  firstKey: 'vineA' | 'glow',
  secondKey: 'vineB' | 'glow',
  bias: number,
) {
  const uv = geometry.getAttribute('uv')
  const position = geometry.getAttribute('position')
  const colors = new Float32Array(position.count * 3)
  const first = new THREE.Color()
  const second = new THREE.Color()
  const working = new THREE.Color()
  for (let index = 0; index < position.count; index += 1) {
    const along = uv ? uv.getX(index) : index / Math.max(1, position.count - 1)
    const blend = getZoneBlend(THREE.MathUtils.lerp(start, end, along))
    blendColor(blend, firstKey, first)
    blendColor(blend, secondKey, second)
    working.copy(first).lerp(second, bias)
    colors[index * 3] = working.r
    colors[index * 3 + 1] = working.g
    colors[index * 3 + 2] = working.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function buildMergedVines(start: number, end: number) {
  const geometries = ([-1, 1] as const).flatMap((side) =>
    [0, 1, 2].map((strand) =>
      addTubeColors(
        new THREE.TubeGeometry(
          makeEdgeVineCurve(side, strand, start, end),
          82,
          0.21 + strand * 0.035,
          7,
          false,
        ),
        start,
        end,
        'vineA',
        'vineB',
        strand / 3,
      ),
    ),
  )
  const merged = mergeGeometries(geometries, false)
  if (!merged) throw new Error('Unable to merge road edge vines')
  geometries.forEach((geometry) => geometry.dispose())
  return merged
}

function makeLengthVein(start: number, end: number, lateral: number, phase: number) {
  const points: THREE.Vector3[] = []
  for (let index = 0; index <= 34; index += 1) {
    const t = THREE.MathUtils.lerp(start, end, index / 34)
    const wavingLane = lateral + Math.sin(t * Math.PI * 13 + phase) * 0.045
    points.push(routeSurfacePoint(t, wavingLane, 0.052))
  }
  return new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.4)
}

function makeCrossVein(t: number, side: -1 | 1) {
  const points: THREE.Vector3[] = []
  for (let index = 0; index <= 7; index += 1) {
    const amount = index / 7
    const lateral = side * amount * 0.92
    const branchT = THREE.MathUtils.clamp(t + side * Math.sin(amount * Math.PI) * 0.0018, 0, 1)
    points.push(routeSurfacePoint(branchT, lateral, 0.051 + Math.sin(amount * Math.PI) * 0.014))
  }
  return new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.35)
}

function buildMergedVeins(start: number, end: number) {
  const geometries: THREE.BufferGeometry[] = [-0.62, 0, 0.62].map((lateral, index) =>
    addTubeColors(
      new THREE.TubeGeometry(makeLengthVein(start, end, lateral, index * 1.8), 66, index === 1 ? 0.035 : 0.023, 5, false),
      start,
      end,
      'glow',
      'glow',
      0,
    ),
  )
  for (let cross = 1; cross <= 3; cross += 1) {
    const t = THREE.MathUtils.lerp(start, end, cross / 4)
    for (const side of [-1, 1] as const) {
      geometries.push(
        addTubeColors(
          new THREE.TubeGeometry(makeCrossVein(t, side), 16, 0.017, 5, false),
          t,
          t,
          'glow',
          'glow',
          0,
        ),
      )
    }
  }
  const merged = mergeGeometries(geometries, false)
  if (!merged) throw new Error('Unable to merge road veins')
  geometries.forEach((geometry) => geometry.dispose())
  return merged
}

function RoadChunk({
  start,
  end,
  textures,
  paused,
}: {
  start: number
  end: number
  textures: ReturnType<typeof buildRoadTextures>
  paused?: boolean
}) {
  const glow = useRef<THREE.MeshBasicMaterial>(null)
  const top = useMemo(() => buildRoadTopGeometry(start, end), [end, start])
  const skirt = useMemo(() => buildRoadSkirtGeometry(start, end), [end, start])
  const vines = useMemo(() => buildMergedVines(start, end), [end, start])
  const veins = useMemo(() => buildMergedVeins(start, end), [end, start])
  const materialColors = useMemo(() => {
    const blend = getZoneBlend((start + end) * 0.5)
    return {
      road: blendColor(blend, 'roadEdge'),
      skirt: blendColor(blend, 'rockBottom'),
      vine: blendColor(blend, 'vineA'),
    }
  }, [end, start])

  useFrame(({ clock }) => {
    if (!paused && glow.current) glow.current.opacity = 0.18 + Math.sin(clock.elapsedTime * 1.15 + start * 18) * 0.04
  })

  return (
    <group>
      <mesh geometry={skirt} castShadow receiveShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.9}
          metalness={0.02}
          emissive={materialColors.skirt}
          emissiveIntensity={0.08}
        />
      </mesh>
      <mesh geometry={top} castShadow receiveShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.78}
          metalness={0.01}
          color="#ffffff"
          emissive={materialColors.road}
          emissiveIntensity={0.11}
          side={THREE.DoubleSide}
          map={textures.colorMap}
          bumpMap={textures.bumpMap}
          bumpScale={0.05}
        />
      </mesh>
      <mesh geometry={vines} castShadow receiveShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.74}
          metalness={0.02}
          emissive={materialColors.vine}
          emissiveIntensity={0.08}
        />
      </mesh>
      <mesh geometry={veins}>
        <meshBasicMaterial
          ref={glow}
          vertexColors
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

function LivingRoad({ progress, paused }: { progress: number; paused?: boolean }) {
  const textures = useMemo(buildRoadTextures, [])
  const chunks = useMemo(
    () =>
      Array.from({ length: ROUTE_CHUNK_COUNT }, (_, index) => ({
        start: index / ROUTE_CHUNK_COUNT,
        end: (index + 1) / ROUTE_CHUNK_COUNT,
        center: (index + 0.5) / ROUTE_CHUNK_COUNT,
      })),
    [],
  )

  useEffect(
    () => () => {
      textures.colorMap.dispose()
      textures.bumpMap.dispose()
    },
    [textures],
  )

  return (
    <group>
      {chunks.map((chunk) =>
        Math.abs(chunk.center - progress) <= ACTIVE_ROAD_CHUNK_RADIUS ||
        (progress < 0.04 && chunk.start < PINNED_ROAD_SPAN) ||
        (progress > 0.96 && chunk.end > 1 - PINNED_ROAD_SPAN) ? (
          <RoadChunk key={chunk.start} {...chunk} textures={textures} paused={paused} />
        ) : null,
      )}
    </group>
  )
}

function islandRadiusAt(angleIndex: number, radialSegments: number, seed: number) {
  const angle = (angleIndex / radialSegments) * Math.PI * 2
  return (
    1 +
    Math.sin(angle * 3 + seed * 0.7) * 0.1 +
    Math.sin(angle * 7 - seed * 1.3) * 0.05 +
    (hash(angleIndex * 3.1 + seed * 11) - 0.5) * 0.08
  )
}

function buildIslandGeometry(radius: number, depth: number, seed: number, zoneId: ZoneId) {
  const radialSegments = 19
  const profiles = [
    { y: 0, scale: 0.94 },
    { y: -0.42, scale: 1.04 },
    { y: -depth * 0.13, scale: 0.98 },
    { y: -depth * 0.3, scale: 0.82 },
    { y: -depth * 0.51, scale: 0.6 },
    { y: -depth * 0.76, scale: 0.34 },
    { y: -depth, scale: 0.08 },
  ]
  const positions: number[] = [0, 0.02, 0]
  const colors: number[] = []
  const indices: number[] = []
  const style = ZONE_VISUALS[zoneId]
  const top = new THREE.Color(style.rockTop)
  const bottom = new THREE.Color(style.rockBottom)
  const working = new THREE.Color()
  colors.push(top.r, top.g, top.b)

  profiles.forEach((profile, layer) => {
    for (let index = 0; index < radialSegments; index += 1) {
      const angle = (index / radialSegments) * Math.PI * 2
      const roughness = islandRadiusAt(index, radialSegments, seed)
      const verticalCrag = layer > 1 ? (hash(seed * 19 + index * 5 + layer) - 0.5) * 0.6 : 0
      const localRadius = radius * profile.scale * roughness
      positions.push(Math.cos(angle) * localRadius, profile.y + verticalCrag, Math.sin(angle) * localRadius)
      working.copy(top).lerp(bottom, layer / (profiles.length - 1))
      working.offsetHSL(0, 0, (hash(seed + index * 7.7 + layer) - 0.5) * 0.08)
      colors.push(working.r, working.g, working.b)
    }
  })

  for (let index = 0; index < radialSegments; index += 1) {
    indices.push(0, 1 + index, 1 + ((index + 1) % radialSegments))
  }
  for (let layer = 0; layer < profiles.length - 1; layer += 1) {
    const current = 1 + layer * radialSegments
    const next = current + radialSegments
    for (let index = 0; index < radialSegments; index += 1) {
      const following = (index + 1) % radialSegments
      indices.push(current + index, next + index, current + following)
      indices.push(current + following, next + index, next + following)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function buildIslandCapGeometry(radius: number, seed: number, zoneId: ZoneId) {
  const radialSegments = 19
  const positions: number[] = [0, 0.08, 0]
  const colors: number[] = []
  const indices: number[] = []
  const base = new THREE.Color(ZONE_VISUALS[zoneId].cap)
  colors.push(base.r, base.g, base.b)
  for (let index = 0; index < radialSegments; index += 1) {
    const angle = (index / radialSegments) * Math.PI * 2
    const localRadius = radius * 0.96 * islandRadiusAt(index, radialSegments, seed)
    positions.push(Math.cos(angle) * localRadius, 0, Math.sin(angle) * localRadius)
    const color = base.clone().offsetHSL(0, 0, (hash(seed * 4 + index) - 0.5) * 0.11)
    colors.push(color.r, color.g, color.b)
  }
  for (let index = 0; index < radialSegments; index += 1) {
    indices.push(0, 1 + ((index + 1) % radialSegments), 1 + index)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function buildIslandRimGeometry(radius: number, seed: number) {
  const segments = 28
  const points = Array.from({ length: segments }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2
    const ripple = islandRadiusAt(index, segments, seed) * radius * 0.96
    return new THREE.Vector3(
      Math.cos(angle) * ripple,
      0.2 + Math.sin(angle * 5 + seed) * 0.08,
      Math.sin(angle) * ripple,
    )
  })
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points, true, 'centripetal'),
    72,
    Math.max(0.11, radius * 0.018),
    6,
    true,
  )
}

function buildIslandStrataGeometry(radius: number, depth: number, seed: number) {
  const layers = [0.16, 0.34, 0.55]
  const geometries = layers.map((depthRatio, layerIndex) => {
    const segments = 20
    const scale = 0.98 - depthRatio * 0.65
    const points = Array.from({ length: segments }, (_, index) => {
      const angle = (index / segments) * Math.PI * 2
      const irregular = 1 + Math.sin(angle * (3 + layerIndex) + seed) * 0.055
      return new THREE.Vector3(
        Math.cos(angle) * radius * scale * irregular,
        -depth * depthRatio + Math.sin(angle * 5 + seed + layerIndex) * 0.12,
        Math.sin(angle) * radius * scale * irregular,
      )
    })
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points, true, 'centripetal'),
      52,
      0.045 + layerIndex * 0.012,
      5,
      true,
    )
  })
  const merged = mergeGeometries(geometries, false)
  if (!merged) throw new Error('Unable to merge island strata')
  geometries.forEach((geometry) => geometry.dispose())
  return merged
}

function buildLeafGeometry(zoneId: ZoneId) {
  const rows = 8
  const positions: number[] = []
  const indices: number[] = []
  const profile = ZONE_RENDER_PROFILES[zoneId]
  for (let index = 0; index <= rows; index += 1) {
    const t = index / rows
    const width = Math.pow(Math.sin(Math.PI * t), profile.leafPower) * profile.leafWidth
    const fanWave = Math.sin(t * Math.PI * 3) * profile.leafWave
    const camber = Math.sin(Math.PI * t) * 0.09 + fanWave
    positions.push(-width, camber, t * profile.leafLength)
    positions.push(width, camber, t * profile.leafLength)
  }
  for (let index = 0; index < rows; index += 1) {
    const a = index * 2
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function LeafCrown({ seed, radius, zoneId, count }: { seed: number; radius: number; zoneId: ZoneId; count: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => buildLeafGeometry(zoneId), [zoneId])
  const profile = ZONE_RENDER_PROFILES[zoneId]
  useLayoutEffect(() => {
    if (!mesh.current) return
    const dummy = new THREE.Object3D()
    const first = new THREE.Color(ZONE_VISUALS[zoneId].foliageA)
    const second = new THREE.Color(ZONE_VISUALS[zoneId].foliageB)
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + hash(seed * 9 + index) * 0.5
      const ring = radius * (0.32 + hash(seed * 3.7 + index * 5.1) * 0.57)
      dummy.position.set(Math.cos(angle) * ring, 0.18 + hash(seed * 7 + index * 1.8) * 0.35, Math.sin(angle) * ring)
      dummy.rotation.set(
        -0.08 - hash(seed + index * 8.2) * 0.36,
        angle - Math.PI / 2 + (hash(seed * 2 + index) - 0.5) * 0.42,
        (hash(seed * 13 + index * 2) - 0.5) * 0.2,
      )
      const length = 1.05 + hash(seed * 17 + index) * profile.leafLengthVariance
      dummy.scale.set(length * (0.72 + hash(seed + index * 4) * 0.35), length, length)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(index, dummy.matrix)
      mesh.current.setColorAt(index, first.clone().lerp(second, hash(seed * 23 + index) * 0.84))
    }
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
  }, [count, profile.leafLengthVariance, radius, seed, zoneId])

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]} castShadow receiveShadow>
      <meshStandardMaterial
        side={THREE.DoubleSide}
        roughness={0.68}
        metalness={profile.rootMetalness * 0.65}
        color="#ffffff"
        emissive={ZONE_VISUALS[zoneId].foliageA}
        emissiveIntensity={profile.rimEmissive}
      />
    </instancedMesh>
  )
}

function GrassTufts({
  seed,
  radius,
  zoneId,
}: {
  seed: number
  radius: number
  zoneId: ZoneId
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const profile = ZONE_RENDER_PROFILES[zoneId]
  const count = profile.grassCount
  useLayoutEffect(() => {
    if (!mesh.current) return
    const dummy = new THREE.Object3D()
    const first = new THREE.Color(ZONE_VISUALS[zoneId].foliageA)
    const second = new THREE.Color(ZONE_VISUALS[zoneId].foliageB)
    for (let index = 0; index < count; index += 1) {
      const angle = hash(seed * 8.4 + index * 2.7) * Math.PI * 2
      const distance = Math.sqrt(hash(seed * 2.1 + index * 5.3)) * radius * 0.82
      dummy.position.set(Math.cos(angle) * distance, 0.47, Math.sin(angle) * distance)
      dummy.rotation.set(
        (hash(seed + index * 4.7) - 0.5) * 0.24,
        angle,
        (hash(seed * 3.2 + index) - 0.5) * 0.28,
      )
      const height = 0.55 + hash(seed * 9.1 + index) * profile.grassHeightVariance
      dummy.scale.set(0.7 + hash(index) * 0.5, height, 0.7 + hash(index * 1.7) * 0.45)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(index, dummy.matrix)
      mesh.current.setColorAt(index, first.clone().lerp(second, hash(seed * 7 + index) * 0.8))
    }
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
  }, [count, profile.grassHeightVariance, radius, seed, zoneId])

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} castShadow>
      <coneGeometry args={[0.075, 0.72, 3, 1]} />
      <meshStandardMaterial
        color="#ffffff"
        roughness={0.78}
        metalness={0}
        emissive={ZONE_VISUALS[zoneId].foliageA}
        emissiveIntensity={0.1}
      />
    </instancedMesh>
  )
}

function BloomPatch({ seed, radius, zoneId, count = 3 }: { seed: number; radius: number; zoneId: ZoneId; count?: number }) {
  const petals = useRef<THREE.InstancedMesh>(null)
  const profile = ZONE_RENDER_PROFILES[zoneId]
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.bezierCurveTo(-0.32, 0.16, -0.38, 0.74, 0, 1.12)
    shape.bezierCurveTo(0.38, 0.74, 0.32, 0.16, 0, 0)
    const value = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.03, bevelSegments: 2 })
    value.center()
    value.translate(0, 0.5, 0)
    return value
  }, [])
  useLayoutEffect(() => {
    if (!petals.current) return
    const dummy = new THREE.Object3D()
    const spin = new THREE.Quaternion()
    const flatten = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
    const accent = new THREE.Color(ZONE_VISUALS[zoneId].accent)
    const glow = new THREE.Color(ZONE_VISUALS[zoneId].collectible)
    for (let bloom = 0; bloom < count; bloom += 1) {
      const bloomAngle = hash(seed * 41 + bloom * 9) * Math.PI * 2
      const bloomRadius = radius * (0.44 + hash(seed * 13 + bloom) * 0.4)
      const position = new THREE.Vector3(Math.cos(bloomAngle) * bloomRadius, 0.65, Math.sin(bloomAngle) * bloomRadius)
      for (let petal = 0; petal < 5; petal += 1) {
        const angle = (petal / 5) * Math.PI * 2
        spin.setFromAxisAngle(UP, angle)
        dummy.position.copy(position)
        dummy.quaternion.copy(spin).multiply(flatten)
        dummy.scale.setScalar(0.52 + hash(seed + bloom) * 0.24)
        dummy.updateMatrix()
        const instance = bloom * 5 + petal
        petals.current.setMatrixAt(instance, dummy.matrix)
        petals.current.setColorAt(instance, accent.clone().lerp(glow, hash(seed * 8 + instance) * 0.28))
      }
    }
    petals.current.instanceMatrix.needsUpdate = true
    if (petals.current.instanceColor) petals.current.instanceColor.needsUpdate = true
  }, [count, radius, seed, zoneId])
  return (
    <instancedMesh ref={petals} args={[geometry, undefined, count * 5]} castShadow>
      <meshStandardMaterial
        color="#ffffff"
        roughness={0.44}
        metalness={0.01}
        emissive={ZONE_VISUALS[zoneId].accent}
        emissiveIntensity={profile.rimEmissive}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  )
}

function CrystalSprouts({ seed, radius }: { seed: number; radius: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const count = 9
  useLayoutEffect(() => {
    if (!mesh.current) return
    const dummy = new THREE.Object3D()
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + seed
      const ring = radius * (0.35 + hash(seed + index) * 0.45)
      dummy.position.set(Math.cos(angle) * ring, 0.65, Math.sin(angle) * ring)
      dummy.rotation.set((hash(index) - 0.5) * 0.25, angle, (hash(index * 4) - 0.5) * 0.3)
      dummy.scale.setScalar(0.65 + hash(seed * 7 + index) * 0.7)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(index, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  }, [radius, seed])
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} castShadow>
      <coneGeometry args={[0.38, 1.8, 6, 2]} />
      <meshStandardMaterial color="#b9d7ed" emissive="#658fd1" emissiveIntensity={0.3} metalness={0.25} roughness={0.3} />
    </instancedMesh>
  )
}

function PrismSprouts({
  seed,
  radius,
  compact = false,
}: {
  seed: number
  radius: number
  compact?: boolean
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const count = compact ? 6 : 11
  useLayoutEffect(() => {
    if (!mesh.current) return
    const dummy = new THREE.Object3D()
    const palette = ['#ffe39a', '#7ee6dc', '#ff967d']
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + hash(seed + index) * 0.6
      const ring = radius * (0.26 + hash(seed * 3 + index) * 0.56)
      const height = (compact ? 0.65 : 0.9) + hash(seed * 9 + index) * (compact ? 0.55 : 1.2)
      dummy.position.set(Math.cos(angle) * ring, height * 0.82, Math.sin(angle) * ring)
      dummy.rotation.set((hash(index * 7) - 0.5) * 0.2, angle, (hash(index * 11) - 0.5) * 0.18)
      dummy.scale.set(0.55 + hash(index * 4) * 0.35, height, 0.55 + hash(index * 6) * 0.28)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(index, dummy.matrix)
      mesh.current.setColorAt(index, new THREE.Color(palette[index % palette.length]))
    }
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
  }, [compact, count, radius, seed])
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} castShadow>
      <coneGeometry args={[0.4, 1.8, 5, 1]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#7dcfc4"
        emissiveIntensity={0.22}
        metalness={0.08}
        roughness={0.24}
      />
    </instancedMesh>
  )
}

function ToyTownCrown({
  seed,
  radius,
  compact = false,
}: {
  seed: number
  radius: number
  compact?: boolean
}) {
  const blocks = useRef<THREE.InstancedMesh>(null)
  const wheels = useRef<THREE.InstancedMesh>(null)
  const count = compact ? 5 : 8
  useLayoutEffect(() => {
    if (!blocks.current || !wheels.current) return
    const dummy = new THREE.Object3D()
    const palette = ['#df6673', '#62aaa4', '#e7b763', '#7792c5']
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + hash(seed * 2 + index) * 0.5
      const ring = radius * (0.28 + hash(seed * 5 + index) * 0.5)
      const height = (compact ? 0.55 : 0.85) + hash(seed * 8 + index) * (compact ? 0.5 : 1.15)
      const position = new THREE.Vector3(Math.cos(angle) * ring, height * 0.55, Math.sin(angle) * ring)
      dummy.position.copy(position)
      dummy.rotation.set(0, angle + hash(index) * 0.28, (hash(seed + index) - 0.5) * 0.05)
      dummy.scale.set(0.75 + hash(index * 3) * 0.6, height, 0.72 + hash(index * 7) * 0.55)
      dummy.updateMatrix()
      blocks.current.setMatrixAt(index, dummy.matrix)
      blocks.current.setColorAt(index, new THREE.Color(palette[index % palette.length]))

      dummy.position.copy(position).add(new THREE.Vector3(Math.cos(angle) * 0.46, -height * 0.18, Math.sin(angle) * 0.46))
      dummy.rotation.set(Math.PI / 2, angle, 0)
      dummy.scale.setScalar(compact ? 0.36 : 0.48)
      dummy.updateMatrix()
      wheels.current.setMatrixAt(index, dummy.matrix)
      wheels.current.setColorAt(index, new THREE.Color(index % 2 ? '#f7d58c' : '#f2eee2'))
    }
    blocks.current.instanceMatrix.needsUpdate = true
    wheels.current.instanceMatrix.needsUpdate = true
    if (blocks.current.instanceColor) blocks.current.instanceColor.needsUpdate = true
    if (wheels.current.instanceColor) wheels.current.instanceColor.needsUpdate = true
  }, [compact, count, radius, seed])
  return (
    <group>
      <instancedMesh ref={blocks} args={[undefined, undefined, count]} castShadow>
        <boxGeometry args={[1, 1, 1, 1, 1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.68} metalness={0.02} />
      </instancedMesh>
      <instancedMesh ref={wheels} args={[undefined, undefined, count]} castShadow>
        <cylinderGeometry args={[1, 1, 0.32, 10, 1]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#8f6d4b"
          emissiveIntensity={0.12}
          roughness={0.42}
          metalness={0.16}
        />
      </instancedMesh>
    </group>
  )
}

function IslandCrown({
  seed,
  radius,
  zoneId,
  compact = false,
}: {
  seed: number
  radius: number
  zoneId: ZoneId
  compact?: boolean
}) {
  const profile = ZONE_RENDER_PROFILES[zoneId]
  switch (profile.crownKind) {
    case 'bloom':
      return (
        <BloomPatch
          seed={seed + 90}
          radius={radius * 0.78}
          zoneId={zoneId}
          count={compact ? 2 : profile.bloomCount}
        />
      )
    case 'crystal':
      return <CrystalSprouts seed={seed} radius={radius} />
    case 'prism':
      return <PrismSprouts seed={seed} radius={radius} compact={compact} />
    case 'toy':
      return <ToyTownCrown seed={seed} radius={radius} compact={compact} />
    default: {
      const unreachable: never = profile
      return unreachable
    }
  }
}

function UndersideDetails({ seed, radius, depth, zoneId }: { seed: number; radius: number; depth: number; zoneId: ZoneId }) {
  const profile = ZONE_RENDER_PROFILES[zoneId]
  const roots = useMemo(() => {
    const count = profile.rootCount
    return Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2 + hash(seed + index) * 0.5
      const edge = radius * (0.72 + hash(seed * 3 + index) * 0.25)
      const length = depth * (0.3 + hash(seed * 7 + index) * 0.52)
      const start = new THREE.Vector3(Math.cos(angle) * edge, -0.1, Math.sin(angle) * edge)
      return new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          start,
          start.clone().add(new THREE.Vector3(Math.sin(angle) * 0.7, -length * 0.35, Math.cos(angle) * 0.5)),
          start.clone().add(new THREE.Vector3(-Math.cos(angle) * 0.4, -length * 0.72, Math.sin(angle) * 0.5)),
          start.clone().add(new THREE.Vector3(Math.sin(seed + index) * 0.3, -length, Math.cos(seed - index) * 0.3)),
        ]),
        24,
        profile.rootThickness * (0.8 + hash(seed * 11 + index) * 0.4),
        profile.rootSegments,
        false,
      )
    })
  }, [depth, profile.rootCount, profile.rootSegments, profile.rootThickness, radius, seed])
  const style = ZONE_VISUALS[zoneId]
  return (
    <group>
      {roots.map((geometry, index) => (
        <mesh key={index} geometry={geometry} castShadow>
          <meshStandardMaterial
            color={profile.crownKind === 'crystal' ? style.rockTop : index % 2 ? style.vineA : style.vineB}
            roughness={profile.rootRoughness}
            metalness={profile.rootMetalness}
          />
        </mesh>
      ))}
    </group>
  )
}

const WATER_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const WATER_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float edge = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x);
    float threads = 0.5 + 0.5 * sin(vUv.x * 52.0 + vUv.y * 18.0 - uTime * 3.6);
    float flow = 0.5 + 0.5 * sin(vUv.y * 88.0 - uTime * 8.0 + sin(vUv.x * 17.0));
    float alpha = edge * mix(0.62, 0.28, vUv.y) * (0.22 + smoothstep(0.35, 0.9, threads * flow) * 0.48);
    gl_FragColor = vec4(mix(uColor, vec3(0.92, 1.0, 1.0), flow * 0.5), alpha);
  }
`

function Waterfall({ width, height, zoneId, paused }: { width: number; height: number; zoneId: ZoneId; paused?: boolean }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: WATER_VERTEX,
        fragmentShader: WATER_FRAGMENT,
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(ZONE_VISUALS[zoneId].glow) } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [zoneId],
  )
  const geometry = useMemo(() => {
    const value = new THREE.PlaneGeometry(width, height, 5, 28)
    value.translate(0, -height * 0.5, 0)
    const position = value.getAttribute('position') as THREE.BufferAttribute
    for (let index = 0; index < position.count; index += 1) {
      const y = position.getY(index)
      position.setZ(index, Math.sin(y * 0.7 + index) * 0.08)
    }
    value.computeVertexNormals()
    return value
  }, [height, width])
  useFrame((_, delta) => {
    if (!paused) material.uniforms.uTime.value += Math.min(delta, 0.05)
  })
  useEffect(() => () => material.dispose(), [material])
  return <mesh geometry={geometry} material={material} />
}

function FloatingIsland({ spec, paused }: { spec: IslandSpec; paused?: boolean }) {
  const rock = useMemo(() => buildIslandGeometry(spec.radius, spec.depth, spec.seed, spec.zoneId), [spec])
  const cap = useMemo(() => buildIslandCapGeometry(spec.radius, spec.seed, spec.zoneId), [spec])
  const rim = useMemo(() => buildIslandRimGeometry(spec.radius, spec.seed), [spec.radius, spec.seed])
  const strata = useMemo(
    () => buildIslandStrataGeometry(spec.radius, spec.depth, spec.seed),
    [spec.depth, spec.radius, spec.seed],
  )
  const waterfallX = -spec.pathSide * spec.radius * 0.82
  const style = ZONE_VISUALS[spec.zoneId]
  const profile = ZONE_RENDER_PROFILES[spec.zoneId]
  return (
    <group position={spec.position} rotation-y={spec.rotationY} scale={[1, 1, spec.stretch]}>
      <mesh geometry={rock} castShadow receiveShadow>
        <meshStandardMaterial
          vertexColors
          flatShading
          roughness={0.86}
          metalness={profile.rockMetalness}
          emissive={style.rockBottom}
          emissiveIntensity={profile.islandEmissive}
        />
      </mesh>
      <mesh geometry={cap} position-y={0.1} castShadow receiveShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.82}
          metalness={profile.capMetalness}
          emissive={style.cap}
          emissiveIntensity={profile.capEmissive}
        />
      </mesh>
      <mesh geometry={strata}>
        <meshStandardMaterial
          color={style.rockTop}
          emissive={style.rockBottom}
          emissiveIntensity={0.08}
          roughness={0.8}
          metalness={0.01}
        />
      </mesh>
      <mesh geometry={rim} castShadow>
        <meshStandardMaterial
          color={style.foliageB}
          emissive={style.cap}
          emissiveIntensity={profile.rimEmissive}
          roughness={0.88}
          metalness={0}
        />
      </mesh>
      <GrassTufts seed={spec.seed + 12} radius={spec.radius} zoneId={spec.zoneId} />
      <LeafCrown seed={spec.seed} radius={spec.radius} zoneId={spec.zoneId} count={profile.leafCount} />
      <IslandCrown seed={spec.seed} radius={spec.radius} zoneId={spec.zoneId} />
      <UndersideDetails seed={spec.seed + 20} radius={spec.radius} depth={spec.depth} zoneId={spec.zoneId} />
      {spec.waterfall && (
        <group position={[waterfallX, -0.15, spec.radius * 0.05]}>
          <Waterfall width={Math.max(2.3, spec.radius * 0.36)} height={spec.depth * 1.15} zoneId={spec.zoneId} paused={paused} />
        </group>
      )}
    </group>
  )
}

function makeIslandSpec(
  progress: number,
  side: -1 | 1,
  distance: number,
  yOffset: number,
  radius: number,
  depth: number,
  stretch: number,
  seed: number,
  waterfall = false,
): IslandSpec {
  const frame = sampleRouteFrame(progress)
  const position = frame.position.clone().addScaledVector(frame.right, side * distance).addScaledVector(frame.up, yOffset)
  return {
    progress,
    position: [position.x, position.y, position.z],
    rotationY: Math.atan2(-frame.right.z, frame.right.x),
    radius,
    depth,
    stretch,
    seed,
    zoneId: zoneIdAt(progress),
    pathSide: side,
    waterfall,
  }
}

function CloudCluster({ position, scale, seed, zoneId, paused }: { position: Vec3; scale: number; seed: number; zoneId: ZoneId; paused?: boolean }) {
  const group = useRef<THREE.Group>(null)
  const cloud = useRef<THREE.InstancedMesh>(null)
  const count = 9
  const profile = ZONE_RENDER_PROFILES[zoneId]
  useLayoutEffect(() => {
    if (!cloud.current) return
    const dummy = new THREE.Object3D()
    const pearl = new THREE.Color(profile.cloudPearl)
    const shade = new THREE.Color(ZONE_VISUALS[zoneId].fog)
    for (let index = 0; index < count; index += 1) {
      const angle = hash(seed * 5 + index * 4.7) * Math.PI * 2
      const radius = Math.pow(hash(seed * 8 + index * 2.1), 0.55) * 3.8
      dummy.position.set(Math.cos(angle) * radius, (hash(seed * 17 + index) - 0.45) * 2, Math.sin(angle) * radius * 0.52)
      dummy.rotation.set(hash(seed + index) * Math.PI, hash(seed * 2 + index) * Math.PI, hash(seed * 3 + index) * Math.PI)
      const puff = 1.35 + hash(seed * 19 + index) * 2.1
      dummy.scale.set(puff * (1.18 + hash(seed + index * 3) * 0.6), puff, puff * 0.82)
      dummy.updateMatrix()
      cloud.current.setMatrixAt(index, dummy.matrix)
      cloud.current.setColorAt(index, pearl.clone().lerp(shade, hash(seed * 23 + index) * 0.25))
    }
    cloud.current.instanceMatrix.needsUpdate = true
    if (cloud.current.instanceColor) cloud.current.instanceColor.needsUpdate = true
  }, [profile.cloudPearl, seed, zoneId])
  useFrame(({ clock }) => {
    if (!paused && group.current) {
      group.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.12 + seed) * 0.3
      group.current.rotation.y = Math.sin(clock.elapsedTime * 0.05 + seed) * 0.03
    }
  })
  return (
    <group ref={group} position={position} scale={scale}>
      <instancedMesh ref={cloud} args={[undefined, undefined, count]} renderOrder={-1}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={profile.cloudOpacity} depthWrite={false} />
      </instancedMesh>
    </group>
  )
}

function RoadsideCrown({ at, side, seed }: { at: number; side: -1 | 1; seed: number }) {
  const zoneId = zoneIdAt(at)
  const profile = ZONE_RENDER_PROFILES[zoneId]
  const anchor = useMemo(() => {
    const frame = sampleRouteFrame(at)
    const position = frame.position.clone().addScaledVector(frame.right, side * (roadHalfWidth(at) + 0.48)).addScaledVector(frame.up, 0.06)
    return { position: [position.x, position.y, position.z] as Vec3, yaw: Math.atan2(-frame.right.z, frame.right.x) }
  }, [at, side])
  const count = Math.max(5, Math.round(profile.leafCount * 0.5))
  return (
    <group position={anchor.position} rotation-y={anchor.yaw} scale={profile.crownScale}>
      <LeafCrown seed={seed} radius={2.2} zoneId={zoneId} count={count} />
      <IslandCrown seed={seed + 10} radius={1.7} zoneId={zoneId} compact />
    </group>
  )
}

const SKY_VERTEX = /* glsl */ `
  varying vec3 vPosition;
  void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uLow;
  varying vec3 vPosition;
  void main() {
    vec3 direction = normalize(vPosition);
    float horizon = smoothstep(-0.34, 0.42, direction.y);
    float zenith = smoothstep(0.18, 0.92, direction.y);
    float glow = pow(max(direction.x * 0.7 - direction.z * 0.22, 0.0), 3.0);
    vec3 color = mix(uLow, uHorizon, horizon);
    color = mix(color, uTop, zenith);
    color += uHorizon * glow * 0.16;
    gl_FragColor = vec4(color, 1.0);
  }
`

function SkyDome({ progress }: { progress: number }) {
  const mesh = useRef<THREE.Mesh>(null)
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERTEX,
        fragmentShader: SKY_FRAGMENT,
        uniforms: {
          uTop: { value: new THREE.Color(ZONE_VISUALS.garden.skyTop) },
          uHorizon: { value: new THREE.Color(ZONE_VISUALS.garden.skyHorizon) },
          uLow: { value: new THREE.Color(ZONE_VISUALS.garden.skyLow) },
        },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  )
  const camera = useThree((state) => state.camera)
  const target = useMemo(() => ({ top: new THREE.Color(), horizon: new THREE.Color(), low: new THREE.Color() }), [])
  useFrame((_, delta) => {
    if (mesh.current) mesh.current.position.copy(camera.position)
    const blend = getZoneBlend(progress)
    blendColor(blend, 'skyTop', target.top)
    blendColor(blend, 'skyHorizon', target.horizon)
    blendColor(blend, 'skyLow', target.low)
    const alpha = 1 - Math.exp(-delta * 3)
    material.uniforms.uTop.value.lerp(target.top, alpha)
    material.uniforms.uHorizon.value.lerp(target.horizon, alpha)
    material.uniforms.uLow.value.lerp(target.low, alpha)
  }, -40)
  useEffect(() => () => material.dispose(), [material])
  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={-100} material={material}>
      <sphereGeometry args={[245, 40, 24]} />
    </mesh>
  )
}

function AtmosphericMotes({ progress, paused }: { progress: number; paused?: boolean }) {
  const group = useRef<THREE.Group>(null)
  const material = useRef<THREE.PointsMaterial>(null)
  const geometry = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 220; index += 1) {
      const angle = hash(index * 5.77) * Math.PI * 2
      const radius = 4 + hash(index * 7.1) * 22
      positions.push(Math.cos(angle) * radius, (hash(index * 11.3) - 0.28) * 14, Math.sin(angle) * radius * 0.66)
    }
    const value = new THREE.BufferGeometry()
    value.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return value
  }, [])
  const targetColor = useMemo(() => new THREE.Color(), [])
  useFrame(({ clock }, delta) => {
    const frame = sampleRouteFrame(progress)
    if (group.current) {
      group.current.position.copy(frame.position).addScaledVector(frame.up, 3)
      if (!paused) group.current.rotation.y = Math.sin(clock.elapsedTime * 0.08) * 0.025
    }
    if (material.current) {
      const blend = getZoneBlend(progress)
      const profile = ZONE_RENDER_PROFILES[blend.from.id]
      blendColor(blend, profile.moteUsesCollectible ? 'collectible' : 'glow', targetColor)
      material.current.color.lerp(targetColor, 1 - Math.exp(-delta * 3))
      material.current.size = THREE.MathUtils.lerp(
        profile.moteSize,
        ZONE_RENDER_PROFILES[blend.to.id].moteSize,
        blend.amount,
      )
    }
  })
  return (
    <group ref={group}>
      <points geometry={geometry}>
        <pointsMaterial
          ref={material}
          size={0.1}
          color="#6eddc1"
          transparent
          opacity={0.72}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  )
}

export default function CloudglowWorld({
  progress,
  lane,
  onObstacleContact = NO_OBSTACLE_CONTACT,
  obstacleHitIds = EMPTY_HITS,
  paused = false,
}: CloudglowWorldProps) {
  const islands = useMemo<IslandSpec[]>(
    () => [
      makeIslandSpec(0.055, -1, 18, -2.2, 8.8, 14, 0.82, 3, true),
      makeIslandSpec(0.14, 1, 21, -4.2, 7.5, 13, 0.74, 8),
      makeIslandSpec(0.225, -1, 25, 1.2, 10.6, 18, 0.8, 14, true),
      makeIslandSpec(0.29, 1, 19, -1.4, 7.2, 14, 0.78, 22),
      makeIslandSpec(0.38, -1, 24, 2.4, 9.8, 18, 0.72, 31),
      makeIslandSpec(0.47, 1, 18, -2.1, 7.8, 16, 0.78, 40),
      makeIslandSpec(0.545, -1, 18, -1.1, 8.2, 14, 0.86, 49, true),
      makeIslandSpec(0.635, 1, 25, 1.8, 11.2, 19, 0.82, 57),
      makeIslandSpec(0.685, 1, 24, 0.4, 9.2, 16, 0.8, 62),
      makeIslandSpec(0.72, -1, 20, -3, 8.5, 16, 0.86, 66, true),
      makeIslandSpec(0.79, 1, 19, -1.2, 8.8, 17, 0.8, 74),
      makeIslandSpec(0.815, -1, 26, 1.6, 10.2, 18, 0.74, 78),
      makeIslandSpec(0.875, -1, 23, 2.2, 10.5, 20, 0.76, 82),
      makeIslandSpec(0.925, 1, 21, -1, 8.6, 16, 0.86, 87),
      makeIslandSpec(0.96, 1, 28, 4, 12.5, 23, 0.78, 91, true),
      makeIslandSpec(0.025, 1, 23, 1.2, 8.2, 15, 0.78, 96),
      makeIslandSpec(0.095, -1, 27, -3.6, 10.4, 19, 0.8, 101, true),
      makeIslandSpec(0.18, 1, 20, 2.5, 7.6, 14, 0.84, 106),
      makeIslandSpec(0.255, -1, 22, -1.8, 9.1, 17, 0.76, 111),
      makeIslandSpec(0.335, 1, 26, 3.2, 10.8, 20, 0.8, 116, true),
      makeIslandSpec(0.425, -1, 19, -2.7, 7.9, 15, 0.86, 121),
      makeIslandSpec(0.505, 1, 24, 1.6, 9.4, 18, 0.78, 126),
      makeIslandSpec(0.59, -1, 28, 3.8, 11.4, 21, 0.76, 131, true),
      makeIslandSpec(0.66, 1, 18, -2.2, 7.5, 14, 0.86, 136),
      makeIslandSpec(0.75, -1, 23, 1.4, 9.2, 17, 0.8, 141),
      makeIslandSpec(0.84, 1, 27, -3.4, 11.1, 20, 0.74, 146, true),
      makeIslandSpec(0.9, -1, 20, 2.6, 8.1, 15, 0.84, 151),
      makeIslandSpec(0.945, -1, 25, -1.5, 10.1, 19, 0.78, 156),
    ],
    [],
  )
  const clouds = useMemo(
    () =>
      Array.from({ length: 36 }, (_, index) => {
        const t = 0.018 + index * (0.965 / 35)
        const side = (index % 2 ? -1 : 1) as -1 | 1
        const frame = sampleRouteFrame(t)
        const point = frame.position.clone().addScaledVector(frame.right, side * (19 + (index % 3) * 4)).addScaledVector(frame.up, -10 - (index % 4) * 2)
        return {
          progress: t,
          position: [point.x, point.y, point.z] as Vec3,
          scale: 1.35 + (index % 4) * 0.23,
          seed: 110 + index * 7,
          zoneId: zoneIdAt(t),
        }
      }),
    [],
  )
  const roadside = useMemo(
    () =>
      Array.from({ length: 60 }, (_, index) => ({
        at: 0.012 + index * (0.976 / 59),
        side: (index % 2 ? -1 : 1) as -1 | 1,
        seed: 210 + index * 11,
      })),
    [],
  )
  const scene = useThree((state) => state.scene)
  const fog = useMemo(() => new THREE.Fog(ZONE_VISUALS.garden.fog, ZONE_VISUALS.garden.fogNear, ZONE_VISUALS.garden.fogFar), [])
  const fogColorTarget = useMemo(() => new THREE.Color(), [])

  useEffect(() => {
    const previousFog = scene.fog
    scene.fog = fog
    return () => {
      if (scene.fog === fog) scene.fog = previousFog
    }
  }, [fog, scene])

  useFrame((_, delta) => {
    const blend = getZoneBlend(progress)
    blendColor(blend, 'fog', fogColorTarget)
    fog.color.lerp(fogColorTarget, 1 - Math.exp(-delta * 3))
    fog.near = THREE.MathUtils.damp(fog.near, blendNumber(blend, 'fogNear'), 3, delta)
    fog.far = THREE.MathUtils.damp(fog.far, blendNumber(blend, 'fogFar'), 3, delta)
  }, -35)

  return (
    <group>
      <SkyDome progress={progress} />
      <LivingRoad progress={progress} paused={paused} />

      {roadside.map((detail) =>
        Math.abs(detail.at - progress) < ROADSIDE_VISIBLE_RADIUS ? <RoadsideCrown key={detail.seed} {...detail} /> : null,
      )}
      {islands.map((spec) =>
        Math.abs(spec.progress - progress) < ISLAND_VISIBLE_RADIUS ? <FloatingIsland key={spec.seed} spec={spec} paused={paused} /> : null,
      )}
      {clouds.map((cloud) =>
        Math.abs(cloud.progress - progress) < CLOUD_VISIBLE_RADIUS ? <CloudCluster key={cloud.seed} {...cloud} paused={paused} /> : null,
      )}

      <ZoneLandmarks progress={progress} paused={paused} />

      {WORLD_OBSTACLES.map((stop) =>
        Math.abs(stop.progress - progress) < 0.067 ? (
          <FriendlyObstacle
            key={stop.id}
            stop={stop}
            progress={progress}
            lane={lane}
            hit={obstacleHitIds.has(stop.id)}
            onContact={onObstacleContact}
            paused={paused}
          />
        ) : null,
      )}

      <AtmosphericMotes progress={progress} paused={paused} />
    </group>
  )
}
