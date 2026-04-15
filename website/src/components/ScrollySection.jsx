import { useState, useEffect } from 'react'
import Chapter from './Chapter'
import VizBox from './VizBox'
import './ScrollySection.css'

const chapterIds = ['chapter-1', 'chapter-2', 'chapter-3', 'chapter-4', 'chapter-5', 'chapter-6']

export default function ScrollySection() {
  const [active, setActive] = useState('chapter-1')

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { threshold: 0.5 }
    )
    chapterIds.forEach(id => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <section className="scrolly">
        <div className="scrolly-scene">
          <div className="scene-panel">
            <div className="scene-header">
              <span className="scene-label">Scene</span>
              <span className="scene-chapter">{active.replace('-', ' ')}</span>
            </div>
            <VizBox
              label="Orbital Globe"
              note="WebGL / Canvas — ~68,000 tracked objects as points around Earth"
              height="100%"
            />
          </div>
        </div>

        <div className="scrolly-story">
          <Chapter
            id="chapter-1"
            number={1}
            title="The Exponential Growth"
            body='How the "Starlink era" post-2019 fundamentally changed orbital density. A line chart tracks cumulative launches. As the user scrolls, a red bar appears post-2019, and thousands of new points swarm the LEO region on the main scene.'
            isActive={active === 'chapter-1'}
          >
            <div className="chapter-control">
              <label className="control-label">
                Launch year: <strong>2026</strong>
              </label>
              <input type="range" min="1957" max="2026" defaultValue="2026" className="year-slider" disabled />
              <span className="control-note">Scroll-linked — will animate the scene forward in time</span>
            </div>
            <VizBox
              label="Line / Area Chart — Cumulative launches 1957–2026"
              note="D3.js · Starlink crossover annotated · red highlight post-2019"
              height="160px"
            />
          </Chapter>

          <Chapter
            id="chapter-2"
            number={2}
            title="The New Space Race"
            body="Which countries and companies dominate the sky? A bar chart of the top operators lets the user hover over any entity — e.g. SpaceX — to highlight its specific satellite shell on the 3D scene while all others fade out."
            isActive={active === 'chapter-2'}
          >
            <VizBox
              label="Bar Chart — Top operators by object count"
              note="D3.js · Hover-to-highlight linked to the 3D scene"
              height="180px"
            />
          </Chapter>

          <Chapter
            id="chapter-3"
            number={3}
            title="Payloads vs. Debris"
            body="Of the 68,148 tracked objects, only ~14,700 are active satellites. The rest are debris, rocket bodies, and fragments. A filter lets the user switch to Debris Only, revealing the cloud of abandoned hardware surrounding Earth."
            isActive={active === 'chapter-3'}
          >
            <div className="filter-row">
              {['All objects', 'Payloads only', 'Debris only', 'Rocket bodies'].map(label => (
                <button key={label} className="filter-btn" disabled>{label}</button>
              ))}
            </div>
            <VizBox
              label="Pie / Donut Chart — Object type breakdown"
              note="D3.js · Active payloads / Debris / Rocket bodies / Other"
              height="160px"
            />
          </Chapter>
        </div>
      </section>

      <section className="scrolly-solo">
        <Chapter
          id="chapter-4"
          number={4}
          title="Kessler Syndrome"
          body="One collision can create thousands of fragments, each capable of triggering more collisions. This chapter animates the 2007 Chinese ASAT test — which generated over 150,000 debris particles — as a 2D cascade: two objects collide, their fragments hit others, and the debris ring thickens with each step."
          isActive={active === 'chapter-4'}
        >
          <VizBox
            label="2D Canvas Animation — Kessler cascade"
            note="Procedural · ASAT test scenario · debris chain reaction"
            height="340px"
          />
        </Chapter>

        <Chapter
          id="chapter-5"
          number={5}
          title='Visualizing the "Invisible" Risk'
          body="A 385 m miss distance sounds safe — until you realise it takes 0.055 seconds at 7 km/s. To make CDM tables human-readable, this chapter zooms into the GEOSAT / PSLV close approach and adds a car-scale comparison: two vehicles on a highway with only 76 cm between them."
          isActive={active === 'chapter-5'}
        >
          <div className="side-by-side">
            <VizBox
              label="Orbit close-approach animation"
              note="Two objects converging · 385 m gap highlighted"
              height="220px"
            />
            <VizBox
              label="Car highway comparison"
              note="50 km/h · 76 cm gap · same 0.055 s window"
              height="220px"
            />
          </div>
        </Chapter>

        <Chapter
          id="chapter-6"
          number={6}
          title="The Margin of Error"
          body="Satellites are not points — they are probability volumes. This chapter replaces discrete dots with 3D Error Tubes: covariance ellipsoids derived from TLE uncertainty. As the user scrolls through the Time of Closest Approach (TCA), the two tubes converge and overlap, showing why 385 m is an emergency-reportable miss."
          isActive={active === 'chapter-6'}
        >
          <VizBox
            label="3D Error Tubes — covariance ellipsoids at TCA"
            note="Three.js / WebGL · TLE uncertainty volumes · scroll through TCA"
            height="340px"
          />
        </Chapter>
      </section>
    </>
  )
}
