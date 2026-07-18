import { SHAPE_DEFINITIONS, type ShapeId } from '../game/worldConfig'
import type { ShapeTrailController } from '../game/useShapeTrail'

export function shapeGlyphPath(shapeId: ShapeId) {
  switch (shapeId) {
    case 'circle': return 'M24 5a19 19 0 1 0 0 38 19 19 0 0 0 0-38Z'
    case 'oval': return 'M24 7C12 7 6 14 6 24s6 17 18 17 18-7 18-17S36 7 24 7Z'
    case 'triangle': return 'M24 5 44 41H4L24 5Z'
    case 'square': return 'M7 7h34v34H7V7Z'
    case 'rectangle': return 'M4 11h40v26H4V11Z'
    case 'rhombus': return 'M24 3 40 24 24 45 8 24 24 3Z'
    case 'kite': return 'M24 3 39 21 24 45 9 21 24 3Z'
    case 'crescent': return 'M35 7C20 9 14 31 31 40 20 46 6 37 6 23 6 10 20 1 35 7Z'
    case 'star': return 'm24 3 6.1 12.4L44 17.5 34 27.2 36.4 41 24 34.5 11.6 41 14 27.2 4 17.5l13.9-2.1L24 3Z'
    case 'heart': return 'M24 42C19 35 7 29 7 18 7 8 19 5 24 14 29 5 41 8 41 18c0 11-12 17-17 24Z'
    case 'semicircle': return 'M5 37a19 19 0 0 1 38 0H5Z'
    case 'pentagon': return 'm24 4 20 15-8 24H12L4 19 24 4Z'
    case 'hexagon': return 'm13 5 22 0 11 19-11 19H13L2 24 13 5Z'
    case 'heptagon': return 'M24 3 41 12 46 30 34 44H14L2 30 7 12 24 3Z'
    case 'octagon': return 'm14 4 20 0 10 10v20L34 44H14L4 34V14L14 4Z'
    case 'nonagon': return 'M24 3 38 8 46 20 43 35 32 44H16L5 35 2 20 10 8 24 3Z'
    case 'decagon': return 'M18 3h12l11 8 5 12-5 13-11 8H18L7 36 2 23l5-12 11-8Z'
    case 'trapezium': return 'M13 8h22l10 33H3L13 8Z'
    case 'parallelogram': return 'M13 7h34L35 41H1L13 7Z'
    case 'sphere': return 'M24 4a20 20 0 1 0 0 40 20 20 0 0 0 0-40Zm0 0c10 8 10 32 0 40m0-40c-10 8-10 32 0 40M5 24h38'
    case 'cube': return 'm24 3 18 10v22L24 45 6 35V13L24 3Zm0 0v21m18-11L24 24 6 13m18 11v21'
    case 'cone': return 'M24 3 6 38c2 9 34 9 36 0L24 3Zm-18 35c4-7 32-7 36 0'
    case 'cylinder': return 'M7 11c0-9 34-9 34 0v26c0 9-34 9-34 0V11Zm0 0c0 9 34 9 34 0M7 37c0-9 34-9 34 0'
    case 'pyramid': return 'M24 3 44 39 24 45 4 39 24 3Zm0 0v42M4 39l20-9 20 9'
    case 'triangular-prism': return 'M6 34 17 8l12 26H6Zm11-26 14 6 11 26-13-6M6 34l13 6h23'
  }
}

export interface ShapeTrailPromptProps {
  shapeTrail: ShapeTrailController
}

export function ShapeTrailPrompt({ shapeTrail }: ShapeTrailPromptProps) {
  const challenge = shapeTrail.activeChallenge
  if (!challenge || shapeTrail.phase === 'cruising' || shapeTrail.phase === 'complete') return null

  const isRetrying = shapeTrail.phase === 'retrying'
  const isSkyReaching = shapeTrail.phase === 'sky-reaching'
  const isCelebrating = shapeTrail.phase === 'celebrating'
  const litThrough = isCelebrating ? challenge.order : challenge.order - 1
  const targetShape = challenge.kind === 'shape' ? challenge.targetShape : null
  const definition = targetShape
    ? SHAPE_DEFINITIONS[targetShape]
    : null
  const equation = challenge.kind === 'math'
    ? `${challenge.left} ${challenge.operator} ${challenge.right} = ?`
    : null
  const promptLabel = definition ? `Find the ${definition.name}` : `Solve ${equation}`

  return (
    <aside
      aria-label={promptLabel}
      className="shape-trail-prompt"
      data-assisted={shapeTrail.assistStopId !== null}
      data-elevated={Boolean(challenge.elevated)}
      data-kind={challenge.kind}
      data-phase={shapeTrail.phase}
    >
      <span className="shape-trail-prompt__glyph">
        {definition && targetShape ? (
          <svg aria-hidden="true" viewBox="0 0 48 48">
            <path d={shapeGlyphPath(targetShape)} />
          </svg>
        ) : (
          <b aria-hidden="true">?</b>
        )}
      </span>
      <span className="shape-trail-prompt__copy">
        <small>
          {isCelebrating
            ? challenge.kind === 'math' ? 'That is right' : 'You found it'
            : isSkyReaching
              ? 'Sky Reach'
              : isRetrying
                ? 'Try another path'
                : challenge.kind === 'math' ? 'Solve the' : 'Find the'}
        </small>
        <strong>{definition?.name ?? equation}</strong>
        {isCelebrating && (
          <em>
            {definition?.fact ?? `${challenge.kind === 'math' ? `${challenge.left} ${challenge.operator} ${challenge.right} = ${challenge.answer}` : ''}`}
          </em>
        )}
        {isRetrying && challenge.kind === 'math' && <em>Count slowly — there is no hurry.</em>}
      </span>
      <span className="shape-trail-prompt__pips" aria-hidden="true">
        {[1, 2, 3].map((order) => (
          <i className={order <= litThrough ? 'is-lit' : ''} key={order} />
        ))}
      </span>
    </aside>
  )
}
