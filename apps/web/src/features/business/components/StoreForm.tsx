import type { FormEvent } from 'react';
import { useIntl } from 'react-intl';

import { BusinessSetupAlert, BusinessSetupSuccess } from './BusinessSetupState';
import './BusinessSetup.css';
import type {
  StoreField,
  StoreValidationErrors,
  CreateStoreValues,
} from '../store-validation';

interface StoreFormProps {
  values: CreateStoreValues;
  errors: StoreValidationErrors;
  serverError?: string | null;
  successMessage?: string | null;
  isSubmitting: boolean;
  onChange: (field: StoreField, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const FIELDS: Array<{
  name: StoreField;
  labelKey: string;
}> = [
  { name: 'storeName', labelKey: 'store.create.name' },
  { name: 'storeCode', labelKey: 'store.create.code' },
];

export function StoreForm({
  values,
  errors,
  serverError,
  successMessage,
  isSubmitting,
  onChange,
  onSubmit,
}: StoreFormProps) {
  const intl = useIntl();
  const t = (id: string) => intl.formatMessage({ id });

  return (
    <form className="business-setup-form" noValidate onSubmit={onSubmit}>
      {FIELDS.map((field) => {
        const error = errors[field.name];
        const errorId = `store-${field.name}-error`;

        return (
          <div className="business-setup-field" key={field.name}>
            <label
              className="business-setup-label"
              htmlFor={`store-${field.name}`}
            >
              {t(field.labelKey)}
            </label>
            <input
              className="business-setup-input"
              id={`store-${field.name}`}
              name={field.name}
              type="text"
              value={values[field.name]}
              disabled={isSubmitting}
              required={field.name === 'storeName'}
              maxLength={field.name === 'storeName' ? 100 : 30}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => onChange(field.name, event.target.value)}
            />
            {error && (
              <span className="business-setup-field-error" id={errorId}>
                {t(`store.validation.${error}`)}
              </span>
            )}
          </div>
        );
      })}

      {successMessage && <BusinessSetupSuccess message={successMessage} />}
      {serverError && <BusinessSetupAlert message={serverError} />}

      <button
        className="business-setup-submit"
        type="submit"
        disabled={isSubmitting}
      >
        {t(isSubmitting ? 'store.create.submitting' : 'store.create.submit')}
      </button>
    </form>
  );
}
