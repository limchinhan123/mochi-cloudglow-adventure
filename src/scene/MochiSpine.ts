import * as THREE from 'three'
import type { ZoneId } from '../game/worldConfig'

export const MOCHI_SPINE_STATIONS = 32
export const MOCHI_BODY_LENGTH = 11.58
export const MOCHI_BODY_SEGMENTS = 112
export const MOCHI_RADIAL_SEGMENTS = 20

const TAU = Math.PI * 2
const REFERENCE_UP = new THREE.Vector3(0, 1, 0)

export type MochiMotionProfile = {
  lateralAmplitude: number
  wavelength: number
  verticalAmplitude: number
  compression: number
  phaseScale: number
  verticalRate: number
  headStability: number
}

export const MOCHI_ZONE_MOTION: Readonly<Record<ZoneId, MochiMotionProfile>> = {
  garden: {
    lateralAmplitude: 0.29,
    wavelength: 5.45,
    verticalAmplitude: 0.032,
    compression: 0.018,
    phaseScale: 0.94,
    verticalRate: 0.42,
    headStability: 0.8,
  },
  citadel: {
    lateralAmplitude: 0.18,
    wavelength: 6.35,
    verticalAmplitude: 0.078,
    compression: 0.009,
    phaseScale: 0.74,
    verticalRate: 0.58,
    headStability: 0.86,
  },
  reef: {
    lateralAmplitude: 0.4,
    wavelength: 7.25,
    verticalAmplitude: 0.18,
    compression: 0.012,
    phaseScale: 0.61,
    verticalRate: 0.68,
    headStability: 0.7,
  },
  jungle: {
    lateralAmplitude: 0.235,
    wavelength: 4.85,
    verticalAmplitude: 0.009,
    compression: 0.028,
    phaseScale: 1.06,
    verticalRate: 0.28,
    headStability: 0.84,
  },
  desert: {
    lateralAmplitude: 0.22,
    wavelength: 5.8,
    verticalAmplitude: 0.055,
    compression: 0.015,
    phaseScale: 0.88,
    verticalRate: 0.5,
    headStability: 0.88,
  },
  toytown: {
    lateralAmplitude: 0.32,
    wavelength: 4.7,
    verticalAmplitude: 0.07,
    compression: 0.03,
    phaseScale: 1.08,
    verticalRate: 0.65,
    headStability: 0.8,
  },
  aurora: {
    lateralAmplitude: 0.24, wavelength: 6.8, verticalAmplitude: 0.1,
    compression: 0.012, phaseScale: 0.72, verticalRate: 0.58, headStability: 0.88,
  },
  dinosaur: {
    lateralAmplitude: 0.34, wavelength: 5.2, verticalAmplitude: 0.045,
    compression: 0.024, phaseScale: 0.96, verticalRate: 0.42, headStability: 0.78,
  },
  carnival: {
    lateralAmplitude: 0.36, wavelength: 4.55, verticalAmplitude: 0.09,
    compression: 0.032, phaseScale: 1.12, verticalRate: 0.7, headStability: 0.78,
  },
  melody: {
    lateralAmplitude: 0.3, wavelength: 5.05, verticalAmplitude: 0.082,
    compression: 0.026, phaseScale: 1.04, verticalRate: 0.64, headStability: 0.82,
  },
  spaceport: {
    lateralAmplitude: 0.2, wavelength: 7.4, verticalAmplitude: 0.16,
    compression: 0.01, phaseScale: 0.58, verticalRate: 0.76, headStability: 0.9,
  },
  storybook: {
    lateralAmplitude: 0.28, wavelength: 5.75, verticalAmplitude: 0.06,
    compression: 0.02, phaseScale: 0.9, verticalRate: 0.48, headStability: 0.86,
  },
}

export type MochiSpineMotion = MochiMotionProfile & {
  phase: number
  time: number
  magic: number
  obstacle: number
  reachLift: number
  reachCoil: number
  reachUpright: number
}

function smooth01(value: number) {
  const clamped = THREE.MathUtils.clamp(value, 0, 1)
  return clamped * clamped * (3 - 2 * clamped)
}

/**
 * A fixed-allocation follow-the-leader spine. The world nodes retain the path
 * taken by Mochi's head, so lane changes travel naturally toward the tail.
 */
export class MochiSpine {
  readonly worldNodes = Array.from({ length: MOCHI_SPINE_STATIONS }, () => new THREE.Vector3())
  readonly centers = Array.from({ length: MOCHI_SPINE_STATIONS }, () => new THREE.Vector3())
  readonly tangents = Array.from({ length: MOCHI_SPINE_STATIONS }, () => new THREE.Vector3(0, 0, 1))
  readonly rights = Array.from({ length: MOCHI_SPINE_STATIONS }, () => new THREE.Vector3(1, 0, 0))
  readonly ups = Array.from({ length: MOCHI_SPINE_STATIONS }, () => new THREE.Vector3(0, 1, 0))
  readonly radiusScales = new Float32Array(MOCHI_SPINE_STATIONS).fill(1)

