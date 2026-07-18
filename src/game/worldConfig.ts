export type CloudglowLane = -1 | 0 | 1
export type SpeedMode = 'breeze' | 'adventure' | 'comet'
export type LearningMode = 'shapes' | 'math' | 'mixed'

export type ZoneId =
  | 'garden'
  | 'citadel'
  | 'reef'
  | 'jungle'
  | 'desert'
  | 'toytown'
  | 'aurora'
  | 'dinosaur'
  | 'carnival'
  | 'melody'
  | 'spaceport'
  | 'storybook'

export type ShapeId =
  | 'circle'
  | 'triangle'
  | 'square'
  | 'rectangle'
  | 'oval'
  | 'star'
  | 'heart'
  | 'semicircle'
  | 'pentagon'
  | 'hexagon'
  | 'octagon'
  | 'trapezium'
  | 'parallelogram'
  | 'kite'
  | 'crescent'
  | 'rhombus'
  | 'heptagon'
  | 'nonagon'
  | 'decagon'
  | 'sphere'
  | 'cube'
  | 'cone'
  | 'cylinder'
  | 'pyramid'
  | 'triangular-prism'

export type ShapeLevel = 'familiar' | 'advanced' | 'explorer'
export type ShapeDimension = '2d' | '3d'

export interface ShapeDefinition {
  id: ShapeId
  name: string
  spokenName?: string
  fact: string
  sides: number | null
  level: ShapeLevel
  dimension: ShapeDimension
  color: string
}

export const SHAPE_DEFINITIONS: Record<ShapeId, ShapeDefinition> = {
  circle: { id: 'circle', name: 'Circle', fact: 'Round all the way', sides: null, level: 'familiar', dimension: '2d', color: '#ffd66f' },
  triangle: { id: 'triangle', name: 'Triangle', fact: 'Three straight sides', sides: 3, level: 'familiar', dimension: '2d', color: '#ff91ad' },
  square: { id: 'square', name: 'Square', fact: 'Four equal sides', sides: 4, level: 'familiar', dimension: '2d', color: '#7edfc2' },
  rectangle: { id: 'rectangle', name: 'Rectangle', fact: 'Four square corners', sides: 4, level: 'familiar', dimension: '2d', color: '#85b9ff' },
  oval: { id: 'oval', name: 'Oval', fact: 'A stretched circle', sides: null, level: 'familiar', dimension: '2d', color: '#d8a4ff' },
  star: { id: 'star', name: 'Star', fact: 'Five bright points', sides: null, level: 'familiar', dimension: '2d', color: '#ffe783' },
  heart: { id: 'heart', name: 'Heart', fact: 'Two curves and a point', sides: null, level: 'familiar', dimension: '2d', color: '#ff91c2' },
  semicircle: { id: 'semicircle', name: 'Semicircle', fact: 'Half of a circle', sides: 2, level: 'familiar', dimension: '2d', color: '#8dd9ff' },
  pentagon: { id: 'pentagon', name: 'Pentagon', fact: 'Five straight sides', sides: 5, level: 'advanced', dimension: '2d', color: '#a9e47d' },
  hexagon: { id: 'hexagon', name: 'Hexagon', fact: 'Six straight sides', sides: 6, level: 'advanced', dimension: '2d', color: '#ffad72' },
  octagon: { id: 'octagon', name: 'Octagon', fact: 'Eight straight sides', sides: 8, level: 'advanced', dimension: '2d', color: '#f58cae' },
  trapezium: { id: 'trapezium', name: 'Trapezium', fact: 'One pair of parallel sides', sides: 4, level: 'advanced', dimension: '2d', color: '#b6a1ff' },
  parallelogram: { id: 'parallelogram', name: 'Parallelogram', fact: 'Two pairs of parallel sides', sides: 4, level: 'advanced', dimension: '2d', color: '#74d9b5' },
  kite: { id: 'kite', name: 'Kite', fact: 'Two pairs of touching equal sides', sides: 4, level: 'advanced', dimension: '2d', color: '#ffb4d2' },
  crescent: { id: 'crescent', name: 'Crescent', fact: 'A curved moon shape', sides: null, level: 'advanced', dimension: '2d', color: '#a8c7ff' },
  rhombus: { id: 'rhombus', name: 'Rhombus', spokenName: 'Rhombus, sometimes called a diamond', fact: 'Four equal slanting sides', sides: 4, level: 'advanced', dimension: '2d', color: '#71e6ed' },
  heptagon: { id: 'heptagon', name: 'Heptagon', fact: 'Seven straight sides', sides: 7, level: 'explorer', dimension: '2d', color: '#f5a7d5' },
  nonagon: { id: 'nonagon', name: 'Nonagon', fact: 'Nine straight sides', sides: 9, level: 'explorer', dimension: '2d', color: '#97d8ff' },
  decagon: { id: 'decagon', name: 'Decagon', fact: 'Ten straight sides', sides: 10, level: 'explorer', dimension: '2d', color: '#b9ed86' },
  sphere: { id: 'sphere', name: 'Sphere', fact: 'A round 3D shape with no edges', sides: null, level: 'explorer', dimension: '3d', color: '#ffcf70' },
  cube: { id: 'cube', name: 'Cube', fact: 'Six equal square faces', sides: null, level: 'explorer', dimension: '3d', color: '#7ee0c5' },
  cone: { id: 'cone', name: 'Cone', fact: 'A round base and one point', sides: null, level: 'explorer', dimension: '3d', color: '#ff9cb8' },
  cylinder: { id: 'cylinder', name: 'Cylinder', fact: 'Two round faces and one curved surface', sides: null, level: 'explorer', dimension: '3d', color: '#86bcff' },
  pyramid: { id: 'pyramid', name: 'Pyramid', fact: 'Triangle faces meet at one point', sides: null, level: 'explorer', dimension: '3d', color: '#d6a8ff' },
  'triangular-prism': { id: 'triangular-prism', name: 'Triangular Prism', fact: 'Two triangle faces and three rectangle faces', sides: null, level: 'explorer', dimension: '3d', color: '#83e6e7' },
}

