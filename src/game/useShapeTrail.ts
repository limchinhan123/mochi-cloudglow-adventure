import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import {
  buildLearningJourney,
  buildLearningStops,
  getLearningChallenge,
  type CollectibleStop,
  type LearningChallenge,
  type LearningJourney,
  type LessonKind,
} from './learningCurriculum'
import {
  BASE_JOURNEY_SECONDS,
  SPEED_MODES,
  ZONES,
  type CloudglowLane,
  type LearningMode,
  type ShapeId,
  type ZoneId,
} from './worldConfig'

export type ShapeTrailPhase =
  | 'cruising'
  | 'prompting'
  | 'retrying'
  | 'sky-reaching'
  | 'celebrating'
  | 'complete'

export type ShapeChoiceSource = 'route-contact' | 'lane-control' | 'shape-tap'
export type ShapeAttemptResult = 'ignored' | 'wrong' | 'pending' | 'correct'

export interface ShapeFeedback {
  challengeId: string
  kind: LessonKind
  answerKey: string
  shapeId?: ShapeId
  numberValue?: number
  lane: CloudglowLane
  result: 'wrong' | 'pending' | 'correct'
  nonce: number
}

export interface ShapeTrailSuccessEvent {
  challenge: LearningChallenge
  stop: CollectibleStop
  challengeId: string
  lane: CloudglowLane
  progress: number
  order: 1 | 2 | 3
  elevated: boolean
}

export interface ShapeTrailWrongEvent {
  challenge: LearningChallenge
  stop: CollectibleStop
  challengeId: string
  lane: CloudglowLane
}

export interface SkyReachCue {
  nonce: number
  challengeId: string
  answerKey: string
  lane: CloudglowLane
  progress: number
}

export interface UseShapeTrailOptions {
  learningMode: LearningMode
  initialRunSeed?: number
  initialCompletedChallengeIds?: readonly string[]
  onCorrect?: (event: ShapeTrailSuccessEvent) => void
  onWrong?: (event: ShapeTrailWrongEvent) => void
}

export interface ShapeTrailController {
  runSeed: number
  journey: LearningJourney
  challenges: readonly LearningChallenge[]
  challengeCount: number
  stops: readonly CollectibleStop[]
  phase: ShapeTrailPhase
  phaseRef: MutableRefObject<ShapeTrailPhase>
  activeChallenge: LearningChallenge | null
  activeChallengeId: string | null
  completedChallengeIds: ReadonlySet<string>
  completedChallengeIdsRef: MutableRefObject<Set<string>>
  completedStopIds: ReadonlySet<string>
  completedZoneIds: ReadonlySet<ZoneId>
  feedback: ShapeFeedback | null
  assistStopId: string | null
  skyReachCue: SkyReachCue | null
  skyReachQueue: readonly SkyReachCue[]
  pendingSkyReach: SkyReachCue | null
  inFlightSkyReachNonce: number | null
  paceFactor: number
  paceFactorRef: MutableRefObject<number>
  routeHeld: boolean
  routeHeldRef: MutableRefObject<boolean>
  laneLocked: boolean
  laneLockedRef: MutableRefObject<boolean>
  tick: (progress: number, lane: CloudglowLane, now: number) => void
  attemptStop: (stopId: string, source?: ShapeChoiceSource) => ShapeAttemptResult
  attemptLane: (
    challengeId: string,
    lane: CloudglowLane,
    source?: ShapeChoiceSource,
  ) => ShapeAttemptResult
  noteLaneChoice: (lane: CloudglowLane) => void
  acknowledgeSkyReach: (nonce: number) => void
  requestSkyReach: () => SkyReachCue | null
  completeSkyReach: (nonce: number) => boolean
  releaseSkyReach: (nonce: number) => void
  restartShapeTrail: (runSeed?: number) => void
}

const PROMPT_DISTANCE = 0.013
const ANSWER_LINE_OFFSET = 0.0024
const LANE_SETTLE_MS = 340
const SUCCESS_BEAT_MS = 1_450

const PHASE_PACE: Record<ShapeTrailPhase, number> = {
  cruising: 1,
  prompting: 0.6,
  retrying: 0,
  'sky-reaching': 0,
  celebrating: 0.42,
  complete: 1,
}

