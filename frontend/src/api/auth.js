import { fetchJson } from './api'

export function loginUser(credentials) {
  return fetchJson('/auth/login/', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export function signupUser(data) {
  return fetchJson('/auth/signup/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function verifyOTP(data) {
  return fetchJson('/auth/verify-otp/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