export const SHAPE_POOLS = {
  familiar: ['circle', 'triangle', 'square', 'rectangle', 'oval', 'star', 'heart', 'semicircle'],
  advanced: ['pentagon', 'hexagon', 'octagon', 'trapezium', 'parallelogram', 'kite', 'crescent', 'rhombus'],
  explorer: ['heptagon', 'nonagon', 'decagon', 'sphere', 'cube', 'cone', 'cylinder', 'pyramid', 'triangular-prism'],
} as const satisfies Record<ShapeLevel, readonly ShapeId[]>

export interface ZoneDefinition {
  id: ZoneId
  name: string
  shortName: string
  start: number
  end: number
  learning: string
  soundscape: string
}

const ZONE_SPAN = 1 / 12

function realm(
  index: number,
  id: ZoneId,
  name: string,
  shortName: string,
  learning: string,
  soundscape: string,
): ZoneDefinition {
  return {
    id,
    name,
    shortName,
    start: index * ZONE_SPAN,
    end: index === 11 ? 1 : (index + 1) * ZONE_SPAN,
    learning,
    soundscape,
  }
}

export const ZONES: readonly ZoneDefinition[] = [
  realm(0, 'garden', 'Cloudglow Garden', 'Sky Garden', 'First sky discoveries', 'Harp, birds and pollen bells'),
  realm(1, 'citadel', 'Starwind Citadel', 'Air Castle', 'Castle cloud puzzles', 'Celesta, wind chimes and airy choir'),
  realm(2, 'reef', 'Lantern Reef', 'Underwater', 'Coral-light discoveries', 'Bubbles, coral clicks and soft water song'),
  realm(3, 'jungle', 'Moonvine Wilds', 'Glow Jungle', 'Bright jungle puzzles', 'Rain, handpan and luminous insects'),
  realm(4, 'desert', 'Sunbeam Prism Desert', 'Prism Desert', 'Crystal trail discoveries', 'Glass marimba, warm wind and crystal shimmer'),
  realm(5, 'toytown', 'Clockwork Toy Town', 'Toy Town', 'Playroom puzzles', 'Toy piano, wooden clicks and friendly brass'),
  realm(6, 'aurora', 'Aurora Snowglobe', 'Snowglobe', 'Snowflake discoveries', 'Sleigh bells, soft strings and crystal taps'),
  realm(7, 'dinosaur', 'Dinosaur Fern Valley', 'Dino Valley', 'Fossil trail puzzles', 'Wood flutes, friendly stomps and fern rustles'),
  realm(8, 'carnival', 'Candy Cloud Carnival', 'Candy Carnival', 'Carousel discoveries', 'Calliope, handclaps and candy chimes'),
  realm(9, 'melody', 'Melody Mountain', 'Music Mountain', 'Musical path puzzles', 'Marimba, drums and dancing brass'),
  realm(10, 'spaceport', 'Bubble Planet Spaceport', 'Spaceport', 'Planet-hop discoveries', 'Sparkle synth, bubble pops and tiny rockets'),
  realm(11, 'storybook', 'Storybook Harbor', 'Book Harbor', 'Grand storybook review', 'Pizzicato strings, page turns and warm horns'),
]

export const ZONE_COUNT = ZONES.length
export const ZONE_IDS: readonly ZoneId[] = ZONES.map((zone) => zone.id)
export const ZONE_TRANSITIONS: readonly number[] = ZONES.slice(1).map((zone) => zone.start)

