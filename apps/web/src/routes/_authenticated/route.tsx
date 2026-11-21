import { createFileRoute, redirect } from '@tanstack/react-router';

import AppLayout from '../../app/layout/AppLayout';
import { authSession } from '../../features/auth/session/auth-session';
import { BusinessSetupLoading } from '../../features/business/components/BusinessSetupState';
import { businessContext } from '../../features/business/session/business-context';
import { getBusinessSetupRoute } from '../../features/business/utils/business-routing';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const isAuthenticated = await authSession.restore();

    if (!isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }

    let outcome;

    try {
      outcome = await businessContext.restore();
    } catch {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }

    if (outcome.status === 'stale') {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }

    const businessId = businessContext.getBusinessId();
    const storeId = businessContext.getStoreId();

    if (outcome.status === 'ready' && (!businessId || !storeId)) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }

    if (outcome.status !== 'ready') {
      throw redirect({
        to: getBusinessSetupRoute(outcome)!,
      });
    }

    return { businessOutcome: outcome };
  },

  pendingComponent: BusinessSetupLoading,
  component: AppLayout,
});
