import type { ZoneId } from '../game/worldConfig'

export interface CloudglowAudioSettings {
  storyVoice: boolean
  worldSounds: boolean
  music: boolean
}

type ZoneLayer = {
  musicGain: GainNode
  ambienceGain: GainNode
  sources: AudioScheduledSourceNode[]
}

type ZoneSoundDesign = {
  melody: readonly number[]
  bass: readonly number[]
  chord: readonly number[]
  section: 'sky-parade' | 'wonder-march' | 'grand-finale'
  filter: number
}

const ZONE_SOUND_DESIGN: Record<ZoneId, ZoneSoundDesign> = {
  garden: {
    melody: [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 783.99, 880],
    bass: [130.81, 146.83, 164.81, 146.83], chord: [261.63, 329.63, 392], section: 'sky-parade',
    filter: 880,
  },
  citadel: {
    melody: [587.33, 739.99, 880, 739.99, 659.25, 783.99, 987.77, 880],
    bass: [146.83, 164.81, 185, 164.81], chord: [293.66, 369.99, 440], section: 'sky-parade',
    filter: 1040,
  },
  reef: {
    melody: [440, 554.37, 659.25, 739.99, 659.25, 554.37, 493.88, 659.25],
    bass: [110, 123.47, 138.59, 123.47], chord: [220, 277.18, 329.63], section: 'sky-parade',
    filter: 620,
  },
  jungle: {
    melody: [493.88, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 659.25],
    bass: [123.47, 146.83, 164.81, 146.83], chord: [246.94, 293.66, 369.99], section: 'sky-parade',
    filter: 760,
  },
  desert: {
    melody: [554.37, 659.25, 830.61, 739.99, 659.25, 554.37, 622.25, 830.61],
    bass: [138.59, 164.81, 185, 155.56], chord: [277.18, 329.63, 415.3], section: 'wonder-march',
    filter: 920,
  },
  toytown: {
    melody: [659.25, 783.99, 987.77, 880, 783.99, 659.25, 587.33, 783.99],
    bass: [164.81, 196, 220, 196], chord: [329.63, 392, 493.88], section: 'wonder-march',
    filter: 980,
  },
  aurora: {
    melody: [587.33, 739.99, 880, 987.77, 880, 739.99, 659.25, 880],
    bass: [146.83, 185, 220, 185], chord: [293.66, 369.99, 440], section: 'wonder-march', filter: 1120,
  },
  dinosaur: {
    melody: [392, 493.88, 587.33, 659.25, 587.33, 493.88, 440, 587.33],
    bass: [98, 123.47, 146.83, 110], chord: [196, 246.94, 293.66], section: 'wonder-march', filter: 720,
  },
  carnival: {
    melody: [659.25, 830.61, 987.77, 1046.5, 987.77, 830.61, 739.99, 987.77],
    bass: [164.81, 207.65, 246.94, 207.65], chord: [329.63, 415.3, 493.88], section: 'grand-finale', filter: 1180,
  },
  melody: {
    melody: [587.33, 698.46, 880, 1046.5, 880, 783.99, 698.46, 987.77],
    bass: [146.83, 174.61, 220, 196], chord: [293.66, 349.23, 440], section: 'grand-finale', filter: 1080,
  },
  spaceport: {
    melody: [523.25, 659.25, 783.99, 987.77, 880, 659.25, 587.33, 783.99],
    bass: [130.81, 164.81, 196, 164.81], chord: [261.63, 329.63, 392], section: 'grand-finale', filter: 1260,
  },
  storybook: {
    melody: [698.46, 880, 1046.5, 987.77, 880, 783.99, 880, 1174.66],
    bass: [174.61, 220, 261.63, 196], chord: [349.23, 440, 523.25], section: 'grand-finale', filter: 1160,
  },
}

const SOUNDTRACK_BPM = 124
const SIXTEENTH_MS = 60_000 / SOUNDTRACK_BPM / 4

const COLLECTIBLE_NOTES = [523.25, 659.25, 783.99] as const

type AudioContextWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

function createNoiseBuffer(context: AudioContext, seconds = 2) {
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate)
  const data = buffer.getChannelData(0)
  let previous = 0

  for (let index = 0; index < data.length; index += 1) {
    const white = Math.random() * 2 - 1
    previous = previous * 0.985 + white * 0.015
    data[index] = previous * 2.6
  }

  return buffer
}

