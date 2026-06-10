import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Hero from './components/sections/Hero'
import TrustBar from './components/sections/TrustBar'
import ModulesShowcase from './components/sections/ModulesShowcase'
import ProblemSolution from './components/sections/ProblemSolution'
import WorkflowTimeline from './components/sections/WorkflowTimeline'
import Industries from './components/sections/Industries'
import PlatformShowcase from './components/sections/PlatformShowcase'
import Statistics from './components/sections/Statistics'
import Differentiators from './components/sections/Differentiators'
import CTASection from './components/sections/CTASection'

export default function App() {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <ModulesShowcase />
        <ProblemSolution />
        <WorkflowTimeline />
        <Industries />
        <PlatformShowcase />
        <Statistics />
        <Differentiators />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
