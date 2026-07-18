import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent,
  PointerEvent,
  ReactNode,
} from 'react'
import type { CloudglowGame, CloudglowGuidance } from '../game/useCloudglowGame'
import { SPEED_MODES, ZONES, ZONE_COUNT, type LearningMode, type SpeedMode } from '../game/worldConfig'
import { ShapeRecap } from './ShapeRecap'
import { ShapeTrailPrompt } from './ShapeTrailPrompt'
import './ui.css'

export interface GameHudProps {
  game: CloudglowGame
  className?: string
}

function LeafMark({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <svg aria-hidden="true" className={mirrored ? 'icon icon--mirrored' : 'icon'} viewBox="0 0 48 48">
      <path d="M39.5 7.8C24 8.8 12.7 14.9 9.5 26.7c-2.1 7.5 3.6 13.6 11.3 11.9C32.3 36 37.6 24 39.5 7.8Z" />
      <path className="icon-line" d="M12.4 36.7c6.5-8.5 12.5-13.9 21-19.4" />
    </svg>
  )
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg aria-hidden="true" className={direction === 'right' ? 'icon icon--mirrored' : 'icon'} viewBox="0 0 48 48">
      <path className="icon-chevron" d="m29.5 10-14 14 14 14" />
    </svg>
  )
}

function SoundMark({ enabled }: { enabled: boolean }) {
  return (
    <svg aria-hidden="true" className="icon" viewBox="0 0 48 48">
      <path d="M9 20h8l11-9v26l-11-9H9v-8Z" />
      {enabled ? (
        <>
          <path className="icon-line" d="M33 18c2.8 3.1 2.8 8.9 0 12" />
          <path className="icon-line" d="M37.5 13.5c5.4 5.8 5.4 15.2 0 21" />
        </>
      ) : (
        <path className="icon-line" d="m34 19 8 10m0-10-8 10" />
      )}
    </svg>
  )
}

function PauseMark() {
  return (
    <svg aria-hidden="true" className="icon" viewBox="0 0 48 48">
      <rect x="13" y="10" width="8" height="28" rx="4" />
      <rect x="27" y="10" width="8" height="28" rx="4" />
    </svg>
  )
}

function SparkMark() {
  return (
    <svg aria-hidden="true" className="icon" viewBox="0 0 48 48">
      <path d="M24 4c1.7 10.9 7.1 16.3 18 18-10.9 1.7-16.3 7.1-18 18-1.7-10.9-7.1-16.3-18-18C16.9 20.3 22.3 14.9 24 4Z" />
      <circle cx="39" cy="9" r="3" />
      <circle cx="10" cy="37" r="2.5" />
    </svg>
  )
}

function FlowerMark() {
  return (
    <svg aria-hidden="true" className="icon" viewBox="0 0 48 48">
      <path d="M24 20C12 20 8.5 9.5 15 6c5-2.8 8 3 9 8 1-5 4-10.8 9-8 6.5 3.5 3 14-9 14Z" />
      <path d="M28 24c0-12 10.5-15.5 14-9 2.8 5-3 8-8 9 5 1 10.8 4 8 9-3.5 6.5-14 3-14-9Z" />
      <path d="M24 28c12 0 15.5 10.5 9 14-5 2.8-8-3-9-8-1 5-4 10.8-9 8-6.5-3.5-3-14 9-14Z" />
      <path d="M20 24c0 12-10.5 15.5-14 9-2.8-5 3-8 8-9-5-1-10.8-4-8-9 3.5-6.5 14-3 14 9Z" />
      <circle className="icon-center" cx="24" cy="24" r="6" />
    </svg>
  )
}

function MusicMark() {
  return (
    <svg aria-hidden="true" className="icon" viewBox="0 0 48 48">
      <path d="M18 11v23.2a7 7 0 1 1-4-6.3V15l23-5v19.2a7 7 0 1 1-4-6.3V11.7L18 15v-4Z" />
    </svg>
  )
}

function WorldSoundMark() {
  return (
    <svg aria-hidden="true" className="icon" viewBox="0 0 48 48">
      <path d="M24 5c4.5 7.9 10.1 13 18 17-7.9 4-13.5 9.1-18 17-4.5-7.9-10.1-13-18-17 7.9-4 13.5-9.1 18-17Z" />
      <path className="icon-line" d="M9 10c3 1.5 5 3.5 6.5 6.5M39 34c-3 1.5-5 3.5-6.5 6.5" />
    </svg>
  )
}

