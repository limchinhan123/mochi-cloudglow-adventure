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
  homewardStage: 'journey' | 'descending' | 'meadow-in-sight' | 'landing' | 'home'
}

interface Window {
  __CLOUDGLOW_DEBUG__?: {
    readonly snapshot: CloudglowDebugSnapshot
  }
}
