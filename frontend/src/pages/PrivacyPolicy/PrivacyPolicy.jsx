import React from 'react'
import { useAuth } from '../../context/AuthContext'

export default function PrivacyPolicy() {
  const { user } = useAuth()
  const role = user?.role || 'guest'

  return (
    <div className="legal-page">
      <div className={`legal-hero ${role}`}>
        <div className="legal-hero-inner">
          <h1>Privacy Policy</h1>
          <p className="hero-sub">How we collect, use, and protect your information at DigiBazaar.</p>
        </div>
      </div>

      <div className="legal-content">
        <section className="legal-section">
          <h2>Introduction</h2>
          <p>
            We respect your privacy and are committed to protecting your personal information. This
            page provides a brief overview while our full legal copy is prepared.
          </p>
        </section>

        <section className="legal-section">
          <h2>Data We Collect</h2>
          <p>
            We may collect basic account information (name, phone, email), transaction records,
            device identifiers and usage data to deliver and improve our services.
          </p>
        </section>

        {role === 'customer' && (
          <section className="legal-section">
            <h2>Customer Privacy Notes</h2>
            <p>
              Customer data (orders, addresses, payment metadata) is used to process purchases,
              recommend relevant products, and improve your shopping experience. We do not sell
              your personal data to third-party advertisers.
            </p>
          </section>
        )}

        {role === 'shopowner' && (
          <section className="legal-section">
            <h2>Shop Owner Privacy Notes</h2>
            <p>
              As a shop owner, we store business contact details, payout information and order
              histories. Financial data is shared only with our payments provider as required to
              settle payouts and comply with regulations.
            </p>
          </section>
        )}

        {role === 'rider' && (
          <section className="legal-section">
            <h2>Rider Privacy Notes</h2>
            <p>
              Rider profiles include identity verification documents and trip logs. Location data
              is used for routing and safety; we minimise retention and access to this data.
            </p>
          </section>
        )}

        <section className="legal-section">
          <h2>Contact</h2>
          <p>
            For privacy inquiries, reach out to <a href="mailto:support@digibazaar.in">support@digibazaar.in</a>.
          </p>
        </section>
      </div>
    </div>
  )
}
