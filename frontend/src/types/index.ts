export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
}

export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
  user: User;
}

export interface ApiErrorResponse {
  detail?: string;
}
