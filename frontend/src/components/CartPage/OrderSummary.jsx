import './OrderSummary.css'

function OrderSummary({
  itemsTotal,
  deliveryFee,
  smallOrderCharge,
  discountAmount,
  totalPayable,
  discountCode,
  setDiscountCode,
  onApplyDiscount,
  discountApplied,
  discountMessage,
  onProceed,
  disabled
}) {
  const currency = '\u20B9'

  return (
    <div className="order-summary-card">
      <div className="order-summary-card__header">
        <p className="order-summary-card__eyebrow">Order Summary</p>
        <h2 className="order-summary-card__title">Order Summary</h2>
      </div>

      <div className="order-summary-card__body">
        <div className="summary-row">
          <span>Items Total</span>
          <strong>{currency}{itemsTotal.toFixed(2)}</strong>
        </div>
        <div className="summary-row">
          <span>Delivery Fee</span>
          <strong>{deliveryFee === 0 ? 'FREE' : `${currency}${deliveryFee.toFixed(2)}`}</strong>
        </div>
        <div className="summary-row">
          <span>Small Order Surcharge</span>
          <strong>{smallOrderCharge === 0 ? `${currency}0` : `${currency}${smallOrderCharge.toFixed(2)}`}</strong>
        </div>

        <div className="promo-row">
          <input
            type="text"
            className="promo-input"
            placeholder="Discount Code"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value)}
          />
          <button className="promo-apply-btn" onClick={onApplyDiscount}>Apply</button>
        </div>
        {discountMessage && (
          <p className={`promo-message ${discountApplied ? 'success' : 'error'}`}>{discountMessage}</p>
        )}

        <details className="available-promos">
          <summary>View Available Promo Codes</summary>
          <div className="available-promos__menu">
            <button type="button" onClick={() => setDiscountCode('WELCOME50')}>
              <strong>WELCOME50</strong><span>50% OFF · First order only</span>
            </button>
            <button type="button" onClick={() => setDiscountCode('SAVE20')}>
              <strong>SAVE20</strong><span>20% OFF</span>
            </button>
            <button type="button" onClick={() => setDiscountCode('FLAT10')}>
              <strong>FLAT10</strong><span>10% OFF</span>
            </button>
          </div>
        </details>

        {discountApplied && discountAmount > 0 && (
          <div className="summary-row summary-row--discount">
            <span className="summary-row__discount-label"><small>Applied promo</small>{discountCode.trim().toUpperCase()} discount</span>
            <strong>- {currency}{discountAmount.toFixed(2)}</strong>
          </div>
        )}

        <div className="summary-divider" />

        <div className="summary-total-row">
          <span>Total Payable</span>
          <strong>{currency}{totalPayable.toFixed(2)}</strong>
        </div>

        <button className="summary-proceed-btn" onClick={onProceed} disabled={disabled}>
          Proceed to Payment
        </button>
      </div>
    </div>
  )
}

export default OrderSummary
