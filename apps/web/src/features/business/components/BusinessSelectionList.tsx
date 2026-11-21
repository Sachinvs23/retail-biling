import { useIntl } from 'react-intl';

import type { BusinessContextData } from '../types/business.types';
import { BusinessSetupAlert, BusinessSetupEmpty } from './BusinessSetupState';
import './BusinessSetup.css';

interface BusinessSelectionListProps {
  businesses: BusinessContextData[];
  busyBusinessId?: string | null;
  serverError?: string | null;
  onSelect: (context: BusinessContextData) => void;
}

export function BusinessSelectionList({
  businesses,
  busyBusinessId,
  serverError,
  onSelect,
}: BusinessSelectionListProps) {
  const intl = useIntl();

  if (businesses.length === 0) {
    return (
      <BusinessSetupEmpty
        titleKey="business.selection.title"
        messageKey="business.selection.empty"
      />
    );
  }

  return (
    <div className="business-setup-list">
      {serverError && <BusinessSetupAlert message={serverError} />}

      {businesses.map((context) => {
        const storeCount = context.stores.length;
        const countLabel =
          storeCount === 1
            ? intl.formatMessage({ id: 'business.selection.storeCountOne' })
            : intl.formatMessage(
                { id: 'business.selection.storeCount' },
                { count: storeCount },
              );

        return (
          <button
            className="business-setup-option"
            type="button"
            key={context.business.id}
            disabled={Boolean(busyBusinessId)}
            onClick={() => onSelect(context)}
          >
            <span className="business-setup-option-copy">
              <span className="business-setup-option-name">
                {context.business.name}
              </span>
              <span className="business-setup-option-meta">
                {context.business.slug} · {countLabel}
              </span>
            </span>
            <span className="business-setup-action">
              {intl.formatMessage({ id: 'business.selection.action' })}
            </span>
          </button>
        );
      })}
    </div>
  );
}