function GuidanceIcon({ icon }: { icon: CloudglowGuidance['icon'] }) {
  if (icon === 'flower') return <FlowerMark />
  if (icon === 'wing' || icon === 'glow') return <SparkMark />
  return <LeafMark />
}

function PaceIcon({ mode }: { mode: SpeedMode }) {
  if (mode === 'comet') return <SparkMark />
  if (mode === 'adventure') return <WorldSoundMark />
  return <LeafMark />
}

function PointerButton({
  action,
  children,
  className,
  label,
  disabled = false,
}: {
  action: () => void
  children: ReactNode
  className: string
  label: string
  disabled?: boolean
}) {
  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    action()
  }
  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0) action()
  }

  return (
    <button
      aria-label={label}
      className={className}
      disabled={disabled}
      onClick={onClick}
      onPointerUp={onPointerUp}
      type="button"
    >
      {children}
    </button>
  )
}

function HoldButton({
  active,
  children,
  className,
  disabled = false,
  label,
  onHoldStart,
  onHoldStop,
}: {
  active: boolean
  children: ReactNode
  className: string
  disabled?: boolean
  label: string
  onHoldStart: () => void
  onHoldStop: () => void
}) {
  const beginHold = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    onHoldStart()
  }
  const endHold = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    onHoldStop()
  }
  const beginKeyboardHold = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== ' ' && event.key !== 'Enter') return
    event.preventDefault()
    if (!event.repeat) onHoldStart()
  }
  const endKeyboardHold = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== ' ' && event.key !== 'Enter') return
    event.preventDefault()
    onHoldStop()
  }

  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={className}
      data-active={active}
      disabled={disabled}
      onBlur={onHoldStop}
      onKeyDown={beginKeyboardHold}
      onKeyUp={endKeyboardHold}
      onLostPointerCapture={onHoldStop}
      onPointerCancel={endHold}
      onPointerDown={beginHold}
      onPointerUp={endHold}
      type="button"
    >
      {children}
    </button>
  )
}

