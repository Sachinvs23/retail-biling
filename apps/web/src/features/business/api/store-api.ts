import { apiClient } from '../../../app/api/api-client';
import type {
  CreateStoreRequest,
  CreateStoreResponse,
} from '../types/business.types';

export const storeApi = {
  create: (payload: CreateStoreRequest) =>
    apiClient.post<CreateStoreResponse>('/stores', payload),
};
