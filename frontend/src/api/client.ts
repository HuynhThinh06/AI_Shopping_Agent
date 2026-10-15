import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 45000, // 45s cho các cuộc gọi AI LLM
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Error]:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);
