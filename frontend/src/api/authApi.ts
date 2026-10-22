import { apiClient } from './client';

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface UserSummary {
  id: number;
  username: string;
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  user: UserSummary;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', data);
    return res.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/register', data);
    return res.data;
  },

  getMe: async (): Promise<UserSummary> => {
    const res = await apiClient.get<UserSummary>('/auth/me');
    return res.data;
  },
};
