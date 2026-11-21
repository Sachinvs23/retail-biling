import type { FormEvent } from 'react';
import { useIntl } from 'react-intl';

import type {
  BusinessField,
  BusinessValidationErrors,
  CreateBusinessValues,
} from '../validation';
import { BusinessSetupAlert } from './BusinessSetupState';
import './BusinessSetup.css';

interface OnboardingFormProps {
  values: CreateBusinessValues;
  errors: BusinessValidationErrors;
  serverError?: string | null;
  isSubmitting: boolean;
  onChange: (field: BusinessField, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const FIELDS: Array<{
  name: BusinessField;
  labelKey: string;
  type?: string;
  autoComplete?: string;
}> = [
  {
    name: 'businessName',
    labelKey: 'business.onboarding.businessName',
    autoComplete: 'organization',
  },
  {
    name: 'slug',
    labelKey: 'business.onboarding.slug',
  },
  {
    name: 'storeName',
    labelKey: 'business.onboarding.storeName',
  },
  {
    name: 'storeCode',
    labelKey: 'business.onboarding.storeCode',
  },
];

export function OnboardingForm({
  values,
  errors,
  serverError,
  isSubmitting,
  onChange,
  onSubmit,
}: OnboardingFormProps) {
  const intl = useIntl();
  const t = (id: string) => intl.formatMessage({ id });

  return (
    <form className="business-setup-form" noValidate onSubmit={onSubmit}>
      {FIELDS.map((field) => {
        const error = errors[field.name];
        const errorId = `onboarding-${field.name}-error`;

        return (
          <div className="business-setup-field" key={field.name}>
            <label
              className="business-setup-label"
              htmlFor={`onboarding-${field.name}`}
            >
              {t(field.labelKey)}
            </label>
            <input
              className="business-setup-input"
              id={`onboarding-${field.name}`}
              name={field.name}
              type={field.type ?? 'text'}
              autoComplete={field.autoComplete}
              value={values[field.name]}
              disabled={isSubmitting}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => onChange(field.name, event.target.value)}
            />
            {error && (
              <span className="business-setup-field-error" id={errorId}>
                {t(`business.validation.${error}`)}
              </span>
            )}
          </div>
        );
      })}

      {serverError && <BusinessSetupAlert message={serverError} />}

      <button
        className="business-setup-submit"
        type="submit"
        disabled={isSubmitting}
      >
        {t(
          isSubmitting
            ? 'business.onboarding.submitting'
            : 'business.onboarding.submit',
        )}
      </button>
    </form>
  );
}
