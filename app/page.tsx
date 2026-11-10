import { NavPill } from '@/components/nav-pill';
import { Hero } from '@/components/Hero';
import { WaitlistSection } from '@/components/waitlist-section';
import {
  ProblemGallery,
  SampleStores,
  FoundingVendors,
  Faq,
  StatementStrip,
} from '@/components/sections';
import { TheRealCost } from '@/components/the-real-cost';
import { HowItWorks } from '@/components/how-it-works';
import { WhySikatree } from '@/components/why-sikatree';
import { Footer } from '@/components/footer';

export default function Page() {
  return (
    <main>
      <NavPill />
      <Hero />
      <TheRealCost />
      <ProblemGallery />
      <SampleStores />
      <HowItWorks />
      <WhySikatree />
      <FoundingVendors />
      <Faq />
      <StatementStrip />

      <WaitlistSection />

      <Footer />
    </main>
  );
}
