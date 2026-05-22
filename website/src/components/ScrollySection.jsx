import { useState, useEffect, useCallback, useMemo } from 'react'
import { Tooltip } from '@mantine/core'
import Chapter from './Chapter'
import OrbitScene from './OrbitScene'
import GrowthChart from './GrowthChart'
import OrbitClassChart from './OrbitClassChart'
import OwnershipChart from './OwnershipChart'
import TypeBreakdownChart from './TypeBreakdownChart'
import TypeOwnershipWheel from './TypeOwnershipWheel'
import CdmTable from './CdmTable'
import SatelliteCard from './SatelliteCard'
import KesslerSimulator from './KesslerSimulator'
import DebrisGrowthChart from './DebrisGrowthChart'
import ApproachChart from './ApproachChart'
import CarAnimationMiss from './CarAnimationMiss'
import CovarianceViz from './CovarianceViz'
import Explainer from './Explainer'
import { useSatelliteData } from '../hooks/useSatelliteData'
import { useCdmData } from '../hooks/useCdmData'
import { useApproachData } from '../hooks/useApproachData'
import './ScrollySection.css'

const CHAPTER_IDS = ['chapter-1', 'chapter-2', 'chapter-3', 'chapter-4', 'chapter-5', 'chapter-6', 'chapter-7']


const TYPE_FILTERS = [
  { value: 'all', label: 'All objects' },
  { value: 'payload', label: 'Payloads' },
  { value: 'debris', label: 'Debris' },
  { value: 'rocket body', label: 'Rocket bodies' },
  { value: 'other', label: 'Other' },
]

const DEFAULT_TYPE_FILTER = { category: 'all', country: null, operator: null }

function sceneChapter(id) {
  if (id === 'chapter-1') return 'growth'
  if (id === 'chapter-2') return 'altitudes'
  if (id === 'chapter-3') return 'ownership'
  if (id === 'chapter-4') return 'types'
  return 'altitudes'
}

function sceneLabel(id) {
  if (id === 'chapter-1') return 'Growth Over Time'
  if (id === 'chapter-2') return 'Altitudes'
  if (id === 'chapter-3') return 'Ownership'
  if (id === 'chapter-4') return 'Object Types'
  return 'Altitudes'
}

