import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { UserPlus, ArrowRight } from 'lucide-react'
import './Auth.css'

const SignupForm = () => {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Retrieve passed state if any from login page redirect
  const initialRole = location.state?.role || 'customer'
  const initialPhone = location.state?.phone || ''

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: initialPhone,
    role: initialRole
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.phone.length !== 10) {
      setError('Please provide a valid 10-digit mobile number.')
      return
    }
    setLoading(true)
    
    // Map 'name' to the username payload in signup
    const result = await signup({
      phone: formData.phone,
      email: formData.email,
      role: formData.role,
      name: formData.name
    })
    
    setLoading(false)
    if (result.success) {
      setSuccess(true)
      setTimeout(() => {
        if (formData.role === 'shopowner') {
          navigate('/dashboard')
        } else if (formData.role === 'rider') {
          navigate('/rider')
        } else {
          navigate('/')
        }
      }, 1000)
    } else {
      setError(result.error || 'Signup failed. Please try again.')
    }
  }

  return (
    <div className={`auth-page portal-${formData.role}`}>
      <div className="auth-card glass-card fade-in">
        <div className="auth-header">
          <span className="auth-logo">🛒 DigiBazaar</span>
          <h2>Create Account</h2>
          <p>Register using your phone number</p>
        </div>

        {error && <div className="auth-error-msg">{error}</div>}

        {success ? (
          <div className="auth-success-box text-center">
            <div className="success-icon-check">✓</div>
            <h3>Account Created!</h3>
            <p>Welcome to DigiBazaar</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-step-box">
            <div className="auth-field">
              <label className="auth-field-label">Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="e.g. John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>

            <div className="auth-field">
              <label className="auth-field-label">Mobile Number</label>
              <div className="phone-input-group">
                <span className="phone-country">+91</span>
                <input
                  type="tel"
                  name="phone"
                  maxLength={10}
                  placeholder="98765 43210"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-field-label">Email Address (Optional)</label>
              <input
                type="email"
                name="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="auth-field">
              <label className="auth-field-label">Register As</label>
              <select name="role" value={formData.role} onChange={handleChange} className="auth-select">
                <option value="customer">Customer</option>
                <option value="shopowner">Shop Owner</option>
                <option value="rider">Delivery Partner</option>
              </select>
            </div>

            <button type="submit" className="auth-primary-btn" disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign Up'} <ArrowRight size={16} />
            </button>
          </form>
        )}

        {!success && (
          <p className="auth-redirect">
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        )}
      </div>
    </div>
  )
}

export default SignupForm