import { createFileRoute } from '@tanstack/react-router';

import StoreSelectionPage from '../../../features/business/pages/StoreSelectionPage';
import type { BusinessDiscoveryOutcome } from '../../../features/business/types/business.types';
import { requireBusinessSetupOutcome } from '../../../features/business/utils/business-routing';

export const Route = createFileRoute('/_onboarding/stores/select')({
  beforeLoad: ({ context, location }) => {
    const outcome = (
      context as unknown as {
        businessOutcome: BusinessDiscoveryOutcome;
      }
    ).businessOutcome;

    requireBusinessSetupOutcome(
      outcome,
      'store-selection-required',
      location.href,
    );
  },
  component: StoreSelectionPage,
});
