import './CartPageShared.css'

function AddressCard({ address, coordinates, onChange }) {
  return (
    <div className="address-card">
      <div className="address-card__icon"></div>
      <div className="address-card__content">
        <p className="address-card__title">Delivery Address</p>
        <p className="address-card__text">
          {address}
          {coordinates && (
            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>
              ({coordinates})
            </span>
          )}
        </p>
      </div>
      <button className="address-card__change" onClick={onChange}>Change</button>
    </div>
  )
}

export default AddressCard
