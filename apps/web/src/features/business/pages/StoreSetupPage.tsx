import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useIntl } from 'react-intl';

import { BusinessSetupLayout } from '../components/BusinessSetupLayout';
import {
  BusinessSetupAlert,
  BusinessSetupEmpty,
} from '../components/BusinessSetupState';
import { useBusinessSetupOutcome } from '../hooks/useBusinessSetupOutcome';
import { businessContext } from '../session/business-context';
import { getBusinessErrorKey } from '../utils/business-error';
import { getBusinessSetupRoute } from '../utils/business-routing';

export default function StoreSetupPage() {
  const outcome = useBusinessSetupOutcome();
  const navigate = useNavigate();
  const intl = useIntl();

  const [isRetrying, setIsRetrying] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  if (outcome.status !== 'store-setup-required') {
    return null;
  }

  async function handleRetry() {
    setIsRetrying(true);
    setServerError(null);

    try {
      const nextOutcome = await businessContext.restore();
      const route = getBusinessSetupRoute(nextOutcome);

      if (route) {
        await navigate({ to: route, replace: true });
      } else {
        await navigate({
          to: '/login',
          search: { redirect: '/' },
          replace: true,
        });
      }
    } catch (error) {
      const errorKey = getBusinessErrorKey(error, 'context');
      setServerError(intl.formatMessage({ id: `business.error.${errorKey}` }));
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <BusinessSetupLayout
      titleKey="business.store.emptyTitle"
      subtitleKey="business.store.subtitle"
    >
      <div className="business-setup-list">
        <BusinessSetupEmpty
          titleKey="business.store.emptyTitle"
          messageKey="business.store.empty"
        />
        {serverError && <BusinessSetupAlert message={serverError} />}
        <button
          className="business-setup-submit"
          type="button"
          disabled={isRetrying}
          onClick={() => {
            void handleRetry();
          }}
        >
          {intl.formatMessage({ id: 'business.setup.retry' })}
        </button>
      </div>
    </BusinessSetupLayout>
  );
}
