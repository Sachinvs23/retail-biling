import { ForbiddenException } from '@nestjs/common';
import { MembershipRole } from '../generated/prisma/enums.js';

const STORE_CREATION_ROLES: ReadonlySet<MembershipRole> = new Set([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
]);

export function assertStoreCreationAllowed(role: MembershipRole): void {
  if (!STORE_CREATION_ROLES.has(role)) {
    throw new ForbiddenException('Your role cannot create stores');
  }
}
