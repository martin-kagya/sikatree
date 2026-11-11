import { ImageResponse } from 'next/og';
import { site } from '@/lib/brand';
import { normalizeHandle } from '@/lib/handle';
import { accentFor, tintForAccent } from '@/lib/shop-accent';
import { getStorefrontSettings } from '@/lib/storefront';
import { query } from '@/lib/db';

export const alt = 'A sikatree shop';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamic = 'force-dynamic';

function absolute(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${site.url}${url.startsWith('/') ? '' : '/'}${url}`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export default async function StorefrontOpengraphImage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: rawHandle } = await params;
  const handle = normalizeHandle(decodeURIComponent(rawHandle));
  const rows = handle
    ? await query<{ id: string }>(`select id from vendors where handle = $1 and status = 'live'`, [
        handle,
      ])
    : [];
  const settings = rows[0] ? await getStorefrontSettings(rows[0].id) : null;

  if (!settings) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f1f1f1',
            color: '#10111f',
            fontSize: '64px',
            fontWeight: 700,
          }}
        >
          sikatree
        </div>
      ),
      { ...size },
    );
  }

  const accent = accentFor(settings.accent);
  const tint = tintForAccent(accent.hex, 0.18);
  const logo = absolute(settings.logoUrl);
  const line = [settings.location, settings.category].filter(Boolean).join(' · ');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: `linear-gradient(135deg, ${tint}, #ffffff 72%)`,
          padding: '64px',
          color: '#10111f',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: accent.hex,
              marginRight: '18px',
            }}
          />
          <div
            style={{
              display: 'flex',
              fontSize: '36px',
              fontWeight: 700,
              letterSpacing: '-0.04em',
            }}
          >
            sikatree
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              width: '188px',
              height: '188px',
              borderRadius: '50%',
              background: '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '44px',
              border: '8px solid #ffffff',
            }}
          >
            {logo ? (
              <img
                src={logo}
                alt=""
                width={160}
                height={160}
                style={{ objectFit: 'contain' }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  fontSize: '58px',
                  fontWeight: 700,
                  color: accent.hex,
                }}
              >
                {initials(settings.name)}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '780px' }}>
            <div
              style={{
                display: 'flex',
                fontSize: '76px',
                fontWeight: 700,
                letterSpacing: '-0.05em',
                lineHeight: 1.02,
              }}
            >
              {settings.name}
            </div>
            {settings.tagline ? (
              <div
                style={{
                  display: 'flex',
                  marginTop: '20px',
                  fontSize: '30px',
                  lineHeight: 1.2,
                  color: '#5c5d69',
                }}
              >
                {settings.tagline}
              </div>
            ) : null}
            {line ? (
              <div
                style={{
                  display: 'flex',
                  marginTop: '18px',
                  fontSize: '24px',
                  color: '#5c5d69',
                }}
              >
                {line}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              background: '#10111f',
              color: '#ffffff',
              padding: '14px 28px',
              borderRadius: '999px',
              fontSize: '22px',
            }}
          >
            sikatree.africa/{settings.handle}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
