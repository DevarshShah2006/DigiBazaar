import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { Phone, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react'
import './Auth.css'

const LoginForm = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('role') // 'role', 'phone', 'otp', 'success'
  const [role, setRole] = useState('customer')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const otpRefs = useRef([])

  const handleOtpChange = (idx, value) => {
    if (!/^\d*$/.test(value)) return
    const nextOtp = [...otp]
    nextOtp[idx] = value.slice(-1)
    setOtp(nextOtp)
    if (value && idx < 5) {
      otpRefs.current[idx + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus()
    }
  }

  const handleSendOtp = (e) => {
    e.preventDefault()
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.')
      return
    }
    setError('')
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setStep('otp')
    }, 800)
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    const enteredOtp = otp.join('')
    // Pass both phone and OTP to verify
    const result = await login({ phone, otp: enteredOtp })
    setLoading(false)
    if (result.success) {
      setStep('success')
      setTimeout(() => {
        if (role === 'shopowner') {
          navigate('/dashboard')
        } else if (role === 'rider') {
          navigate('/rider')
        } else {
          navigate('/')
        }
      }, 1000)
    } else {
      setError(result.error || 'Your phone number is not registered. Please sign up first.')
    }
  }

  return (
    <div className={`auth-page portal-${role}`}>
      <div className="auth-card glass-card fade-in">
        <div className="auth-header">
          <span className="auth-logo">🛒 DigiBazaar</span>
          <h2>Sign In</h2>
          <p>Passwordless phone verification</p>
        </div>

        {error && <div className="auth-error-msg">{error}</div>}

        {step === 'role' && (
          <div className="auth-step-box">
            <label className="auth-field-label">I want to login as:</label>
            <div className="role-grid">
              <div 
                className={`role-select-card customer ${role === 'customer' ? 'active' : ''}`}
                onClick={() => setRole('customer')}
              >
                <span className="role-icon">🛍️</span>
                <h4>Customer</h4>
                <p>Buy from local shops</p>
              </div>
              <div 
                className={`role-select-card shopowner ${role === 'shopowner' ? 'active' : ''}`}
                onClick={() => setRole('shopowner')}
              >
                <span className="role-icon">🏬</span>
                <h4>Shop Owner</h4>
                <p>Manage your inventory</p>
              </div>
              <div 
                className={`role-select-card rider ${role === 'rider' ? 'active' : ''}`}
                onClick={() => setRole('rider')}
              >
                <span className="role-icon">🏍️</span>
                <h4>Rider</h4>
                <p>Deliver nearby orders</p>
              </div>
            </div>
            <button className="auth-primary-btn" onClick={() => setStep('phone')}>
              Continue <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="auth-step-box">
            <div className="auth-field">
              <label className="auth-field-label">Mobile Number</label>
              <div className="phone-input-group">
                <span className="phone-country">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="98*** *****"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                />
              </div>
            </div>
            <div className="auth-btn-row">
              <button type="button" className="auth-sec-btn" onClick={() => setStep('role')}>Back</button>
              <button type="submit" className="auth-primary-btn" disabled={loading}>
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </div>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerify} className="auth-step-box">
            <div className="auth-field">
              <label className="auth-field-label">Verification OTP</label>
              <p className="otp-sub-text">Enter the 6-digit code sent to +91 {phone}</p>
              <div className="otp-inputs">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => (otpRefs.current[idx] = el)}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(idx, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                    required
                  />
                ))}
              </div>
            </div>
            <div className="auth-btn-row">
              <button type="button" className="auth-sec-btn" onClick={() => setStep('phone')}>Back</button>
              <button type="submit" className="auth-primary-btn" disabled={otp.join('').length !== 6 || loading}>
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
            </div>
          </form>
        )}

        {step === 'success' && (
          <div className="auth-success-box text-center">
            <div className="success-icon-check">✓</div>
            <h3>Verified Successfully!</h3>
            <p>Welcome to DigiBazaar</p>
          </div>
        )}

        {step !== 'success' && (
          <p className="auth-redirect">
            New here? <Link to="/signup" state={{ role, phone }}>Create an account</Link>
          </p>
        )}
      </div>
    </div>
  )
}

export default LoginForm