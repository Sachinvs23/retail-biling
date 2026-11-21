import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';

import { authSession } from '../../features/auth/session/auth-session';
import { BusinessSetupLoading } from '../../features/business/components/BusinessSetupState';
import { businessContext } from '../../features/business/session/business-context';
import { isAddBusinessIntent } from '../../features/business/utils/business-routing';

export const Route = createFileRoute('/_onboarding')({
  beforeLoad: async ({ location }) => {
    const isAuthenticated = await authSession.restore();

    if (!isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }

    let outcome;

    try {
      outcome = await businessContext.restore();
    } catch {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }

    if (outcome.status === 'stale') {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }

    if (outcome.status === 'ready' && !isAddBusinessIntent(location.search)) {
      throw redirect({ to: '/' });
    }

    return { businessOutcome: outcome };
  },

  pendingComponent: BusinessSetupLoading,
  component: () => <Outlet />,
});
