import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { CLOUDLIFT_ROUTE, LANE_WIDTH, ROUTE_LENGTH, sampleRouteFrame } from './route'
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
    const lookProgress = THREE.MathUtils.clamp(
      progress + LOOK_AHEAD_WORLD_UNITS / ROUTE_LENGTH,
      0,
      0.995,
    )
    CLOUDLIFT_ROUTE.getPointAt(lookProgress, desiredTarget)
    tangentTarget
      .copy(frame.position)
      .addScaledVector(frame.tangent, LOOK_AHEAD_WORLD_UNITS)
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

    desiredPosition
      .copy(frame.position)
      .addScaledVector(frame.tangent, -9.2 - reachDolly)
      .addScaledVector(frame.up, (compact ? 5.7 : 4.85) + reachCamera * 0.9)
      .addScaledVector(frame.right, laneOffset * CAMERA_LANE_FOLLOW)

    desiredTarget
      .addScaledVector(frame.up, 1.5 + reachCamera * 2.6)
      .addScaledVector(frame.right, laneOffset * TARGET_LANE_FOLLOW)
    const positionAlpha = 1 - Math.exp(-delta / (paused ? 0.55 : 0.28 - reachCamera * 0.05))
    const rotationAlpha = 1 - Math.exp(-delta / (0.36 - reachCamera * 0.06))
    camera.position.lerp(desiredPosition, positionAlpha)
    smoothedTarget.lerp(desiredTarget, rotationAlpha)

    lookMatrix.lookAt(camera.position, smoothedTarget, frame.up)
    desiredQuaternion.setFromRotationMatrix(lookMatrix)
    camera.quaternion.slerp(desiredQuaternion, rotationAlpha)
    camera.up.lerp(frame.up, Math.min(1, delta * 2.4)).normalize()
  }, -20)

  return null
}
