import { apiContext } from './api-context';
import { ApiError } from './api-error';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
).replace(/\/+$/, '');

let refreshPromise: Promise<void> | null = null;

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  auth?: boolean;
  business?: boolean;
};

export async function refreshAccessToken(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = request<{ access_token: string }>('/auth/refresh', {
      method: 'POST',
      auth: false,
      business: false,
    })
      .then(({ access_token }) => {
        apiContext.setToken(access_token);
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
  hasRetried = false,
): Promise<T> {
  const {
    body,
    auth = true,
    business = true,
    headers: customHeaders,
    ...fetchOptions
  } = options;

  const headers = new Headers(customHeaders);

  if (body !== undefined && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  headers.set('Accept', 'application/json');

  const tokenUsedForRequest = auth ? apiContext.getToken() : null;

  if (tokenUsedForRequest) {
    headers.set('Authorization', `Bearer ${tokenUsedForRequest}`);
  }

  if (business) {
    const businessId = apiContext.getBusinessId();

    if (businessId) {
      headers.set('X-Business-Id', businessId);
    }
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      credentials: 'include',
      headers,
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }

    throw new ApiError(0, 'Unable to connect to the server.');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  let responseData: unknown;

  try {
    responseData = isJson ? await response.json() : await response.text();
  } catch {
    responseData = null;
  }

  if (!response.ok) {
    const data =
      typeof responseData === 'object' && responseData !== null
        ? (responseData as Record<string, unknown>)
        : {};

    const message =
      typeof data.message === 'string'
        ? data.message
        : Array.isArray(data.message)
          ? data.message.join(', ')
          : `Request failed with status ${response.status}`;

    const errors = Array.isArray(data.message)
      ? data.message.filter((item): item is string => typeof item === 'string')
      : undefined;

    if (response.status === 401 && auth) {
      if (!hasRetried) {
        try {
          const latestToken = apiContext.getToken();

          // Another request may already have refreshed the token.
          if (!latestToken || latestToken === tokenUsedForRequest) {
            await refreshAccessToken();
          }

          // Retry the original request with the latest token.
          return request<T>(endpoint, options, true);
        } catch {
          // Refresh failed. The session is no longer valid.
        }
      }

      apiContext.clearSession();
    }

    throw new ApiError(response.status, message, errors);
  }

  return responseData as T;
}

export const apiClient = {
  get<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  },

  post<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body,
    });
  },

  patch<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) {
    return request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body,
    });
  },

  put<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) {
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body,
    });
  },

  delete<T>(
    endpoint: string,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) {
    return request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  },
};