const cometPromptBaselineSeconds =
  ((PROMPT_DISTANCE - ANSWER_LINE_OFFSET) * BASE_JOURNEY_SECONDS) /
  SPEED_MODES.comet.multiplier
const idealCometAddedDwellPerChallenge =
  cometPromptBaselineSeconds * (1 / PHASE_PACE.prompting - 1) +
  (SUCCESS_BEAT_MS / 1_000) * (1 - PHASE_PACE.celebrating)

export const SHAPE_TRAIL_TIMING = {
  promptDistance: PROMPT_DISTANCE,
  answerLineOffset: ANSWER_LINE_OFFSET,
  laneSettleMs: LANE_SETTLE_MS,
  successBeatMs: SUCCESS_BEAT_MS,
  promptPaceFactor: PHASE_PACE.prompting,
  retryPaceFactor: PHASE_PACE.retrying,
  successPaceFactor: PHASE_PACE.celebrating,
  idealCometAddedDwellPerChallenge,
  idealCometAddedDwellTotal: idealCometAddedDwellPerChallenge * ZONES.length * 3,
} as const

function createRunSeed() {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const value = new Uint32Array(1)
    crypto.getRandomValues(value)
    return value[0]
  }
  return (Date.now() ^ Math.floor(Math.random() * 0xffff_ffff)) >>> 0
}

function feedbackForStop(
  stop: CollectibleStop,
  result: ShapeFeedback['result'],
  nonce: number,
): ShapeFeedback {
  return {
    challengeId: stop.challengeId,
    kind: stop.kind === 'shape-token' ? 'shape' : 'math',
    answerKey: stop.answerKey,
    shapeId: stop.kind === 'shape-token' ? stop.shapeId : undefined,
    numberValue: stop.kind === 'number-token' ? stop.numberValue : undefined,
    lane: stop.lane,
    result,
    nonce,
  }
}

