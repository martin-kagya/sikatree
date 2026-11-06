import { NavPill } from '@/components/nav-pill';
import { Hero } from '@/components/Hero';
import { WaitlistForm } from '@/components/WaitlistForm';
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

      <section
        id="waitlist"
        className="scroll-mt-24 bg-dark px-3 pb-16 pt-6 sm:px-5 sm:pb-24 sm:pt-8"
      >
        <WaitlistForm />
      </section>

      <Footer />
    </main>
  );
}
