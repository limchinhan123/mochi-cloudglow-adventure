import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import { useCloudglowAudio } from '../audio/useCloudglowAudio'
import type { SkyReachPose } from '../scene/SkyReachDirector'
import {
  SHAPE_DEFINITIONS,
  BASE_JOURNEY_SECONDS,
  HOME_MEADOW_LANDING_START,
  HOME_MEADOW_REVEAL_START,
  HOMEWARD_DESCENT_START,
  ROUTE_END_PROGRESS,
  SPEED_MODES,
  ZONES,
  getZone,
  getZoneProgress,
  type CloudglowLane,
  type LearningMode,
  type SpeedMode,
  type ZoneDefinition,
} from './worldConfig'
import {
  learningModeName,
  type CollectibleStop,
  type LearningChallenge,
} from './learningCurriculum'
import {
  useShapeTrail,
  type ShapeFeedback,
  type ShapeTrailController,
  type ShapeTrailSuccessEvent,
  type SkyReachCue,
} from './useShapeTrail'

export type { CloudglowLane, SpeedMode } from './worldConfig'

export type CloudglowPhase = 'ready' | 'playing' | 'paused' | 'arriving' | 'celebrating'
export type GuidanceTone = 'gentle' | 'hint' | 'celebrate'

export interface CloudglowGuidance {
  icon: 'leaf' | 'glow' | 'flower' | 'wing'
  text: string
  tone: GuidanceTone
}

export interface UseCloudglowGameOptions {
  /** @deprecated The shared world always uses BASE_JOURNEY_SECONDS. */
  journeySeconds?: number
  skyReachPoseRef?: MutableRefObject<SkyReachPose>
}

export interface CloudglowGame {
  phase: CloudglowPhase
  isPlaying: boolean
  lane: CloudglowLane
  laneRef: MutableRefObject<CloudglowLane>
  progress: number
  progressRef: MutableRefObject<number>
  baseJourneySeconds: number
  speedMode: SpeedMode
  speedMultiplier: number
  speedMultiplierRef: MutableRefObject<number>
  paceEnvelope: number
  isAccelerating: boolean
  accelerationFactor: number
  setSpeedMode: (mode: SpeedMode) => void
  learningMode: LearningMode
  learningModeLabel: string
  setLearningMode: (mode: LearningMode) => void
  resumeAvailable: boolean
  resumeRealm: number
  zone: ZoneDefinition
  zoneProgress: number
  collected: number
  collectedIds: ReadonlySet<string>
  flowersGrown: number
  countInBloom: 0 | 1 | 2 | 3
  guidance: CloudglowGuidance
  audioCaption: string | null
  magicPulse: number
  obstaclePulse: number
  obstacleHitIds: ReadonlySet<string>
  obstacleProtected: boolean
  narrationEnabled: boolean
  storyVoiceEnabled: boolean
  worldSoundsEnabled: boolean
  musicEnabled: boolean
  audioStarted: boolean
  isInactivityHint: boolean
  shapeTrail: ShapeTrailController
  shapeStops: readonly CollectibleStop[]
  completedChallengeIds: ReadonlySet<string>
  shapeFeedback: ShapeFeedback | null
  skyReachCue: SkyReachCue | null
  begin: () => void
  togglePause: () => void
  restart: () => void
  moveLeft: () => void
  moveRight: () => void
  moveToLane: (lane: CloudglowLane) => void
  startAccelerating: () => void
  stopAccelerating: () => void
  magicBounce: () => void
  collectSeed: (id: string) => boolean
  hitObstacle: (id: string) => boolean
  toggleNarration: () => void
  toggleWorldSounds: () => void
  toggleMusic: () => void
  setStoryVoiceEnabled: (enabled: boolean) => void
  setWorldSoundsEnabled: (enabled: boolean) => void
  setMusicEnabled: (enabled: boolean) => void
  speak: (message: string) => void
  noteActivity: () => void
}

