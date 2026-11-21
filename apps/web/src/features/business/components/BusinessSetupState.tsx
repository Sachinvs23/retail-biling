import { useIntl } from 'react-intl';

import './BusinessSetup.css';

export function BusinessSetupLoading() {
  const intl = useIntl();

  return (
    <main className="business-setup-page">
      <section className="business-setup-card" role="status" aria-live="polite">
        <p className="business-setup-subtitle">
          {intl.formatMessage({ id: 'business.setup.loading' })}
        </p>
      </section>
    </main>
  );
}

interface BusinessSetupAlertProps {
  message: string;
  onRetry?: () => void;
}

export function BusinessSetupAlert({
  message,
  onRetry,
}: BusinessSetupAlertProps) {
  const intl = useIntl();

  return (
    <div className="business-setup-alert" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button
          className="business-setup-secondary"
          type="button"
          onClick={onRetry}
        >
          {intl.formatMessage({ id: 'business.setup.retry' })}
        </button>
      )}
    </div>
  );
}

interface BusinessSetupEmptyProps {
  titleKey: string;
  messageKey: string;
}

export function BusinessSetupEmpty({
  titleKey,
  messageKey,
}: BusinessSetupEmptyProps) {
  const intl = useIntl();

  return (
    <div className="business-setup-empty">
      <strong className="business-setup-empty-title">
        {intl.formatMessage({ id: titleKey })}
      </strong>
      <span>{intl.formatMessage({ id: messageKey })}</span>
    </div>
  );
}