  private readonly stationSpacing = MOCHI_BODY_LENGTH / (MOCHI_SPINE_STATIONS - 1)
  private readonly inverseRoot = new THREE.Quaternion()
  private readonly fallbackBackward = new THREE.Vector3()
  private readonly delta = new THREE.Vector3()
  private readonly sampleCenter = new THREE.Vector3()
  private readonly sampleRight = new THREE.Vector3()
  private readonly sampleUp = new THREE.Vector3()
  private readonly sampleNormal = new THREE.Vector3()
  private initialized = false

  reset(headWorld: THREE.Vector3, backwardWorld: THREE.Vector3) {
    this.fallbackBackward.copy(backwardWorld).normalize()
    for (let index = 0; index < MOCHI_SPINE_STATIONS; index += 1) {
      this.worldNodes[index]
        .copy(headWorld)
        .addScaledVector(this.fallbackBackward, this.stationSpacing * index)
    }
    this.initialized = true
  }

  advance(
    headWorld: THREE.Vector3,
    rootQuaternion: THREE.Quaternion,
    motion: MochiSpineMotion,
  ) {
    if (!this.initialized) {
      this.fallbackBackward.set(0, 0, 1).applyQuaternion(rootQuaternion)
      this.reset(headWorld, this.fallbackBackward)
    }

    this.worldNodes[0].copy(headWorld)
    this.fallbackBackward.set(0, 0, 1).applyQuaternion(rootQuaternion).normalize()

    const compressionWaveNumber = TAU / 6.8
    for (let index = 1; index < MOCHI_SPINE_STATIONS; index += 1) {
      const distanceFromHead = this.stationSpacing * index
      const stretch = THREE.MathUtils.clamp(
        1 + motion.compression * Math.cos(compressionWaveNumber * distanceFromHead - motion.phase * 0.72),
        0.965,
        1.035,
      )
      const desiredSpacing = this.stationSpacing * stretch

      this.delta.subVectors(this.worldNodes[index], this.worldNodes[index - 1])
      const distance = this.delta.length()
      if (distance < 0.0001) this.delta.copy(this.fallbackBackward)
      else this.delta.multiplyScalar(1 / distance)

      this.worldNodes[index]
        .copy(this.worldNodes[index - 1])
        .addScaledVector(this.delta, desiredSpacing)
      this.radiusScales[index] = 1 / Math.sqrt(stretch)
    }
    this.radiusScales[0] = this.radiusScales[1]

    this.inverseRoot.copy(rootQuaternion).invert()
    const waveNumber = TAU / motion.wavelength

    for (let index = 0; index < MOCHI_SPINE_STATIONS; index += 1) {
      const distanceFromHead = this.stationSpacing * index
      const normalizedDistance = distanceFromHead / MOCHI_BODY_LENGTH
      const headRelease = smooth01((distanceFromHead - 0.42) / 1.78)
      const tailSoftening = 1 - 0.42 * smooth01((normalizedDistance - 0.82) / 0.18)
      const waveEnvelope = headRelease * tailSoftening
      const neckRise = 0.86 * Math.pow(1 - smooth01(distanceFromHead / 2.65), 2)
      const shoulderRoundness = 0.075 * Math.exp(-distanceFromHead / 4.3)
      const lateralWave = Math.sin(waveNumber * distanceFromHead - motion.phase)
      const verticalWave = Math.sin(
        waveNumber * distanceFromHead * 0.82 - motion.phase * 0.68 + motion.time * motion.verticalRate + 1.08,
      )
      const frontEnvelope = 1 - smooth01(distanceFromHead / 4.6)
      const reachEnvelope = 1 - smooth01((normalizedDistance - 0.06) / 0.88)
      const coilEnvelope =
        smooth01(normalizedDistance / 0.14) *
        (1 - smooth01((normalizedDistance - 0.76) / 0.22))

      this.centers[index]
        .copy(this.worldNodes[index])
        .sub(headWorld)
        .applyQuaternion(this.inverseRoot)

      this.centers[index].x += motion.lateralAmplitude * waveEnvelope * lateralWave
      this.centers[index].y +=
        0.555 +
        shoulderRoundness +
        neckRise +
        motion.verticalAmplitude * waveEnvelope * verticalWave +
        motion.magic * 0.065 * frontEnvelope -
        motion.obstacle * 0.075 * frontEnvelope
      this.centers[index].z += 0.22 * (1 - smooth01(distanceFromHead / 1.8))

      // Sky Reach is an authored deformation layered over the normal trail.
      // The root and tail stay on the route, preventing a vertical kink from
      // entering the follow-the-leader history after Mochi lands.
      if (motion.reachLift > 0 || motion.reachCoil > 0 || motion.reachUpright > 0) {
        const coilPhase = normalizedDistance * TAU * 1.42 + motion.phase * 0.12
        const baseDepth = this.centers[index].z
        const pack = reachEnvelope * (motion.reachUpright * 0.58 + motion.reachCoil * 0.12)
        const packedDepth =
          baseDepth * 0.46 +
          Math.cos(coilPhase) * 0.48 * coilEnvelope * (0.45 + motion.reachCoil * 0.55)

        this.centers[index].x +=
          Math.sin(coilPhase) *
          coilEnvelope *
          (motion.reachCoil * 0.48 + motion.reachUpright * 0.16)
        this.centers[index].y += motion.reachLift * reachEnvelope
        this.centers[index].z = THREE.MathUtils.lerp(baseDepth, packedDepth, pack)
        this.radiusScales[index] *= 1 + motion.reachCoil * coilEnvelope * 0.075
      }
    }

    for (let index = 0; index < MOCHI_SPINE_STATIONS; index += 1) {
      if (index === 0) {
        this.tangents[index].subVectors(this.centers[1], this.centers[0])
      } else if (index === MOCHI_SPINE_STATIONS - 1) {
        this.tangents[index].subVectors(this.centers[index], this.centers[index - 1])
      } else {
        this.tangents[index].subVectors(this.centers[index + 1], this.centers[index - 1])
      }
      this.tangents[index].normalize()

      this.rights[index].crossVectors(REFERENCE_UP, this.tangents[index])
      if (this.rights[index].lengthSq() < 0.0001) {
        if (index > 0) this.rights[index].copy(this.rights[index - 1])
        else this.rights[index].set(1, 0, 0)
      } else {
        this.rights[index].normalize()
      }
      this.ups[index].crossVectors(this.tangents[index], this.rights[index]).normalize()
    }
  }

