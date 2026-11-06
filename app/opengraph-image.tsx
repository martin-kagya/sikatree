import { ImageResponse } from 'next/og';

export const alt = 'sikatree: your whole store on WhatsApp';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// WhatsApp and social preview. Generated at request time, no binary asset to
// keep in sync with the brand.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#f1f1f1',
          padding: '64px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: '#3fa55c',
              marginRight: '18px',
            }}
          />
          <div
            style={{
              display: 'flex',
              fontSize: '38px',
              fontWeight: 700,
              color: '#10111f',
              letterSpacing: '-0.04em',
            }}
          >
            sikatree
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: '86px',
              fontWeight: 700,
              color: '#10111f',
              letterSpacing: '-0.05em',
              lineHeight: 1,
            }}
          >
            Your whole store
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '86px',
              fontWeight: 700,
              color: '#10111f',
              letterSpacing: '-0.05em',
              lineHeight: 1.1,
            }}
          >
            <span>on</span>
            <span style={{ color: '#1f7a45', marginLeft: '16px' }}>WhatsApp.</span>
          </div>
          <div style={{ display: 'flex', marginTop: '26px', fontSize: '28px', color: '#6b6b6b' }}>
            Photos, prices, orders and MoMo payments. All from one chat.
          </div>
        </div>

        <div style={{ display: 'flex' }}>
          <div
            style={{
              display: 'flex',
              background: '#10111f',
              color: '#ffffff',
              padding: '14px 30px',
              borderRadius: '999px',
              fontSize: '24px',
            }}
          >
            sikatree.africa
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
