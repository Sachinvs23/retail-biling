const BUSINESS_KEY = 'retail_billing_business_id';
const STORE_KEY = 'retail_billing_store_id';

interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function createMemoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function resolveStorage(): KeyValueStorage {
  try {
    if (typeof window !== 'undefined') {
      const storage = window.localStorage;
      const probeKey = '__retail_billing_storage_probe__';
      storage.setItem(probeKey, probeKey);
      storage.removeItem(probeKey);
      return storage;
    }
  } catch {
    // Fall back to memory when storage is unavailable or blocked.
  }

  return createMemoryStorage();
}

const storage = resolveStorage();

let accessToken: string | null = null;
let sessionCleanup: (() => void) | null = null;
let sessionGeneration = 0;

function clearState(): void {
  sessionGeneration += 1;
  accessToken = null;
  storage.removeItem(BUSINESS_KEY);
  storage.removeItem(STORE_KEY);
}

function clearSession(): void {
  clearState();
  sessionCleanup?.();
}

export function onSessionCleared(cleanup: () => void): () => void {
  sessionCleanup = cleanup;

  return () => {
    if (sessionCleanup === cleanup) {
      sessionCleanup = null;
    }
  };
}

export const apiContext = {
  getToken(): string | null {
    return accessToken;
  },

  setToken(token: string): void {
    accessToken = token;
  },

  getSessionGeneration(): number {
    return sessionGeneration;
  },

  clearToken(): void {
    accessToken = null;
  },

  getBusinessId(): string | null {
    return storage.getItem(BUSINESS_KEY);
  },

  setBusinessId(businessId: string): void {
    storage.setItem(BUSINESS_KEY, businessId);
  },

  getStoreId(): string | null {
    return storage.getItem(STORE_KEY);
  },

  setStoreId(storeId: string): void {
    storage.setItem(STORE_KEY, storeId);
  },

  clearStoreId(): void {
    storage.removeItem(STORE_KEY);
  },

  clearBusinessId(): void {
    storage.removeItem(BUSINESS_KEY);
    storage.removeItem(STORE_KEY);
  },

  clearState,

  clearSession,

  clear: clearSession,
};
