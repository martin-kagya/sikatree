import { ArrowRight } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Accent } from '@/components/ui/accent';
import { HeroPhone } from '@/components/hero/HeroPhone';

export function Hero() {
  return (
    <section id="top" className="hero-dots relative overflow-hidden bg-mint-100">
      <div
        className="relative z-10 mx-auto flex max-w-[1200px] flex-col items-center gap-10 px-6 py-14 sm:px-10 sm:py-16 lg:flex-row lg:items-center lg:gap-16 lg:px-12 lg:py-16"
        style={{ minHeight: 'clamp(660px, 88dvh, 840px)' }}
      >
        <div className="w-full max-w-[600px] lg:flex-1">
          <h1 className="text-display text-ink sm:text-display-lg">
            Why pay GH₵4,000 for a website when your{' '}
            <Accent className="text-green-deep">store</Accent> can be{' '}
            <Accent className="text-green-deep">free</Accent>?
          </h1>
          <p className="mt-5 max-w-[480px] text-lead text-ink-muted sm:text-lead-lg">
            Send your photos on WhatsApp. Get a free shop link with prices, MoMo payments
            and bookings. Live in 10 minutes.
          </p>
          <div className="mt-7 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Button href="#waitlist">Join the waitlist</Button>
            <a
              href="#how-it-works"
              className="group inline-flex items-center gap-1.5 text-label font-medium text-ink-muted transition-colors hover:text-ink"
            >
              See how it works
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                strokeWidth={1.75}
              />
            </a>
          </div>
        </div>

        <div className="relative w-[72%] max-w-[340px] lg:w-[340px] lg:max-w-none lg:shrink-0">
          <div className="translate-y-[12%] lg:translate-y-0">
            <HeroPhone />
          </div>
        </div>
      </div>
    </section>
  );
}
