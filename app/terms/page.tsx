import type { Metadata } from 'next';
import { LegalShell } from '@/components/legal-shell';
import { site } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Terms of use | sikatree',
  description:
    'The terms that apply to the sikatree waitlist, vendor pages, orders and service bookings.',
  alternates: { canonical: '/terms' },
};

const UPDATED = '6 November 2026';

export default function TermsPage() {
  return (
    <LegalShell title="Terms of use" updated={UPDATED}>
      <p>
        These terms cover the sikatree website, the early access waitlist, vendor pages and any
        order or service booking placed through them. By using sikatree you agree to them. sikatree
        is operated by Ostra in Ghana.
      </p>

      <h2 className="text-h3 text-ink">What sikatree is</h2>
      <p>
        sikatree turns a vendor&rsquo;s WhatsApp catalogue into a simple storefront page. A vendor
        lists products or services, shares their link, and customers order or book from it. During
        the pilot, vendor access is by invitation from the waitlist.
      </p>

      <h2 className="text-h3 text-ink">The waitlist</h2>
      <p>
        The waitlist is a list of vendors who want early access. Joining does not create an account,
        does not guarantee access, and does not guarantee a launch date. We invite vendors in
        batches as the product is ready.
      </p>

      <h2 className="text-h3 text-ink">Reserved links</h2>
      <p>
        A reserved handle such as <em>sikatree.africa/amasglow</em> is a soft reservation, not
        ownership of a name. It is held for the reservation window shown at signup (normally 30
        days) and can be released if you do not continue to onboarding, if we need the name for the
        service, or if the name breaks these terms. We will tell you before releasing a handle you
        actively claimed.
      </p>

      <h2 className="text-h3 text-ink">For vendors</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          You are responsible for your page: accurate names, descriptions, prices (in GH₵),
          photos and availability.
        </li>
        <li>You must have the right to use the photos and content you upload.</li>
        <li>
          Keep stock and availability up to date, and honour the orders and bookings you accept.
        </li>
        <li>Do not list prohibited, unsafe or unlawful items or services.</li>
        <li>
          You are the seller. The sale is between you and the customer; sikatree provides the page
          and the tools.
        </li>
        <li>
          You are responsible for arranging payment and delivery, pickup or the appointment with the
          customer, and for any tax or licence that applies to your sales.
        </li>
      </ul>

      <h2 className="text-h3 text-ink">For customers</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Give accurate contact and delivery details when you order or book.</li>
        <li>Pay the vendor as agreed on delivery, at pickup or at the appointment.</li>
        <li>sikatree does not process payments and is not a party to the sale.</li>
        <li>
          A problem with an order is between you and the vendor; we will help where we can, but we
          cannot refund a payment we never took.
        </li>
      </ul>

      <h2 className="text-h3 text-ink">Payments and fees</h2>
      <p>
        Online payments are not connected. Orders are paid directly to the vendor, by cash or mobile
        money as you agree with them. Joining the waitlist is free. When online payments go live, a
        fee applies only when a vendor gets paid through sikatree, and we will show it plainly before
        it is switched on. There is no monthly fee during the pilot.
      </p>

      <h2 className="text-h3 text-ink">Messaging</h2>
      <p>
        You agree to receive WhatsApp messages about your spot, your store, your orders and support.
        Reply STOP to any message to opt out. Message and data rates from your network operator may
        apply.
      </p>

      <h2 className="text-h3 text-ink">Acceptable use</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Do not submit someone else&rsquo;s phone number without their permission.</li>
        <li>Do not use sikatree to send spam, abuse or unlawful content.</li>
        <li>Do not impersonate another business or mislead customers.</li>
        <li>Do not attempt to break, overload or scrape the service.</li>
      </ul>

      <h2 className="text-h3 text-ink">Content</h2>
      <p>
        You keep ownership of the content you add. You give us a licence to host, display and resize
        it so the service can show your page. We may remove content that breaks these terms or the
        law, and we will tell you when we do.
      </p>

      <h2 className="text-h3 text-ink">Changes and availability</h2>
      <p>
        We are building sikatree in the open and the product will change. We may add, change or
        remove features, and we may pause the service for maintenance. We will give notice on
        WhatsApp where a change materially affects vendors or waitlist members.
      </p>

      <h2 className="text-h3 text-ink">Liability</h2>
      <p>
        sikatree is provided as is. To the extent the law allows, Ostra is not liable for indirect or
        consequential loss arising from use of the service, or for disputes between vendors and
        customers. Nothing in these terms limits rights you have under Ghanaian law.
      </p>

      <h2 className="text-h3 text-ink">Privacy</h2>
      <p>
        How we handle your data is described in our{' '}
        <a href="/privacy" className="text-green-deep underline underline-offset-2">
          privacy notice
        </a>
        .
      </p>

      <h2 className="text-h3 text-ink">Governing law</h2>
      <p>These terms are governed by the laws of Ghana, and the courts of Ghana have jurisdiction.</p>

      <h2 className="text-h3 text-ink">Contact</h2>
      <p>
        Email{' '}
        <a href={`mailto:${site.email}`} className="text-green-deep underline underline-offset-2">
          {site.email}
        </a>
        .
      </p>
    </LegalShell>
  );
}
