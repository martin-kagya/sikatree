import type { Metadata } from 'next';
import { LegalShell } from '@/components/legal-shell';
import { site } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Privacy notice | sikatree',
  description: 'How sikatree collects, uses and protects your WhatsApp number and signup details.',
  alternates: { canonical: '/privacy' },
};

const UPDATED = '5 November 2026';

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy notice" updated={UPDATED}>
      <p>
        sikatree is a product of Ostra, built for vendors in Ghana. This notice explains what we
        collect when you join the waitlist or use the site, why we collect it, and the choices you
        have. We handle personal data under Ghana&rsquo;s Data Protection Act, 2012 (Act 843).
      </p>

      <h2 className="text-h3 text-ink">What we collect</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Your WhatsApp number.</strong> Required so we can message you about your spot,
          invite you to set up your shop, and support you. We store it in international format.
        </li>
        <li>
          <strong>What you sell and your business name.</strong> Optional. It helps us prepare your
          setup and invite you with the right examples.
        </li>
        <li>
          <strong>Your reserved link.</strong> Optional. If you reserve a handle such as
          {' '}
          <em>amasglow</em>, we store the handle and when the reservation expires.
        </li>
        <li>
          <strong>Consent and basic technical data.</strong> When you tick the consent box we record
          the time. Our servers also see your IP address and browser type, which we use briefly for
          security and rate limiting.
        </li>
        <li>
          <strong>Anonymous usage events.</strong> Page views, scroll depth and button clicks, with a
          random identifier kept in your browser. We do not use advertising cookies or third-party
          trackers, and these events are not linked to your WhatsApp number.
        </li>
      </ul>

      <h2 className="text-h3 text-ink">Why we use it</h2>
      <p>
        To hold your place in the queue, contact you on WhatsApp about early access, prepare your
        shop when your invite comes, prevent abuse of the signup form, and understand which parts of
        the page work so we can improve them.
      </p>

      <h2 className="text-h3 text-ink">Our legal basis</h2>
      <p>
        Consent. You tick the box before joining, and you can withdraw at any time. We also process
        limited technical data for our legitimate interest in keeping the service secure.
      </p>

      <h2 className="text-h3 text-ink">Who we share it with</h2>
      <p>
        We send messages through the WhatsApp Business Platform, operated by Meta. We use service
        providers for hosting and the database. They process data on our instructions. We do not
        sell your data, and we do not share your number with other vendors.
      </p>

      <h2 className="text-h3 text-ink">How long we keep it</h2>
      <p>
        While you are on the waitlist and for up to 12 months afterwards, unless you ask us to
        delete it sooner. Reserved handles that are not claimed are released after the reservation
        window shown when you sign up.
      </p>

      <h2 className="text-h3 text-ink">Your rights</h2>
      <p>
        You can ask for a copy of your data, correct it, delete it, withdraw consent, or object to
        our use of it. Reply <strong>STOP</strong> to any WhatsApp message to be removed from
        messages and to free your reserved handle. You can also email us. If you are not satisfied,
        you can complain to the Data Protection Commission of Ghana.
      </p>

      <h2 className="text-h3 text-ink">Security</h2>
      <p>
        Signups are written only through our server, the database is not publicly readable, and
        access to the admin view is password protected. No system is perfectly secure, but we keep
        the data we hold to the minimum needed for the waitlist.
      </p>

      <h2 className="text-h3 text-ink">Children</h2>
      <p>sikatree is for people aged 18 and over. We do not knowingly collect data from children.</p>

      <h2 className="text-h3 text-ink">Changes</h2>
      <p>
        If this notice changes in a way that matters, we will tell waitlist members on WhatsApp and
        update the date above.
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
