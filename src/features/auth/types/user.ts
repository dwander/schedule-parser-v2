export interface User {
  id: string
  name: string
  email: string
  picture?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}
