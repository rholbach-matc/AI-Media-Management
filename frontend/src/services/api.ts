import type { ApiErrorResponse, LoginResponse, OutputListResponse, OutputNode, OutputQueryParams, OutputUpdate, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8100/api';

let accessToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function setApiToken(token: string | null): void {
  accessToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const error = (await response.json()) as ApiErrorResponse;
      message = error.detail ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export const api = {
  login(username: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  logout(): Promise<{ message: string }> {
    return request<{ message: string }>('/auth/logout', { method: 'POST' });
  },
  me(): Promise<User> {
    return request<User>('/auth/me');
  },
  uploadOutput(formData: FormData): Promise<OutputNode> {
    return request<OutputNode>('/outputs/upload', {
      method: 'POST',
      body: formData,
    });
  },
  uploadOutputsBulk(formData: FormData): Promise<{ items: OutputNode[] }> {
    return request<{ items: OutputNode[] }>('/outputs/upload/bulk', {
      method: 'POST',
      body: formData,
    });
  },
  getOutputs(params: OutputQueryParams = {}): Promise<OutputListResponse> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, String(value));
      }
    });
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return request<OutputListResponse>(`/outputs${suffix}`);
  },
  getOutput(id: string): Promise<OutputNode> {
    return request<OutputNode>(`/outputs/${id}`);
  },
  updateOutput(id: string, data: OutputUpdate): Promise<OutputNode> {
    return request<OutputNode>(`/outputs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteOutput(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/outputs/${id}`, { method: 'DELETE' });
  },
};
