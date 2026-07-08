import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import './Auth.css'

const LoginForm = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const result = await login(formData)
    setLoading(false)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error || 'Invalid credentials. Please try again.')
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
            <h1 className="auth-form-title">Welcome back</h1>
            <p className="auth-form-sub">Please enter your details.</p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label>Username</label>
                <div className="auth-input-wrap">
                  <input
                    type="text"
                    name="username"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label>Password</label>
                <div className="auth-input-wrap">
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <div className="auth-meta-row">
                <label className="auth-checkbox">
                  <input type="checkbox" /> Remember me
                </label>
                <a href="#" className="auth-forgot">Forgot your password?</a>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? 'Logging in...' : 'Log in'}
              </button>
            </form>

            <p className="auth-switch">
              Don't have an account? <Link to="/signup">Register here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginForm