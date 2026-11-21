import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useIntl } from 'react-intl';

import { BusinessSelectionList } from '../components/BusinessSelectionList';
import { BusinessSetupLayout } from '../components/BusinessSetupLayout';
import { useBusinessSetupOutcome } from '../hooks/useBusinessSetupOutcome';
import { businessContext } from '../session/business-context';
import type { BusinessContextData } from '../types/business.types';
import { getBusinessErrorKey } from '../utils/business-error';
import { getRouteAfterBusinessSelection } from '../utils/business-routing';

export default function BusinessSelectionPage() {
  const outcome = useBusinessSetupOutcome();
  const navigate = useNavigate();
  const intl = useIntl();

  const [busyBusinessId, setBusyBusinessId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  if (outcome.status !== 'selection-required') {
    return null;
  }

  async function handleSelect(context: BusinessContextData) {
    setBusyBusinessId(context.business.id);
    setServerError(null);

    try {
      const result = businessContext.selectBusiness(context);
      await navigate({
        to: getRouteAfterBusinessSelection(result),
        replace: true,
      });
    } catch (error) {
      const errorKey = getBusinessErrorKey(error, 'context');
      setServerError(intl.formatMessage({ id: `business.error.${errorKey}` }));
    } finally {
      setBusyBusinessId(null);
    }
  }

  return (
    <BusinessSetupLayout
      titleKey="business.selection.title"
      subtitleKey="business.selection.subtitle"
    >
      <BusinessSelectionList
        businesses={outcome.businesses}
        busyBusinessId={busyBusinessId}
        serverError={serverError}
        onSelect={(context) => {
          void handleSelect(context);
        }}
      />
    </BusinessSetupLayout>
  );
}
