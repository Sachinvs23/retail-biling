import { createFileRoute, redirect } from '@tanstack/react-router';

import StoreCreationPage from '../../../features/business/pages/StoreCreationPage';
import { businessContext } from '../../../features/business/session/business-context';
import { canCreateStore } from '../../../features/business/utils/store-permissions';

export const Route = createFileRoute('/_authenticated/stores/new')({
  beforeLoad: () => {
    const context = businessContext.getActiveContext();

    if (!context || !canCreateStore(context.membership.role)) {
      throw redirect({ to: '/' });
    }
  },
  component: StoreCreationPage,
});
