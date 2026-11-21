import { describe, expect, it } from 'vite-plus/test';

import { canCreateStore } from './store-permissions';

describe('store permissions', () => {
  it('allows owners and admins', () => {
    expect(canCreateStore('OWNER')).toBe(true);
    expect(canCreateStore('ADMIN')).toBe(true);
  });

  it('denies managers, cashiers, and missing roles', () => {
    expect(canCreateStore('MANAGER')).toBe(false);
    expect(canCreateStore('CASHIER')).toBe(false);
    expect(canCreateStore(undefined)).toBe(false);
  });
});
