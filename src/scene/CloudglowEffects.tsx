import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import * as THREE from 'three'

type CloudglowEffectsProps = { enabled: boolean }

export function CloudglowEffects({ enabled }: CloudglowEffectsProps) {
  const { gl, scene, camera, size } = useThree()
  const composer = useMemo(() => {
    const next = new EffectComposer(gl)
    const render = new RenderPass(scene, camera)
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.18, 0.42, 1.28)
    bloom.threshold = 1.28
    bloom.strength = 0.18
    bloom.radius = 0.42
    next.addPass(render)
    next.addPass(bloom)
    next.addPass(new OutputPass())
    return next
  }, [camera, gl, scene, size.height, size.width])

  useEffect(() => {
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    composer.setSize(size.width, size.height)
    return () => composer.dispose()
  }, [composer, size.height, size.width])

  useFrame((_, delta) => {
    if (enabled) composer.render(delta)
  }, enabled ? 1 : 0)

  return null
}
