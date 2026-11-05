import { Eyebrow } from '@/components/ui/eyebrow';
import { Accent } from '@/components/ui/accent';
import { Button } from '@/components/ui/button';
import { ImageGallery } from '@/components/ui/image-gallery';
import { FrustrationIllustration } from '@/components/illustrations';
import { foundingDescription, foundingOffer, monthsLabel } from '@/lib/offer';

const STORES = [
  { name: 'Clothing', photo: 'clothing' },
  { name: 'Nail tech', photo: 'nail-tech' },
  { name: 'Photography', photo: 'photography' },
  { name: 'Mentorship', photo: 'mentorship' },
] as const;

export function ProblemGallery() {
  return (
    <section className="px-3 py-24 sm:px-5 sm:py-40">
      <div className="mx-auto max-w-[1120px]">
        <h2 className="mx-auto max-w-2xl text-center text-h2 sm:text-h2-lg">
          Stop typing <Accent>how much?</Accent> 50 times a day.
        </h2>

        <div className="mt-16 flex justify-center">
          <FrustrationIllustration />
        </div>
      </div>
    </section>
  );
}

export function SampleStores() {
  return (
    <section id="sample-stores" className="scroll-mt-24 px-3 py-24 sm:px-5 sm:py-40">
      <div className="mx-auto max-w-[1120px]">
        <div className="flex justify-center">
          <Eyebrow>Sample stores</Eyebrow>
        </div>
        <ImageGallery
          images={STORES.map((store) => ({
            photo: store.photo,
            alt: `Example: ${store.name} store`,
            label: store.name,
          }))}
          className="mt-10"
        />
      </div>
    </section>
  );
}

export function FoundingVendors() {
  // Offer copy is configuration (LP-16). Disable it here to take the block off
  // the page without touching the layout.
  if (!foundingOffer.enabled) return null;

  return (
    <section id="founding-vendors" className="bg-dark px-3 py-24 sm:px-5 sm:py-40">
      <div className="mx-auto max-w-[900px] rounded-card border border-hairline-dark bg-surface-dark p-8 text-center sm:p-12">
        <div className="flex justify-center">
          <Eyebrow onDark>Founding vendors</Eyebrow>
        </div>
        <h2 className="mt-4 text-h2 text-white sm:text-h2-lg">
          First {foundingOffer.capacity.toLocaleString('en-GH')} vendors get{' '}
          <Accent>zero fees</Accent> for {monthsLabel(foundingOffer.feeFreeMonths)}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-body text-ink-on-dark-muted">
          {foundingDescription(foundingOffer)}
        </p>
        <div className="mt-8">
          <Button href="#waitlist">Join the waitlist</Button>
        </div>
      </div>
    </section>
  );
}

const FAQ_ITEMS = [
  {
    q: 'Is it really free?',
    a: 'Starting is free, with no monthly fee. A small fee applies when you receive online payments.',
  },
  { q: 'Do I need a website or a developer?', a: 'No. You set up on WhatsApp.' },
  { q: 'How do my customers pay?', a: 'MTN MoMo, Telecel Cash, AT Money, or card.' },
  {
    q: 'I sell services, not products. Can I use it?',
    a: 'Yes. Set your hours, take bookings, and collect deposits.',
  },
  { q: 'Will my customers need to install anything?', a: 'No. They tap your link.' },
  {
    q: 'What happens after I join the waitlist?',
    a: 'We invite vendors in batches and message you on WhatsApp.',
  },
  { q: 'Can I keep my custom website?', a: 'Yes. Many vendors use both.' },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 bg-dark px-3 py-24 sm:px-5 sm:py-40">
      <div className="mx-auto max-w-[900px]">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Eyebrow onDark>FAQ</Eyebrow>
            <h2 className="mt-4 text-h2 text-white sm:text-h2-lg">
              Frequently asked <Accent>questions</Accent>
            </h2>
          </div>
          <Button href="#waitlist" variant="secondary">
            Ask on WhatsApp
          </Button>
        </div>

        <div className="mt-8 space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <details
              key={item.q}
              name="faq"
              className="group rounded-inner border border-hairline-dark bg-surface-dark px-6 py-5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-h3 text-white sm:text-h3-lg">
                <span className="flex items-baseline gap-2">
                  <span className="text-[12px] text-ink-on-dark-muted">[{String(i + 1).padStart(2, '0')}]</span>
                  <span>{item.q}</span>
                </span>
                <span className="relative h-5 w-5 shrink-0" aria-hidden>
                  <span className="absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 bg-white" />
                  <span className="absolute left-1/2 top-0 h-5 w-0.5 -translate-x-1/2 bg-white group-open:hidden" />
                </span>
              </summary>
              <p className="mt-3 max-w-[640px] text-body text-ink-on-dark-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StatementStrip() {
  return (
    <section className="bg-dark px-3 pb-8 pt-24 sm:px-5 sm:pb-12 sm:pt-40">
      <p className="mx-auto max-w-[900px] text-center text-statement text-white sm:text-statement-lg">
        Send photos. Get a <Accent>store</Accent>.
      </p>
    </section>
  );
}
