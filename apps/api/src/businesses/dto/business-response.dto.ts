import type {
  MembershipRole,
  TenantStatus,
} from '../../generated/prisma/enums.js';

export interface BusinessSummary {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  createdAt: Date;
}

export interface MembershipSummary {
  role: MembershipRole;
}

export interface StoreSummary {
  id: string;
  name: string;
  code: string | null;
  createdAt: Date;
}

export interface BusinessContextResponse {
  business: BusinessSummary;
  membership: MembershipSummary;
  stores: StoreSummary[];
}

export interface BusinessListResponse {
  businesses: BusinessContextResponse[];
}
