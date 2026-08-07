import './OfferCards.css'

function OfferCards() {
  return (
    <section className="offer-cards" aria-label="Festive coupon offers">
      <div className="offer-card offer-card--dark">
        <div>
          <p className="offer-card__title">Rakhi Sweet Sale · Flat 25% Off</p>
          <p className="offer-card__subtitle">On sweets and chocolates · one use per customer</p>
        </div>
        <span className="offer-badge">RAKHI25</span>
      </div>
      <div className="offer-card offer-card--orange">
        <div>
          <p className="offer-card__title">Independence Day · Flat 20% Off</p>
          <p className="offer-card__subtitle">On cart values of ₹499 or more · one use per customer</p>
        </div>
        <span className="offer-badge">INDIA20</span>
      </div>
    </section>
  )
}

export default OfferCards
