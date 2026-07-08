import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import './Auth.css'

const SignupForm = () => {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const result = await signup(formData)
    setLoading(false)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error || 'Signup failed. Please try again.')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-visual">
          {/* Empty left side to show the background image purely */}
        </div>

        <div className="auth-form-wrap">
          <div className="auth-form-card">
            <h1 className="auth-form-title">Join us</h1>
            <p className="auth-form-sub">Create your account below.</p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label>Username</label>
                <div className="auth-input-wrap">
                  <input
                    type="text"
                    name="username"
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label>Email</label>
                <div className="auth-input-wrap">
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label>Password</label>
                <div className="auth-input-wrap">
                  <input
                    type="password"
                    name="password"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? 'Registering...' : 'Register'}
              </button>
            </form>

            <p className="auth-switch">
              Already have an account? <Link to="/login">Log in here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignupForm