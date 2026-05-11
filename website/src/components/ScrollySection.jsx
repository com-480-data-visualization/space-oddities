import { useState, useEffect, useCallback } from 'react'
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
import VizBox from './VizBox'
import { useSatelliteData } from '../hooks/useSatelliteData'
import './ScrollySection.css'

const CHAPTER_IDS = ['chapter-1', 'chapter-2', 'chapter-3', 'chapter-4', 'chapter-5', 'chapter-6', 'chapter-7']

const KESSLER_EVENTS = [
  { id: 'cerise',   year: 1996, name: 'Cerise × Ariane debris',          debrisAdded: 'minor fragmentation' },
  { id: 'fengyun',  year: 2007, name: 'China ASAT — Fengyun-1C',         debrisAdded: '~3,500 trackable fragments' },
  { id: 'iridium',  year: 2009, name: 'Iridium 33 × Cosmos 2251',        debrisAdded: '~2,000 trackable fragments' },
  { id: 'cosmos',   year: 2021, name: 'Russia ASAT — Cosmos 1408',       debrisAdded: '~1,500 trackable fragments' },
  { id: 'starlink', year: 2023, name: 'Starlink-1095 × debris near-miss', debrisAdded: 'no collision — evasive manoeuvre' },
]

const DEBRIS_SIZE_FILTERS = ['>1 mm', '>1 cm', '>10 cm', '>1 m']
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
  const [hoveredEvent, setHoveredEvent] = useState(null)
  const [debrisSizeFilter, setDebrisSizeFilter] = useState('>10 cm')
  const { satellites, loading, yearRange } = useSatelliteData()
  const [minYear, maxYear] = yearRange

  useEffect(() => { setCurrentYear(maxYear) }, [maxYear])

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

  const tcaLabel = selectedCdm
    ? `TCA  ${new Date(selectedCdm.tca_utc).toISOString().slice(0, 16)} UTC`
    : 'Select a CDM to enable'

  return (
    <>
      {/* Chapters 1–4: orbit scene (sticky) + story */}
      <section className="scrolly">
        <div className="scrolly-scene">
          <div className="scene-panel">
            <div className="scene-header">
              <span className="scene-label">
                {sceneLabel(active)}
              </span>
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
                  multiline
                  width={260}
                  withArrow
                  position="top"
                >
                  <span className="term-help" tabIndex={0}>TLE</span>
                </Tooltip>{' '}
                available in our data, then filters out objects that are no longer in orbit. Their positions are recomputed every few seconds, giving an approximate real-time view of how objects move around Earth. Drag the slider to reveal how today's orbital population built up over launch history.
              </>
            }
            isActive={active === 'chapter-1'}
          >
            <div className="chapter-control">
              <label className="control-label">
                Launch year: <strong>{currentYear}</strong>
              </label>
              <input
                type="range"
                min={minYear}
                max={maxYear}
                value={currentYear}
                onChange={handleSlider}
                className="year-slider"
              />
            </div>
            <GrowthChart
              satellites={satellites}
              currentYear={currentYear}
              yearRange={yearRange}
              isActive={active === 'chapter-1'}
            />
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
            <OwnershipChart
              satellites={satellites}
              highlight={ownershipHighlight}
              onHighlight={setOwnershipHighlight}
            />
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
                onClick={() => {
                  setTypeView('simple')
                  setTypeFilter(prev => ({ category: prev.category, country: null, operator: null }))
                }}
              >
                Simple view
              </button>
              <button
                className={`view-toggle-btn${typeView === 'wheel' ? ' view-toggle-btn--active' : ''}`}
                onClick={() => setTypeView('wheel')}
              >
                Wheel view
              </button>
            </div>
            {typeView === 'simple' ? (
              <>
                <div className="filter-row">
                  {TYPE_FILTERS.map(filter => (
                    <button
                      key={filter.value}
                      className={`filter-btn${typeFilter.category === filter.value && !typeFilter.country && !typeFilter.operator ? ' filter-btn--active' : ''}`}
                      onClick={() => setTypeCategory(filter.value)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <TypeBreakdownChart
                  satellites={satellites}
                  selectedCategory={typeFilter.category}
                  onSelectCategory={setTypeCategory}
                />
              </>
            ) : (
              <TypeOwnershipWheel
                satellites={satellites}
                filter={typeFilter}
                onFilterChange={setTypeFilter}
              />
            )}
          </Chapter>
        </div>
      </section>

      {/* Chapter 5: Kessler syndrome — simulator + real debris data */}
      <section className="scrolly-solo">
        <Chapter
          id="chapter-5"
          number={5}
          title="Kessler Syndrome"
          body="One collision can trigger a cascade: each fragment becomes a projectile capable of generating more. Above a critical orbital density, this self-sustaining chain reaction could render entire shells permanently unusable. The simulation below illustrates the mechanics; the data below that shows the historical record."
          isActive={active === 'chapter-5'}
        >
          <VizBox
            label="Kessler Cascade Simulator"
            note="Canvas animation · a ring of objects orbits Earth · triggering a collision causes fragments to branch outward · each fragment carries its own velocity vector and can strike other objects · the cascade expands until the ring is saturated"
            height="340px"
          />

          <div className="kessler-data">
            <div className="kessler-events-col">
              <div className="kessler-col-label">Real events</div>
              <div className="kessler-event-list">
                {KESSLER_EVENTS.map(ev => (
                  <div
                    key={ev.id}
                    className={`kessler-event${hoveredEvent?.id === ev.id ? ' kessler-event--hovered' : ''}`}
                    onMouseEnter={() => setHoveredEvent(ev)}
                    onMouseLeave={() => setHoveredEvent(null)}
                  >
                    <span className="kessler-event-year">{ev.year}</span>
                    <div className="kessler-event-body">
                      <div className="kessler-event-name">{ev.name}</div>
                      <div className="kessler-event-debris">{ev.debrisAdded}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="kessler-graph-col">
              <div className="filter-row" style={{ marginBottom: '0.5rem' }}>
                {DEBRIS_SIZE_FILTERS.map(size => (
                  <button
                    key={size}
                    className={`filter-btn${debrisSizeFilter === size ? ' filter-btn--active' : ''}`}
                    onClick={() => setDebrisSizeFilter(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <VizBox
                label="Cumulative Debris Count Over Time"
                note={
                  hoveredEvent
                    ? `D3 line chart · tracked objects ${debrisSizeFilter} · x-axis zoomed to ±2 years around ${hoveredEvent.year} · spike from ${hoveredEvent.name} highlighted in red with fragment count annotation`
                    : `D3 line chart · total tracked objects ${debrisSizeFilter} · 1957–present · hover an event on the left to zoom and highlight its debris contribution`
                }
                height="280px"
              />
            </div>
          </div>
        </Chapter>
      </section>

      {/* Chapters 6 & 7: CDM table (sticky) + approach viz + error tubes */}
      <section className="scrolly scrolly--half">
        <div className="scrolly-scene">
          <div className="scene-panel">
            <CdmTable selectedCdm={selectedCdm} onSelect={setSelectedCdm} />
          </div>
        </div>

        <div className="scrolly-story">
          <Chapter
            id="chapter-6"
            number={6}
            title='Visualizing the "Invisible" Risk'
            body="Select a conjunction event from the table. The miss distance only becomes meaningful once you translate it into a human scale — the comparison below does exactly that."
            isActive={active === 'chapter-6'}
          >
            <div className="cdm-sat-cards">
              <SatelliteCard label="Object 1" role="primary" sat={null} />
              <SatelliteCard label="Object 2" role="secondary" sat={null} />
            </div>

            <VizBox
              label="Orbit Pair Canvas"
              note="2D canvas · both orbital paths drawn from TLE satrec · coloured dots track each satellite at the slider time · connecting line at closest approach with distance label"
              height="300px"
            />

            <div className="cdm-time-control">
              <div className="cdm-time-labels">
                <span>TCA − 3 h</span>
                <span className="cdm-time-center">{tcaLabel}</span>
                <span>TCA + 3 h</span>
              </div>
              <input
                type="range"
                className="year-slider"
                min={-180}
                max={180}
                defaultValue={0}
                disabled={!selectedCdm}
              />
            </div>

            <VizBox
              label="Approach Distance Graph"
              note="D3 line chart · distance (m) vs time · ±3 h around TCA · computed by propagating both satellites every 2 min with SGP4 · vertical playhead linked to time slider · minimum approach annotated"
              height="180px"
            />

            <VizBox
              label="Car Highway Comparison"
              note={
                selectedCdm
                  ? `SVG · two cars on a road · gap proportional to ${selectedCdm.min_rng_m.toLocaleString()} m miss distance · time-to-contact label at orbital speed (~7 km/s) · car length as scale reference`
                  : 'SVG · two cars on a road · gap and time-to-contact scale to the selected CDM · select a row to populate'
              }
              height="160px"
            />
          </Chapter>

          <Chapter
            id="chapter-7"
            number={7}
            title="The Margin of Error"
            body="Satellites are not points — they are probability volumes. The covariance ellipses below show why a seemingly safe miss distance can still be classified as an emergency."
            isActive={active === 'chapter-7'}
          >
            <VizBox
              label="Covariance Ellipse Visualization"
              note={
                selectedCdm
                  ? `Canvas · two uncertainty ellipses at TCA position · ellipse axes from TLE epoch uncertainty · overlap region shaded · Pc = ${selectedCdm.pc != null ? selectedCdm.pc.toExponential(2) : '—'} labelled`
                  : 'Canvas · two uncertainty ellipses at TCA position · axes from TLE epoch age · overlap shaded · Pc labelled · select a CDM to populate'
              }
              height="340px"
            />
          </Chapter>
        </div>
      </section>
    </>
  )
}
