import type { Metadata } from 'next';
import { LegalShell } from '@/components/legal-shell';
import { site } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Privacy notice | sikatree',
  description:
    'How sikatree handles data for waitlist signups, vendor pages, customer orders, bookings and WhatsApp messages.',
  alternates: { canonical: '/privacy' },
};

const UPDATED = '6 November 2026';

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy notice" updated={UPDATED}>
      <p>
        sikatree is a product of Ostra, built for vendors in Ghana. It turns a vendor&rsquo;s
        WhatsApp catalogue into a storefront page that takes orders and service bookings. This
        notice explains what we collect when you join the waitlist, run a store, or order from one,
        why we collect it, who we share it with, and the choices you have. We handle personal data
        under Ghana&rsquo;s Data Protection Act, 2012 (Act 843).
      </p>

      <h2 className="text-h3 text-ink">Who this covers</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Vendors</strong> &mdash; anyone who joins the waitlist or runs a store on
          sikatree.
        </li>
        <li>
          <strong>Customers</strong> &mdash; anyone who opens a vendor&rsquo;s page, places an order
          or books a service.
        </li>
        <li>
          <strong>Visitors</strong> &mdash; anyone browsing the site.
        </li>
      </ul>

      <h2 className="text-h3 text-ink">What we collect</h2>
      <p>
        <strong>If you join the waitlist:</strong> your WhatsApp number (required), business name,
        what you sell (products, services or both), your estimated orders per month, an optional
        reserved link, the time you gave consent, how you found us (referral code and campaign
        tags), and basic technical data (IP address and browser) for security and rate limiting.
      </p>
      <p>
        <strong>If you run a store:</strong> your business name, bio, location, category, WhatsApp
        number, item names, descriptions, prices and photos, stock, opening hours and blocked dates
        for services, delivery and ETA settings, your order history and support messages. Signing in
        uses a single-use link sent to your WhatsApp number and sets a session cookie.
      </p>
      <p>
        <strong>If you order or book:</strong> your name, WhatsApp number, email, delivery address or
        landmark (delivery orders only), any note you add, the items or services you chose, the
        appointment time for bookings, the total, and any messages you send us. Customers check out
        as guests; there is no customer account.
      </p>
      <p>
        <strong>From everyone:</strong> IP address and browser type, basic usage events (page views,
        scroll depth, button clicks) tied to a random identifier kept in your browser, and the
        contents of your cart kept in local storage. We do not use advertising cookies or
        third-party trackers, and those usage events are not linked to your WhatsApp number.
      </p>

      <h2 className="text-h3 text-ink">Payments</h2>
      <p>
        sikatree does not take card or mobile-money payments. Orders are paid directly to the vendor
        on delivery, at pickup or at the appointment. We do not collect or store card numbers, mobile
        money PINs or bank details. The vendor is responsible for the payment arrangement and for any
        tax or licence that applies to their sales.
      </p>

      <h2 className="text-h3 text-ink">Why we use it</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Hold your place in the waitlist and invite vendors to set up.</li>
        <li>Create and show a vendor&rsquo;s page and catalogue.</li>
        <li>Take orders and bookings, and route them to the right vendor.</li>
        <li>Notify vendors on WhatsApp about new orders, bookings and messages.</li>
        <li>Let vendors manage their page, items, availability and orders.</li>
        <li>Answer support requests and keep the service secure.</li>
        <li>Understand which parts of the product work so we can improve them.</li>
      </ul>

      <h2 className="text-h3 text-ink">Our legal basis</h2>
      <p>
        <strong>Consent</strong> for the waitlist, for WhatsApp messages and for the optional
        details you add. You can withdraw at any time. <strong>Contract</strong> for running a store
        and handling orders and bookings. <strong>Legitimate interest</strong> for security, abuse
        prevention and aggregate analytics. <strong>Legal obligation</strong> for records we must
        keep.
      </p>

      <h2 className="text-h3 text-ink">Who we share it with</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>The vendor you order from</strong> sees the details needed to fulfil the order:
          your name, phone, email, address or landmark, notes, items and appointment time.
        </li>
        <li>
          <strong>Meta / WhatsApp Business Platform</strong> carries our messages to vendors and
          customers and delivers replies to us.
        </li>
        <li>
          <strong>Supabase</strong> hosts the database and item photos. <strong>Cloudflare</strong>{' '}
          hosts the site and connects it to the database.
        </li>
        <li>
          <strong>Other service providers</strong> process data on our instructions only. We do not
          sell your data, and we do not share your number with other vendors.
        </li>
      </ul>
      <p>
        Some providers may process data outside Ghana. Where that happens we rely on their
        contractual safeguards for personal data.
      </p>

      <h2 className="text-h3 text-ink">Cookies and local storage</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          A vendor session cookie keeps you signed in to your dashboard. It is httpOnly and lasts 30
          days.
        </li>
        <li>Your cart is kept in your browser&rsquo;s local storage, separately for each store.</li>
        <li>
          A random analytics identifier is kept in local storage, and referral or campaign
          attribution is kept for your session, so we can credit invites and understand traffic.
        </li>
      </ul>
      <p>
        You can clear these in your browser at any time. Clearing the cart empties it; clearing the
        session cookie signs you out of the dashboard.
      </p>

      <h2 className="text-h3 text-ink">How long we keep it</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Waitlist:</strong> while you are on it and for up to 12 months afterwards, unless
          you ask us to delete it sooner. Reserved handles that are not claimed are released after
          the reservation window shown at signup.
        </li>
        <li>
          <strong>Store and orders:</strong> while the store is live, and afterwards for as long as
          we need them for records, disputes and accounting. When we no longer need them we delete
          or aggregate them.
        </li>
        <li>
          <strong>Photos:</strong> while the item or store is live.
        </li>
        <li>
          <strong>Usage events:</strong> kept in aggregate; individual events for up to 12 months.
        </li>
        <li>
          <strong>WhatsApp messages:</strong> for as long as needed to run onboarding, orders and
          support.
        </li>
      </ul>

      <h2 className="text-h3 text-ink">Your rights</h2>
      <p>
        You can ask for a copy of your data, correct it, delete it, withdraw consent, restrict or
        object to our use of it. Reply <strong>STOP</strong> to any WhatsApp message to be removed
        from messages and to free your reserved handle. You can also email us. If you are not
        satisfied, you can complain to the Data Protection Commission of Ghana.
      </p>

      <h2 className="text-h3 text-ink">Security</h2>
      <p>
        Writes happen only through our server, the database is not publicly readable, the admin view
        is password protected, and secrets stay in the hosting platform. No system is perfectly
        secure, but we keep the data we hold to the minimum needed to run the service.
      </p>

      <h2 className="text-h3 text-ink">Children</h2>
      <p>sikatree is for people aged 18 and over. We do not knowingly collect data from children.</p>

      <h2 className="text-h3 text-ink">Changes</h2>
      <p>
        If this notice changes in a way that matters, we will tell vendors and waitlist members on
        WhatsApp and update the date above.
      </p>

      <h2 className="text-h3 text-ink">Contact</h2>
      <p>
        Email{' '}
        <a href={`mailto:${site.email}`} className="text-green-deep underline underline-offset-2">
          {site.email}
        </a>{' '}
        or message us on WhatsApp. We aim to reply within five working days.
      </p>
    </LegalShell>
  );
}
