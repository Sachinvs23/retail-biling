export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface RegisteredUser extends AuthUser {
  name: string;
  createdAt: string;
}

export interface LogoutResponse {
  message: string;
}
