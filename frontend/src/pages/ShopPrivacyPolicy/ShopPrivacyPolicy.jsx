import React from 'react'

export default function ShopPrivacyPolicy() {
  return (
    <div className="legal-page shopowner">
      <div className="legal-hero shopowner">
        <div className="legal-hero-inner">
          <h1>Shop Owner Privacy Policy</h1>
          <p className="hero-sub">A focused privacy overview for DigiBazaar shop owners and sellers.</p>
        </div>
      </div>

      <div className="legal-content">
        <section className="legal-section">
          <h2>Purpose</h2>
          <p>
            This policy explains how DigiBazaar collects and uses information from shop owners,
            vendors, and their store operations.
          </p>
        </section>

        <section className="legal-section">
          <h2>Business Data</h2>
          <p>
            We collect shop registration details, bank account and payout information, order
            logs, inventory records, and support interactions to operate your store and manage
            payments.
          </p>
        </section>

        <section className="legal-section">
          <h2>How We Share Information</h2>
          <p>
            Shop data is shared with payment processors, delivery partners, and regulatory
            authorities only when required by law or for order fulfillment.
          </p>
        </section>

        <section className="legal-section">
          <h2>Seller Support & Security</h2>
          <p>
            We protect your account with encrypted storage and role-based access controls.
            Contact our seller support team at <a href="mailto:partner-support@digibazaar.in">partner-support@digibazaar.in</a>.
          </p>
        </section>

        <section className="legal-section">
          <h2>Contact</h2>
          <p>
            Questions about shop owner privacy can be sent to <a href="mailto:partner-support@digibazaar.in">partner-support@digibazaar.in</a>.
          </p>
        </section>
      </div>
    </div>
  )
}