const SPEED_MODE_KEY = 'cloudglow.speedMode.v1'
const LEARNING_MODE_KEY = 'cloudglow.learningMode.v1'
const JOURNEY_SAVE_KEY = 'cloudglow.journey.v2'
const HINT_AFTER_MS = 6_000
const OBSTACLE_SLOW_MS = 800
const OBSTACLE_PROTECTION_MS = 1_500
const ACCELERATION_FACTOR = 1.55
const ACCELERATION_TAP_MS = 700
const HOME_ARRIVAL_PAUSE_MS = 2_000

function loadSpeedMode(): SpeedMode {
  if (typeof window === 'undefined') return 'adventure'
  try {
    const saved = window.localStorage.getItem(SPEED_MODE_KEY)
    return saved === 'breeze' || saved === 'comet' || saved === 'adventure'
      ? saved
      : 'adventure'
  } catch {
    return 'adventure'
  }
}

interface JourneySave {
  version: 2
  learningMode: LearningMode
  runSeed: number
  progress: number
  completedChallengeIds: string[]
}

function isLearningMode(value: unknown): value is LearningMode {
  return value === 'shapes' || value === 'math' || value === 'mixed'
}

function loadJourneySave(): JourneySave | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(JOURNEY_SAVE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<JourneySave>
    if (
      parsed.version !== 2 ||
      !isLearningMode(parsed.learningMode) ||
      typeof parsed.runSeed !== 'number' ||
      typeof parsed.progress !== 'number' ||
      !Array.isArray(parsed.completedChallengeIds)
    ) return null
    return {
      version: 2,
      learningMode: parsed.learningMode,
      runSeed: parsed.runSeed,
      progress: Math.min(ROUTE_END_PROGRESS, Math.max(0, parsed.progress)),
      completedChallengeIds: parsed.completedChallengeIds.filter(
        (id): id is string => typeof id === 'string',
      ),
    }
  } catch {
    return null
  }
}

function loadLearningMode(fallback: LearningMode): LearningMode {
  if (typeof window === 'undefined') return fallback
  try {
    const saved = window.localStorage.getItem(LEARNING_MODE_KEY)
    return isLearningMode(saved) ? saved : fallback
  } catch {
    return fallback
  }
}

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.matches('button, input, textarea, select, [contenteditable="true"]') ||
      target.closest('[role="button"], [role="radio"]') !== null)
  )
}

function restingGuidance(zone: ZoneDefinition): CloudglowGuidance {
  return {
    icon: 'leaf',
    text: zone.learning,
    tone: 'gentle',
  }
}

function getPredictableEnvelope(
  progress: number,
  completedChallengeIds: ReadonlySet<string>,
  challenges: readonly LearningChallenge[],
  mode: SpeedMode,
) {
  const pace = SPEED_MODES[mode]
  let envelope = 1
  const launchDistance = mode === 'breeze' ? 0.024 : mode === 'adventure' ? 0.018 : 0.012

  if (progress < launchDistance) {
    envelope = pace.launchFloor + (progress / launchDistance) * (1 - pace.launchFloor)
  }

  const nextChallenge = challenges.find(
    (challenge) =>
      !completedChallengeIds.has(challenge.id) && challenge.progress >= progress,
  )
  if (nextChallenge) {
    const distance = nextChallenge.progress - progress
    const approachDistance = 0.02 * Math.max(1, pace.multiplier / 1.5)
    if (distance < approachDistance) {
      const approach =
        pace.collectibleFloor +
        (distance / approachDistance) * (1 - pace.collectibleFloor)
      envelope = Math.min(envelope, approach)
    }
  }

  const finaleStart = HOME_MEADOW_LANDING_START
  if (progress > finaleStart) {
    const finale =
      1 -
      Math.min(1, (progress - finaleStart) / (ROUTE_END_PROGRESS - finaleStart)) *
        (1 - pace.finaleFloor)
    envelope = Math.min(envelope, finale)
  }

  return envelope
}

