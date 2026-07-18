import * as THREE from 'three'
import { getZone, ZONES, ZONE_COUNT, type ZoneId } from '../../game/worldConfig'

export type ZoneVisual = {
  id: ZoneId
  skyTop: string
  skyHorizon: string
  skyLow: string
  fog: string
  hemiSky: string
  hemiGround: string
  key: string
  fill: string
  roadCenter: string
  roadEdge: string
  vineA: string
  vineB: string
  glow: string
  rockTop: string
  rockBottom: string
  cap: string
  foliageA: string
  foliageB: string
  accent: string
  collectible: string
  fogNear: number
  fogFar: number
  sunIntensity: number
  ambientIntensity: number
  hemiIntensity: number
  fillIntensity: number
  rimIntensity: number
  accentIntensity: number
}

/** Presentation order follows the authoritative gameplay realm configuration. */
export const ZONE_ORDER: readonly ZoneId[] = ZONES.map((zone) => zone.id)

export const ZONE_VISUALS: Record<ZoneId, ZoneVisual> = {
  garden: {
    id: 'garden',
    skyTop: '#8d83bd',
    skyHorizon: '#f8cbb2',
    skyLow: '#6f929d',
    fog: '#9aadb7',
    hemiSky: '#ffe1c2',
    hemiGround: '#355e58',
    key: '#ffe2b5',
    fill: '#aae8d7',
    roadCenter: '#7e9668',
    roadEdge: '#516b53',
    vineA: '#4a7152',
    vineB: '#759064',
    glow: '#8aefd1',
    rockTop: '#727d7c',
    rockBottom: '#445360',
    cap: '#6f8d6c',
    foliageA: '#2c6258',
    foliageB: '#78956a',
    accent: '#e594b5',
    collectible: '#ffdc82',
    fogNear: 112,
    fogFar: 282,
    sunIntensity: 2.42,
    ambientIntensity: 0.56,
    hemiIntensity: 0.92,
    fillIntensity: 0.72,
    rimIntensity: 0.58,
    accentIntensity: 1.7,
  },
  citadel: {
    id: 'citadel',
    skyTop: '#243b79',
    skyHorizon: '#c5c5ec',
    skyLow: '#314565',
    fog: '#7183aa',
    hemiSky: '#d9dcff',
    hemiGround: '#24314d',
    key: '#f1e7ff',
    fill: '#82ccff',
    roadCenter: '#7686a7',
    roadEdge: '#4a5e82',
    vineA: '#405b87',
    vineB: '#7287ae',
    glow: '#b7edff',
    rockTop: '#65758d',
    rockBottom: '#3c4967',
    cap: '#7f8da9',
    foliageA: '#536da0',
    foliageB: '#bed9e8',
    accent: '#d9b6ff',
    collectible: '#fff0a2',
    fogNear: 118,
    fogFar: 282,
    sunIntensity: 2.25,
    ambientIntensity: 0.38,
    hemiIntensity: 0.76,
    fillIntensity: 0.55,
    rimIntensity: 0.52,
    accentIntensity: 1.8,
  },
  reef: {
    id: 'reef',
    skyTop: '#073c5c',
    skyHorizon: '#27a4a8',
    skyLow: '#0b3148',
    fog: '#236f7f',
    hemiSky: '#76ddd1',
    hemiGround: '#082b3d',
    key: '#a5f1dc',
    fill: '#55a9d8',
    roadCenter: '#2b6870',
    roadEdge: '#285d65',
    vineA: '#1f5960',
    vineB: '#3c8780',
    glow: '#62ffe2',
    rockTop: '#37676e',
    rockBottom: '#244d58',
    cap: '#31746f',
    foliageA: '#c95f79',
    foliageB: '#f1a86e',
    accent: '#ffd27c',
    collectible: '#fff4cf',
    fogNear: 82,
    fogFar: 230,
    sunIntensity: 1.72,
    ambientIntensity: 0.52,
    hemiIntensity: 0.88,
    fillIntensity: 0.6,
    rimIntensity: 0.38,
    accentIntensity: 2.1,
  },
  jungle: {
    id: 'jungle',
    skyTop: '#6578bc',
    skyHorizon: '#b9d9c4',
    skyLow: '#4f8792',
    fog: '#82a9a2',
    hemiSky: '#dbe5ff',
    hemiGround: '#36645b',
    key: '#fff0ca',
    fill: '#90f0c8',
    roadCenter: '#6f9363',
    roadEdge: '#476c55',
    vineA: '#3e735c',
    vineB: '#79a86c',
    glow: '#9effd5',
    rockTop: '#738c7b',
    rockBottom: '#4c6870',
    cap: '#6f9967',
    foliageA: '#397967',
    foliageB: '#8fb979',
    accent: '#d6a5ef',
    collectible: '#c9ffe0',
    fogNear: 94,
    fogFar: 252,
    sunIntensity: 1.76,
    ambientIntensity: 0.41,
    hemiIntensity: 0.72,
    fillIntensity: 0.54,
    rimIntensity: 0.48,
    accentIntensity: 2.5,
  },
  desert: {
    id: 'desert',
    skyTop: '#78b8d4',
    skyHorizon: '#ffd6a2',
    skyLow: '#d78f86',
    fog: '#ddb28f',
    hemiSky: '#fff0c9',
    hemiGround: '#76564f',
    key: '#fff0b8',
    fill: '#9fe4df',
    roadCenter: '#d8ae72',
    roadEdge: '#a9765b',
    vineA: '#ae7156',
    vineB: '#dfb86f',
    glow: '#81e8df',
    rockTop: '#d8946c',
    rockBottom: '#855968',
    cap: '#e8c47f',
    foliageA: '#55a68b',
    foliageB: '#b9cf72',
    accent: '#ff8f77',
    collectible: '#fff1a5',
    fogNear: 108,
    fogFar: 282,
    sunIntensity: 2.52,
    ambientIntensity: 0.58,
    hemiIntensity: 0.98,
    fillIntensity: 0.72,
    rimIntensity: 0.55,
    accentIntensity: 1.75,
  },
  toytown: {
    id: 'toytown',
    skyTop: '#647faa',
    skyHorizon: '#f7c5a8',
    skyLow: '#8f718e',
    fog: '#988b9e',
    hemiSky: '#ffe4c2',
    hemiGround: '#493f52',
    key: '#ffe2b0',
    fill: '#a4d7dc',
    roadCenter: '#c98d6b',
    roadEdge: '#7d5361',
    vineA: '#754b4d',
    vineB: '#d2a968',
    glow: '#ffd77f',
    rockTop: '#8d6877',
    rockBottom: '#493e5d',
    cap: '#c89478',
    foliageA: '#55a6a0',
    foliageB: '#e3b56c',
    accent: '#e96572',
    collectible: '#fff1a3',
    fogNear: 102,
    fogFar: 264,
    sunIntensity: 2.18,
    ambientIntensity: 0.52,
    hemiIntensity: 0.86,
    fillIntensity: 0.68,
    rimIntensity: 0.52,
    accentIntensity: 1.9,
  },
  aurora: {
    id: 'aurora',
    skyTop: '#8197df', skyHorizon: '#f4d9ff', skyLow: '#9bdde0', fog: '#c2d8ea',
    hemiSky: '#f8edff', hemiGround: '#6993aa', key: '#fff4e7', fill: '#a8f1ef',
    roadCenter: '#b5d5dc', roadEdge: '#7da9bd', vineA: '#75a4b5', vineB: '#b9dce6',
    glow: '#d9ffff', rockTop: '#9eb9cb', rockBottom: '#6f86ac', cap: '#c8e2e5',
    foliageA: '#8dc8d2', foliageB: '#d2eeef', accent: '#d7b8ff', collectible: '#fff1a9',
    fogNear: 112, fogFar: 286, sunIntensity: 2.45, ambientIntensity: 0.61,
    hemiIntensity: 0.96, fillIntensity: 0.76, rimIntensity: 0.62, accentIntensity: 2.1,
  },
  dinosaur: {
    id: 'dinosaur',
    skyTop: '#70b5c8', skyHorizon: '#ffe0a7', skyLow: '#8fc58d', fog: '#b7cda2',
    hemiSky: '#fff2c9', hemiGround: '#587450', key: '#fff0ae', fill: '#9ce4cf',
    roadCenter: '#8dad68', roadEdge: '#5f8055', vineA: '#527f58', vineB: '#91ae68',
    glow: '#b7f4b3', rockTop: '#9d9a72', rockBottom: '#676f62', cap: '#8eb06b',
    foliageA: '#428265', foliageB: '#9bbf72', accent: '#f0a36f', collectible: '#ffe58d',
    fogNear: 106, fogFar: 276, sunIntensity: 2.58, ambientIntensity: 0.58,
    hemiIntensity: 0.95, fillIntensity: 0.7, rimIntensity: 0.54, accentIntensity: 1.85,
  },
  carnival: {
    id: 'carnival',
    skyTop: '#93a8e8', skyHorizon: '#ffd5dd', skyLow: '#f3b8b6', fog: '#d9b9cf',
    hemiSky: '#fff0f4', hemiGround: '#826b83', key: '#fff0c8', fill: '#b4ebee',
    roadCenter: '#edb18b', roadEdge: '#c37d91', vineA: '#a5688d', vineB: '#e8a9ba',
    glow: '#fff0bd', rockTop: '#bf91a3', rockBottom: '#765e82', cap: '#ecb7b0',
    foliageA: '#76b9a7', foliageB: '#f3c77e', accent: '#f072a4', collectible: '#fff28d',
    fogNear: 112, fogFar: 288, sunIntensity: 2.55, ambientIntensity: 0.6,
    hemiIntensity: 0.96, fillIntensity: 0.76, rimIntensity: 0.58, accentIntensity: 2.05,
  },
  melody: {
    id: 'melody',
    skyTop: '#6c93d1', skyHorizon: '#ffe0a9', skyLow: '#93c5bb', fog: '#a9c5c3',
    hemiSky: '#fff0cf', hemiGround: '#536b69', key: '#fff1bd', fill: '#9ce2e8',
    roadCenter: '#8fa879', roadEdge: '#5d7768', vineA: '#557462', vineB: '#a2b474',
    glow: '#b8f3e1', rockTop: '#879899', rockBottom: '#59687b', cap: '#93ac82',
    foliageA: '#4e8f78', foliageB: '#b3c77f', accent: '#ed8da8', collectible: '#ffd86e',
    fogNear: 110, fogFar: 286, sunIntensity: 2.48, ambientIntensity: 0.59,
    hemiIntensity: 0.94, fillIntensity: 0.73, rimIntensity: 0.58, accentIntensity: 1.95,
  },
  spaceport: {
    id: 'spaceport',
    skyTop: '#7e7cc4', skyHorizon: '#efc4df', skyLow: '#8db8cf', fog: '#aaa5cc',
    hemiSky: '#f5dcff', hemiGround: '#596078', key: '#fff1d8', fill: '#a9e4f0',
    roadCenter: '#8b99b8', roadEdge: '#646c93', vineA: '#6577a0', vineB: '#9baad1',
    glow: '#c2f4ff', rockTop: '#858cae', rockBottom: '#5a5a7d', cap: '#9ca7c8',
    foliageA: '#659eac', foliageB: '#c4b4dc', accent: '#ff9bad', collectible: '#fff099',
    fogNear: 116, fogFar: 292, sunIntensity: 2.34, ambientIntensity: 0.55,
    hemiIntensity: 0.88, fillIntensity: 0.72, rimIntensity: 0.65, accentIntensity: 2.3,
  },
  storybook: {
    id: 'storybook',
    skyTop: '#78a7d0', skyHorizon: '#ffe0b7', skyLow: '#8bc8c1', fog: '#b4c9c0',
    hemiSky: '#fff3d5', hemiGround: '#596f66', key: '#fff0bd', fill: '#a7e6df',
    roadCenter: '#ba9c78', roadEdge: '#826d69', vineA: '#6f765d', vineB: '#b7a879',
    glow: '#d7f1c3', rockTop: '#998b83', rockBottom: '#606777', cap: '#b4a27c',
    foliageA: '#5c967b', foliageB: '#c5bb7a', accent: '#e98791', collectible: '#ffe27d',
    fogNear: 112, fogFar: 286, sunIntensity: 2.52, ambientIntensity: 0.6,
    hemiIntensity: 0.96, fillIntensity: 0.75, rimIntensity: 0.58, accentIntensity: 2.0,
  },
}

