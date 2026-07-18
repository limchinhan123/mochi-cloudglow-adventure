import {
  SHAPE_DEFINITIONS,
  SHAPE_POOLS,
  ZONES,
  zoneLocalToWorld,
  type CloudglowLane,
  type LearningMode,
  type ShapeId,
  type ShapeLevel,
  type ZoneId,
} from './worldConfig'

export type LessonKind = 'shape' | 'math'
export type MathOperator = '+' | '−'

interface BaseLearningChallenge {
  id: string
  progress: number
  zoneId: ZoneId
  order: 1 | 2 | 3
  elevated: boolean
}

export interface ShapeChallenge extends BaseLearningChallenge {
  kind: 'shape'
  targetShape: ShapeId
  choices: readonly [ShapeId, ShapeId, ShapeId]
}

export interface MathChallenge extends BaseLearningChallenge {
  kind: 'math'
  left: number
  operator: MathOperator
  right: number
  answer: number
  choices: readonly [number, number, number]
}

export type LearningChallenge = ShapeChallenge | MathChallenge

interface BaseCollectibleStop {
  id: string
  challengeId: string
  progress: number
  lane: CloudglowLane
  label: 'one' | 'two' | 'three'
  number: 1 | 2 | 3
  zoneId: ZoneId
  answerKey: string
  isCorrect: boolean
  elevated: boolean
}

export interface ShapeCollectibleStop extends BaseCollectibleStop {
  kind: 'shape-token'
  shapeId: ShapeId
  targetShape: ShapeId
}

export interface MathCollectibleStop extends BaseCollectibleStop {
  kind: 'number-token'
  numberValue: number
  targetNumber: number
}

export type CollectibleStop = ShapeCollectibleStop | MathCollectibleStop

export interface LearningJourney {
  mode: LearningMode
  seed: number
  challenges: readonly LearningChallenge[]
  lessonKindsByZone: Readonly<Record<ZoneId, LessonKind>>
}

const CHALLENGE_LOCAL_PROGRESS = [0.22, 0.5, 0.8] as const
const LANES = [-1, 0, 1] as const
const ORDER_LABELS = ['one', 'two', 'three'] as const
const ALL_SHAPES = Object.keys(SHAPE_DEFINITIONS) as ShapeId[]

function seededRandom(seed: number) {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let mixed = value
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296
  }
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

function makeTierSequence(level: ShapeLevel, count: number, random: () => number) {
  const result: ShapeId[] = []
  while (result.length < count) result.push(...shuffle(SHAPE_POOLS[level], random))
  return result.slice(0, count)
}

function shapeChoices(target: ShapeId, random: () => number): [ShapeId, ShapeId, ShapeId] {
  const definition = SHAPE_DEFINITIONS[target]
  const sameDimension = ALL_SHAPES.filter(
    (shapeId) => shapeId !== target && SHAPE_DEFINITIONS[shapeId].dimension === definition.dimension,
  )
  const sameLevel = sameDimension.filter(
    (shapeId) => SHAPE_DEFINITIONS[shapeId].level === definition.level,
  )
  const candidates = shuffle([...sameLevel, ...sameDimension.filter((id) => !sameLevel.includes(id))], random)
  return shuffle([target, candidates[0], candidates[1]], random) as [ShapeId, ShapeId, ShapeId]
}

function mathChoices(answer: number, random: () => number): [number, number, number] {
  const candidates = shuffle(
    [answer - 1, answer + 1, answer - 2, answer + 2, answer - 3, answer + 3, 0, 10]
      .filter((value, index, values) => value >= 0 && value <= 10 && value !== answer && values.indexOf(value) === index),
    random,
  )
  return shuffle([answer, candidates[0], candidates[1]], random) as [number, number, number]
}

function makeMathProblem(
  operator: MathOperator,
  maximum: number,
  random: () => number,
) {
  if (operator === '+') {
    const answer = Math.max(2, 2 + Math.floor(random() * Math.max(1, maximum - 1)))
    const left = Math.max(1, 1 + Math.floor(random() * Math.max(1, answer - 1)))
    return { left, operator, right: answer - left, answer }
  }

  const left = Math.max(2, 2 + Math.floor(random() * Math.max(1, maximum - 1)))
  const right = Math.max(1, 1 + Math.floor(random() * left))
  return { left, operator, right, answer: left - right }
}

const MIX_PATTERNS: readonly (readonly LessonKind[])[] = [
  ['shape', 'math', 'shape', 'math', 'math', 'shape', 'math', 'shape', 'shape', 'math', 'shape', 'math'],
  ['math', 'shape', 'math', 'shape', 'shape', 'math', 'shape', 'math', 'math', 'shape', 'math', 'shape'],
  ['shape', 'math', 'math', 'shape', 'math', 'shape', 'shape', 'math', 'shape', 'math', 'math', 'shape'],
]

function buildLessonKinds(mode: LearningMode, seed: number): LessonKind[] {
  if (mode === 'shapes') return ZONES.map(() => 'shape')
  if (mode === 'math') return ZONES.map(() => 'math')
  return [...MIX_PATTERNS[Math.abs(seed) % MIX_PATTERNS.length]]
}

