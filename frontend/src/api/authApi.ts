import { apiClient } from './client';
import { getRefreshToken } from '../utils/storage';

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
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: string;
  user: UserSummary;
}

export interface UserSessionDTO {
  id: number;
  deviceInfo: string;
  ipAddress: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
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

  refreshToken: async (token?: string): Promise<AuthResponse> => {
    const fallbackToken = token || getRefreshToken();
    const res = await apiClient.post<AuthResponse>('/auth/refresh', {
      refreshToken: fallbackToken || undefined,
    });
    return res.data;
  },

  logout: async (): Promise<void> => {
    const token = getRefreshToken();
    try {
      await apiClient.post('/auth/logout', { refreshToken: token || undefined });
    } catch {
      // Ignored: cleanup client-side regardless
    }
  },

  getMe: async (): Promise<UserSummary> => {
    const res = await apiClient.get<UserSummary>('/auth/me');
    return res.data;
  },

  getSessions: async (): Promise<UserSessionDTO[]> => {
    const res = await apiClient.get<UserSessionDTO[]>('/auth/sessions');
    return res.data;
  },

  revokeSession: async (sessionId: number): Promise<void> => {
    await apiClient.delete(`/auth/sessions/${sessionId}`);
  },

  revokeOtherSessions: async (): Promise<void> => {
    await apiClient.delete('/auth/sessions/other');
  },
};
