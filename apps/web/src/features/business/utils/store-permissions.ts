import type { MembershipRole } from '../types/business.types';

const STORE_CREATION_ROLES: ReadonlySet<MembershipRole> = new Set([
  'OWNER',
  'ADMIN',
]);

export function canCreateStore(role: MembershipRole | undefined): boolean {
  return role !== undefined && STORE_CREATION_ROLES.has(role);
}
