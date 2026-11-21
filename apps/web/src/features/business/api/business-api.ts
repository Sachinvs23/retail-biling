import { apiClient } from '../../../app/api/api-client';
import type {
  BusinessContextResponse,
  BusinessListResponse,
  CreateBusinessRequest,
  CreateBusinessResponse,
} from '../types/business.types';

export const businessApi = {
  list: () =>
    apiClient.get<BusinessListResponse>('/businesses', {
      business: false,
    }),

  getContext: (businessId: string) =>
    apiClient.get<BusinessContextResponse>('/businesses/context', {
      business: false,
      headers: { 'X-Business-Id': businessId },
    }),

  create: (payload: CreateBusinessRequest) =>
    apiClient.post<CreateBusinessResponse>('/businesses', payload, {
      business: false,
    }),
};
