import { useFrame } from '@react-three/fiber'
import { useRef, type MutableRefObject } from 'react'

export const SKY_REACH_DURATION = 2.08
export const SKY_REACH_MAX_LIFT = 4.2

export type SkyReachPhase = 'idle' | 'coil' | 'rise' | 'hold' | 'fall' | 'land'

export type SkyReachTarget = {
  id: string
  progress: number
  lane: number
  lift?: number
}

export type SkyReachCue = {
  sequence: number
  command: 'start' | 'cancel'
  target?: SkyReachTarget | null
}

export type SkyReachPose = {
  sequence: number
  phase: SkyReachPhase
  active: boolean
  elapsed: number
  lift: number
  coil: number
  upright: number
  squash: number
  camera: number
  magnet: number
  glow: number
  paceScale: number
}

export type SkyReachDirectorProps = {
  cue: SkyReachCue
  paused?: boolean
  poseRef: MutableRefObject<SkyReachPose>
  onCapture?: (sequence: number) => void
  onComplete?: (sequence: number) => void
}

export function createSkyReachPose(): SkyReachPose {
  return {
    sequence: 0,
    phase: 'idle',
    active: false,
    elapsed: 0,
    lift: 0,
    coil: 0,
    upright: 0,
    squash: 0,
    camera: 0,
    magnet: 0,
    glow: 0,
    paceScale: 1,
  }
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function smooth01(value: number) {
  const clamped = clamp01(value)
  return clamped * clamped * (3 - 2 * clamped)
}

function easeOutCubic(value: number) {
  const inverse = 1 - clamp01(value)
  return 1 - inverse * inverse * inverse
}

function easeInOutCubic(value: number) {
  const clamped = clamp01(value)
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2
}

function resetPose(pose: SkyReachPose, sequence: number, elapsed = 0) {
  pose.sequence = sequence
  pose.phase = 'idle'
  pose.active = false
  pose.elapsed = elapsed
  pose.lift = 0
  pose.coil = 0
  pose.upright = 0
  pose.squash = 0
  pose.camera = 0
  pose.magnet = 0
  pose.glow = 0
  pose.paceScale = 1
}

function sampleSkyReach(pose: SkyReachPose, elapsed: number, hasTarget: boolean) {
  pose.elapsed = elapsed

  const cameraRise = smooth01((elapsed - 0.06) / 0.56)
  const cameraFall = 1 - smooth01((elapsed - 1.34) / 0.62)
  pose.camera = Math.min(cameraRise, cameraFall)
  pose.glow = Math.min(smooth01(elapsed / 0.52), 1 - smooth01((elapsed - 1.48) / 0.52))
  pose.magnet = hasTarget
    ? Math.min(smooth01((elapsed - 0.5) / 0.34), 1 - smooth01((elapsed - 0.98) / 0.36))
    : 0

  if (elapsed < 0.2) {
    const phase = smooth01(elapsed / 0.2)
    pose.phase = 'coil'
    pose.lift = -0.18 * phase
    pose.coil = phase
    pose.upright = phase * 0.12
    pose.squash = phase
    pose.paceScale = 1 - phase * 0.26
    return
  }

  if (elapsed < 0.68) {
    const phase = (elapsed - 0.2) / 0.48
    const rise = easeOutCubic(phase)
    pose.phase = 'rise'
    pose.lift = -0.18 + (SKY_REACH_MAX_LIFT + 0.18) * rise
    pose.coil = 1 - smooth01(phase) * 0.78
    pose.upright = 0.12 + smooth01(phase) * 0.88
    pose.squash = 1 - smooth01(phase)
    pose.paceScale = 0.74 - smooth01(phase) * 0.32
    return
  }

  if (elapsed < 0.96) {
    const phase = smooth01((elapsed - 0.68) / 0.28)
    pose.phase = 'hold'
    pose.lift = SKY_REACH_MAX_LIFT - phase * 0.12
    pose.coil = 0.22 - phase * 0.06
    pose.upright = 1
    pose.squash = 0
    pose.paceScale = 0.42
    return
  }

  if (elapsed < 1.62) {
    const phase = easeInOutCubic((elapsed - 0.96) / 0.66)
    pose.phase = 'fall'
    pose.lift = (SKY_REACH_MAX_LIFT - 0.12) * (1 - phase)
    pose.coil = 0.16 + Math.sin(phase * Math.PI) * 0.34
    pose.upright = 1 - smooth01(phase) * 0.92
    pose.squash = 0
    pose.paceScale = 0.42 + smooth01(phase) * 0.46
    return
  }

  const landingPhase = clamp01((elapsed - 1.62) / 0.46)
  const landingWave = Math.sin(landingPhase * Math.PI * 2) * (1 - landingPhase)
  pose.phase = 'land'
  pose.lift = Math.max(0, landingWave * 0.14)
  pose.coil = (1 - landingPhase) * 0.18
  pose.upright = (1 - smooth01(landingPhase)) * 0.08
  pose.squash = Math.max(0, Math.sin(landingPhase * Math.PI)) * 0.82
  pose.paceScale = 0.88 + smooth01(landingPhase) * 0.12
}

/**
 * Advances one shared, allocation-free Sky Reach pose. Camera and character
 * consume the same mutable ref, so their motion remains synchronized without
 * causing React renders every frame.
 */
export function SkyReachDirector({
  cue,
  paused = false,
  poseRef,
  onCapture,
  onComplete,
}: SkyReachDirectorProps) {
  const seenSequence = useRef(-1)
  const activeSequence = useRef(0)
  const activeHasTarget = useRef(false)
  const captureSent = useRef(false)

  useFrame((_, delta) => {
    const pose = poseRef.current

    if (cue.sequence !== seenSequence.current) {
      if (cue.command === 'cancel') {
        seenSequence.current = cue.sequence
        captureSent.current = false
        resetPose(pose, cue.sequence)
      } else if (!pose.active) {
        seenSequence.current = cue.sequence
        activeSequence.current = cue.sequence
        activeHasTarget.current = Boolean(cue.target)
        captureSent.current = false
        resetPose(pose, cue.sequence)
        pose.active = true
        pose.phase = 'coil'
      }
    }

    if (!pose.active || paused) return

    const safeDelta = Math.min(delta, 1 / 20)
    const elapsed = Math.min(SKY_REACH_DURATION, pose.elapsed + safeDelta)
    sampleSkyReach(pose, elapsed, activeHasTarget.current)

    if (activeHasTarget.current && !captureSent.current && elapsed >= 0.78) {
      captureSent.current = true
      onCapture?.(activeSequence.current)
    }

    if (elapsed >= SKY_REACH_DURATION) {
      const completedSequence = activeSequence.current
      resetPose(pose, completedSequence, SKY_REACH_DURATION)
      onComplete?.(completedSequence)
    }
  }, -40)

  return null
}

export default SkyReachDirector
