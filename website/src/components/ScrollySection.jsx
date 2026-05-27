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
import ErrorBoundary from './ErrorBoundary'
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

export default function ScrollySection({ satellites = [], loading = true, yearRange = [1957, 2026] }) {
  const [active, setActive] = useState('chapter-1')
  const [currentYear, setCurrentYear] = useState(2026)
  const [hoverBand, setHoverBand] = useState(null)
  const [ownershipHighlight, setOwnershipHighlight] = useState(null)
  const [typeView, setTypeView] = useState('simple')
  const [typeFilter, setTypeFilter] = useState(DEFAULT_TYPE_FILTER)
  const [selectedCdm, setSelectedCdm] = useState(null)
  const [tcaOffsetMin, setTcaOffsetMin] = useState(0)

  const { cdms, loading: cdmLoading } = useCdmData(satellites)
  const [minYear, maxYear] = yearRange

  // Build a fast NORAD-ID → satellite lookup map
  const satMap = useMemo(() => new Map(satellites.map(s => [s.id, s])), [satellites])

  const debrisCount  = useMemo(() => satellites.filter(s => s.category === 'debris').length, [satellites])
  const totalCount   = satellites.length

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
      {/* Intro hook */}
      <section className="story-intro">
        <p className="story-intro-text">
          There are{' '}
          {loading
            ? 'tens of thousands of objects'
            : <><strong>{totalCount.toLocaleString()} objects</strong></>
          }{' '}
          orbiting Earth right now. About{' '}
          {loading
            ? 'half'
            : <strong>{debrisCount.toLocaleString()}</strong>
          }{' '}
          of them are debris: dead satellites, rocket parts, and shrapnel from collisions. In Low Earth Orbit (LEO), they typically travel at <strong>7 km/s</strong>: fast enough that a 1 cm fragment hits with the energy of a hand grenade. This is what that looks like, and why it matters.
        </p>
      </section>

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
            title="The Sky Is Getting Crowded"
            body={
              <>
                The orbit map continously estimates each object's position from the latest{' '}
                <Tooltip
                  label="TLE stands for Two-Line Element: a compact text record that describes an object's orbit, used here to estimate where it is around Earth."
                  multiline width={260} withArrow position="top"
                >
                  <span className="term-help" tabIndex={0}>TLE</span>
                </Tooltip>{' '}
                available in our data, then filters out objects that are no longer in orbit. Drag the slider to see how fast the population has grown, and how steeply it accelerated in the last decade.
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
            title="Most of It Is Junk"
            body="Not everything in orbit is a working satellite. Rocket stages, dead spacecraft, and collision fragments now outnumber active payloads. That debris doesn't float harmlessly: at orbital speed, even a centimetre-sized fragment carries the energy of a hand grenade, and one collision creates thousands more pieces."
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
          title="One Collision Can Trigger a Chain Reaction"
          body="Each new fragment becomes a projectile capable of causing another collision. Above a critical debris density, this feedback loop becomes self-sustaining. No new launches needed, the shell destroys itself. Click any satellite in the simulation to watch it begin. The chart below tracks how close we already are."
          isActive={active === 'chapter-5'}
        >
          <KesslerSimulator height="340px" />
          <DebrisGrowthChart />
        </Chapter>
      </section>

      {/* Chapters 6 & 7: CDM table (sticky) + approach viz + error ellipses */}
      <ErrorBoundary>
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
            title="Near-Misses Happen Every Day"
            body="Space agencies issue hundreds of collision warnings every week. Most are ruled out on closer inspection, but not all. The table shows real conjunction events from recent months: cases where two objects passed close enough that a collision was a genuine possibility. Some of those miss distances are smaller than your kitchen. Click any row to explore what happened."
            isActive={active === 'chapter-6'}
          >
            <div className="cdm-sat-cards">
              <SatelliteCard label="Object 1" role="primary" sat={cdmSat1} />
              <SatelliteCard label="Object 2" role="secondary" sat={cdmSat2} />
            </div>

            <CarAnimationMiss
              cdm={selectedCdm}
              approachData={approachData}
              mode="miss"
              onProgress={handleOffsetChange}
            />

            <Explainer label="How do we know where satellites will be?">
              <p>
                Most tracked objects do not publicly broadcast their position. Instead, ground stations track them with radar, then feed that data into a simplified physics model called a <strong>TLE (Two-Line Element set)</strong>. A computer then <strong>propagates</strong> that model forward: it runs the orbital equations to estimate where the satellite will be at any future moment. This is the same method used to draw the orbit map in the earlier chapters.
              </p>
              <p>
                For each warning in the table, we propagate both objects around the predicted encounter time. The chart below shows how their estimated separation changes during the 40 minutes around closest approach. The bottom of the V-curve is the <strong>TCA (Time of Closest Approach)</strong>: the moment they are nearest.
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
                The chart uses a model called <strong>SGP4</strong> which is fast and freely available, but accurate only to about 1–5 km. Space agencies compute the authoritative miss distance using much higher-quality tracking data and more powerful algorithms. That is the value you see in the table. The chart shows the <em>shape</em> of the approach; the table shows the definitive closest distance.
              </p>
            </Explainer>

            <Explainer label="Why do some events show no collision probability (Pc)?" variant="method">
              <p>
                Space-Track computes Pc only for events it classifies as <strong>"emergency reportable"</strong>: typically those above a risk threshold of roughly 1-in-100,000. For informational warnings where the risk is judged low, no Pc is published. A blank Pc column does not mean the event was safe, it means it was below the threshold where detailed probability modelling was considered necessary.
              </p>
            </Explainer>

            <Explainer label="About this data: snapshot, not live">
              <p>
                The conjunction events shown here were retrieved from <strong>Space-Track.org on 24 May 2026</strong>, covering the preceding 30 days
                {cdmLoading ? '' : <> ({cdms.length.toLocaleString()} deduplicated events)</>}.
                Space-Track publishes only events that exceed internal risk thresholds, this is not an exhaustive catalogue of every close approach.
              </p>
              <p>
                Orbital elements (TLEs) were also fetched on <strong>24 May 2026</strong> for <strong>{loading ? '…' : satellites.length.toLocaleString()}</strong> objects currently in orbit. Positions and separation distances shown are propagated from that snapshot; they do not update in real time. Some recently catalogued objects may lack TLE data, in which case the approach chart and uncertainty visualisation cannot be displayed.
              </p>
            </Explainer>
          </Chapter>

          <Chapter
            id="chapter-7"
            number={7}
            title="Our Predictions Are Often Wrong"
            body="A miss distance of a few metres sounds alarming, but it assumes our calculations are perfectly accurate. They are not. Every orbital prediction carries uncertainty, and that uncertainty is often larger than the miss distance itself. We are making high-stakes calls about collisions using models that can be off by kilometres."
            isActive={active === 'chapter-7'}
          >
            <Explainer label="What is position uncertainty?" variant="method">
              <p>
                When we propagate a TLE forward in time, the result is not a precise point, it's a <strong>probability cloud</strong>. The older the tracking data, the larger that cloud grows. Space agencies model this uncertainty as an <strong>error ellipsoid</strong>: a 3-D region where the satellite is most likely to be found.
              </p>
              <p>
                The visualization below shows a cross-section of those ellipsoids at the moment of closest approach. If the two clouds overlap, a collision is possible even if our best-guess positions say they'll miss. The gap between the two ellipses is almost invisible compared to the ellipses themselves, which is precisely what makes these events so hard to assess.
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
      </ErrorBoundary>

      {/* Closing */}
      <section className="story-outro">
        <p className="story-outro-text">
          Each year there are more objects, more warnings, and more uncertainty. There is no international system to remove debris, and no authority to coordinate collision avoidance between competing operators. The question isn't whether a major collision will happen, it's when, and whether we'll be ready.
        </p>
      </section>
    </>
  )
}
