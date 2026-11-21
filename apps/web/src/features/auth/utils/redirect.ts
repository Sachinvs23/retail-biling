export const DEFAULT_REDIRECT = '/';

function resolveOrigin(origin?: string): string {
  if (origin) {
    return origin;
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost';
}

export function resolveSafeRedirect(
  value: unknown,
  fallback: string = DEFAULT_REDIRECT,
  origin?: string,
): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const candidate = value.trim();

  if (
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.startsWith('/\\') ||
    candidate.includes('\\')
  ) {
    return fallback;
  }

  try {
    const base = resolveOrigin(origin);
    const url = new URL(candidate, base);

    if (url.origin !== new URL(base).origin) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}
