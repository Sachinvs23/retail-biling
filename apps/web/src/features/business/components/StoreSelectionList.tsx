import { useIntl } from 'react-intl';

import type { Store } from '../types/business.types';
import { BusinessSetupAlert, BusinessSetupEmpty } from './BusinessSetupState';
import './BusinessSetup.css';

interface StoreSelectionListProps {
  stores: Store[];
  busyStoreId?: string | null;
  serverError?: string | null;
  onSelect: (storeId: string) => void;
}

export function StoreSelectionList({
  stores,
  busyStoreId,
  serverError,
  onSelect,
}: StoreSelectionListProps) {
  const intl = useIntl();

  if (stores.length === 0) {
    return (
      <BusinessSetupEmpty
        titleKey="business.store.emptyTitle"
        messageKey="business.store.empty"
      />
    );
  }

  return (
    <div className="business-setup-list">
      {serverError && <BusinessSetupAlert message={serverError} />}

      {stores.map((store) => (
        <button
          className="business-setup-option"
          type="button"
          key={store.id}
          disabled={busyStoreId === store.id}
          onClick={() => onSelect(store.id)}
        >
          <span className="business-setup-option-copy">
            <span className="business-setup-option-name">{store.name}</span>
            {store.code && (
              <span className="business-setup-option-meta">
                {intl.formatMessage(
                  { id: 'business.store.code' },
                  { code: store.code },
                )}
              </span>
            )}
          </span>
          <span className="business-setup-action">
            {intl.formatMessage({ id: 'business.store.action' })}
          </span>
        </button>
      ))}
    </div>
  );
}
