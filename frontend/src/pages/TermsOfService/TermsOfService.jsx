import React from 'react'

export default function TermsOfService() {
  return (
    <div className="legal-page shopowner">
      <div className="legal-hero shopowner">
        <div className="legal-hero-inner">
          <h1>Terms of Service</h1>
          <p className="hero-sub">Basic terms for using DigiBazaar as a shop owner and seller.</p>
        </div>
      </div>

      <div className="legal-content">
        <section className="legal-section">
          <h2>Acceptance</h2>
          <p>
            By using the DigiBazaar shop dashboard, you agree to these terms for managing orders,
            inventory, and payouts through our platform.
          </p>
        </section>

        <section className="legal-section">
          <h2>Shop Owner Responsibilities</h2>
          <p>
            Shop owners must keep product information accurate, fulfill accepted orders promptly,
            and comply with local laws and marketplace policies.
          </p>
        </section>

        <section className="legal-section">
          <h2>Payment and Fees</h2>
          <p>
            DigiBazaar may charge commission on orders and process payouts as described in your
            seller agreement. Fees may change with notice.
          </p>
        </section>

        <section className="legal-section">
          <h2>Prohibited Activity</h2>
          <p>
            Do not use DigiBazaar to list restricted goods, misrepresent products, or engage in
            fraudulent activity. Violation may result in account suspension.
          </p>
        </section>

        <section className="legal-section">
          <h2>Contact</h2>
          <p>
            For terms questions, email <a href="mailto:partner-support@digibazaar.in">partner-support@digibazaar.in</a>.
          </p>
        </section>
      </div>
    </div>
  )
}
