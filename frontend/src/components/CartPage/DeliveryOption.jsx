import './CartPageShared.css'

function DeliveryOption({ option, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`delivery-option${selected ? ' delivery-option--selected' : ''}`}
      onClick={onSelect}
    >
      <div>
        <p className="delivery-option__label">{option.title}</p>
        <p className="delivery-option__subtext">{option.subtitle}</p>
      </div>
      <div className="delivery-option__badge">{option.label}</div>
    </button>
  )
}

export default DeliveryOption
