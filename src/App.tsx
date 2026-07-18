import { Canvas } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useCloudglowGame } from './game/useCloudglowGame'
import {
  HOME_MEADOW_LANDING_START,
  HOME_MEADOW_REVEAL_START,
  HOMEWARD_DESCENT_START,
  ROUTE_END_PROGRESS,
  ZONES,
  getZone,
} from './game/worldConfig'
import CloudglowWorld from './scene/CloudglowWorld'
import { CinematicCamera } from './scene/CinematicCamera'
import { CloudglowEffects } from './scene/CloudglowEffects'
import { CloudglowLighting } from './scene/Lighting'
import Mochi from './scene/Mochi'
import {
  SkyReachDirector,
  createSkyReachPose,
  type SkyReachCue as DirectorSkyReachCue,
} from './scene/SkyReachDirector'
import { ShapeTrailObjects } from './scene/zones/ShapeTrailObjects'
import { GameHud } from './ui/GameHud'

function SceneLoading() {
  return (
    <div className="scene-loading" role="status" aria-live="polite">
      <div className="scene-loading__petal" />
      <span>Waking the cloud garden…</span>
    </div>
  )
}

export default function App() {
  const skyReachPoseRef = useRef(createSkyReachPose())
  const game = useCloudglowGame({ skyReachPoseRef })
  const realmPreview = useMemo(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    const requestedRealm = params.get('realm')
    const zone = ZONES.find((candidate) => candidate.id === requestedRealm)
    if (!zone) return null
    const requestedLocalProgress = Number(params.get('at'))
    const localProgress = Number.isFinite(requestedLocalProgress)
      ? THREE.MathUtils.clamp(requestedLocalProgress, 0.05, 0.95)
      : 0.58
    const requestedLane = Number(params.get('lane'))
    const lane = Number.isFinite(requestedLane)
      ? THREE.MathUtils.clamp(Math.round(requestedLane), -1, 1)
      : 0
    return {
      id: zone.id,
      progress: zone.start + (zone.end - zone.start) * localProgress,
      lane,
    }
  }, [])
  const sceneProgress = realmPreview?.progress ?? game.progress
  const sceneLane = realmPreview?.lane ?? game.lane
  const scenePaused = realmPreview ? false : !game.isPlaying
  const sceneZone = getZone(sceneProgress)
  const previewProgressRef = useRef(sceneProgress)
  previewProgressRef.current = sceneProgress
  const sceneProgressRef = realmPreview ? previewProgressRef : game.progressRef
  const [skyReachBusy, setSkyReachBusy] = useState(false)
  const [directorCue, setDirectorCue] = useState<DirectorSkyReachCue>({
    sequence: 0,
    command: 'cancel',
    target: null,
  })
  const directorSequenceRef = useRef(0)
  const activeShapeCueNonceRef = useRef<number | null>(null)
  const capturedShapeCueRef = useRef(false)
  const lastMagicPulseRef = useRef(game.magicPulse)
  const lastRunSeedRef = useRef(game.shapeTrail.runSeed)
  const isCompact = useMemo(
    () => typeof window !== 'undefined' && (window.innerWidth < 820 || window.matchMedia('(pointer: coarse)').matches),
    [],
  )

  useEffect(() => {
    const cue = game.skyReachCue
    if (!cue || skyReachBusy) return

    directorSequenceRef.current += 1
    activeShapeCueNonceRef.current = cue.nonce
    capturedShapeCueRef.current = false
    setSkyReachBusy(true)
    setDirectorCue({
      sequence: directorSequenceRef.current,
      command: 'start',
      target: {
        id: cue.challengeId,
        progress: cue.progress,
        lane: cue.lane,
        lift: 5.05,
      },
    })
    game.shapeTrail.acknowledgeSkyReach(cue.nonce)
  }, [game.shapeTrail.acknowledgeSkyReach, game.skyReachCue, skyReachBusy])

  useEffect(() => {
    const previousPulse = lastMagicPulseRef.current
    lastMagicPulseRef.current = game.magicPulse
    if (game.magicPulse <= previousPulse || skyReachBusy || game.skyReachCue) return

    directorSequenceRef.current += 1
    activeShapeCueNonceRef.current = null
    capturedShapeCueRef.current = false
    setSkyReachBusy(true)
    setDirectorCue({
      sequence: directorSequenceRef.current,
      command: 'start',
      target: null,
    })
  }, [game.magicPulse, game.skyReachCue, skyReachBusy])

  useEffect(() => {
    if (lastRunSeedRef.current === game.shapeTrail.runSeed) return
    lastRunSeedRef.current = game.shapeTrail.runSeed
    directorSequenceRef.current += 1
    activeShapeCueNonceRef.current = null
    capturedShapeCueRef.current = false
    setSkyReachBusy(false)
    setDirectorCue({
      sequence: directorSequenceRef.current,
      command: 'cancel',
      target: null,
    })
  }, [game.shapeTrail.runSeed])

  const handleSkyReachCapture = useCallback(() => {
    const nonce = activeShapeCueNonceRef.current
    if (nonce === null || capturedShapeCueRef.current) return
    capturedShapeCueRef.current = game.shapeTrail.completeSkyReach(nonce)
  }, [game.shapeTrail.completeSkyReach])

  const handleSkyReachComplete = useCallback(() => {
    const nonce = activeShapeCueNonceRef.current
    if (nonce !== null && !capturedShapeCueRef.current) {
      game.shapeTrail.completeSkyReach(nonce)
    }
    activeShapeCueNonceRef.current = null
    capturedShapeCueRef.current = false
    setSkyReachBusy(false)
  }, [game.shapeTrail.completeSkyReach])

  useEffect(() => {
    window.__CLOUDGLOW_DEBUG__ = {
      get snapshot() {
        const currentProgress = game.progressRef.current
        const homewardStage: CloudglowDebugSnapshot['homewardStage'] = currentProgress >= ROUTE_END_PROGRESS
          ? 'home'
          : currentProgress >= HOME_MEADOW_LANDING_START
            ? 'landing'
            : currentProgress >= HOME_MEADOW_REVEAL_START
              ? 'meadow-in-sight'
              : currentProgress >= HOMEWARD_DESCENT_START
                ? 'descending'
                : 'journey'
        return {
          phase: game.phase,
          progress: game.progressRef.current,
          lane: game.laneRef.current,
          collected: game.collected,
          flowersGrown: game.flowersGrown,
          zone: game.zone.id,
          learningMode: game.learningMode,
          speedMode: game.speedMode,
          speedMultiplier: game.speedMultiplier,
          isAccelerating: game.isAccelerating,
          obstacleProtected: game.obstacleProtected,
          guidance: game.guidance.text,
          shapePhase: game.shapeTrail.phase,
          lessonKind: game.shapeTrail.activeChallenge?.kind ?? null,
          targetShape: game.shapeTrail.activeChallenge?.kind === 'shape'
            ? game.shapeTrail.activeChallenge.targetShape
            : null,
          mathPrompt: game.shapeTrail.activeChallenge?.kind === 'math'
            ? `${game.shapeTrail.activeChallenge.left} ${game.shapeTrail.activeChallenge.operator} ${game.shapeTrail.activeChallenge.right}`
            : null,
          skyReachBusy,
          homewardStage,
        }
      },
    }
  }, [
    game.collected,
    game.flowersGrown,
    game.guidance.text,
    game.lane,
    game.obstacleProtected,
    game.phase,
    game.progress,
    game.speedMode,
    game.speedMultiplier,
    game.isAccelerating,
    game.shapeTrail.activeChallenge,
    game.shapeTrail.phase,
    game.zone.id,
    skyReachBusy,
  ])

  return (
    <main className="game-shell">
      <Canvas
        className="scene-canvas"
        shadows="basic"
        dpr={isCompact ? [0.85, 1.2] : [1, 1.65]}
        camera={{ fov: 54, near: 0.1, far: 560, position: [0, 5.4, 17] }}
        gl={{ antialias: true, alpha: false, depth: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.08
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.shadowMap.type = THREE.PCFShadowMap
        }}
      >
        <color attach="background" args={['#123f46']} />
        <CloudglowLighting progress={sceneProgress} />
        <SkyReachDirector
          cue={directorCue}
          paused={realmPreview ? true : !game.isPlaying}
          poseRef={skyReachPoseRef}
          onCapture={handleSkyReachCapture}
          onComplete={handleSkyReachComplete}
        />
        <CinematicCamera
          progress={sceneProgress}
          lane={sceneLane}
          paused={scenePaused}
          skyReachPoseRef={skyReachPoseRef}
        />
        <Suspense fallback={null}>
          <CloudglowWorld
            progress={sceneProgress}
            lane={sceneLane}
            onObstacleContact={realmPreview ? undefined : game.hitObstacle}
            obstacleHitIds={game.obstacleHitIds}
            paused={scenePaused}
          />
          {!realmPreview && (
            <ShapeTrailObjects
              progress={game.progress}
              stops={game.shapeStops}
              completedChallengeIds={game.completedChallengeIds}
              activeChallengeId={game.shapeTrail.activeChallengeId}
              feedback={game.shapeFeedback}
              assistStopId={game.shapeTrail.assistStopId}
              onChoose={(id, lane) => {
                game.moveToLane(lane)
                const stop = game.shapeStops.find((candidate) => candidate.id === id)
                if (stop && Math.abs(game.progressRef.current - stop.progress) <= 0.008) {
                  game.collectSeed(id)
                }
              }}
              paused={!game.isPlaying}
            />
          )}
          <Mochi
            progress={sceneProgress}
            progressRef={sceneProgressRef}
            lane={sceneLane}
            collected={game.collected}
            speedMultiplier={game.speedMultiplier}
            zoneId={sceneZone.id}
            magicPulse={game.magicPulse}
            obstaclePulse={game.obstaclePulse}
            paused={scenePaused}
            skyReachPoseRef={skyReachPoseRef}
          />
        </Suspense>
        <CloudglowEffects enabled={!isCompact} />
      </Canvas>

      <div className="visual-vignette" aria-hidden="true" />
      <div className="visual-grain" aria-hidden="true" />
      {!realmPreview && <GameHud game={game} />}
      {!realmPreview && (
        <div className="orientation-note" role="note">
          Turn your device sideways for Mochi’s twelve magical worlds.
        </div>
      )}
    </main>
  )
}