export type ZoneBlend = {
  from: ZoneVisual
  to: ZoneVisual
  amount: number
}

/** Matches the old transition proportion while scaling with the realm count. */
const TRANSITION_HALF_WIDTH = 0.13 / ZONE_COUNT

function smoothstep(value: number) {
  const t = THREE.MathUtils.clamp(value, 0, 1)
  return t * t * (3 - 2 * t)
}

export function getZoneBlend(progress: number): ZoneBlend {
  const p = THREE.MathUtils.clamp(progress, 0, 0.999_999)
  for (let boundaryIndex = 1; boundaryIndex < ZONES.length; boundaryIndex += 1) {
    const boundary = ZONES[boundaryIndex].start
    if (p >= boundary - TRANSITION_HALF_WIDTH && p <= boundary + TRANSITION_HALF_WIDTH) {
      return {
        from: ZONE_VISUALS[ZONES[boundaryIndex - 1].id],
        to: ZONE_VISUALS[ZONES[boundaryIndex].id],
        amount: smoothstep(
          (p - (boundary - TRANSITION_HALF_WIDTH)) / (TRANSITION_HALF_WIDTH * 2),
        ),
      }
    }
  }
  const visual = ZONE_VISUALS[getZone(p).id]
  return { from: visual, to: visual, amount: 0 }
}

