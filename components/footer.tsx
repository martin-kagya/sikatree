import { MessageCircle, AtSign, Globe } from '@/components/icons';
import { Accent } from '@/components/ui/accent';
import { OstraMark } from '@/components/ui/ostra-mark';
import { site } from '@/lib/brand';

export function Footer() {
  return (
    <footer className="bg-dark">
      <div className="mx-auto max-w-[1120px] px-5 pt-10 sm:pt-12">
        <h2 className="max-w-2xl text-h2 text-white sm:text-h2-lg">
          Your shop is one <Accent>photo</Accent> away.
        </h2>

        <div className="mt-12 grid gap-8 border-t border-hairline-dark pt-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <p className="text-label text-white">WhatsApp</p>
            <a
              href="https://wa.me/"
              className="mt-2 inline-flex items-center gap-2 text-small text-ink-on-dark-muted hover:text-white"
            >
              <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
            </a>
          </div>
          <div>
            <p className="text-label text-white">Email</p>
            <a
              href={`mailto:${site.email}`}
              className="mt-2 block text-small text-ink-on-dark-muted hover:text-white"
            >
              {site.email}
            </a>
          </div>
          <div>
            <p className="text-label text-white">Social</p>
            <div className="mt-2 flex gap-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline-dark text-white/80">
                <AtSign className="h-5 w-5" />
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline-dark text-white/80">
                <Globe className="h-5 w-5" />
              </span>
            </div>
          </div>
          <div>
            <p className="text-label text-white">Menu</p>
            <div className="mt-2 flex flex-col gap-1 text-small text-ink-on-dark-muted">
              <a href="#how-it-works" className="hover:text-white">How it works</a>
              <a href="#sample-stores" className="hover:text-white">Made for</a>
              <a href="#faq" className="hover:text-white">FAQ</a>
              <a href="/start" className="hover:text-white">Open your shop</a>
              <a href="/auth/login" className="hover:text-white">Vendor sign in</a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2.5 text-small text-ink-on-dark-muted">
            <OstraMark className="h-7 w-7" />
            <span>powered by Ostra</span>
          </div>
          <div className="flex items-center gap-6 text-small text-ink-on-dark-muted">
            <span>&copy; 2026 sikatree</span>
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <a href="/terms" className="hover:text-white">Terms</a>
          </div>
        </div>
      </div>

      <div className="flex justify-center overflow-hidden px-5 pb-12 pt-10 sm:pt-14">
        <span className="block max-w-full font-sans text-[clamp(96px,18vw,200px)] font-semibold lowercase leading-none tracking-[-0.05em] text-[var(--bg-page)]">
          sikatree
        </span>
      </div>
    </footer>
  );
}
