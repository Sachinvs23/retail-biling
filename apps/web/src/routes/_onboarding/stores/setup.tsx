import { createFileRoute } from '@tanstack/react-router';

import StoreSetupPage from '../../../features/business/pages/StoreSetupPage';
import type { BusinessDiscoveryOutcome } from '../../../features/business/types/business.types';
import { requireBusinessSetupOutcome } from '../../../features/business/utils/business-routing';

export const Route = createFileRoute('/_onboarding/stores/setup')({
  beforeLoad: ({ context, location }) => {
    const outcome = (
      context as unknown as {
        businessOutcome: BusinessDiscoveryOutcome;
      }
    ).businessOutcome;

    requireBusinessSetupOutcome(outcome, 'store-setup-required', location.href);
  },
  component: StoreSetupPage,
});
