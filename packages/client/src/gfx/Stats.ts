import StatsImpl from 'three/examples/jsm/libs/stats.module.js'
import { useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'

export function Stats() {
  const [stats] = useState(() => new (StatsImpl as any)()) // for some reason TS doesn't pick up ctor signature
  useEffect(() => {
    stats.showPanel(0)
    document.body.appendChild(stats.dom)
    return () => document.body.removeChild(stats.dom)
  }, [stats])
  return useFrame(state => {
    stats.begin()
    state.gl.render(state.scene, state.camera)
    stats.end()
  }, 1)
}
