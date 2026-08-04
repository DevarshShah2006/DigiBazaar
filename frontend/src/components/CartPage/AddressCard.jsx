import './CartPageShared.css'

function AddressCard({ address, onChange }) {
  return (
    <div className="address-card">
      <div className="address-card__icon">🏠</div>
      <div className="address-card__content">
        <p className="address-card__title">Delivery Address</p>
        <p className="address-card__text">{address}</p>
      </div>
      <button className="address-card__change" onClick={onChange}>Change</button>
    </div>
  )
}

export default AddressCard
