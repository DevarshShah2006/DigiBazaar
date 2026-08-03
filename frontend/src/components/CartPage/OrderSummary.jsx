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
  return (
    <div className="order-summary-card">
      <div className="order-summary-card__header">
        <p className="order-summary-card__eyebrow">Order Summary</p>
        <h2 className="order-summary-card__title">Order Summary</h2>
      </div>

      <div className="order-summary-card__body">
        <div className="summary-row">
          <span>Items Total</span>
          <strong>₹{itemsTotal.toFixed(2)}</strong>
        </div>
        <div className="summary-row">
          <span>Delivery Fee</span>
          <strong>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}</strong>
        </div>
        <div className="summary-row">
          <span>Small Order Surcharge</span>
          <strong>{smallOrderCharge === 0 ? '₹0' : `₹${smallOrderCharge.toFixed(2)}`}</strong>
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

        <div className="summary-divider" />

        <div className="summary-total-row">
          <span>Total Payable</span>
          <strong>₹{totalPayable.toFixed(2)}</strong>
        </div>

        <button className="summary-proceed-btn" onClick={onProceed} disabled={disabled}>
          Proceed to Payment
        </button>
      </div>
    </div>
  )
}

export default OrderSummary