export default function ScrollySection() {
  const [active, setActive] = useState('chapter-1')
  const [currentYear, setCurrentYear] = useState(2026)
  const [hoverBand, setHoverBand] = useState(null)
  const [ownershipHighlight, setOwnershipHighlight] = useState(null)
  const [typeView, setTypeView] = useState('simple')
  const [typeFilter, setTypeFilter] = useState(DEFAULT_TYPE_FILTER)
  const [selectedCdm, setSelectedCdm] = useState(null)
  const [tcaOffsetMin, setTcaOffsetMin] = useState(0)

  const { satellites, loading, yearRange } = useSatelliteData()
  const { cdms, loading: cdmLoading } = useCdmData(satellites)
  const [minYear, maxYear] = yearRange

  // Build a fast NORAD-ID → satellite lookup map
  const satMap = useMemo(() => new Map(satellites.map(s => [s.id, s])), [satellites])

  // Precompute approach data when CDM is selected
  const approachData = useApproachData(selectedCdm, satMap)

  // Satellite records for the selected CDM
  const cdmSat1 = selectedCdm ? satMap.get(selectedCdm.norad_id_1) : null
  const cdmSat2 = selectedCdm ? satMap.get(selectedCdm.norad_id_2) : null

  useEffect(() => { setCurrentYear(maxYear) }, [maxYear])

  // Reset offset when CDM changes
  useEffect(() => { setTcaOffsetMin(0) }, [selectedCdm])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { threshold: 0.5 }
    )
    CHAPTER_IDS.forEach(id => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (active !== 'chapter-2') setHoverBand(null)
    if (active !== 'chapter-3') setOwnershipHighlight(null)
  }, [active])

  const handleSlider = useCallback(e => setCurrentYear(Number(e.target.value)), [])
  const handleOffsetChange = useCallback(v => setTcaOffsetMin(v), [])

  const setTypeCategory = useCallback(category => {
    setTypeFilter({ category, country: null, operator: null })
  }, [])

  function matchesTypeFilter(sat) {
    if (typeFilter.category === 'all') return true
    if (sat.category !== typeFilter.category) return false
    if (typeFilter.countryValues && !typeFilter.countryValues.includes(sat.country)) return false
    if (typeFilter.country && sat.country !== typeFilter.country) return false
    if (typeFilter.operatorValues && !typeFilter.operatorValues.includes(sat.operator)) return false
    if (typeFilter.operator && sat.operator !== typeFilter.operator) return false
    return true
  }

  const visibleCount = satellites.filter(sat => {
    if (sceneChapter(active) === 'growth') return Number.isFinite(sat.launchYear) && sat.launchYear <= currentYear
    if (sceneChapter(active) === 'types') return matchesTypeFilter(sat)
    return true
  }).length

  return (
    <>
      {/* Chapters 1–4: orbit scene (sticky) + story */}
      <section className="scrolly">
        <div className="scrolly-scene">
          <div className="scene-panel">
            <div className="scene-header">
              <span className="scene-label">{sceneLabel(active)}</span>
              <span className="scene-stats">
                {loading ? 'Loading…' : <><strong>{visibleCount.toLocaleString()}</strong> objects</>}
              </span>
            </div>
            <div className="scene-canvas-wrap">
              {loading
                ? <div className="scene-loading">Loading satellite data…</div>
                : <OrbitScene
                    satellites={satellites}
                    activeChapter={sceneChapter(active)}
                    currentYear={currentYear}
                    hoverBand={hoverBand}
                    ownershipHighlight={ownershipHighlight}
                    typeFilter={typeFilter}
                  />
              }
            </div>
          </div>
        </div>

        <div className="scrolly-story">
          <Chapter
            id="chapter-1"
            number={1}
            title="The Exponential Growth"
            body={
              <>
                The orbit map estimates each object's current position from the latest{' '}
                <Tooltip
                  label="TLE stands for Two-Line Element: a compact text record that describes an object's orbit, used here to estimate where it is around Earth."
                  multiline width={260} withArrow position="top"
                >
                  <span className="term-help" tabIndex={0}>TLE</span>
                </Tooltip>{' '}
                available in our data, then filters out objects that are no longer in orbit. Drag the slider to reveal how today's orbital population built up over launch history.
              </>
            }
            isActive={active === 'chapter-1'}
          >
            <div className="chapter-control">
              <label className="control-label">
                Launch year: <strong>{currentYear}</strong>
              </label>
              <input
                type="range" min={minYear} max={maxYear} value={currentYear}
                onChange={handleSlider} className="year-slider"
              />
            </div>
            <GrowthChart satellites={satellites} currentYear={currentYear} yearRange={yearRange} isActive={active === 'chapter-1'} />
          </Chapter>

          <Chapter
            id="chapter-2"
            number={2}
            title="Where Do They Orbit?"
            body="Not all satellites share the same altitude. LEO hosts the dense Starlink swarms. MEO carries GPS networks. GEO locks weather and communications satellites in a fixed ring. Hover the bars to isolate each band."
            isActive={active === 'chapter-2'}
          >
            <OrbitClassChart satellites={satellites} onBandHover={setHoverBand} />
          </Chapter>

          <Chapter
            id="chapter-3"
            number={3}
            title="Who Owns Orbit?"
            body="Orbital space is not evenly shared. A few countries and operators account for much of the current population. Hover a bar to isolate that group on the map."
            isActive={active === 'chapter-3'}
          >
            <OwnershipChart satellites={satellites} highlight={ownershipHighlight} onHighlight={setOwnershipHighlight} />
          </Chapter>

          <Chapter
            id="chapter-4"
            number={4}
            title="Payloads vs. Debris"
            body="Not everything in orbit is a working satellite. The map separates payloads, debris, rocket bodies, and other tracked objects."
            isActive={active === 'chapter-4'}
          >
            <div className="view-toggle">
              <button
                className={`view-toggle-btn${typeView === 'simple' ? ' view-toggle-btn--active' : ''}`}
                onClick={() => { setTypeView('simple'); setTypeFilter(prev => ({ category: prev.category, country: null, operator: null })) }}
              >Simple view</button>
              <button
                className={`view-toggle-btn${typeView === 'wheel' ? ' view-toggle-btn--active' : ''}`}
                onClick={() => setTypeView('wheel')}
              >Wheel view</button>
            </div>
            {typeView === 'simple' ? (
              <>
                <div className="filter-row">
                  {TYPE_FILTERS.map(filter => (
                    <button
                      key={filter.value}
                      className={`filter-btn${typeFilter.category === filter.value && !typeFilter.country && !typeFilter.operator ? ' filter-btn--active' : ''}`}
                      onClick={() => setTypeCategory(filter.value)}
                    >{filter.label}</button>
                  ))}
                </div>
                <TypeBreakdownChart satellites={satellites} selectedCategory={typeFilter.category} onSelectCategory={setTypeCategory} />
              </>
            ) : (
              <TypeOwnershipWheel satellites={satellites} filter={typeFilter} onFilterChange={setTypeFilter} />
            )}
          </Chapter>
        </div>
      </section>

      {/* Chapter 5: Kessler syndrome */}
      <section className="scrolly-solo">
        <Chapter
          id="chapter-5"
          number={5}
          title="Kessler Syndrome"
          body="One collision can trigger a cascade: each fragment becomes a projectile capable of generating more. Above a critical orbital density, this self-sustaining chain reaction could render entire shells permanently unusable. Click any satellite to see it begin."
          isActive={active === 'chapter-5'}
        >
          <KesslerSimulator height="340px" />
          <DebrisGrowthChart />
        </Chapter>
      </section>

      {/* Chapters 6 & 7: CDM table (sticky) + approach viz + error ellipses */}
      <section className="scrolly scrolly--half">
        <div className="scrolly-scene">
          <div className="scene-panel">
            <CdmTable cdms={cdms} loading={cdmLoading} selectedCdm={selectedCdm} onSelect={setSelectedCdm} />
          </div>
        </div>

        <div className="scrolly-story">
          <Chapter
            id="chapter-6"
            number={6}
            title="Close Calls in Orbit"
            body="The table opposite lists real events from recent months where two orbiting objects came dangerously close to each other. These are called conjunction events. Click any row to explore what happened."
            isActive={active === 'chapter-6'}
          >
            <div className="cdm-sat-cards">
              <SatelliteCard label="Object 1" role="primary" sat={cdmSat1} />
              <SatelliteCard label="Object 2" role="secondary" sat={cdmSat2} />
            </div>

            <Explainer label="How do we know where satellites will be?">
              <p>
                There is no GPS in space — satellites don't broadcast their position. Instead, ground stations track them with radar, then feed that data into a simplified physics model called a <strong>TLE (Two-Line Element set)</strong>. A computer then <strong>propagates</strong> that model forward: it runs the orbital equations to estimate where the satellite will be at any future moment.
              </p>
              <p>
                The chart below shows this estimate — the predicted separation between the two objects in the 40 minutes around their closest point. The bottom of the V-curve is the <strong>TCA (Time of Closest Approach)</strong>: the moment they are nearest.
              </p>
            </Explainer>

            <ApproachChart
              cdm={selectedCdm}
              approachData={approachData}
              offsetMin={tcaOffsetMin}
              onOffsetChange={handleOffsetChange}
            />

            <Explainer label="Why is the chart minimum different from the table miss distance?" variant="warning">
              <p>
                The chart uses a model called <strong>SGP4</strong> — fast and freely available, but accurate only to about 1–5 km. Space agencies compute the authoritative miss distance using much higher-quality tracking data and more powerful algorithms. That is the value you see in the table. The chart shows the <em>shape</em> of the approach; the table shows the definitive closest distance.
              </p>
            </Explainer>

            <Explainer label="What does this miss distance feel like at a human scale?">
              <p>
                Satellites travel at roughly <strong>25,200 km/h</strong> — about 315 times faster than a car on the highway. To make the miss distance feel real, we scale it down proportionally to highway speed (80 km/h). At that scale, a 5-meter orbital miss becomes about <strong>1.6 cm</strong> — narrower than a finger. Press Play below to watch the two objects approach and narrowly pass each other.
              </p>
            </Explainer>

            <CarAnimationMiss
              cdm={selectedCdm}
              approachData={approachData}
              mode="miss"
              onProgress={handleOffsetChange}
            />
          </Chapter>

          <Chapter
            id="chapter-7"
            number={7}
            title="We Don't Know Exactly Where They Are"
            body="A miss distance of a few metres sounds close — but it assumes our predictions are perfectly accurate. They are not. Every prediction carries uncertainty, and that uncertainty is often larger than the miss distance itself."
            isActive={active === 'chapter-7'}
          >
            <Explainer label="What is position uncertainty?" variant="method">
              <p>
                When we propagate a TLE forward in time, the result is not a precise point — it's a <strong>probability cloud</strong>. The older the tracking data, the larger that cloud grows. Space agencies model this uncertainty as an <strong>error ellipsoid</strong>: a 3-D region where the satellite is most likely to be found.
              </p>
              <p>
                The visualization below shows a cross-section of those ellipsoids at the moment of closest approach. If the two clouds overlap, a collision is possible even if our best-guess positions say they'll miss. The gap between the two ellipses is almost invisible compared to the ellipses themselves — which is precisely what makes these events so hard to assess.
              </p>
            </Explainer>

            <Explainer label="Why the propagation model misses the actual close approach" variant="warning">
              <p>
                The animation below runs the same SGP4 propagation used in the approach chart, but scaled to highway speed. Notice that the cars <strong>never get as close as the CDM miss distance</strong> suggests — the model predicts a much larger gap at TCA. This is the imprecision of SGP4: it cannot predict a near-miss to metre-level accuracy. The covariance ellipses below are how we quantify and communicate that uncertainty.
              </p>
            </Explainer>

            <CarAnimationMiss
              cdm={selectedCdm}
              approachData={approachData}
              mode="propagation"
            />

            <CovarianceViz cdm={selectedCdm} satMap={satMap} />
          </Chapter>
        </div>
      </section>
    </>
  )
}
