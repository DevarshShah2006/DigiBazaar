import { fetchJson } from './api'

export function login(credentials) {
  return fetchJson('/auth/login/', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export function signup(details) {
  return fetchJson('/auth/signup/', {
    method: 'POST',
    body: JSON.stringify(details),
  })
}
