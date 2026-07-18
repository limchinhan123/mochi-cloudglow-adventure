import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import {
  HOME_MEADOW_LANDING_START,
  HOMEWARD_DESCENT_START,
  ROUTE_END_PROGRESS,
} from '../game/worldConfig'
import { LANE_WIDTH, sampleRouteAhead, sampleRouteFrame } from './route'
import type { SkyReachPose } from './SkyReachDirector'

type CinematicCameraProps = {
  progress: number
  lane: number
  paused?: boolean
  skyReachPoseRef?: MutableRefObject<SkyReachPose>
}

const desiredPosition = new THREE.Vector3()
const desiredTarget = new THREE.Vector3()
const tangentTarget = new THREE.Vector3()
const cameraUp = new THREE.Vector3()
const WORLD_UP = new THREE.Vector3(0, 1, 0)
const lookMatrix = new THREE.Matrix4()
const desiredQuaternion = new THREE.Quaternion()

/** Keep cinematic distances stable when the authored route gains new realms. */
const LOOK_AHEAD_WORLD_UNITS = 20
const CURVE_ANTICIPATION = 0.35
const CAMERA_LANE_FOLLOW = 0.9
const TARGET_LANE_FOLLOW = 0.8
const LANE_FOLLOW_DAMPING = 5.2

export function CinematicCamera({
  progress,
  lane,
  paused = false,
  skyReachPoseRef,
}: CinematicCameraProps) {
  const { camera, size } = useThree()
  const smoothedTarget = useMemo(() => new THREE.Vector3(), [])
  const smoothedLane = useRef(lane)

  useFrame((_, delta) => {
    const frame = sampleRouteFrame(progress)
    const descentAmount = THREE.MathUtils.smoothstep(
      progress,
      HOMEWARD_DESCENT_START,
      HOME_MEADOW_LANDING_START,
    )
    const landingAmount = THREE.MathUtils.smoothstep(
      progress,
      HOME_MEADOW_LANDING_START,
      ROUTE_END_PROGRESS,
    )
    const lookAhead = LOOK_AHEAD_WORLD_UNITS + descentAmount * 9
    sampleRouteAhead(progress, lookAhead, desiredTarget)
    tangentTarget
      .copy(frame.position)
      .addScaledVector(frame.tangent, lookAhead)
      .lerp(desiredTarget, CURVE_ANTICIPATION)
    desiredTarget.copy(tangentTarget)
    const reachCamera = skyReachPoseRef?.current.camera ?? 0
    const compact = size.width < 720
    const reachDolly = reachCamera * (compact ? 2.2 : 1.6)
    smoothedLane.current = THREE.MathUtils.damp(
      smoothedLane.current,
      lane,
      LANE_FOLLOW_DAMPING,
      Math.min(delta, 1 / 20),
    )
    const laneOffset = smoothedLane.current * LANE_WIDTH * (1 - reachCamera * 0.35)
    cameraUp
      .copy(frame.up)
      .lerp(WORLD_UP, descentAmount * 0.78 + landingAmount * 0.12)
      .normalize()

    desiredPosition
      .copy(frame.position)
      .addScaledVector(frame.tangent, -9.2 - reachDolly - descentAmount * 2.15)
      .addScaledVector(cameraUp, (compact ? 5.7 : 4.85) + reachCamera * 0.9 + descentAmount * 1.3)
      .addScaledVector(frame.right, laneOffset * CAMERA_LANE_FOLLOW)

    desiredTarget
      .addScaledVector(cameraUp, 1.5 + reachCamera * 2.6 + landingAmount * 0.35)
      .addScaledVector(WORLD_UP, descentAmount * 2.7 - landingAmount * 1.4)
      .addScaledVector(frame.right, laneOffset * TARGET_LANE_FOLLOW)
    const positionAlpha = 1 - Math.exp(-delta / (paused ? 0.55 : 0.28 - reachCamera * 0.05))
    const rotationAlpha = 1 - Math.exp(-delta / (0.36 - reachCamera * 0.06))
    camera.position.lerp(desiredPosition, positionAlpha)
    smoothedTarget.lerp(desiredTarget, rotationAlpha)

    lookMatrix.lookAt(camera.position, smoothedTarget, cameraUp)
    desiredQuaternion.setFromRotationMatrix(lookMatrix)
    camera.quaternion.slerp(desiredQuaternion, rotationAlpha)
    camera.up.lerp(cameraUp, Math.min(1, delta * 2.4)).normalize()
  }, -20)

  return null
}