function SpeedSelector({ game }: { game: CloudglowGame }) {
  return (
    <fieldset className="speed-selector">
      <legend>How shall Mochi fly?</legend>
      <div className="speed-selector__choices">
        {(Object.keys(SPEED_MODES) as SpeedMode[]).map((mode) => {
          const choice = SPEED_MODES[mode]
          return (
            <label className="speed-choice" data-selected={game.speedMode === mode} key={mode}>
              <input
                checked={game.speedMode === mode}
                name="cloudglow-speed"
                onChange={() => game.setSpeedMode(mode)}
                type="radio"
                value={mode}
              />
              <span className="speed-choice__icon"><PaceIcon mode={mode} /></span>
              <span className="speed-choice__copy">
                <strong>{choice.name}</strong>
                <small>{choice.description}</small>
              </span>
              <span className="speed-choice__check" aria-hidden="true">✓</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

const LEARNING_CHOICES: readonly {
  id: LearningMode
  name: string
  description: string
  mark: string
}[] = [
  { id: 'shapes', name: 'Shape Trail', description: '2D and 3D shapes', mark: '○ △ □' },
  { id: 'math', name: 'Math Quest', description: 'Add and subtract to 10', mark: '2 + 3' },
  { id: 'mixed', name: 'Surprise Mix', description: 'A new subject each realm', mark: '? ✦' },
]

function LearningModeSelector({ game }: { game: CloudglowGame }) {
  return (
    <fieldset className="learning-selector">
      <legend>Choose today’s learning trail</legend>
      <div className="learning-selector__choices">
        {LEARNING_CHOICES.map((choice) => (
          <label className="learning-choice" data-selected={game.learningMode === choice.id} key={choice.id}>
            <input
              checked={game.learningMode === choice.id}
              name="cloudglow-learning"
              onChange={() => game.setLearningMode(choice.id)}
              type="radio"
              value={choice.id}
            />
            <span className="learning-choice__mark" aria-hidden="true">{choice.mark}</span>
            <span className="learning-choice__copy">
              <strong>{choice.name}</strong>
              <small>{choice.description}</small>
            </span>
            <span className="learning-choice__check" aria-hidden="true">✓</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function AudioSettings({ game }: { game: CloudglowGame }) {
  const choices = [
    {
      label: 'Answer names',
      enabled: game.storyVoiceEnabled,
      action: game.toggleNarration,
      icon: <SoundMark enabled={game.storyVoiceEnabled} />,
    },
    {
      label: 'World sounds',
      enabled: game.worldSoundsEnabled,
      action: game.toggleWorldSounds,
      icon: <WorldSoundMark />,
    },
    {
      label: 'Music',
      enabled: game.musicEnabled,
      action: game.toggleMusic,
      icon: <MusicMark />,
    },
  ]

  return (
    <div className="audio-settings" aria-label="Garden sound choices">
      {choices.map((choice) => (
        <button
          aria-pressed={choice.enabled}
          className="audio-choice"
          data-enabled={choice.enabled}
          key={choice.label}
          onClick={choice.action}
          type="button"
        >
          <span>{choice.icon}</span>
          <strong>{choice.label}</strong>
          <small>{choice.enabled ? 'On' : 'Off'}</small>
        </button>
      ))}
    </div>
  )
}

const COUNT_WORDS = ['Three discoveries ahead', 'One found', 'Two found', 'Realm complete!'] as const

export function GameHud({ game, className = '' }: GameHudProps) {
  const overlayVisible = game.phase !== 'playing'
  const hudClassName = ['game-hud', overlayVisible ? 'game-hud--covered' : '', className]
    .filter(Boolean)
    .join(' ')
  const visibleCaption = game.audioCaption ?? game.guidance.text
  const currentLessonKind = game.shapeTrail.journey.lessonKindsByZone[game.zone.id]
  const shapePromptVisible =
    game.shapeTrail.activeChallenge !== null &&
    game.shapeTrail.phase !== 'cruising' &&
    game.shapeTrail.phase !== 'complete'

  return (
    <div className={hudClassName} data-phase={game.phase} data-zone={game.zone.id}>
      <header className="hud-toprail">
        <div className="place-plaque" aria-label={game.zone.name}>
          <span className="place-plaque__crest"><LeafMark /></span>
          <span className="place-plaque__copy">
            <small>{game.zone.shortName}</small>
            <strong>{game.zone.name}</strong>
            <span className="zone-trail" aria-label={`Realm ${ZONES.findIndex((zone) => zone.id === game.zone.id) + 1} of ${ZONE_COUNT}`}>
              {ZONES.map((zone) => (
                <i className={zone.id === game.zone.id ? 'is-current' : ''} key={zone.id} />
              ))}
            </span>
          </span>
        </div>

        {!shapePromptVisible && (
          <div
            aria-label={`${game.countInBloom} of 3 discoveries found in this realm`}
            className={`counting-card counting-card--${game.countInBloom}`}
          >
            <span className="counting-card__eyebrow">{currentLessonKind === 'math' ? 'Math Quest' : 'Shape Trail'} · {game.zone.learning}</span>
            <div className="counting-card__pips" aria-hidden="true">
              {[1, 2, 3].map((number) => (
                <span className={number <= game.countInBloom ? 'count-pip is-lit' : 'count-pip'} key={number}>
                  <span>{number}</span>
                </span>
              ))}
            </div>
            <strong className="counting-card__word">
              {COUNT_WORDS[game.countInBloom]}
            </strong>
          </div>
        )}

        <div className="hud-actions">
          <div className="harvest-tally" aria-label={`${game.flowersGrown} realms glowing; ${game.collected} of ${game.shapeTrail.challengeCount} discoveries found`}>
            <span className="harvest-tally__icon"><FlowerMark /></span>
            <span className="harvest-tally__copy">
              <small>Realms glowing</small>
              <strong>{game.flowersGrown}<i>/{ZONE_COUNT}</i></strong>
              <em>{game.collected}/{game.shapeTrail.challengeCount} discoveries</em>
            </span>
          </div>
          <button
            aria-label={game.storyVoiceEnabled ? 'Turn spoken answer names off' : 'Turn spoken answer names on'}
            aria-pressed={game.storyVoiceEnabled}
            className="round-tool"
            onClick={game.toggleNarration}
            type="button"
          >
            <SoundMark enabled={game.storyVoiceEnabled} />
          </button>
          <button
            aria-label="Pause the sky adventure"
            className="round-tool"
            disabled={!game.isPlaying}
            onClick={game.togglePause}
            type="button"
          >
            <PauseMark />
          </button>
        </div>
      </header>

      <ShapeTrailPrompt shapeTrail={game.shapeTrail} />

      {!shapePromptVisible && (
        <div aria-live="polite" className={`guidance-ribbon guidance-ribbon--${game.guidance.tone}`} role="status">
          <span className="guidance-ribbon__icon"><GuidanceIcon icon={game.guidance.icon} /></span>
          <span className="guidance-ribbon__text">{visibleCaption}</span>
          {game.guidance.tone === 'hint' && (
            <span className="guidance-ribbon__keys" aria-hidden="true">A&nbsp;&nbsp; D</span>
          )}
        </div>
      )}

      <nav aria-label="Mochi flight controls" className="flight-controls">
        <PointerButton action={game.moveLeft} className="leaf-control leaf-control--left" disabled={!game.isPlaying} label="Glide Mochi one path to the left">
          <span className="leaf-control__leaf"><LeafMark mirrored /></span>
          <span className="leaf-control__arrow"><Chevron direction="left" /></span>
          <span className="leaf-control__copy"><small>A</small><strong>Glide left</strong></span>
        </PointerButton>

        <div className="center-flight-controls">
          <HoldButton
            active={game.isAccelerating}
            className="accelerate-control"
            disabled={!game.isPlaying || game.shapeTrail.phase !== 'cruising'}
            label="Hold to accelerate Mochi; release to return to cruise speed"
            onHoldStart={game.startAccelerating}
            onHoldStop={game.stopAccelerating}
          >
            <span className="accelerate-control__icon" aria-hidden="true">↑</span>
            <span className="accelerate-control__copy">
              <strong>{game.isAccelerating ? 'Zooming!' : 'Accelerate'}</strong>
              <small>Hold ↑</small>
            </span>
          </HoldButton>

          <PointerButton action={game.magicBounce} className="bounce-control" disabled={!game.isPlaying} label="Give Mochi a magic cloud bounce">
            <span className="bounce-control__icon"><SparkMark /></span>
            <span className="bounce-control__copy"><strong>Cloud bounce</strong><small>Space</small></span>
          </PointerButton>
        </div>

        <PointerButton action={game.moveRight} className="leaf-control leaf-control--right" disabled={!game.isPlaying} label="Glide Mochi one path to the right">
          <span className="leaf-control__leaf"><LeafMark /></span>
          <span className="leaf-control__arrow"><Chevron direction="right" /></span>
          <span className="leaf-control__copy"><small>D</small><strong>Glide right</strong></span>
        </PointerButton>
      </nav>

      {overlayVisible && (
        <div className="story-overlay" role="presentation">
          <div className={`storybook-card storybook-card--${game.phase}`} role="dialog" aria-modal="true">
            <span className="storybook-card__leaf storybook-card__leaf--one"><LeafMark /></span>
            <span className="storybook-card__leaf storybook-card__leaf--two"><LeafMark mirrored /></span>

            {game.phase === 'ready' && (
              <>
                <span className="storybook-card__eyebrow">Twelve realms · thirty-six discoveries · one smooth journey</span>
                <div className="storybook-card__emblem"><FlowerMark /></div>
                <h1>Mochi’s<br />Learning Adventure</h1>
                <p>Choose shapes, little maths, or a balanced surprise. Three friendly answers appear in every magical realm.</p>
                <LearningModeSelector game={game} />
                <SpeedSelector game={game} />
                <AudioSettings game={game} />
                <button className="storybook-primary" onClick={game.begin} type="button">
                  <span>{game.resumeAvailable ? `Continue at realm ${game.resumeRealm}` : 'Wake the sky path'}</span><LeafMark />
                </button>
                {game.resumeAvailable && (
                  <button className="storybook-secondary" onClick={game.restart} type="button">Start a fresh {game.learningModeLabel}</button>
                )}
                <small className="storybook-card__aside">Three big paths · no timer · no wrong-answer penalty</small>
              </>
            )}

            {game.phase === 'paused' && (
              <>
                <span className="storybook-card__eyebrow">A quiet cloud-pause · {game.zone.shortName}</span>
                <h1>The clouds are waiting</h1>
                <p>Mochi will stay right here. You can choose a new breeze or make the world quieter.</p>
                <SpeedSelector game={game} />
                <AudioSettings game={game} />
                <button className="storybook-primary" onClick={game.begin} type="button">
                  <span>Keep exploring</span><LeafMark />
                </button>
                <button className="storybook-secondary" onClick={game.restart} type="button">Begin all twelve realms again</button>
              </>
            )}

            {game.phase === 'celebrating' && (
              <>
                <span className="storybook-card__eyebrow">The whole {game.learningModeLabel} is glowing</span>
                <div className="storybook-card__emblem storybook-card__emblem--glowing"><FlowerMark /></div>
                <h1>All twelve realms<br />are glowing!</h1>
                <p>You solved <strong>{game.collected} discoveries</strong> across <strong>{game.flowersGrown} magical realms</strong>.</p>
                <ShapeRecap challenges={game.shapeTrail.challenges} completedChallengeIds={game.completedChallengeIds} />
                <button className="storybook-primary" onClick={game.restart} type="button">
                  <span>Fly the learning trail again</span><LeafMark />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default GameHud
