import './OfferCards.css'

function OfferCards() {
  return (
    <section className="offer-cards">
      <div className="offer-card offer-card--dark">
        <div>
          <p className="offer-card__title">Flat 50% Off</p>
          <p className="offer-card__subtitle">On your very first order at DigiBazaar</p>
        </div>
        <span className="offer-badge">WELCOME50</span>
      </div>
      <div className="offer-card offer-card--orange">
        <div>
          <p className="offer-card__title">Free Delivery</p>
          <p className="offer-card__subtitle">On all orders above ₹99 today</p>
        </div>
        <span className="offer-icon">🚚</span>
      </div>
    </section>
  )
}

export default OfferCards