/** The playable endpoint leaves a tiny curve guard-band for stable tangents. */
export const ROUTE_END_PROGRESS = 0.995

export const SPEED_MODES = {
  breeze: {
    id: 'breeze', name: 'Soft Breeze', description: 'Gentle, roomy and easy to explore', multiplier: 0.95,
    icon: 'leaf', launchFloor: 0.68, collectibleFloor: 0.72, finaleFloor: 0.72,
    bloomFactor: 0.66, obstacleFactor: 0.66, easeSeconds: 1.25,
  },
  adventure: {
    id: 'adventure', name: 'Adventure', description: 'Quick, lively and full of wonder', multiplier: 1.98375,
    icon: 'wing', launchFloor: 0.78, collectibleFloor: 0.84, finaleFloor: 0.8,
    bloomFactor: 0.78, obstacleFactor: 0.72, easeSeconds: 0.85,
  },
  comet: {
    id: 'comet', name: 'Comet', description: 'A fast, sparkling sky dash', multiplier: 3.174,
    icon: 'star', launchFloor: 0.9, collectibleFloor: 0.91, finaleFloor: 0.91,
    bloomFactor: 0.9, obstacleFactor: 0.82, easeSeconds: 0.45,
  },
} as const satisfies Record<SpeedMode, {
  id: SpeedMode
  name: string
  description: string
  multiplier: number
  icon: 'leaf' | 'wing' | 'star'
  launchFloor: number
  collectibleFloor: number
  finaleFloor: number
  bloomFactor: number
  obstacleFactor: number
  easeSeconds: number
}>

/** Twelve physical realms: exactly twice the authored six-realm journey. */
export const BASE_JOURNEY_SECONDS = 690

export type ObstacleKind =
  | 'puffbug'
  | 'leaf-gate'
  | 'cloud-sheep'
  | 'bell-ribbon'
  | 'bubble-jelly'
  | 'clam-puff'
  | 'curling-vine'
  | 'seedpod'
  | 'tumble-star'
  | 'prism-whirl'
  | 'toy-blocks'
  | 'bubble-train'

export interface ObstacleStop {
  id: string
  progress: number
  lane: CloudglowLane
  zoneId: ZoneId
  kind: ObstacleKind
}

const OBSTACLE_KINDS: readonly ObstacleKind[] = [
  'puffbug', 'leaf-gate', 'cloud-sheep', 'bell-ribbon', 'bubble-jelly', 'clam-puff',
  'curling-vine', 'seedpod', 'tumble-star', 'prism-whirl', 'toy-blocks', 'bubble-train',
]
const OBSTACLE_LANES: readonly CloudglowLane[] = [1, -1, 0, 1, -1, 0, 1, -1, 1, -1, 0, 1]

export const WORLD_OBSTACLES: readonly ObstacleStop[] = ZONES.flatMap((zone, zoneIndex) => {
  const localStops = zone.id === 'storybook' ? ([0.22, 0.42] as const) : ([0.37, 0.66] as const)
  return localStops.map((local, localIndex) => ({
    id: `${zone.id}-${localIndex ? 'trail-friend' : 'path-friend'}`,
    progress: zone.start + (zone.end - zone.start) * local,
    lane: OBSTACLE_LANES[(zoneIndex * 2 + localIndex) % OBSTACLE_LANES.length],
    zoneId: zone.id,
    kind: OBSTACLE_KINDS[(zoneIndex * 2 + localIndex) % OBSTACLE_KINDS.length],
  }))
})

export function getZone(progress: number): ZoneDefinition {
  const clamped = Math.min(0.999_999, Math.max(0, progress))
  return ZONES.find((zone) => clamped >= zone.start && clamped < zone.end) ?? ZONES[ZONES.length - 1]
}

export function getZoneProgress(progress: number): number {
  const zone = getZone(progress)
  return Math.min(1, Math.max(0, (progress - zone.start) / (zone.end - zone.start)))
}

export function getZoneIndex(progress: number): number {
  return ZONES.findIndex((zone) => zone.id === getZone(progress).id)
}

export function getZoneById(id: ZoneId): ZoneDefinition {
  return ZONES.find((zone) => zone.id === id) ?? ZONES[0]
}

export function zoneLocalToWorld(zoneId: ZoneId, localProgress: number): number {
  const zone = getZoneById(zoneId)
  return zone.start + Math.min(1, Math.max(0, localProgress)) * (zone.end - zone.start)
}

/** Storybook's learning finishes before Rae crests the long homeward hill. */
export const HOMEWARD_DESCENT_START = zoneLocalToWorld('storybook', 0.54)
export const HOME_MEADOW_REVEAL_START = zoneLocalToWorld('storybook', 0.66)
export const HOME_MEADOW_LANDING_START = zoneLocalToWorld('storybook', 0.82)