export class CloudglowAudioEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private musicBus: GainNode | null = null
  private worldBus: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private layers = new Map<ZoneId, ZoneLayer>()
  private transientSources = new Set<AudioScheduledSourceNode>()
  private currentZone: ZoneId = 'garden'
  private melodyTimer: number | null = null
  private melodyStep = 0
  private settings: CloudglowAudioSettings = {
    storyVoice: true,
    worldSounds: true,
    music: true,
  }
  private narrationDucked = false

  get started() {
    return this.context !== null
  }

  async start(zone: ZoneId) {
    if (typeof window === 'undefined') return false

    if (!this.context) {
      const AudioContextClass =
        window.AudioContext ?? (window as AudioContextWindow).webkitAudioContext
      if (!AudioContextClass) return false

      const context = new AudioContextClass()
      this.context = context
      this.master = context.createGain()
      this.musicBus = context.createGain()
      this.worldBus = context.createGain()
      this.noiseBuffer = createNoiseBuffer(context)

      this.master.gain.value = 0.82
      this.musicBus.gain.value = 0
      this.worldBus.gain.value = 0
      this.musicBus.connect(this.master)
      this.worldBus.connect(this.master)
      this.master.connect(context.destination)

      ;(Object.keys(ZONE_SOUND_DESIGN) as ZoneId[]).forEach((zoneId) => {
        this.layers.set(zoneId, this.createZoneLayer(zoneId))
      })
      this.applyVolumes(0.02)
    }

    this.currentZone = zone
    this.crossfadeTo(zone, 0.12)
    if (this.context.state !== 'running') await this.context.resume()
    this.startMelodyClock()
    return true
  }

  private createZoneLayer(zoneId: ZoneId): ZoneLayer {
    const context = this.context as AudioContext
    const design = ZONE_SOUND_DESIGN[zoneId]
    const musicGain = context.createGain()
    const ambienceGain = context.createGain()
    const sources: AudioScheduledSourceNode[] = []
    musicGain.gain.value = 0
    ambienceGain.gain.value = 0
    musicGain.connect(this.musicBus as GainNode)
    ambienceGain.connect(this.worldBus as GainNode)

    const noise = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const breath = context.createGain()
    noise.buffer = this.noiseBuffer
    noise.loop = true
    filter.type = 'lowpass'
    filter.frequency.value = design.filter
    filter.Q.value = 0.35
    breath.gain.value = zoneId === 'reef' ? 0.035 : 0.022
    noise.connect(filter)
    filter.connect(breath)
    breath.connect(ambienceGain)
    noise.start()
    sources.push(noise)

    return { musicGain, ambienceGain, sources }
  }

  setSettings(settings: CloudglowAudioSettings) {
    this.settings = settings
    this.applyVolumes(0.22)
  }

  setNarrationDucked(ducked: boolean) {
    this.narrationDucked = ducked
    this.applyVolumes(ducked ? 0.12 : 0.4)
  }

  private applyVolumes(duration: number) {
    if (!this.context || !this.musicBus || !this.worldBus) return
    const now = this.context.currentTime
    // Music sits just above ambience when exploring, then drops by roughly
    // 16 dB beneath narration so spoken learning cues remain effortless.
    const musicTarget = this.settings.music ? (this.narrationDucked ? 0.05 : 0.3) : 0
    const worldTarget = this.settings.worldSounds ? (this.narrationDucked ? 0.115 : 0.27) : 0

    this.musicBus.gain.cancelScheduledValues(now)
    this.worldBus.gain.cancelScheduledValues(now)
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, now)
    this.worldBus.gain.setValueAtTime(this.worldBus.gain.value, now)
    this.musicBus.gain.linearRampToValueAtTime(musicTarget, now + duration)
    this.worldBus.gain.linearRampToValueAtTime(worldTarget, now + duration)
  }

  setZone(zone: ZoneId) {
    this.currentZone = zone
    this.melodyStep = 0
    this.crossfadeTo(zone, 2.4)
  }

  private startMelodyClock() {
    if (this.melodyTimer !== null || typeof window === 'undefined') return

    const tick = () => {
      this.melodyTimer = null
      if (this.context && this.context.state === 'running' && this.settings.music) {
        const design = ZONE_SOUND_DESIGN[this.currentZone]
        const phraseStep = this.melodyStep % 32
        const barStep = phraseStep % 16
        const melodyIndex = Math.floor(barStep / 2) % design.melody.length
        const sectionLift = design.section === 'grand-finale' ? 1.08 : 1

        if (barStep % 2 === 0 && barStep !== 14) {
          this.playMusicVoice(
            design.melody[melodyIndex] * sectionLift,
            'marimba',
            barStep === 0 ? 0.082 : 0.062,
            0.3,
          )
        }
        if (barStep % 4 === 0) {
          this.playMusicVoice(
            design.bass[Math.floor(barStep / 4) % design.bass.length],
            'bass',
            0.075,
            0.38,
          )
          this.playParadePercussion('kick', barStep === 0 ? 1 : 0.78)
        } else if (barStep % 4 === 2) {
          this.playParadePercussion('clap', 0.52)
        }
        if (barStep === 7 || barStep === 15) {
          this.playMusicVoice(design.melody[(melodyIndex + 2) % design.melody.length] * 2, 'sparkle', 0.026, 0.42)
        }
        if (
          (design.section === 'wonder-march' && barStep === 12) ||
          (design.section === 'grand-finale' && (barStep === 4 || barStep === 12))
        ) {
          design.chord.forEach((frequency, index) => {
            this.playMusicVoice(frequency * 2, 'brass', 0.022 - index * 0.002, 0.34)
          })
        }
        this.melodyStep += 1
      }

      if (this.context) {
        const swing = this.melodyStep % 2 === 0 ? 0.97 : 1.03
        this.melodyTimer = window.setTimeout(tick, SIXTEENTH_MS * swing)
      }
    }

    this.melodyTimer = window.setTimeout(tick, 260)
  }

  private playMusicVoice(
    frequency: number,
    instrument: 'marimba' | 'bass' | 'sparkle' | 'brass',
    volume: number,
    duration: number,
  ) {
    if (!this.context) return
    const layer = this.layers.get(this.currentZone)
    if (!layer) return
    const now = this.context.currentTime
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    const filter = this.context.createBiquadFilter()
    oscillator.type = instrument === 'bass' ? 'sine' : instrument === 'sparkle' ? 'sine' : 'triangle'
    oscillator.frequency.setValueAtTime(frequency * (instrument === 'marimba' ? 1.012 : 1), now)
    oscillator.frequency.exponentialRampToValueAtTime(frequency, now + 0.035)
    filter.type = 'lowpass'
    filter.frequency.value = instrument === 'bass'
      ? Math.min(520, frequency * 3.2)
      : instrument === 'brass'
        ? Math.min(2_200, frequency * 2.8)
        : Math.min(3_600, frequency * 4.8)
    filter.Q.value = instrument === 'marimba' ? 1.2 : 0.22
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(volume, now + (instrument === 'brass' ? 0.035 : 0.008))
    gain.gain.exponentialRampToValueAtTime(
      instrument === 'brass' ? volume * 0.42 : volume * 0.24,
      now + duration * 0.34,
    )
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(filter)
    filter.connect(gain)
    gain.connect(layer.musicGain)
    this.trackTransient(oscillator, [filter, gain])
    oscillator.start(now)
    oscillator.stop(now + duration + 0.03)
  }

  private playParadePercussion(kind: 'kick' | 'clap', accent: number) {
    if (!this.context) return
    const layer = this.layers.get(this.currentZone)
    if (!layer) return
    const now = this.context.currentTime

    if (kind === 'kick') {
      const oscillator = this.context.createOscillator()
      const gain = this.context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(118, now)
      oscillator.frequency.exponentialRampToValueAtTime(48, now + 0.12)
      gain.gain.setValueAtTime(0.06 * accent, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)
      oscillator.connect(gain)
      gain.connect(layer.musicGain)
      this.trackTransient(oscillator, [gain])
      oscillator.start(now)
      oscillator.stop(now + 0.2)
      return
    }

    if (!this.noiseBuffer) return
    const source = this.context.createBufferSource()
    const filter = this.context.createBiquadFilter()
    const gain = this.context.createGain()
    source.buffer = this.noiseBuffer
    filter.type = 'bandpass'
    filter.frequency.value = 2_300
    filter.Q.value = 0.7
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.025 * accent, now + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(layer.musicGain)
    this.trackTransient(source, [filter, gain])
    source.start(now)
    source.stop(now + 0.1)
  }

  private trackTransient(source: AudioScheduledSourceNode, nodes: AudioNode[] = []) {
    this.transientSources.add(source)
    source.addEventListener(
      'ended',
      () => {
        this.transientSources.delete(source)
        source.disconnect()
        nodes.forEach((node) => node.disconnect())
      },
      { once: true },
    )
  }

  private crossfadeTo(zone: ZoneId, duration: number) {
    if (!this.context) return
    const now = this.context.currentTime
    this.layers.forEach((layer, layerZone) => {
      const target = layerZone === zone ? 1 : 0
      for (const gain of [layer.musicGain.gain, layer.ambienceGain.gain]) {
        gain.cancelScheduledValues(now)
        gain.setValueAtTime(gain.value, now)
        gain.linearRampToValueAtTime(target, now + duration)
      }
    })
  }

  private playTone(
    frequency: number,
    delay: number,
    duration: number,
    volume: number,
    wave: OscillatorType = 'sine',
  ) {
    if (!this.context || !this.worldBus) return
    const startAt = this.context.currentTime + delay
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = wave
    oscillator.frequency.setValueAtTime(frequency, startAt)
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.025)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
    oscillator.connect(gain)
    gain.connect(this.worldBus)
    this.trackTransient(oscillator, [gain])
    oscillator.start(startAt)
    oscillator.stop(startAt + duration + 0.04)
  }

  playCollectible(number: 1 | 2 | 3) {
    this.playTone(COLLECTIBLE_NOTES[number - 1], 0, 0.58, 0.23, 'sine')
    this.playTone(COLLECTIBLE_NOTES[number - 1] * 2, 0.045, 0.34, 0.065, 'triangle')
    if (number === 3) {
      COLLECTIBLE_NOTES.forEach((frequency, index) => {
        this.playTone(frequency, 0.18 + index * 0.035, 0.72, 0.095, 'sine')
      })
    }
  }

  playShapeSuccess(number: 1 | 2 | 3) {
    this.playCollectible(number)
    this.playTone(1046.5, 0.14, 0.52, 0.055, 'sine')
  }

  playShapeTryAgain() {
    // A neutral pollen-like flutter: no buzzer, downward failure cadence or voice.
    this.playTone(392, 0, 0.22, 0.045, 'sine')
    this.playTone(493.88, 0.08, 0.28, 0.038, 'triangle')
  }

  playLaneSwish(direction: -1 | 1) {
    if (!this.context || !this.worldBus || !this.noiseBuffer) return
    const now = this.context.currentTime
    const source = this.context.createBufferSource()
    const filter = this.context.createBiquadFilter()
    const gain = this.context.createGain()
    const panner = this.context.createStereoPanner()
    source.buffer = this.noiseBuffer
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(920, now)
    filter.frequency.exponentialRampToValueAtTime(1750, now + 0.24)
    filter.Q.value = 0.7
    panner.pan.value = direction * 0.42
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.025)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.31)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(panner)
    panner.connect(this.worldBus)
    this.trackTransient(source, [filter, gain, panner])
    source.start(now)
    source.stop(now + 0.34)
  }

  playPuff() {
    if (!this.context || !this.worldBus || !this.noiseBuffer) return
    const now = this.context.currentTime
    const source = this.context.createBufferSource()
    const filter = this.context.createBiquadFilter()
    const gain = this.context.createGain()
    source.buffer = this.noiseBuffer
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(680, now)
    filter.frequency.exponentialRampToValueAtTime(190, now + 0.42)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.worldBus)
    this.trackTransient(source, [filter, gain])
    source.start(now)
    source.stop(now + 0.52)
    this.playTone(155, 0, 0.4, 0.09, 'sine')
    this.playTone(116, 0.08, 0.38, 0.065, 'sine')
  }

  playBounce() {
    this.playTone(440, 0, 0.28, 0.11, 'triangle')
    this.playTone(659.25, 0.09, 0.33, 0.095, 'sine')
    this.playTone(880, 0.18, 0.4, 0.075, 'sine')
  }

  dispose() {
    if (this.melodyTimer !== null) {
      window.clearTimeout(this.melodyTimer)
      this.melodyTimer = null
    }
    this.transientSources.forEach((source) => {
      try {
        source.stop()
      } catch {
        // The short procedural note may already have completed.
      }
    })
    this.transientSources.clear()
    this.layers.forEach((layer) => {
      layer.sources.forEach((source) => {
        try {
          source.stop()
        } catch {
          // A browser may already have stopped the node during page teardown.
        }
      })
      layer.musicGain.disconnect()
      layer.ambienceGain.disconnect()
    })
    this.layers.clear()
    void this.context?.close()
    this.context = null
    this.master = null
    this.musicBus = null
    this.worldBus = null
    this.noiseBuffer = null
    this.melodyStep = 0
  }
}