export function useCloudglowGame(
  options: UseCloudglowGameOptions = {},
): CloudglowGame {
  void options.journeySeconds
  const skyReachPoseRef = options.skyReachPoseRef
  const initialSave = useMemo(loadJourneySave, [])
  const [learningMode, setLearningModeState] = useState<LearningMode>(() =>
    initialSave ? initialSave.learningMode : loadLearningMode('shapes'),
  )
  const [resumeAvailable, setResumeAvailable] = useState(
    () => Boolean(initialSave && initialSave.progress > 0.001),
  )

  const audio = useCloudglowAudio()
  const handleShapeCorrect = useCallback(
    (event: ShapeTrailSuccessEvent) => {
      audio.playShapeSuccess(event.order)
      if (event.challenge.kind === 'shape') {
        const definition = SHAPE_DEFINITIONS[event.challenge.targetShape]
        const spokenName = definition.spokenName ?? definition.name
        audio.narrate(
          spokenName,
          'learning',
          `shape-correct-${event.challengeId}`,
          definition.name,
        )
        return
      }
      const equation = `${event.challenge.left} ${event.challenge.operator === '−' ? 'minus' : 'plus'} ${event.challenge.right} equals ${event.challenge.answer}`
      audio.narrate(
        equation,
        'learning',
        `math-correct-${event.challengeId}`,
        `${event.challenge.left} ${event.challenge.operator} ${event.challenge.right} = ${event.challenge.answer}`,
      )
    },
    [audio.narrate, audio.playShapeSuccess],
  )
  const handleShapeWrong = useCallback(() => {
    audio.playShapeTryAgain()
  }, [audio.playShapeTryAgain])
  const shapeTrail = useShapeTrail({
    learningMode,
    initialRunSeed: initialSave?.learningMode === learningMode ? initialSave.runSeed : undefined,
    initialCompletedChallengeIds:
      initialSave?.learningMode === learningMode
        ? initialSave.completedChallengeIds
        : undefined,
    onCorrect: handleShapeCorrect,
    onWrong: handleShapeWrong,
  })

  const [phase, setPhase] = useState<CloudglowPhase>('ready')
  const [lane, setLane] = useState<CloudglowLane>(0)
  const [progress, setProgress] = useState(
    () => initialSave?.learningMode === learningMode ? initialSave.progress : 0,
  )
  const [speedMode, setSpeedModeState] = useState<SpeedMode>(loadSpeedMode)
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(
    () => SPEED_MODES[speedMode].multiplier * SPEED_MODES[speedMode].launchFloor,
  )
  const [paceEnvelope, setPaceEnvelope] = useState<number>(
    () => SPEED_MODES[speedMode].launchFloor,
  )
  const [isAccelerating, setIsAccelerating] = useState(false)
  const initialZone = getZone(0)
  const [guidance, setGuidance] = useState<CloudglowGuidance>(
    () => restingGuidance(initialZone),
  )
  const [magicPulse, setMagicPulse] = useState(0)
  const [obstaclePulse, setObstaclePulse] = useState(0)
  const [obstacleHitIds, setObstacleHitIds] = useState<ReadonlySet<string>>(() => new Set())
  const [obstacleProtected, setObstacleProtected] = useState(false)
  const [isInactivityHint, setIsInactivityHint] = useState(false)

  const laneRef = useRef<CloudglowLane>(0)
  const progressRef = useRef(
    initialSave?.learningMode === learningMode ? initialSave.progress : 0,
  )
  const speedMultiplierRef = useRef<number>(
    SPEED_MODES[speedMode].multiplier * SPEED_MODES[speedMode].launchFloor,
  )
  const acceleratingRef = useRef(false)
  const accelerationStartedAtRef = useRef(0)
  const accelerationStopTimerRef = useRef<number | null>(null)
  const obstacleHitIdsRef = useRef(new Set<string>())
  const obstacleSlowUntilRef = useRef(0)
  const obstacleProtectedUntilRef = useRef(0)
  const bloomSlowUntilRef = useRef(0)
  const lastActivityRef = useRef(Date.now())
  const hintShownRef = useRef(false)
  const guidanceTimerRef = useRef<number | null>(null)
  const protectionTimerRef = useRef<number | null>(null)
  const arrivalTimerRef = useRef<number | null>(null)
  const descentCueShownRef = useRef(false)
  const meadowCueShownRef = useRef(false)
  const currentZone = getZone(progress)
  const restingGuidanceRef = useRef(restingGuidance(currentZone))
  restingGuidanceRef.current = restingGuidance(currentZone)

  const countInBloom = useMemo(() => {
    const found = shapeTrail.challenges.filter(
      (challenge) =>
        challenge.zoneId === currentZone.id &&
        shapeTrail.completedChallengeIds.has(challenge.id),
    ).length
    return Math.min(3, found) as 0 | 1 | 2 | 3
  }, [currentZone.id, shapeTrail.challenges, shapeTrail.completedChallengeIds])

  const setSpeedMode = useCallback((mode: SpeedMode) => {
    setSpeedModeState(mode)
    try {
      window.localStorage.setItem(SPEED_MODE_KEY, mode)
    } catch {
      // Storage is a convenience only; gameplay never depends on it.
    }
  }, [])

  const setLearningMode = useCallback(
    (mode: LearningMode) => {
      if (mode === learningMode) return
      try {
        window.localStorage.setItem(LEARNING_MODE_KEY, mode)
        window.localStorage.removeItem(JOURNEY_SAVE_KEY)
      } catch {
        // Storage is a convenience only; gameplay never depends on it.
      }
      progressRef.current = 0
      laneRef.current = 0
      shapeTrail.restartShapeTrail()
      setProgress(0)
      setLane(0)
      setGuidance(restingGuidance(getZone(0)))
      setResumeAvailable(false)
      setLearningModeState(mode)
    },
    [learningMode, shapeTrail.restartShapeTrail],
  )

  const showGuidance = useCallback((next: CloudglowGuidance, duration = 2_700) => {
    if (guidanceTimerRef.current !== null) {
      window.clearTimeout(guidanceTimerRef.current)
      guidanceTimerRef.current = null
    }

    setGuidance(next)
    if (duration > 0) {
      guidanceTimerRef.current = window.setTimeout(() => {
        setGuidance(restingGuidanceRef.current)
        guidanceTimerRef.current = null
      }, duration)
    }
  }, [])

  const noteActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    hintShownRef.current = false
    setIsInactivityHint(false)
    setGuidance((current) =>
      current.tone === 'hint' ? restingGuidanceRef.current : current,
    )
  }, [])

  const setLaneSafely = useCallback(
    (nextLane: CloudglowLane) => {
      if (shapeTrail.laneLockedRef.current || skyReachPoseRef?.current.active) return
      const previous = laneRef.current
      laneRef.current = nextLane
      setLane(nextLane)
      if (nextLane !== previous) {
        audio.playLaneSwish(nextLane > previous ? 1 : -1)
      }
      shapeTrail.noteLaneChoice(nextLane)
      noteActivity()
    },
    [audio.playLaneSwish, noteActivity, shapeTrail.laneLockedRef, shapeTrail.noteLaneChoice, skyReachPoseRef],
  )

  const moveToLane = useCallback(
    (nextLane: CloudglowLane) => setLaneSafely(nextLane),
    [setLaneSafely],
  )

  const moveLeft = useCallback(() => {
    setLaneSafely(Math.max(-1, laneRef.current - 1) as CloudglowLane)
  }, [setLaneSafely])

  const moveRight = useCallback(() => {
    setLaneSafely(Math.min(1, laneRef.current + 1) as CloudglowLane)
  }, [setLaneSafely])

  const magicBounce = useCallback(() => {
    if (phase !== 'playing' || skyReachPoseRef?.current.active) return
    noteActivity()
    if (shapeTrail.phaseRef.current === 'sky-reaching') {
      shapeTrail.requestSkyReach()
      audio.playBounce()
      return
    }
    setMagicPulse((pulse) => pulse + 1)
    audio.playBounce()
    showGuidance({ icon: 'wing', text: 'Sky Reach!', tone: 'gentle' }, 1_350)
  }, [audio.playBounce, noteActivity, phase, shapeTrail.phaseRef, shapeTrail.requestSkyReach, showGuidance, skyReachPoseRef])

  const finishAcceleration = useCallback(() => {
    if (accelerationStopTimerRef.current !== null) {
      window.clearTimeout(accelerationStopTimerRef.current)
      accelerationStopTimerRef.current = null
    }
    acceleratingRef.current = false
    setIsAccelerating(false)
  }, [])

  const startAccelerating = useCallback(() => {
    if (
      phase !== 'playing' ||
      shapeTrail.routeHeldRef.current ||
      skyReachPoseRef?.current.active
    ) return
    if (accelerationStopTimerRef.current !== null) {
      window.clearTimeout(accelerationStopTimerRef.current)
      accelerationStopTimerRef.current = null
    }
    if (acceleratingRef.current) return
    acceleratingRef.current = true
    accelerationStartedAtRef.current = performance.now()
    setIsAccelerating(true)
    noteActivity()
    showGuidance({ icon: 'wing', text: 'Zoom, Mochi, zoom!', tone: 'gentle' }, 900)
  }, [noteActivity, phase, shapeTrail.routeHeldRef, showGuidance, skyReachPoseRef])

  const stopAccelerating = useCallback(() => {
    if (!acceleratingRef.current) return
    if (accelerationStopTimerRef.current !== null) return
    const remaining = ACCELERATION_TAP_MS - (performance.now() - accelerationStartedAtRef.current)
    if (remaining <= 0) {
      finishAcceleration()
      return
    }
    accelerationStopTimerRef.current = window.setTimeout(finishAcceleration, remaining)
  }, [finishAcceleration])

  const begin = useCallback(() => {
    if (phase === 'arriving' || phase === 'celebrating') return
    lastActivityRef.current = Date.now()
    setIsInactivityHint(false)
    setGuidance(restingGuidance(currentZone))
    setPhase('playing')
    void audio.start(currentZone.id)
  }, [audio.start, currentZone, phase])

  const togglePause = useCallback(() => {
    if (phase === 'ready') {
      begin()
      return
    }
    if (phase === 'arriving' || phase === 'celebrating') return

    if (phase === 'playing') {
      setPhase('paused')
      audio.cancelNarration()
    } else {
      lastActivityRef.current = Date.now()
      setPhase('playing')
      void audio.start(currentZone.id)
    }
  }, [audio.cancelNarration, audio.start, begin, currentZone.id, phase])

  const restart = useCallback(() => {
    try {
      window.localStorage.removeItem(JOURNEY_SAVE_KEY)
    } catch {
      // Storage is optional.
    }
    progressRef.current = 0
    laneRef.current = 0
    descentCueShownRef.current = false
    meadowCueShownRef.current = false
    finishAcceleration()
    speedMultiplierRef.current =
      SPEED_MODES[speedMode].multiplier * SPEED_MODES[speedMode].launchFloor
    obstacleHitIdsRef.current = new Set()
    obstacleSlowUntilRef.current = 0
    obstacleProtectedUntilRef.current = 0
    bloomSlowUntilRef.current = 0
    lastActivityRef.current = Date.now()
    hintShownRef.current = false

    if (protectionTimerRef.current !== null) window.clearTimeout(protectionTimerRef.current)
    if (arrivalTimerRef.current !== null) {
      window.clearTimeout(arrivalTimerRef.current)
      arrivalTimerRef.current = null
    }
    audio.cancelNarration()
    shapeTrail.restartShapeTrail()
    setProgress(0)
    setLane(0)
    setSpeedMultiplier(speedMultiplierRef.current)
    setPaceEnvelope(SPEED_MODES[speedMode].launchFloor)
    setIsAccelerating(false)
    setGuidance(restingGuidance(getZone(0)))
    setMagicPulse(0)
    setObstaclePulse(0)
    setObstacleHitIds(new Set())
    setObstacleProtected(false)
    setIsInactivityHint(false)
    setResumeAvailable(false)
    setPhase('playing')
    audio.setZone('garden')
    void audio.start('garden')
  }, [
    audio.cancelNarration,
    audio.setZone,
    audio.start,
    shapeTrail.restartShapeTrail,
    finishAcceleration,
    speedMode,
  ])

  const collectSeed = useCallback(
    (id: string) => {
      const stop = shapeTrail.stops.find((candidate) => candidate.id === id)
      if (!stop) return false
      if (laneRef.current !== stop.lane) setLaneSafely(stop.lane)
      noteActivity()
      return shapeTrail.attemptStop(id, 'shape-tap') === 'correct'
    },
    [noteActivity, setLaneSafely, shapeTrail.attemptStop, shapeTrail.stops],
  )

  const hitObstacle = useCallback(
    (id: string) => {
      if (shapeTrail.laneLockedRef.current || skyReachPoseRef?.current.active) return false
      const now = performance.now()
      if (
        !id ||
        obstacleHitIdsRef.current.has(id) ||
        now < obstacleProtectedUntilRef.current
      ) {
        return false
      }

      obstacleHitIdsRef.current.add(id)
      obstacleSlowUntilRef.current = now + OBSTACLE_SLOW_MS
      obstacleProtectedUntilRef.current = now + OBSTACLE_PROTECTION_MS
      setObstacleHitIds(new Set(obstacleHitIdsRef.current))
      setObstaclePulse((pulse) => pulse + 1)
      setObstacleProtected(true)
      if (protectionTimerRef.current !== null) window.clearTimeout(protectionTimerRef.current)
      protectionTimerRef.current = window.setTimeout(() => {
        setObstacleProtected(false)
        protectionTimerRef.current = null
      }, OBSTACLE_PROTECTION_MS)

      showGuidance({ icon: 'wing', text: 'Soft poof — Mochi is okay!', tone: 'hint' }, 2_400)
      audio.playPuff()
      return true
    },
    [audio.playPuff, shapeTrail.laneLockedRef, showGuidance, skyReachPoseRef],
  )

  const toggleNarration = useCallback(
    () => audio.setStoryVoice(!audio.settings.storyVoice),
    [audio.setStoryVoice, audio.settings.storyVoice],
  )
  const toggleWorldSounds = useCallback(
    () => audio.setWorldSounds(!audio.settings.worldSounds),
    [audio.setWorldSounds, audio.settings.worldSounds],
  )
  const toggleMusic = useCallback(
    () => audio.setMusic(!audio.settings.music),
    [audio.setMusic, audio.settings.music],
  )
  const speak = useCallback(
    (message: string) => audio.narrate(message, 'guidance', message, message),
    [audio.narrate],
  )

  useEffect(() => {
    audio.setZone(currentZone.id)
    setGuidance(restingGuidance(currentZone))
  }, [audio.setZone, currentZone])

  useEffect(() => {
    const completedRealmCount = shapeTrail.completedZoneIds.size
    if (completedRealmCount <= 0 || completedRealmCount >= ZONES.length) return
    const nextRealm = ZONES[Math.min(completedRealmCount, ZONES.length - 1)]
    const checkpointProgress = Math.max(
      progressRef.current,
      Math.min(ROUTE_END_PROGRESS, nextRealm.start + 0.0015),
    )
    const save: JourneySave = {
      version: 2,
      learningMode,
      runSeed: shapeTrail.runSeed,
      progress: checkpointProgress,
      completedChallengeIds: [...shapeTrail.completedChallengeIds],
    }
    try {
      window.localStorage.setItem(JOURNEY_SAVE_KEY, JSON.stringify(save))
    } catch {
      // Private browsing and storage limits should never stop play.
    }
  }, [learningMode, shapeTrail.completedChallengeIds, shapeTrail.completedZoneIds.size, shapeTrail.runSeed])

  useEffect(() => {
    if (phase !== 'playing') return

    let animationFrame = 0
    let lastFrame = performance.now()
    let lastPublished = lastFrame
    let lastSpeedPublished = lastFrame

    const advance = (now: number) => {
      const deltaSeconds = Math.min((now - lastFrame) / 1_000, 0.05)
      lastFrame = now
      shapeTrail.tick(progressRef.current, laneRef.current, now)

      const authoredEnvelope = getPredictableEnvelope(
        progressRef.current,
        shapeTrail.completedChallengeIdsRef.current,
        shapeTrail.challenges,
        speedMode,
      )
      const pace = SPEED_MODES[speedMode]
      let targetSpeed =
        pace.multiplier * authoredEnvelope * shapeTrail.paceFactorRef.current
      targetSpeed *= skyReachPoseRef?.current.paceScale ?? 1
      if (acceleratingRef.current && !skyReachPoseRef?.current.active) {
        targetSpeed *= ACCELERATION_FACTOR
      }
      if (now < bloomSlowUntilRef.current) targetSpeed *= pace.bloomFactor
      if (now < obstacleSlowUntilRef.current) targetSpeed *= pace.obstacleFactor

      const ease = 1 - Math.exp((-4.6 * deltaSeconds) / pace.easeSeconds)
      speedMultiplierRef.current +=
        (targetSpeed - speedMultiplierRef.current) * ease

      const nextProgress = shapeTrail.routeHeldRef.current
        ? progressRef.current
        : Math.min(
            ROUTE_END_PROGRESS,
            progressRef.current +
              (deltaSeconds / BASE_JOURNEY_SECONDS) * speedMultiplierRef.current,
          )
      progressRef.current = nextProgress

      const publishInterval = speedMode === 'comet' ? 40 : speedMode === 'adventure' ? 55 : 75
      if (now - lastPublished >= publishInterval || nextProgress >= ROUTE_END_PROGRESS) {
        setProgress(nextProgress)
        lastPublished = now
      }
      if (now - lastSpeedPublished >= 100) {
        setSpeedMultiplier(speedMultiplierRef.current)
        setPaceEnvelope(authoredEnvelope * shapeTrail.paceFactorRef.current)
        lastSpeedPublished = now
      }

      if (!descentCueShownRef.current && nextProgress >= HOMEWARD_DESCENT_START) {
        descentCueShownRef.current = true
        showGuidance(
          { icon: 'wing', text: 'Down the home hill — wheee!', tone: 'gentle' },
          2_500,
        )
      }
      if (!meadowCueShownRef.current && nextProgress >= HOME_MEADOW_REVEAL_START) {
        meadowCueShownRef.current = true
        showGuidance(
          { icon: 'flower', text: 'The green meadow is just ahead!', tone: 'celebrate' },
          2_700,
        )
      }

      if (nextProgress >= ROUTE_END_PROGRESS) {
        finishAcceleration()
        audio.cancelNarration()
        audio.playHomecoming()
        setPhase('arriving')
        setIsInactivityHint(false)
        showGuidance(
          { icon: 'flower', text: 'Mochi is home in the green meadow!', tone: 'celebrate' },
          0,
        )
        try {
          window.localStorage.removeItem(JOURNEY_SAVE_KEY)
        } catch {
          // Storage is optional.
        }
        setResumeAvailable(false)
        arrivalTimerRef.current = window.setTimeout(() => {
          arrivalTimerRef.current = null
          setPhase('celebrating')
        }, HOME_ARRIVAL_PAUSE_MS)
        return
      }

      animationFrame = window.requestAnimationFrame(advance)
    }

    animationFrame = window.requestAnimationFrame(advance)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [audio.cancelNarration, audio.playHomecoming, finishAcceleration, phase, shapeTrail.challenges, shapeTrail.completedChallengeIdsRef, shapeTrail.paceFactorRef, shapeTrail.routeHeldRef, shapeTrail.tick, showGuidance, skyReachPoseRef, speedMode])

  useEffect(() => {
    if (phase !== 'playing') finishAcceleration()
  }, [finishAcceleration, phase])

  useEffect(() => {
    if (phase !== 'playing') return

    const checkInactivity = () => {
      const idleFor = Date.now() - lastActivityRef.current
      if (idleFor < HINT_AFTER_MS || hintShownRef.current) return
      hintShownRef.current = true
      setIsInactivityHint(true)

      if (shapeTrail.phaseRef.current === 'cruising') {
        showGuidance(
          { icon: 'leaf', text: 'The two big leaves move Mochi across the trail.', tone: 'hint' },
          3_200,
        )
      }
    }

    const timer = window.setInterval(checkInactivity, 700)
    return () => window.clearInterval(timer)
  }, [phase, shapeTrail.phaseRef, showGuidance])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      const key = event.key.toLowerCase()

      if (key === 'arrowup' || key === 'w') {
        event.preventDefault()
        if (phase === 'playing') startAccelerating()
        return
      }
      if (event.repeat) return

      if (key === 'arrowleft' || key === 'a') {
        if (phase !== 'playing') return
        event.preventDefault()
        moveLeft()
      } else if (key === 'arrowright' || key === 'd') {
        if (phase !== 'playing') return
        event.preventDefault()
        moveRight()
      } else if (key === ' ' || key === 'spacebar') {
        event.preventDefault()
        if (phase === 'playing') magicBounce()
        else if (phase === 'ready' || phase === 'paused') begin()
      } else if (key === 'escape' || key === 'p') {
        event.preventDefault()
        togglePause()
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (key !== 'arrowup' && key !== 'w') return
      event.preventDefault()
      stopAccelerating()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', stopAccelerating)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', stopAccelerating)
    }
  }, [begin, magicBounce, moveLeft, moveRight, phase, startAccelerating, stopAccelerating, togglePause])

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden) {
        setPhase((current) => (current === 'playing' ? 'paused' : current))
        audio.cancelNarration()
      }
    }

    document.addEventListener('visibilitychange', pauseWhenHidden)
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden)
  }, [audio.cancelNarration])

  useEffect(
    () => () => {
      if (guidanceTimerRef.current !== null) window.clearTimeout(guidanceTimerRef.current)
      if (protectionTimerRef.current !== null) window.clearTimeout(protectionTimerRef.current)
      if (accelerationStopTimerRef.current !== null) window.clearTimeout(accelerationStopTimerRef.current)
      if (arrivalTimerRef.current !== null) window.clearTimeout(arrivalTimerRef.current)
    },
    [],
  )

  return {
    phase,
    isPlaying: phase === 'playing',
    lane,
    laneRef,
    progress,
    progressRef,
    baseJourneySeconds: BASE_JOURNEY_SECONDS,
    speedMode,
    speedMultiplier,
    speedMultiplierRef,
    paceEnvelope,
    isAccelerating,
    accelerationFactor: ACCELERATION_FACTOR,
    setSpeedMode,
    learningMode,
    learningModeLabel: learningModeName(learningMode),
    setLearningMode,
    resumeAvailable,
    resumeRealm: Math.min(ZONES.length, shapeTrail.completedZoneIds.size + 1),
    zone: currentZone,
    zoneProgress: getZoneProgress(progress),
    collected: shapeTrail.completedChallengeIds.size,
    collectedIds: shapeTrail.completedStopIds,
    flowersGrown: shapeTrail.completedZoneIds.size,
    countInBloom,
    guidance,
    audioCaption: audio.caption,
    magicPulse,
    obstaclePulse,
    obstacleHitIds,
    obstacleProtected,
    narrationEnabled: audio.settings.storyVoice,
    storyVoiceEnabled: audio.settings.storyVoice,
    worldSoundsEnabled: audio.settings.worldSounds,
    musicEnabled: audio.settings.music,
    audioStarted: audio.started,
    isInactivityHint,
    shapeTrail,
    shapeStops: shapeTrail.stops,
    completedChallengeIds: shapeTrail.completedChallengeIds,
    shapeFeedback: shapeTrail.feedback,
    skyReachCue: shapeTrail.skyReachCue,
    begin,
    togglePause,
    restart,
    moveLeft,
    moveRight,
    moveToLane,
    startAccelerating,
    stopAccelerating,
    magicBounce,
    collectSeed,
    hitObstacle,
    toggleNarration,
    toggleWorldSounds,
    toggleMusic,
    setStoryVoiceEnabled: audio.setStoryVoice,
    setWorldSoundsEnabled: audio.setWorldSounds,
    setMusicEnabled: audio.setMusic,
    speak,
    noteActivity,
  }
}
