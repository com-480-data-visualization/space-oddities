import NavBar from './components/NavBar'
import Hero from './components/Hero'
import ScrollySection from './components/ScrollySection'
import Team from './components/Team'
import { useSatelliteData } from './hooks/useSatelliteData'

export default function App() {
  const { satellites, loading, yearRange } = useSatelliteData()

  return (
    <>
      <NavBar />
      <Hero satellites={satellites} loading={loading} />
      <ScrollySection satellites={satellites} loading={loading} yearRange={yearRange} />
      <Team />
    </>
  )
}
