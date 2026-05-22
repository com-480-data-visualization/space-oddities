import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import './DebrisCloud3D.css'

const EARTH_RADIUS_KM = 6371
// Scale down so it fits nicely in the camera view (e.g. Earth r = 1)
const SCALE = 1 / EARTH_RADIUS_KM

// Mappings for specific events to object name patterns in the dataset
const EVENT_MAPPINGS = {
  'cerise': ['CERISE DEB'],
  'fengyun': ['FENGYUN 1C DEB'],
  'iridium': ['IRIDIUM 33 DEB', 'COSMOS 2251 DEB'],
  'cosmos': ['COSMOS 1408 DEB']
}

function DebrisParticles({ satellites, hoveredEvent }) {
  const pointsRef = useRef()

  // Filter and compute positions for the current event
  const { positions, colors, count } = useMemo(() => {
    let activeSats = satellites.filter(s => s.hasPosition && s.category === 'debris')
    
    // If an event is hovered, filter strictly to that event's debris
    // Simple deterministic PRNG
    const pseudoRandom = (seed) => {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };

    if (hoveredEvent && EVENT_MAPPINGS[hoveredEvent.id]) {
      const matchers = EVENT_MAPPINGS[hoveredEvent.id]
      activeSats = activeSats.filter(s => matchers.some(m => s.name.toUpperCase().includes(m)))
    } else {
      // Use deterministic sort based on satellite ID to keep it stable
      activeSats = activeSats.sort((a, b) => {
        const idA = parseInt(a.id) || 0;
        const idB = parseInt(b.id) || 0;
        return pseudoRandom(idA) - pseudoRandom(idB);
      }).slice(0, 2000)
    }

    const posArray = new Float32Array(activeSats.length * 3)
    const colorArray = new Float32Array(activeSats.length * 3)
    
    const baseColor = new THREE.Color('#fb7185') // Debris red
    const highlightColor = new THREE.Color('#fcd34d') // Yellowish highlight

    activeSats.forEach((sat, i) => {
      const seed = parseInt(sat.id) || i;
      
      let px = sat.pos_x || (Math.cos(sat._angle || pseudoRandom(seed)*Math.PI*2) * sat.geoKm)
      let py = sat.pos_y || (Math.sin(sat._angle || pseudoRandom(seed+1)*Math.PI*2) * sat.geoKm)
      let pz = sat.pos_z || ((pseudoRandom(seed+2) - 0.5) * sat.geoKm * 0.5) // Fake inclination if missing

      // Scale to our 3D world
      posArray[i * 3] = px * SCALE
      posArray[i * 3 + 1] = py * SCALE
      posArray[i * 3 + 2] = pz * SCALE

      // Color logic: if it's a specific event, highlight it. Otherwise base color.
      let c = hoveredEvent ? highlightColor.clone() : baseColor.clone()
      // add slight random variation to color
      c.r += (pseudoRandom(seed+3) - 0.5) * 0.1
      c.g += (pseudoRandom(seed+4) - 0.5) * 0.1
      c.b += (pseudoRandom(seed+5) - 0.5) * 0.1

      colorArray[i * 3] = c.r
      colorArray[i * 3 + 1] = c.g
      colorArray[i * 3 + 2] = c.b
    })

    return { positions: posArray, colors: colorArray, count: activeSats.length }
  }, [satellites, hoveredEvent])

  // Optional: slow rotation
  useFrame((state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.05
      pointsRef.current.rotation.x += delta * 0.02
    }
  })

  if (count === 0) return null

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export default function DebrisCloud3D({ satellites, hoveredEvent, height = '300px' }) {
  const eventName = hoveredEvent ? hoveredEvent.name : "Background Debris (Sample)"
  
  return (
    <div className="debris-cloud-container" style={{ height }}>
      <Canvas camera={{ position: [0, 1.5, 3.5], fov: 45 }}>
        <color attach="background" args={['#040810']} />
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 3, 5]} intensity={1.5} />
        <directionalLight position={[-5, -3, -5]} intensity={0.5} color="#4338ca" />
        
        {/* Earth */}
        <Sphere args={[1, 64, 64]}>
          <meshPhongMaterial 
            color="#1d4ed8" 
            emissive="#1e3a8a"
            specular="#111827"
            shininess={15}
            flatShading={false}
          />
        </Sphere>
        
        {/* Atmosphere Glow */}
        <Sphere args={[1.05, 32, 32]}>
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} side={THREE.BackSide} />
        </Sphere>

        <DebrisParticles satellites={satellites} hoveredEvent={hoveredEvent} />
        
        <OrbitControls 
          enablePan={false} 
          minDistance={1.2} 
          maxDistance={8}
          autoRotate={!hoveredEvent}
          autoRotateSpeed={0.5}
        />
      </Canvas>
      
      <div className="debris-cloud-overlay">
        <div className="debris-cloud-title">{eventName}</div>
        <div className="debris-cloud-stats">Interactive 3D View</div>
      </div>
    </div>
  )
}
