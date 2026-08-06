import React from 'react'
import { useAuth } from '../../context/AuthContext'

export default function SafeDeliveryTips() {
  const { user } = useAuth()
  const role = user?.role || 'guest'

  return (
    <div className="legal-page">
      <div className={`legal-hero ${role}`}>
        <div className="legal-hero-inner">
          <h1>Safe Delivery Tips</h1>
          <p className="hero-sub">Guidance to keep riders, customers and parcels safe during deliveries.</p>
        </div>
      </div>

      <div className="legal-content">
        <section className="legal-section">
          <h2>Before Pickup</h2>
          <ul>
            <li>Verify the order details and package condition before accepting the job.</li>
            <li>Wear appropriate safety gear and secure the parcel on your vehicle.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>During Delivery</h2>
          <ul>
            <li>Follow traffic rules, maintain safe speed and be aware of surroundings.</li>
            <li>Prefer contactless handovers when requested and confirm identity where needed.</li>
          </ul>
        </section>

        {role === 'rider' && (
          <section className="legal-section">
            <h2>Rider-Focused Best Practices</h2>
            <ul>
              <li>Share location with support if you encounter unsafe situations.</li>
              <li>Take photos only when required for delivery proof; avoid capturing customer faces.</li>
            </ul>
          </section>
        )}

        {role === 'customer' && (
          <section className="legal-section">
            <h2>Customer Tips</h2>
            <ul>
              <li>Provide clear drop-off instructions to help quick and safe delivery.</li>
              <li>Use contactless delivery preferences when desired and confirm identity carefully.</li>
            </ul>
          </section>
        )}

        {role === 'shopowner' && (
          <section className="legal-section">
            <h2>Shop Owner Notes</h2>
            <p>Package items securely and label fragile goods to reduce in-transit damage.</p>
          </section>
        )}

        <section className="legal-section">
          <h2>After Delivery</h2>
          <p>Confirm delivery in the app and report any issues to rider-support@digibazaar.in.</p>
        </section>
      </div>
    </div>
  )
}
