export type BusinessStatus = 'ACTIVE' | 'SUSPENDED';

export type MembershipRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'CASHIER';

export interface Business {
  id: string;
  name: string;
  slug: string;
  status: BusinessStatus;
  createdAt: string;
}

export interface BusinessMembership {
  role: MembershipRole;
}

export interface Store {
  id: string;
  name: string;
  code: string | null;
  createdAt: string;
}

export interface BusinessContextData {
  business: Business;
  membership: BusinessMembership;
  stores: Store[];
}

export interface BusinessListResponse {
  businesses: BusinessContextData[];
}

export interface BusinessContextResponse {
  business: Business;
  membership: BusinessMembership;
  stores: Store[];
}

export interface CreateBusinessRequest {
  businessName: string;
  slug: string;
  storeName: string;
  storeCode?: string;
}

export interface CreateBusinessResponse {
  business: Business;
  membership: BusinessMembership;
  store: Store | null;
}

export interface CreateStoreRequest {
  storeName: string;
  storeCode?: string;
}

export type CreateStoreResponse = Store;

export type BusinessSelectionOutcome =
  | { status: 'ready'; context: BusinessContextData }
  | { status: 'store-selection-required'; context: BusinessContextData }
  | { status: 'store-setup-required'; context: BusinessContextData };

export type BusinessActivationOutcome =
  | BusinessSelectionOutcome
  | { status: 'stale' };

export type BusinessDiscoveryOutcome =
  | BusinessActivationOutcome
  | { status: 'selection-required'; businesses: BusinessContextData[] }
  | { status: 'onboarding-required' };
