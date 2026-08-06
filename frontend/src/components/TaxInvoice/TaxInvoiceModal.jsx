import { useRef } from 'react'
import './TaxInvoiceModal.css'

function numberToWords(num) {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen ']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  
  num = Math.floor(Number(num) || 0)
  if (num === 0) return 'Zero'
  if (num < 20) return a[num]
  if (num < 100) return b[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + a[num % 10] : '')
  if (num < 1000) return a[Math.floor(num / 100)] + 'Hundred ' + (num % 100 !== 0 ? numberToWords(num % 100) : '')
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + 'Thousand ' + (num % 1000 !== 0 ? numberToWords(num % 1000) : '')
  return numberToWords(Math.floor(num / 100000)) + 'Lakh ' + (num % 100000 !== 0 ? numberToWords(num % 100000) : '')
}

export default function TaxInvoiceModal({ order, onClose }) {
  const printRef = useRef(null)

  if (!order) return null

  const handlePrint = () => {
    window.print()
  }

  const items = order.items || []
  const itemsTotal = items.reduce((sum, item) => sum + (parseFloat(item.price_at_order || 0) * Number(item.quantity || 1)), 0)
  const discount = parseFloat(order.discount_amount || 0)
  const deliveryFee = parseFloat(order.delivery_charge || 0)
  const grandTotal = Math.max(0, itemsTotal + deliveryFee - discount)

  // Tax breakdown (Assume 5% total GST included: 2.5% CGST + 2.5% SGST)
  const taxableAmount = grandTotal / 1.05
  const totalTax = grandTotal - taxableAmount
  const cgstAmount = totalTax / 2
  const sgstAmount = totalTax / 2

  const invoiceNo = `INV-2026-${String(order.id).padStart(5, '0')}`
  const invoiceDate = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })

  return (
    <div className="tax-invoice-overlay fade-in">
      <div className="tax-invoice-modal-container">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="tax-invoice-controls noprint">
          <div>
            <h3>Tax Invoice · Order #{order.id}</h3>
            <p>Official computer-generated GST tax receipt</p>
          </div>
          <div className="controls-btn-group">
            <button className="btn-print-invoice" onClick={handlePrint}>
              Download PDF / Print Receipt
            </button>
            <button className="btn-close-invoice" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {/* Printable Tax Invoice Sheet */}
        <div className="tax-invoice-sheet" ref={printRef}>
          {/* Header */}
          <div className="invoice-header-row">
            <div className="company-branding">
              <h1 className="brand-logo">DigiBazaar</h1>
              <p className="company-legal">DigiBazaar Hyperlocal Commerce Pvt. Ltd.</p>
              <p className="company-address">Paldi Cross Roads, Ahmedabad, Gujarat - 380007</p>
              <p className="company-gstin"><strong>GSTIN:</strong> 24AAACD1234F1Z9 · <strong>FSSAI:</strong> 10721001000456</p>
            </div>
            <div className="invoice-meta-box">
              <div className="tax-invoice-badge">TAX INVOICE</div>
              <p className="meta-line"><strong>Invoice No:</strong> {invoiceNo}</p>
              <p className="meta-line"><strong>Date:</strong> {invoiceDate}</p>
              <p className="meta-line"><strong>Order ID:</strong> #{order.id}</p>
              <p className="meta-line"><strong>Payment Mode:</strong> {(order.payment_method || 'UPI').toUpperCase()} ({order.payment_status === 'paid' ? 'PAID' : 'COMPLETED'})</p>
            </div>
          </div>

          <hr className="divider-line" />

          {/* Billed From & Billed To */}
          <div className="billing-parties-grid">
            <div className="party-box seller-box">
              <h4>Billed From (Seller)</h4>
              <p className="party-name">{order.shop_name || 'DigiBazaar Partner Shop'}</p>
              <p className="party-detail">{order.shop_address || 'Merchant Premises, Ahmedabad, Gujarat'}</p>
              <p className="party-detail">Phone: +91 {order.shop_phone || '9876543210'}</p>
              <p className="party-detail">Merchant GSTIN: 24AAAFG9988H1Z2</p>
            </div>
            <div className="party-box buyer-box">
              <h4>Billed To (Customer)</h4>
              <p className="party-name">{order.user_name || 'Valued Customer'}</p>
              <p className="party-detail">{order.delivery_address || 'Delivery Address, Ahmedabad'}</p>
              <p className="party-detail">Phone: +91 {order.user_phone || '9988776655'}</p>
              <p className="party-detail">Fulfillment: {order.fulfillment_option === 'digibazaar_delivery' ? 'Delivery by DigiBazaar' : order.fulfillment_option === 'shop_delivery' ? 'Delivery by Shop' : 'Store Pickup'}</p>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="invoice-table-wrapper">
            <table className="invoice-items-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Item Description</th>
                  <th style={{ width: '80px' }}>HSN</th>
                  <th style={{ width: '50px' }}>Qty</th>
                  <th style={{ width: '90px' }}>Rate (₹)</th>
                  <th style={{ width: '80px' }}>CGST</th>
                  <th style={{ width: '80px' }}>SGST</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const rate = parseFloat(item.price_at_order || 0)
                  const qty = Number(item.quantity || 1)
                  const lineTotal = rate * qty
                  const itemCgst = (lineTotal * 0.025).toFixed(2)
                  const itemSgst = (lineTotal * 0.025).toFixed(2)

                  return (
                    <tr key={item.id || idx}>
                      <td>{idx + 1}</td>
                      <td className="item-name-cell">
                        <strong>{item.product_name}</strong>
                      </td>
                      <td>210690</td>
                      <td>{qty}</td>
                      <td>₹{rate.toFixed(2)}</td>
                      <td>2.5% (₹{itemCgst})</td>
                      <td>2.5% (₹{itemSgst})</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{lineTotal.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Grid */}
          <div className="invoice-summary-layout">
            <div className="summary-left-words">
              <p className="words-label">Amount in Words:</p>
              <p className="words-text">{numberToWords(grandTotal)} Rupees Only</p>
              <div className="gst-declaration-box">
                <p><strong>Declaration:</strong> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. Tax is payable on reverse charge basis: NO.</p>
              </div>
            </div>

            <div className="summary-right-totals">
              <div className="summary-line">
                <span>Items Net Subtotal:</span>
                <span>₹{itemsTotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="summary-line discount">
                  <span>Promo Coupon Discount:</span>
                  <span>- ₹{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="summary-line">
                <span>Delivery Charge:</span>
                <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}</span>
              </div>
              <div className="summary-line tax-line">
                <span>CGST (2.5%):</span>
                <span>₹{cgstAmount.toFixed(2)}</span>
              </div>
              <div className="summary-line tax-line">
                <span>SGST (2.5%):</span>
                <span>₹{sgstAmount.toFixed(2)}</span>
              </div>
              <div className="summary-line grand-total">
                <span>Grand Total:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer & Digital Verification */}
          <div className="invoice-footer">
            <div className="footer-qr-stub">
              <div className="qr-code-placeholder">
                <div className="qr-symbol">QR</div>
              </div>
              <span className="qr-caption">Scan to verify invoice authenticity</span>
            </div>
            <div className="footer-signature-stub">
              <div className="stamp-box">
                <span>COMPUTERS GENERATED TAX INVOICE</span>
                <span>AUTHENTICATED RECORD</span>
              </div>
              <p className="signature-caption">Authorized Signatory for DigiBazaar Commerce</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