export function buildLearningJourney(mode: LearningMode, seed = 0): LearningJourney {
  const random = seededRandom(seed ^ (mode === 'shapes' ? 0x51a9e : mode === 'math' ? 0x4a77 : 0x91ced))
  const lessonKinds = buildLessonKinds(mode, seed)
  const shapeRealmCount = lessonKinds.filter((kind) => kind === 'shape').length
  const familiar = makeTierSequence('familiar', shapeRealmCount, random)
  const advanced = makeTierSequence('advanced', shapeRealmCount, random)
  const explorer = makeTierSequence('explorer', shapeRealmCount, random)
  const lessonKindsByZone = {} as Record<ZoneId, LessonKind>
  const challenges: LearningChallenge[] = []
  let shapeRealmIndex = 0
  let mathChallengeIndex = 0

  ZONES.forEach((zone, zoneIndex) => {
    const kind = lessonKinds[zoneIndex]
    lessonKindsByZone[zone.id] = kind

    if (kind === 'shape') {
      const targets = shuffle(
        [familiar[shapeRealmIndex], advanced[shapeRealmIndex], explorer[shapeRealmIndex]],
        random,
      )
      targets.forEach((targetShape, orderIndex) => {
        const order = (orderIndex + 1) as 1 | 2 | 3
        challenges.push({
          id: `${zone.id}-${order}-shape`,
          progress: zoneLocalToWorld(zone.id, CHALLENGE_LOCAL_PROGRESS[orderIndex]),
          zoneId: zone.id,
          order,
          kind: 'shape',
          targetShape,
          choices: shapeChoices(targetShape, random),
          elevated: order === 3,
        })
      })
      shapeRealmIndex += 1
      return
    }

    const maximums = shuffle([5, 8, 10], random)
    maximums.forEach((maximum, orderIndex) => {
      const order = (orderIndex + 1) as 1 | 2 | 3
      const operator: MathOperator = (mathChallengeIndex + (seed & 1)) % 2 === 0 ? '+' : '−'
      const problem = makeMathProblem(operator, maximum, random)
      challenges.push({
        id: `${zone.id}-${order}-math`,
        progress: zoneLocalToWorld(zone.id, CHALLENGE_LOCAL_PROGRESS[orderIndex]),
        zoneId: zone.id,
        order,
        kind: 'math',
        ...problem,
        choices: mathChoices(problem.answer, random),
        elevated: order === 3,
      })
      mathChallengeIndex += 1
    })
  })

  return { mode, seed, challenges, lessonKindsByZone }
}

function answerKey(value: ShapeId | number) {
  return typeof value === 'number' ? `number:${value}` : `shape:${value}`
}

/** Builds one answer token per lane and deterministically reshuffles each run. */
export function buildLearningStops(
  challenges: readonly LearningChallenge[],
  seed = 0,
): readonly CollectibleStop[] {
  const random = seededRandom(seed ^ 0x71a1c)
  return challenges.flatMap<CollectibleStop>((challenge) => {
    if (challenge.kind === 'shape') {
      const choices = shuffle(challenge.choices, random)
      return LANES.map((lane, laneIndex): ShapeCollectibleStop => {
        const shapeId = choices[laneIndex]
        return {
          id: `${challenge.id}-lane-${laneIndex}`,
          challengeId: challenge.id,
          progress: challenge.progress,
          lane,
          label: ORDER_LABELS[challenge.order - 1],
          number: challenge.order,
          zoneId: challenge.zoneId,
          answerKey: answerKey(shapeId),
          isCorrect: shapeId === challenge.targetShape,
          elevated: challenge.elevated,
          kind: 'shape-token',
          shapeId,
          targetShape: challenge.targetShape,
        }
      })
    }

    const choices = shuffle(challenge.choices, random)
    return LANES.map((lane, laneIndex): MathCollectibleStop => {
      const numberValue = choices[laneIndex]
      return {
        id: `${challenge.id}-lane-${laneIndex}`,
        challengeId: challenge.id,
        progress: challenge.progress,
        lane,
        label: ORDER_LABELS[challenge.order - 1],
        number: challenge.order,
        zoneId: challenge.zoneId,
        answerKey: answerKey(numberValue),
        isCorrect: numberValue === challenge.answer,
        elevated: challenge.elevated,
        kind: 'number-token',
        numberValue,
        targetNumber: challenge.answer,
      }
    })
  })
}

export function getLearningChallenge(
  challenges: readonly LearningChallenge[],
  id: string,
) {
  return challenges.find((challenge) => challenge.id === id)
}

export function learningModeName(mode: LearningMode) {
  if (mode === 'math') return 'Math Quest'
  if (mode === 'mixed') return 'Surprise Mix'
  return 'Shape Trail'
}

/** Compatibility snapshots for route tooling and non-runtime previews. */
export const DEFAULT_LEARNING_JOURNEY = buildLearningJourney('shapes', 0)
export const WORLD_COLLECTIBLES = buildLearningStops(DEFAULT_LEARNING_JOURNEY.challenges, 0)
