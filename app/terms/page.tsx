import type { Metadata } from 'next';
import { LegalShell } from '@/components/legal-shell';
import { site } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Terms of use | sikatree',
  description: 'The terms that apply to the sikatree waitlist and early access programme.',
  alternates: { canonical: '/terms' },
};

const UPDATED = '5 November 2026';

export default function TermsPage() {
  return (
    <LegalShell title="Terms of use" updated={UPDATED}>
      <p>
        These terms cover the sikatree website and the early access waitlist. By joining the
        waitlist you agree to them. sikatree is operated by Ostra in Ghana.
      </p>

      <h2 className="text-h3 text-ink">What the waitlist is</h2>
      <p>
        The waitlist is a list of vendors who want early access. Joining does not create an
        account, does not guarantee access, and does not guarantee a launch date. We invite vendors
        in batches as the product is ready.
      </p>

      <h2 className="text-h3 text-ink">Reserved links</h2>
      <p>
        A reserved handle such as <em>sikatree.africa/amasglow</em> is a soft reservation, not
        ownership of a name. It is held for the reservation window shown at signup (normally 30
        days) and can be released if you do not continue to onboarding, if we need the name for the
        service, or if the name breaks these terms. We will tell you before releasing a handle you
        actively claimed.
      </p>

      <h2 className="text-h3 text-ink">Messaging</h2>
      <p>
        You agree to receive WhatsApp messages about your spot and early access. Reply STOP to any
        message to opt out. Message and data rates from your network operator may apply.
      </p>

      <h2 className="text-h3 text-ink">Acceptable use</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Do not submit someone else&rsquo;s phone number without their permission.</li>
        <li>Do not use the form to send spam, abuse or unlawful content.</li>
        <li>Do not attempt to break, overload or scrape the service.</li>
      </ul>

      <h2 className="text-h3 text-ink">Fees</h2>
      <p>
        Joining the waitlist is free. When online payments go live, a fee applies only when you get
        paid through sikatree, and we will show it plainly before you switch it on. There is no
        monthly fee during the pilot.
      </p>

      <h2 className="text-h3 text-ink">Changes and availability</h2>
      <p>
        We are building sikatree in the open and the product will change. We may add, change or
        remove features, and we may pause the service for maintenance. We will give notice on
        WhatsApp where a change materially affects waitlist members.
      </p>

      <h2 className="text-h3 text-ink">Liability</h2>
      <p>
        The waitlist is provided as is. To the extent the law allows, Ostra is not liable for
        indirect or consequential loss arising from use of this website. Nothing in these terms
        limits rights you have under Ghanaian law.
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
