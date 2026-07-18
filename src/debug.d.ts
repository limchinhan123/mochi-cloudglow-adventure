interface CloudglowDebugSnapshot {
  phase: string
  progress: number
  lane: number
  collected: number
  flowersGrown: number
  zone: string
  speedMode: string
  speedMultiplier: number
  isAccelerating: boolean
  obstacleProtected: boolean
  guidance: string
}

interface Window {
  __CLOUDGLOW_DEBUG__?: {
    readonly snapshot: CloudglowDebugSnapshot
  }
}
