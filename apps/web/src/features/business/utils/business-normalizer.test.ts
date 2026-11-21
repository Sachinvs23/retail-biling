import { describe, expect, it } from 'vite-plus/test';

import type {
  BusinessContextResponse,
  CreateBusinessResponse,
} from '../types/business.types';
import { normalizeBusinessResponse } from './business-normalizer';

const business = {
  id: 'business-1',
  name: 'Shop',
  slug: 'shop',
  status: 'ACTIVE' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const membership = { role: 'OWNER' as const };
const store = {
  id: 'store-1',
  name: 'Main',
  code: 'MAIN',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('business response normalization', () => {
  it('normalizes a GET context response with a stores array', () => {
    const response: BusinessContextResponse = {
      business,
      membership,
      stores: [store],
    };

    expect(normalizeBusinessResponse(response)).toEqual({
      business,
      membership,
      stores: [store],
    });
  });

  it('normalizes a POST response with a singular store', () => {
    const response: CreateBusinessResponse = {
      business,
      membership,
      store,
    };

    expect(normalizeBusinessResponse(response)).toEqual({
      business,
      membership,
      stores: [store],
    });
  });

  it('handles a missing created store', () => {
    const response: CreateBusinessResponse = {
      business,
      membership,
      store: null,
    };

    expect(normalizeBusinessResponse(response).stores).toEqual([]);
  });
});
