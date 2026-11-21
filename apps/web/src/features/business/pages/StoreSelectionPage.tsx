import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useIntl } from 'react-intl';

import { BusinessSetupLayout } from '../components/BusinessSetupLayout';
import { StoreSelectionList } from '../components/StoreSelectionList';
import { useBusinessSetupOutcome } from '../hooks/useBusinessSetupOutcome';
import { businessContext } from '../session/business-context';
import { getBusinessErrorKey } from '../utils/business-error';
import { getRouteAfterStoreSelection } from '../utils/business-routing';

export default function StoreSelectionPage() {
  const outcome = useBusinessSetupOutcome();
  const navigate = useNavigate();
  const intl = useIntl();

  const [busyStoreId, setBusyStoreId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  if (outcome.status !== 'store-selection-required') {
    return null;
  }

  async function handleSelect(storeId: string) {
    setBusyStoreId(storeId);
    setServerError(null);

    try {
      businessContext.selectStore(storeId);
      await navigate({ to: getRouteAfterStoreSelection(), replace: true });
    } catch (error) {
      const errorKey = getBusinessErrorKey(error, 'context');
      setServerError(intl.formatMessage({ id: `business.error.${errorKey}` }));
    } finally {
      setBusyStoreId(null);
    }
  }

  return (
    <BusinessSetupLayout
      titleKey="business.store.title"
      subtitleKey="business.store.subtitle"
    >
      <StoreSelectionList
        stores={outcome.context.stores}
        busyStoreId={busyStoreId}
        serverError={serverError}
        onSelect={(storeId) => {
          void handleSelect(storeId);
        }}
      />
    </BusinessSetupLayout>
  );
}
