import { useRef, useEffect, useState, useCallback } from 'react'
import * as d3 from 'd3'
import './KesslerSimulator.css'

const WIDTH = 800
const HEIGHT = 400
const HIT_RADIUS = 12
const FRAGMENTS_PER_HIT = 12
const PAYLOAD_SPEED = 0.4
const DEBRIS_SPEED_MULTI = 2.0

export default function KesslerSimulator({ height = '400px' }) {
  const svgRef = useRef(null)
  const [isRunning, setIsRunning] = useState(false)
  const [stats, setStats] = useState({ payloads: 0, debris: 0, status: 'nominal' })

  const stateRef = useRef({
    nodes: [],
    explosions: [],
    idCounter: 0,
    timer: null
  })

  const spawnPayload = useCallback(() => {
    const state = stateRef.current
    const edge = Math.floor(Math.random() * 4)
    let x, y, vx, vy
    
    if (edge === 0) {
      x = Math.random() * WIDTH
      y = -20
      vx = (Math.random() - 0.5) * PAYLOAD_SPEED
      vy = Math.random() * PAYLOAD_SPEED + 0.2
    } else if (edge === 1) {
      x = WIDTH + 20
      y = Math.random() * HEIGHT
      vx = -Math.random() * PAYLOAD_SPEED - 0.2
      vy = (Math.random() - 0.5) * PAYLOAD_SPEED
    } else if (edge === 2) {
      x = Math.random() * WIDTH
      y = HEIGHT + 20
      vx = (Math.random() - 0.5) * PAYLOAD_SPEED
      vy = -Math.random() * PAYLOAD_SPEED - 0.2
    } else {
      x = -20
      y = Math.random() * HEIGHT
      vx = Math.random() * PAYLOAD_SPEED + 0.2
      vy = (Math.random() - 0.5) * PAYLOAD_SPEED
    }

    state.nodes.push({
      id: `p-${state.idCounter++}`,
      type: 'payload',
      x, y, vx, vy,
      active: true
    })
  }, [])

  const resetSim = useCallback(() => {
    const state = stateRef.current
    if (state.timer) {
      state.timer.stop()
      state.timer = null
    }
    
    state.nodes = []
    state.explosions = []
    
    // Initial peaceful population of an orbital intersection
    for (let i = 0; i < 60; i++) {
      state.nodes.push({
        id: `p-${state.idCounter++}`,
        type: 'payload',
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT,
        vx: (Math.random() - 0.5) * PAYLOAD_SPEED * 1.5,
        vy: (Math.random() - 0.5) * PAYLOAD_SPEED * 1.5,
        active: true
      })
    }

    setStats({ payloads: 60, debris: 0, status: 'nominal' })
    setIsRunning(false)
  }, [])



  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    const state = stateRef.current

    // Make sure we only have one timer running
    if (state.timer) state.timer.stop()

    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`)
    
    // Background
    svg.append('rect')
      .attr('width', WIDTH)
      .attr('height', HEIGHT)
      .attr('fill', '#040812')

    const gExplosions = svg.append('g').attr('class', 'explosions')
    const gNodes = svg.append('g').attr('class', 'nodes')

    function explode(node) {
      node.active = false
      if (!isRunning) setIsRunning(true)

      state.explosions.push({
        id: `e-${state.idCounter++}`,
        x: node.x, y: node.y,
        r: 0, maxR: 35, life: 1
      })

      for (let i = 0; i < FRAGMENTS_PER_HIT; i++) {
        const angle = Math.random() * Math.PI * 2
        const force = Math.random() * DEBRIS_SPEED_MULTI + 0.5
        state.nodes.push({
          id: `d-${state.idCounter++}`,
          type: 'debris',
          x: node.x, y: node.y,
          vx: node.vx * 0.5 + Math.cos(angle) * force,
          vy: node.vy * 0.5 + Math.sin(angle) * force,
          active: true
        })
      }
    }

    state.timer = d3.timer(() => {
      // Spawn new payloads periodically to keep the intersection busy
      if (Math.random() < 0.04) spawnPayload()

      // Update positions and handle off-screen removal
      for (let i = 0; i < state.nodes.length; i++) {
        const n = state.nodes[i]
        if (!n.active) continue
        
        n.x += n.vx
        n.y += n.vy
        
        // Let them drift a bit off screen before despawning so they can re-enter or look natural
        if (n.x < -150 || n.x > WIDTH + 150 || n.y < -150 || n.y > HEIGHT + 150) {
          n.active = false
        }
      }

      state.nodes = state.nodes.filter(n => n.active)
      
      const payloads = []
      const debris = []
      for (let i = 0; i < state.nodes.length; i++) {
         if (state.nodes[i].type === 'payload') payloads.push(state.nodes[i])
         else debris.push(state.nodes[i])
      }

      // Physics - Quadtree Collision Check
      if (isRunning && debris.length > 0) {
        const quadtree = d3.quadtree()
          .x(d => d.x)
          .y(d => d.y)
          .addAll(debris)

        for (let i = 0; i < payloads.length; i++) {
          const p = payloads[i]
          if (!p.active) continue
          
          // Find any debris within collision radius
          const hit = quadtree.find(p.x, p.y, HIT_RADIUS)
          if (hit && hit.active) {
            explode(p)
          }
        }
      }

      // Update explosions
      for (let i = 0; i < state.explosions.length; i++) {
        const e = state.explosions[i]
        e.r += (e.maxR - e.r) * 0.15
        e.life -= 0.03
      }
      state.explosions = state.explosions.filter(e => e.life > 0)

      // --- D3 RENDERING --- //
      gExplosions.selectAll('circle')
        .data(state.explosions, d => d.id)
        .join(
          enter => enter.append('circle')
            .attr('fill', 'none')
            .attr('stroke', '#fb7185')
            .attr('stroke-width', 2),
          update => update,
          exit => exit.remove()
        )
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', d => d.r)
        .attr('opacity', d => d.life)

      const nodeSel = gNodes.selectAll('circle.node')
        .data(state.nodes, d => d.id)
        
      nodeSel.join(
        enter => enter.append('circle')
          .attr('class', d => `node ${d.type}`)
          .attr('r', d => d.type === 'payload' ? 3 : 1.5)
          .attr('fill', d => d.type === 'payload' ? '#7dd3fc' : '#fb7185')
          .attr('opacity', d => d.type === 'payload' ? 0.9 : 0.8)
          .attr('cursor', d => d.type === 'payload' ? 'crosshair' : 'default')
          .on('click', (event, d) => {
            if (d.type === 'payload') explode(d)
          }),
        update => update,
        exit => exit.remove()
      )
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)

      if (isRunning) {
        let st = 'nominal'
        if (debris.length > 400) st = 'cascading'
        else if (debris.length > 30) st = 'critical'
        
        setStats({
          payloads: payloads.length,
          debris: debris.length,
          status: st
        })
      }

    })

  }, [isRunning, spawnPayload])

  return (
    <div className="kessler-sim-container" style={{ height }}>
      <svg ref={svgRef} className="kessler-svg" style={{ width: '100%', height: '100%', display: 'block' }}></svg>
      
      {!isRunning && stats.payloads > 0 && (
        <div className="kessler-prompt">
          Click any satellite to trigger an impact
        </div>
      )}

      <div className="kessler-overlay">
        <div className="kessler-stat kessler-stat--payload">
          Crossing Payloads: {stats.payloads}
        </div>
        <div className="kessler-stat kessler-stat--debris">
          Debris Fragments: {stats.debris}
        </div>
      </div>

      <div className={`kessler-status ${stats.status}`}>
        Status: {stats.status === 'nominal' ? 'Nominal' : stats.status === 'critical' ? 'Critical' : 'Cascading Failure'}
      </div>

      <button className="kessler-reset" onClick={resetSim}>
        Reset Sector
      </button>
    </div>
  )
}