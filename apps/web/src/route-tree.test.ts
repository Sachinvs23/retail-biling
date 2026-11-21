import { QueryClient } from '@tanstack/react-query';
import { createMemoryHistory, createRouter } from '@tanstack/react-router';
import { describe, expect, it } from 'vite-plus/test';

import { routeTree } from './routeTree.gen';

function createTestRouter() {
  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
    context: { queryClient: new QueryClient() },
  });
}

describe('generated route tree', () => {
  it('registers the authenticated layout and dashboard index', () => {
    const { routesById } = createTestRouter();

    expect(routesById['/_authenticated']).toBeDefined();
    expect(routesById['/_authenticated/']).toBeDefined();
    expect(routesById['/_authenticated/']?.parentRoute?.id).toBe(
      '/_authenticated',
    );
  });

  it('keeps login and registration as public routes', () => {
    const { routesById } = createTestRouter();

    expect(routesById['/login']?.fullPath).toBe('/login');
    expect(routesById['/login']?.parentRoute?.id).toBe('__root__');
    expect(routesById['/register']?.fullPath).toBe('/register');
    expect(routesById['/register']?.parentRoute?.id).toBe('__root__');
  });

  it('registers the onboarding and selection routes', () => {
    const { routesById } = createTestRouter();

    expect(routesById['/_onboarding']).toBeDefined();
    expect(routesById['/_onboarding/onboarding']?.fullPath).toBe('/onboarding');
    expect(routesById['/_onboarding/businesses/select']?.fullPath).toBe(
      '/businesses/select',
    );
    expect(routesById['/_onboarding/stores/select']?.fullPath).toBe(
      '/stores/select',
    );
    expect(routesById['/_onboarding/stores/setup']?.fullPath).toBe(
      '/stores/setup',
    );
  });
});
