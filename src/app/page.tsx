export const dynamic = 'force-dynamic'

import { ExperienceSection } from '@/app/components/ExperienceSection'
import { Footer } from '@/app/components/Footer'
import { GameOfLife } from '@/app/components/GameOfLife'
import { Header } from '@/app/components/Header'
import { LinksSection } from '@/app/components/LinksSection'
import { PrintPortfolio } from '@/app/components/PrintPortfolio'
import { ProjectsSection } from '@/app/components/ProjectsSection'
import { RandomQuote } from '@/app/components/RandomQuote'

export default function Page() {
  return (
    <>
      <GameOfLife />
      <div className="site">
        <Header />
        <RandomQuote />
        <ExperienceSection />
        <ProjectsSection />
        <LinksSection />
        <Footer />
      </div>
      <PrintPortfolio />
    </>
  )
}
