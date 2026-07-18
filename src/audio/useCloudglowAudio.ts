import { useCallback, useEffect, useRef, useState } from 'react'
import type { ZoneId } from '../game/worldConfig'
import {
  CloudglowAudioEngine,
  type CloudglowAudioSettings,
} from './cloudglowAudio'

export type NarrationPriority =
  | 'flavor'
  | 'celebration'
  | 'guidance'
  | 'learning'
  | 'safety'

type NarrationItem = {
  id: number
  key: string
  text: string
  caption: string
  priority: NarrationPriority
}

const PRIORITY: Record<NarrationPriority, number> = {
  flavor: 0,
  celebration: 1,
  guidance: 2,
  learning: 3,
  safety: 4,
}

const AUDIO_SETTINGS_KEY = 'cloudglow.audio.v1'
const DEFAULT_SETTINGS: CloudglowAudioSettings = {
  storyVoice: true,
  worldSounds: true,
  music: true,
}

function loadAudioSettings(): CloudglowAudioSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const saved = JSON.parse(window.localStorage.getItem(AUDIO_SETTINGS_KEY) ?? '{}') as Partial<CloudglowAudioSettings>
    return {
      storyVoice: saved.storyVoice ?? true,
      worldSounds: saved.worldSounds ?? true,
      music: saved.music ?? true,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function chooseVoice(voices: SpeechSynthesisVoice[]) {
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'))
  return (
    english.find((voice) => /^en-(sg|au|gb)$/i.test(voice.lang)) ??
    english.find((voice) => /samantha|karen|moira|serena|ava/i.test(voice.name)) ??
    english[0]
  )
}

export interface CloudglowAudioApi {
  started: boolean
  caption: string | null
  settings: CloudglowAudioSettings
  start: (zone: ZoneId) => Promise<boolean>
  setZone: (zone: ZoneId) => void
  narrate: (
    text: string,
    priority?: NarrationPriority,
    key?: string,
    caption?: string,
  ) => void
  cancelNarration: () => void
  setStoryVoice: (enabled: boolean) => void
  setWorldSounds: (enabled: boolean) => void
  setMusic: (enabled: boolean) => void
  playCollectible: (number: 1 | 2 | 3) => void
  playShapeSuccess: (number: 1 | 2 | 3) => void
  playShapeTryAgain: () => void
  playLaneSwish: (direction: -1 | 1) => void
  playPuff: () => void
  playBounce: () => void
  playHomecoming: () => void
}

export function useCloudglowAudio(): CloudglowAudioApi {
  const [started, setStarted] = useState(false)
  const [settings, setSettings] = useState<CloudglowAudioSettings>(loadAudioSettings)
  const [caption, setCaption] = useState<string | null>(null)
  const engineRef = useRef<CloudglowAudioEngine | null>(null)
  const queueRef = useRef<NarrationItem[]>([])
  const currentRef = useRef<NarrationItem | null>(null)
  const nextIdRef = useRef(1)
  const settingsRef = useRef(settings)
  const captionTimerRef = useRef<number | null>(null)
  const pumpTimerRef = useRef<number | null>(null)
  const pumpRef = useRef<() => void>(() => undefined)

  settingsRef.current = settings

  const showCaption = useCallback((text: string) => {
    setCaption(text)
    if (captionTimerRef.current !== null) window.clearTimeout(captionTimerRef.current)
    const wordCount = text.trim().split(/\s+/).length
    captionTimerRef.current = window.setTimeout(
      () => setCaption(null),
      Math.max(2_400, Math.min(6_000, wordCount * 430)),
    )
  }, [])

  const schedulePump = useCallback((delay: number) => {
    if (pumpTimerRef.current !== null) window.clearTimeout(pumpTimerRef.current)
    pumpTimerRef.current = window.setTimeout(() => {
      pumpTimerRef.current = null
      pumpRef.current()
    }, delay)
  }, [])

  const finishNarration = useCallback((id: number) => {
    if (currentRef.current?.id !== id) return
    currentRef.current = null
    engineRef.current?.setNarrationDucked(false)
    schedulePump(70)
  }, [schedulePump])

  pumpRef.current = () => {
    if (
      currentRef.current ||
      !settingsRef.current.storyVoice ||
      typeof window === 'undefined' ||
      !('speechSynthesis' in window)
    ) {
      return
    }

    const item = queueRef.current.shift()
    if (!item) {
      engineRef.current?.setNarrationDucked(false)
      return
    }

    currentRef.current = item
    const utterance = new SpeechSynthesisUtterance(item.text)
    const voice = chooseVoice(window.speechSynthesis.getVoices())
    if (voice) utterance.voice = voice
    utterance.lang = voice?.lang ?? 'en-SG'
    utterance.rate = item.priority === 'learning' ? 0.86 : 0.9
    utterance.pitch = 1.1
    utterance.volume = 0.9
    utterance.onend = () => finishNarration(item.id)
    utterance.onerror = () => finishNarration(item.id)
    engineRef.current?.setNarrationDucked(true)
    window.speechSynthesis.speak(utterance)
  }

  const start = useCallback(async (zone: ZoneId) => {
    if (!engineRef.current) engineRef.current = new CloudglowAudioEngine()
    engineRef.current.setSettings(settingsRef.current)
    const didStart = await engineRef.current.start(zone)
    setStarted(didStart)
    return didStart
  }, [])

  const setZone = useCallback((zone: ZoneId) => {
    engineRef.current?.setZone(zone)
  }, [])

  const cancelNarration = useCallback(() => {
    queueRef.current = []
    currentRef.current = null
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    engineRef.current?.setNarrationDucked(false)
  }, [])

  const narrate = useCallback(
    (
      text: string,
      priority: NarrationPriority = 'guidance',
      key = text,
      visibleCaption = text,
    ) => {
      showCaption(visibleCaption)
      if (!settingsRef.current.storyVoice) return
      if (currentRef.current?.key === key || queueRef.current.some((item) => item.key === key)) return

      const item: NarrationItem = {
        id: nextIdRef.current,
        key,
        text,
        caption: visibleCaption,
        priority,
      }
      nextIdRef.current += 1

      const current = currentRef.current
      const canInterrupt =
        current !== null &&
        PRIORITY[priority] > PRIORITY[current.priority] &&
        current.priority !== 'learning' &&
        current.priority !== 'safety'

      if (canInterrupt && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        currentRef.current = null
        window.speechSynthesis.cancel()
        queueRef.current.unshift(item)
        engineRef.current?.setNarrationDucked(false)
        schedulePump(50)
        return
      }

      queueRef.current.push(item)
      queueRef.current.sort((left, right) => PRIORITY[right.priority] - PRIORITY[left.priority])
      pumpRef.current()
    },
    [schedulePump, showCaption],
  )

  const updateSetting = useCallback(
    (key: keyof CloudglowAudioSettings, enabled: boolean) => {
      setSettings((current) => ({ ...current, [key]: enabled }))
      if (key === 'storyVoice' && !enabled) cancelNarration()
    },
    [cancelNarration],
  )

  const setStoryVoice = useCallback(
    (enabled: boolean) => updateSetting('storyVoice', enabled),
    [updateSetting],
  )
  const setWorldSounds = useCallback(
    (enabled: boolean) => updateSetting('worldSounds', enabled),
    [updateSetting],
  )
  const setMusic = useCallback(
    (enabled: boolean) => updateSetting('music', enabled),
    [updateSetting],
  )

  const playCollectible = useCallback((number: 1 | 2 | 3) => {
    engineRef.current?.playCollectible(number)
  }, [])
  const playShapeSuccess = useCallback((number: 1 | 2 | 3) => {
    engineRef.current?.playShapeSuccess(number)
  }, [])
  const playShapeTryAgain = useCallback(() => {
    engineRef.current?.playShapeTryAgain()
  }, [])
  const playLaneSwish = useCallback((direction: -1 | 1) => {
    engineRef.current?.playLaneSwish(direction)
  }, [])
  const playPuff = useCallback(() => engineRef.current?.playPuff(), [])
  const playBounce = useCallback(() => engineRef.current?.playBounce(), [])
  const playHomecoming = useCallback(() => engineRef.current?.playHomecoming(), [])

  useEffect(() => {
    engineRef.current?.setSettings(settings)
    try {
      window.localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // The game remains fully playable when storage is unavailable.
    }
  }, [settings])

  useEffect(
    () => () => {
      if (captionTimerRef.current !== null) window.clearTimeout(captionTimerRef.current)
      if (pumpTimerRef.current !== null) window.clearTimeout(pumpTimerRef.current)
      cancelNarration()
      engineRef.current?.dispose()
      engineRef.current = null
    },
    [cancelNarration],
  )

  return {
    started,
    caption,
    settings,
    start,
    setZone,
    narrate,
    cancelNarration,
    setStoryVoice,
    setWorldSounds,
    setMusic,
    playCollectible,
    playShapeSuccess,
    playShapeTryAgain,
    playLaneSwish,
    playPuff,
    playBounce,
    playHomecoming,
  }
}
