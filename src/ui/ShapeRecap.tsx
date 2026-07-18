import type { LearningChallenge } from '../game/learningCurriculum'
import { SHAPE_DEFINITIONS, ZONES } from '../game/worldConfig'
import { shapeGlyphPath } from './ShapeTrailPrompt'

export interface ShapeRecapProps {
  challenges: readonly LearningChallenge[]
  completedChallengeIds: ReadonlySet<string>
}

export function ShapeRecap({ challenges, completedChallengeIds }: ShapeRecapProps) {
  return (
    <div className="shape-recap" aria-label="Twelve realm learning trail recap">
      {ZONES.map((zone) => {
        const zoneChallenges = challenges.filter((challenge) => challenge.zoneId === zone.id)
        const completed = zoneChallenges.filter((challenge) => completedChallengeIds.has(challenge.id)).length
        return (
          <section className="shape-recap__realm" data-complete={completed === zoneChallenges.length} key={zone.id}>
            <span className="shape-recap__name">{zone.shortName}</span>
            <span className="shape-recap__shapes">
              {zoneChallenges.map((challenge) => {
                const found = completedChallengeIds.has(challenge.id)
                const color = challenge.kind === 'shape'
                  ? SHAPE_DEFINITIONS[challenge.targetShape].color
                  : '#f0b36f'
                return (
                  <span
                    className="shape-recap__glyph"
                    data-found={found}
                    key={challenge.id}
                    style={{ '--shape-color': color } as React.CSSProperties}
                  >
                    {challenge.kind === 'shape' ? (
                      <svg aria-hidden="true" viewBox="0 0 48 48">
                        <path d={shapeGlyphPath(challenge.targetShape)} />
                      </svg>
                    ) : (
                      <b>{challenge.answer}</b>
                    )}
                  </span>
                )
              })}
            </span>
          </section>
        )
      })}
    </div>
  )
}
