import { DM_ROWS, SHOW_REVIEW_STEP, VENDOR, ORDER } from './data';

export function InboxScreen() {
  return (
    <div className="hiw-inbox">
      <div className="hiw-inbox-head">
        <div>
          <h3 className="hiw-inbox-title">Messages</h3>
          <p className="hiw-inbox-sub">23 unread</p>
        </div>
      </div>

      <ul className="hiw-dm-list">
        {DM_ROWS.map((dm) => (
          <li key={dm.name} className="hiw-dm">
            <span className="hiw-dm-avatar" aria-hidden>
              {dm.name[0]}
            </span>
            <div className="hiw-dm-meta">
              <p className="hiw-dm-name">{dm.name}</p>
              <p className="hiw-dm-line">{dm.line}</p>
            </div>
            <span className="hiw-dm-badge">{dm.unread}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ParseScreen() {
  return (
    <div className="hiw-parse">
      <div className="hiw-parse-head">
        <span className="hiw-parse-avatar" aria-hidden>
          s
        </span>
        <div>
          <p className="hiw-parse-name">sikatree</p>
          <p className="hiw-parse-status">online</p>
        </div>
      </div>

      <div className="hiw-parse-body">
        <div className="hiw-bubble-out hiw-anim">
          <span className="hiw-hl hiw-hl--green">Serum</span>
          {', '}
          <span className="hiw-hl hiw-hl--amber">120</span>
        </div>

        <div className="hiw-card hiw-anim" style={{ transitionDelay: '300ms' }}>
          <p className="hiw-card-title">Here’s what I got</p>
          <div className="hiw-card-field">
            <span className="hiw-card-key">Name</span>
            <span className="hiw-card-val">Serum</span>
          </div>
          <div className="hiw-card-field">
            <span className="hiw-card-key">Price</span>
            <span className="hiw-card-val">GH₵120</span>
          </div>
          {SHOW_REVIEW_STEP && (
            <div className="hiw-card-actions">
              <span className="hiw-btn hiw-btn--primary">Confirm</span>
              <span className="hiw-btn hiw-btn--ghost">Edit</span>
            </div>
          )}
        </div>

        <div className="hiw-live-line hiw-anim" style={{ transitionDelay: '600ms' }}>
          Added. You’re live at <span className="hiw-live-link">/amasglow</span>
        </div>
      </div>
    </div>
  );
}

export function HiwShopScreen() {
  const avatar = VENDOR.shopName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="hiw-shop">
      <div className="hiw-shop-head">
        <span className="hiw-shop-avatar" aria-hidden>
          {avatar}
        </span>
        <div>
          <p className="hiw-shop-name">{VENDOR.shopName}</p>
          <p className="hiw-shop-sub">{VENDOR.subtitle}</p>
        </div>
      </div>

      <span className="hiw-shop-link hiw-anim">sikatree/{VENDOR.slug}</span>

      <div className="hiw-shop-grid">
        {VENDOR.items.map((item, i) => (
          <div key={item.name} className="hiw-tile hiw-anim" style={{ transitionDelay: `${150 + i * 120}ms` }}>
            <div className="hiw-tile-img" style={{ background: item.tint }}>
              <span aria-hidden>{item.name[0]}</span>
            </div>
            <p className="hiw-tile-name">{item.name}</p>
            <p className="hiw-tile-price">{item.price}</p>
          </div>
        ))}
      </div>

      <div className="hiw-pay hiw-anim" style={{ transitionDelay: '390ms' }}>
        Pay with MoMo
      </div>
    </div>
  );
}

export function OrderScreen() {
  return (
    <div className="hiw-order">
      <div className="hiw-order-head">
        <h3 className="hiw-order-title">New order</h3>
      </div>

      <div className="hiw-order-card hiw-anim">
        <p className="hiw-order-code">{ORDER.code}</p>
        <p className="hiw-order-item">{ORDER.item}</p>
        <p className="hiw-order-buyer">Buyer: {ORDER.buyer}</p>
        <p className="hiw-order-amount">{ORDER.amount} paid</p>
        <div className="hiw-order-actions">
          <span className="hiw-btn hiw-btn--primary">Confirm</span>
          <span className="hiw-btn hiw-btn--ghost">Contact buyer</span>
        </div>
      </div>

      <p className="hiw-order-line hiw-anim" style={{ transitionDelay: '350ms' }}>
        MoMo received. Order code sent to the buyer.
      </p>
    </div>
  );
}
