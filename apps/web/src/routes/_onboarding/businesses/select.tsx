import { createFileRoute } from '@tanstack/react-router';

import BusinessSelectionPage from '../../../features/business/pages/BusinessSelectionPage';
import type { BusinessDiscoveryOutcome } from '../../../features/business/types/business.types';
import { requireBusinessSetupOutcome } from '../../../features/business/utils/business-routing';

export const Route = createFileRoute('/_onboarding/businesses/select')({
  beforeLoad: ({ context, location }) => {
    const outcome = (
      context as unknown as {
        businessOutcome: BusinessDiscoveryOutcome;
      }
    ).businessOutcome;

    requireBusinessSetupOutcome(outcome, 'selection-required', location.href);
  },
  component: BusinessSelectionPage,
});