export function blendColor(
  blend: ZoneBlend,
  key: keyof Pick<
    ZoneVisual,
    | 'skyTop'
    | 'skyHorizon'
    | 'skyLow'
    | 'fog'
    | 'hemiSky'
    | 'hemiGround'
    | 'key'
    | 'fill'
    | 'roadCenter'
    | 'roadEdge'
    | 'vineA'
    | 'vineB'
    | 'glow'
    | 'rockTop'
    | 'rockBottom'
    | 'cap'
    | 'foliageA'
    | 'foliageB'
    | 'accent'
    | 'collectible'
  >,
  target = new THREE.Color(),
) {
  return target.set(blend.from[key]).lerp(new THREE.Color(blend.to[key]), blend.amount)
}

export function blendNumber(
  blend: ZoneBlend,
  key: keyof Pick<
    ZoneVisual,
    | 'fogNear'
    | 'fogFar'
    | 'sunIntensity'
    | 'ambientIntensity'
    | 'hemiIntensity'
    | 'fillIntensity'
    | 'rimIntensity'
    | 'accentIntensity'
  >,
) {
  return THREE.MathUtils.lerp(blend.from[key], blend.to[key], blend.amount)
}

export function zoneIdAt(progress: number): ZoneId {
  return getZone(progress).id
}
