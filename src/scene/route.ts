import * as THREE from 'three'
import { WORLD_COLLECTIBLES } from '../game/learningCurriculum'
import { ZONE_COUNT } from '../game/worldConfig'

/**
 * One continuous, arc-length sampled climb through all twelve realms. Each realm
 * is deliberately similar in physical length so the authoritative worldConfig
 * boundaries line up with authored landmarks without speed discontinuities.
 */
const ROUTE_POINTS = [
  // Cloudglow Garden — a gentle rising garden path.
  new THREE.Vector3(0, 0, 8),
  new THREE.Vector3(1.2, 0.8, -10),
  new THREE.Vector3(-2.8, 2.4, -28),
  new THREE.Vector3(4.8, 5.2, -46),
  new THREE.Vector3(9.2, 9.2, -64),
  new THREE.Vector3(3.5, 14.6, -82),
  new THREE.Vector3(-7.5, 20.2, -100),

  // Starwind Citadel — taller, confident arcs between floating towers.
  new THREE.Vector3(-12.2, 27.2, -118),
  new THREE.Vector3(-5.4, 36.5, -136),
  new THREE.Vector3(8.8, 47.8, -154),
  new THREE.Vector3(14.4, 57.4, -172),
  new THREE.Vector3(6.2, 64.8, -190),
  new THREE.Vector3(-9.8, 68.6, -208),

  // Lantern Reef — a slow dive through a cloud-ocean trench.
  new THREE.Vector3(-15.2, 64.1, -226),
  new THREE.Vector3(-8.4, 56.4, -244),
  new THREE.Vector3(7.5, 46.1, -262),
  new THREE.Vector3(14.7, 35.3, -280),
  new THREE.Vector3(6.1, 25.8, -298),
  new THREE.Vector3(-9.2, 20.4, -316),

  // Moonvine Wilds — an upward moonlit sweep to the final bloom.
  new THREE.Vector3(-14.8, 21.8, -334),
  new THREE.Vector3(-8.2, 25.7, -352),
  new THREE.Vector3(6.9, 31.2, -370),
  new THREE.Vector3(13.5, 36.4, -388),
  new THREE.Vector3(5.4, 42.3, -406),
  new THREE.Vector3(-8.4, 49.2, -424),

  // Sunbeam Prism Desert — a wide sunrise glide over crystalline dune mesas.
  new THREE.Vector3(-14.6, 54.8, -442),
  new THREE.Vector3(-5.2, 60.4, -460),
  new THREE.Vector3(9.8, 64.2, -478),
  new THREE.Vector3(15.4, 61, -496),
  new THREE.Vector3(7, 55.2, -514),
  new THREE.Vector3(-10.2, 52, -532),

  // Clockwork Toy Town — a buoyant final climb into the music-box skyline.
  new THREE.Vector3(-15, 53, -550),
  new THREE.Vector3(-8, 59.5, -568),
  new THREE.Vector3(6.8, 67, -586),
  new THREE.Vector3(14, 74, -604),
  new THREE.Vector3(6, 80.8, -622),
  new THREE.Vector3(-7.2, 86, -640),

  // Aurora Snowglobe — crystalline switchbacks climbing into pastel snowlight.
  new THREE.Vector3(-14.4, 92, -658),
  new THREE.Vector3(-8, 101, -676),
  new THREE.Vector3(6.8, 112, -694),
  new THREE.Vector3(14.8, 118, -712),
  new THREE.Vector3(7.2, 121, -730),
  new THREE.Vector3(-8.8, 118, -748),

  // Dinosaur Fern Valley — a broad friendly descent through giant fronds.
  new THREE.Vector3(-15, 111, -766),
  new THREE.Vector3(-7.4, 103, -784),
  new THREE.Vector3(7.8, 96, -802),
  new THREE.Vector3(15.2, 91, -820),
  new THREE.Vector3(6.4, 89, -838),
  new THREE.Vector3(-9.6, 93, -856),

  // Candy Cloud Carnival — buoyant carousel loops over sherbet islands.
  new THREE.Vector3(-15.4, 100, -874),
  new THREE.Vector3(-7.2, 110, -892),
  new THREE.Vector3(8.4, 120, -910),
  new THREE.Vector3(15.7, 126, -928),
  new THREE.Vector3(7.1, 132, -946),
  new THREE.Vector3(-9.4, 136, -964),

  // Melody Mountain — rolling musical rises with a confident summit.
  new THREE.Vector3(-15.2, 139, -982),
  new THREE.Vector3(-7.8, 146, -1000),
  new THREE.Vector3(7.2, 154, -1018),
  new THREE.Vector3(14.6, 159, -1036),
  new THREE.Vector3(6.5, 166, -1054),
  new THREE.Vector3(-9, 172, -1072),

  // Bubble Planet Spaceport — a weightless launch between bright planets.
  new THREE.Vector3(-15, 180, -1090),
  new THREE.Vector3(-7, 191, -1108),
  new THREE.Vector3(8.2, 205, -1126),
  new THREE.Vector3(15.5, 219, -1144),
  new THREE.Vector3(7.4, 230, -1162),
  new THREE.Vector3(-9.2, 238, -1180),

  // Storybook Harbor — a warm final glide toward the great open book.
  new THREE.Vector3(-15.1, 241, -1198),
  new THREE.Vector3(-7.2, 238, -1216),
  new THREE.Vector3(8, 232, -1234),
  new THREE.Vector3(15.2, 226, -1252),
  new THREE.Vector3(6.8, 223, -1270),
  new THREE.Vector3(-7.6, 226, -1288),
] as const

export const CLOUDLIFT_ROUTE = new THREE.CatmullRomCurve3(
  [...ROUTE_POINTS],
  false,
  'centripetal',
  0.42,
)

export const ROUTE_LENGTH = CLOUDLIFT_ROUTE.getLength()
export const LANE_WIDTH = 2.15
/** Four independently culled road chunks per realm. */
export const ROUTE_CHUNK_COUNT = ZONE_COUNT * 4

const UP = new THREE.Vector3(0, 1, 0)
const scratchTangent = new THREE.Vector3()
const scratchRight = new THREE.Vector3()

export function sampleRoute(progress: number, lane = 0, target = new THREE.Vector3()) {
  const t = THREE.MathUtils.clamp(progress, 0, 0.995)
  CLOUDLIFT_ROUTE.getPointAt(t, target)
  CLOUDLIFT_ROUTE.getTangentAt(t, scratchTangent).normalize()
  scratchRight.crossVectors(scratchTangent, UP).normalize()
  target.addScaledVector(scratchRight, lane * LANE_WIDTH)
  return target
}

export function sampleRouteFrame(progress: number) {
  const t = THREE.MathUtils.clamp(progress, 0, 0.995)
  const position = CLOUDLIFT_ROUTE.getPointAt(t)
  const tangent = CLOUDLIFT_ROUTE.getTangentAt(t).normalize()
  const right = new THREE.Vector3().crossVectors(tangent, UP).normalize()
  const up = new THREE.Vector3().crossVectors(right, tangent).normalize()
  return { position, tangent, right, up }
}

/** Compatibility alias. worldConfig remains the locked source of truth. */
export const COLLECTIBLE_STOPS = WORLD_COLLECTIBLES