export function useShapeTrail(options: UseShapeTrailOptions): ShapeTrailController {
  const [runSeed, setRunSeed] = useState(options.initialRunSeed ?? createRunSeed)
  const journey = useMemo(
    () => buildLearningJourney(options.learningMode, runSeed),
    [options.learningMode, runSeed],
  )
  const challenges = journey.challenges
  const challengesRef = useRef(challenges)
  challengesRef.current = challenges
  const stops = useMemo(
    () => buildLearningStops(challenges, runSeed),
    [challenges, runSeed],
  )
  const stopsRef = useRef(stops)
  stopsRef.current = stops

  const initialCompleted = useMemo(
    () => new Set(options.initialCompletedChallengeIds ?? []),
    [],
  )
  const [phase, setPhase] = useState<ShapeTrailPhase>('cruising')
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null)
  const [completedChallengeIds, setCompletedChallengeIds] = useState<ReadonlySet<string>>(
    initialCompleted,
  )
  const [feedback, setFeedback] = useState<ShapeFeedback | null>(null)
  const [assistStopId, setAssistStopId] = useState<string | null>(null)
  const [skyReachQueue, setSkyReachQueue] = useState<readonly SkyReachCue[]>([])
  const [pendingSkyReach, setPendingSkyReach] = useState<SkyReachCue | null>(null)
  const [inFlightSkyReachNonce, setInFlightSkyReachNonce] = useState<number | null>(null)
  const [paceFactor, setPaceFactor] = useState(1)

  const phaseRef = useRef<ShapeTrailPhase>('cruising')
  const activeChallengeIdRef = useRef<string | null>(null)
  const completedChallengeIdsRef = useRef(new Set(initialCompleted))
  const feedbackNonceRef = useRef(0)
  const skyReachNonceRef = useRef(0)
  const skyReachQueueRef = useRef<readonly SkyReachCue[]>([])
  const pendingSkyReachRef = useRef<SkyReachCue | null>(null)
  const inFlightSkyReachNonceRef = useRef<number | null>(null)
  const retryStartedAtRef = useRef(0)
  const assistStopIdRef = useRef<string | null>(null)
  const celebrationUntilRef = useRef(0)
  const paceFactorRef = useRef(1)
  const routeHeldRef = useRef(false)
  const laneLockedRef = useRef(false)
  const laneAttemptTimerRef = useRef<number | null>(null)
  const onCorrectRef = useRef(options.onCorrect)
  const onWrongRef = useRef(options.onWrong)
  onCorrectRef.current = options.onCorrect
  onWrongRef.current = options.onWrong

  const setPhaseSafely = useCallback((next: ShapeTrailPhase) => {
    phaseRef.current = next
    const nextPace = PHASE_PACE[next]
    paceFactorRef.current = nextPace
    routeHeldRef.current = next === 'retrying' || next === 'sky-reaching'
    laneLockedRef.current = next === 'sky-reaching'
    setPhase(next)
    setPaceFactor(nextPace)
  }, [])

  const setActiveChallengeSafely = useCallback((challengeId: string | null) => {
    activeChallengeIdRef.current = challengeId
    setActiveChallengeId(challengeId)
  }, [])

  const publishFeedback = useCallback(
    (stop: CollectibleStop, result: ShapeFeedback['result']) => {
      feedbackNonceRef.current += 1
      const next = feedbackForStop(stop, result, feedbackNonceRef.current)
      setFeedback(next)
      return next
    },
    [],
  )

  const commitCorrectStop = useCallback(
    (stop: CollectibleStop) => {
      const challenge = getLearningChallenge(challengesRef.current, stop.challengeId)
      if (!challenge) return
      const nextCompleted = new Set(completedChallengeIdsRef.current)
      nextCompleted.add(stop.challengeId)
      completedChallengeIdsRef.current = nextCompleted
      setCompletedChallengeIds(nextCompleted)
      setAssistStopId(null)
      assistStopIdRef.current = null
      publishFeedback(stop, 'correct')
      celebrationUntilRef.current = performance.now() + SUCCESS_BEAT_MS
      setPhaseSafely('celebrating')
      onCorrectRef.current?.({
        challenge,
        stop,
        challengeId: stop.challengeId,
        lane: stop.lane,
        progress: stop.progress,
        order: stop.number,
        elevated: stop.elevated,
      })
    },
    [publishFeedback, setPhaseSafely],
  )

  const attemptStop = useCallback(
    (stopId: string, _source: ShapeChoiceSource = 'route-contact'): ShapeAttemptResult => {
      const stop = stopsRef.current.find((candidate) => candidate.id === stopId)
      if (!stop || completedChallengeIdsRef.current.has(stop.challengeId)) return 'ignored'

      const currentPhase = phaseRef.current
      const currentChallengeId = activeChallengeIdRef.current
      if (currentPhase === 'sky-reaching' || currentPhase === 'celebrating' || currentPhase === 'complete') {
        return 'ignored'
      }
      if (currentChallengeId !== null && currentChallengeId !== stop.challengeId) return 'ignored'
      if (currentChallengeId === null) setActiveChallengeSafely(stop.challengeId)

      const challenge = getLearningChallenge(challengesRef.current, stop.challengeId)
      if (!challenge) return 'ignored'

      if (!stop.isCorrect) {
        if (currentPhase !== 'retrying') retryStartedAtRef.current = performance.now()
        assistStopIdRef.current = null
        setAssistStopId(null)
        publishFeedback(stop, 'wrong')
        setPhaseSafely('retrying')
        onWrongRef.current?.({
          challenge,
          stop,
          challengeId: stop.challengeId,
          lane: stop.lane,
        })
        return 'wrong'
      }

      if (stop.elevated) {
        skyReachNonceRef.current += 1
        const cue: SkyReachCue = {
          nonce: skyReachNonceRef.current,
          challengeId: stop.challengeId,
          answerKey: stop.answerKey,
          lane: stop.lane,
          progress: stop.progress,
        }
        const nextQueue = [...skyReachQueueRef.current, cue]
        skyReachQueueRef.current = nextQueue
        setSkyReachQueue(nextQueue)
        pendingSkyReachRef.current = cue
        setPendingSkyReach(cue)
        publishFeedback(stop, 'pending')
        setPhaseSafely('sky-reaching')
        return 'pending'
      }

      commitCorrectStop(stop)
      return 'correct'
    },
    [commitCorrectStop, publishFeedback, setActiveChallengeSafely, setPhaseSafely],
  )

  const attemptLane = useCallback(
    (challengeId: string, lane: CloudglowLane, source: ShapeChoiceSource = 'lane-control') => {
      const stop = stopsRef.current.find(
        (candidate) => candidate.challengeId === challengeId && candidate.lane === lane,
      )
      return stop ? attemptStop(stop.id, source) : 'ignored'
    },
    [attemptStop],
  )

  const noteLaneChoice = useCallback(
    (lane: CloudglowLane) => {
      if (phaseRef.current !== 'retrying' || activeChallengeIdRef.current === null) return
      if (laneAttemptTimerRef.current !== null) window.clearTimeout(laneAttemptTimerRef.current)
      const challengeId = activeChallengeIdRef.current
      laneAttemptTimerRef.current = window.setTimeout(() => {
        laneAttemptTimerRef.current = null
        if (phaseRef.current === 'retrying') attemptLane(challengeId, lane, 'lane-control')
      }, LANE_SETTLE_MS)
    },
    [attemptLane],
  )

  const tick = useCallback(
    (progress: number, lane: CloudglowLane, now: number) => {
      const currentPhase = phaseRef.current

      if (currentPhase === 'cruising') {
        const nextChallenge = challengesRef.current.find(
          (challenge) => !completedChallengeIdsRef.current.has(challenge.id),
        )
        if (!nextChallenge) {
          setActiveChallengeSafely(null)
          setPhaseSafely('complete')
          return
        }
        if (nextChallenge.progress - progress <= PROMPT_DISTANCE) {
          setActiveChallengeSafely(nextChallenge.id)
          setFeedback(null)
          setPhaseSafely('prompting')
        }
        return
      }

      if (currentPhase === 'prompting') {
        const challengeId = activeChallengeIdRef.current
        const challenge = challengeId
          ? getLearningChallenge(challengesRef.current, challengeId)
          : undefined
        if (challenge && progress >= challenge.progress - ANSWER_LINE_OFFSET) {
          attemptLane(challenge.id, lane, 'route-contact')
        }
        return
      }

      if (currentPhase === 'retrying') {
        if (assistStopIdRef.current === null && now - retryStartedAtRef.current >= 4_000) {
          const challengeId = activeChallengeIdRef.current
          const correctStop = stopsRef.current.find(
            (stop) => stop.challengeId === challengeId && stop.isCorrect,
          )
          if (correctStop) {
            assistStopIdRef.current = correctStop.id
            setAssistStopId(correctStop.id)
          }
        }
        return
      }

      if (currentPhase === 'celebrating' && now >= celebrationUntilRef.current) {
        setFeedback(null)
        setActiveChallengeSafely(null)
        setPhaseSafely(
          completedChallengeIdsRef.current.size >= challengesRef.current.length
            ? 'complete'
            : 'cruising',
        )
      }
    },
    [attemptLane, setActiveChallengeSafely, setPhaseSafely],
  )

  const restartShapeTrail = useCallback(
    (seed = createRunSeed()) => {
      if (laneAttemptTimerRef.current !== null) {
        window.clearTimeout(laneAttemptTimerRef.current)
        laneAttemptTimerRef.current = null
      }
      const nextJourney = buildLearningJourney(options.learningMode, seed)
      stopsRef.current = buildLearningStops(nextJourney.challenges, seed)
      completedChallengeIdsRef.current = new Set()
      feedbackNonceRef.current = 0
      celebrationUntilRef.current = 0
      setRunSeed(seed)
      setCompletedChallengeIds(new Set())
      setFeedback(null)
      setAssistStopId(null)
      assistStopIdRef.current = null
      pendingSkyReachRef.current = null
      inFlightSkyReachNonceRef.current = null
      skyReachQueueRef.current = []
      setSkyReachQueue([])
      setPendingSkyReach(null)
      setInFlightSkyReachNonce(null)
      setActiveChallengeSafely(null)
      setPhaseSafely('cruising')
    },
    [options.learningMode, setActiveChallengeSafely, setPhaseSafely],
  )

  const acknowledgeSkyReach = useCallback((nonce: number) => {
    const pending = pendingSkyReachRef.current
    if (!pending || pending.nonce !== nonce || inFlightSkyReachNonceRef.current !== null) return
    const nextQueue = skyReachQueueRef.current.filter((cue) => cue.nonce !== nonce)
    skyReachQueueRef.current = nextQueue
    setSkyReachQueue(nextQueue)
    inFlightSkyReachNonceRef.current = nonce
    setInFlightSkyReachNonce(nonce)
  }, [])

  const requestSkyReach = useCallback(() => {
    const pending = pendingSkyReachRef.current
    if (!pending || inFlightSkyReachNonceRef.current === pending.nonce) return pending
    if (!skyReachQueueRef.current.some((cue) => cue.nonce === pending.nonce)) {
      const nextQueue = [...skyReachQueueRef.current, pending]
      skyReachQueueRef.current = nextQueue
      setSkyReachQueue(nextQueue)
    }
    return pending
  }, [])

  const completeSkyReach = useCallback(
    (nonce: number) => {
      const pending = pendingSkyReachRef.current
      if (!pending || pending.nonce !== nonce || phaseRef.current !== 'sky-reaching') return false
      const stop = stopsRef.current.find(
        (candidate) =>
          candidate.challengeId === pending.challengeId &&
          candidate.lane === pending.lane &&
          candidate.isCorrect,
      )
      if (!stop) return false

      const nextQueue = skyReachQueueRef.current.filter((cue) => cue.nonce !== nonce)
      skyReachQueueRef.current = nextQueue
      setSkyReachQueue(nextQueue)
      pendingSkyReachRef.current = null
      setPendingSkyReach(null)
      inFlightSkyReachNonceRef.current = null
      setInFlightSkyReachNonce(null)
      commitCorrectStop(stop)
      return true
    },
    [commitCorrectStop],
  )

  const releaseSkyReach = useCallback((nonce: number) => {
    const pending = pendingSkyReachRef.current
    if (!pending || pending.nonce !== nonce) return
    inFlightSkyReachNonceRef.current = null
    setInFlightSkyReachNonce(null)
    if (!skyReachQueueRef.current.some((cue) => cue.nonce === nonce)) {
      const nextQueue = [pending, ...skyReachQueueRef.current]
      skyReachQueueRef.current = nextQueue
      setSkyReachQueue(nextQueue)
    }
  }, [])

  useEffect(
    () => () => {
      if (laneAttemptTimerRef.current !== null) window.clearTimeout(laneAttemptTimerRef.current)
    },
    [],
  )

  const completedStopIds = useMemo(
    () => new Set(stops.filter((stop) => completedChallengeIds.has(stop.challengeId)).map((stop) => stop.id)),
    [completedChallengeIds, stops],
  )

  const completedZoneIds = useMemo(
    () => new Set(
      ZONES.filter((zone) => {
        const zoneChallenges = challenges.filter((challenge) => challenge.zoneId === zone.id)
        return zoneChallenges.length > 0 && zoneChallenges.every(
          (challenge) => completedChallengeIds.has(challenge.id),
        )
      }).map((zone) => zone.id),
    ),
    [challenges, completedChallengeIds],
  )

  return {
    runSeed,
    journey,
    challenges,
    challengeCount: challenges.length,
    stops,
    phase,
    phaseRef,
    activeChallenge: activeChallengeId
      ? getLearningChallenge(challenges, activeChallengeId) ?? null
      : null,
    activeChallengeId,
    completedChallengeIds,
    completedChallengeIdsRef,
    completedStopIds,
    completedZoneIds,
    feedback,
    assistStopId,
    skyReachCue: skyReachQueue[0] ?? null,
    skyReachQueue,
    pendingSkyReach,
    inFlightSkyReachNonce,
    paceFactor,
    paceFactorRef,
    routeHeld: phase === 'retrying' || phase === 'sky-reaching',
    routeHeldRef,
    laneLocked: phase === 'sky-reaching',
    laneLockedRef,
    tick,
    attemptStop,
    attemptLane,
    noteLaneChoice,
    acknowledgeSkyReach,
    requestSkyReach,
    completeSkyReach,
    releaseSkyReach,
    restartShapeTrail,
  }
}