  deformTubeGeometry(
    geometry: THREE.BufferGeometry,
    radius: number,
    tubularSegments = MOCHI_BODY_SEGMENTS,
    radialSegments = MOCHI_RADIAL_SEGMENTS,
  ) {
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute
    const normals = geometry.getAttribute('normal') as THREE.BufferAttribute

    for (let ring = 0; ring <= tubularSegments; ring += 1) {
      const bodyU = ring / tubularSegments
      const distanceFromHead = (1 - bodyU) * MOCHI_BODY_LENGTH
      const stationFloat = distanceFromHead / this.stationSpacing
      const station = Math.min(MOCHI_SPINE_STATIONS - 2, Math.floor(stationFloat))
      const blend = THREE.MathUtils.clamp(stationFloat - station, 0, 1)

      this.sampleCenter.lerpVectors(this.centers[station], this.centers[station + 1], blend)
      this.sampleRight.lerpVectors(this.rights[station], this.rights[station + 1], blend).normalize()
      this.sampleUp.lerpVectors(this.ups[station], this.ups[station + 1], blend).normalize()

      const volumeScale = THREE.MathUtils.lerp(
        this.radiusScales[station],
        this.radiusScales[station + 1],
        blend,
      )
      const tailTaper = 0.035 + 0.965 * smooth01(bodyU / 0.23)
      const ringRadius = radius * volumeScale * tailTaper

      for (let radial = 0; radial <= radialSegments; radial += 1) {
        const angle = (radial / radialSegments) * TAU
        this.sampleNormal
          .copy(this.sampleUp)
          .multiplyScalar(-Math.cos(angle))
          .addScaledVector(this.sampleRight, Math.sin(angle))
          .normalize()

        const vertex = ring * (radialSegments + 1) + radial
        positions.setXYZ(
          vertex,
          this.sampleCenter.x + this.sampleNormal.x * ringRadius,
          this.sampleCenter.y + this.sampleNormal.y * ringRadius,
          this.sampleCenter.z + this.sampleNormal.z * ringRadius,
        )
        normals.setXYZ(vertex, this.sampleNormal.x, this.sampleNormal.y, this.sampleNormal.z)
      }
    }

    positions.needsUpdate = true
    normals.needsUpdate = true
  }

  sample(
    distanceFromHead: number,
    outPosition: THREE.Vector3,
    outTangent: THREE.Vector3,
    outUp: THREE.Vector3,
  ) {
    const stationFloat = THREE.MathUtils.clamp(distanceFromHead / this.stationSpacing, 0, MOCHI_SPINE_STATIONS - 1)
    const station = Math.min(MOCHI_SPINE_STATIONS - 2, Math.floor(stationFloat))
    const blend = stationFloat - station
    outPosition.lerpVectors(this.centers[station], this.centers[station + 1], blend)
    outTangent.lerpVectors(this.tangents[station], this.tangents[station + 1], blend).normalize()
    outUp.lerpVectors(this.ups[station], this.ups[station + 1], blend).normalize()
  }
}
