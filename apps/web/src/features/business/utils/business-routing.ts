import { redirect } from '@tanstack/react-router';

import type {
  BusinessDiscoveryOutcome,
  BusinessSelectionOutcome,
} from '../types/business.types';

export type BusinessSetupRoute =
  | '/'
  | '/onboarding'
  | '/businesses/select'
  | '/stores/select'
  | '/stores/setup';

export const ADD_BUSINESS_INTENT = 'add-business' as const;

export interface BusinessOnboardingSearch {
  intent?: typeof ADD_BUSINESS_INTENT;
}

export function parseBusinessOnboardingSearch(
  search: unknown,
): BusinessOnboardingSearch {
  if (
    typeof search === 'object' &&
    search !== null &&
    'intent' in search &&
    search.intent === ADD_BUSINESS_INTENT
  ) {
    return { intent: ADD_BUSINESS_INTENT };
  }

  return {};
}

export function isAddBusinessIntent(search: unknown): boolean {
  return parseBusinessOnboardingSearch(search).intent === ADD_BUSINESS_INTENT;
}

export function getBusinessSetupRoute(
  outcome: BusinessDiscoveryOutcome,
): BusinessSetupRoute | null {
  switch (outcome.status) {
    case 'ready':
      return '/';
    case 'onboarding-required':
      return '/onboarding';
    case 'selection-required':
      return '/businesses/select';
    case 'store-selection-required':
      return '/stores/select';
    case 'store-setup-required':
      return '/stores/setup';
    case 'stale':
      return null;
  }
}

export function getRouteAfterBusinessSelection(
  outcome: BusinessSelectionOutcome,
): BusinessSetupRoute {
  switch (outcome.status) {
    case 'ready':
      return '/';
    case 'store-selection-required':
      return '/stores/select';
    case 'store-setup-required':
      return '/stores/setup';
  }
}

export function getRouteAfterStoreSelection(): '/' {
  return '/';
}

export function requireBusinessSetupOutcome(
  outcome: BusinessDiscoveryOutcome,
  expected: BusinessDiscoveryOutcome['status'],
  currentPath: string,
): void {
  if (outcome.status === expected) {
    return;
  }

  const route = getBusinessSetupRoute(outcome);

  if (route) {
    throw redirect({ to: route });
  }

  throw redirect({
    to: '/login',
    search: { redirect: currentPath },
  });
}
