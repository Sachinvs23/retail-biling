import { useState, type FormEvent } from 'react';
import { useIntl } from 'react-intl';

import { BusinessSetupLayout } from '../components/BusinessSetupLayout';
import { StoreForm } from '../components/StoreForm';
import { submitStoreCreation } from '../services/store-submission';
import {
  type CreateStoreValues,
  type StoreField,
  type StoreValidationErrors,
} from '../store-validation';

const EMPTY_VALUES: CreateStoreValues = {
  storeName: '',
  storeCode: '',
};

export default function StoreCreationPage() {
  const intl = useIntl();

  const [values, setValues] = useState<CreateStoreValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<StoreValidationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: StoreField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setServerError(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setServerError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const result = await submitStoreCreation(values);

    if (result.status === 'validation') {
      setErrors(result.errors);
    } else {
      setErrors({});
    }

    if (result.status === 'success') {
      setValues(EMPTY_VALUES);
      setSuccessMessage(intl.formatMessage({ id: 'store.create.success' }));
    }

    if (result.status === 'error') {
      setServerError(
        intl.formatMessage({ id: `business.error.${result.errorKey}` }),
      );
    }

    setIsSubmitting(false);
  }

  return (
    <BusinessSetupLayout
      titleKey="store.create.title"
      subtitleKey="store.create.subtitle"
      className="business-setup-card--store"
    >
      <StoreForm
        values={values}
        errors={errors}
        serverError={serverError}
        successMessage={successMessage}
        isSubmitting={isSubmitting}
        onChange={updateField}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      />
    </BusinessSetupLayout>
  );
}
