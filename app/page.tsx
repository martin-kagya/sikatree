import { NavPill } from '@/components/nav-pill';
import { Hero } from '@/components/Hero';
import { WaitlistForm } from '@/components/WaitlistForm';
import { Eyebrow } from '@/components/ui/eyebrow';
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
import { FooterParallax } from '@/components/footer-parallax';

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
        className="scroll-mt-24 bg-dark px-3 pb-24 pt-6 sm:px-5 sm:pb-40 sm:pt-8"
      >
        <div className="mx-auto max-w-[560px]">
          <div className="flex justify-center">
            <Eyebrow onDark>Early access</Eyebrow>
          </div>
          <h2 className="mt-4 text-center text-h2 text-white sm:text-h2-lg">Reserve your spot</h2>
          <p className="mx-auto mt-3 max-w-md text-center text-body text-ink-on-dark-muted">
            Just your WhatsApp number. Everything else is optional.
          </p>
          <div className="mt-8">
            <WaitlistForm />
          </div>
        </div>
      </section>

      <FooterParallax />
    </main>
  );
}
