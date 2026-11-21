import { useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useIntl } from 'react-intl';

import { OnboardingForm } from '../components/OnboardingForm';
import { BusinessSetupLayout } from '../components/BusinessSetupLayout';
import { useBusinessSetupOutcome } from '../hooks/useBusinessSetupOutcome';
import { createBusiness } from '../services/business-flows';
import {
  hasBusinessValidationErrors,
  validateCreateBusiness,
  type BusinessField,
  type BusinessValidationErrors,
  type CreateBusinessValues,
} from '../validation';
import { getBusinessErrorKey } from '../utils/business-error';

const EMPTY_VALUES: CreateBusinessValues = {
  businessName: '',
  slug: '',
  storeName: '',
  storeCode: '',
};

export default function OnboardingPage() {
  const outcome = useBusinessSetupOutcome();
  const navigate = useNavigate();
  const intl = useIntl();

  const [values, setValues] = useState<CreateBusinessValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<BusinessValidationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAddingBusiness = outcome.status === 'ready';

  function updateField(field: BusinessField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setServerError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateCreateBusiness(values);
    setErrors(validationErrors);

    if (hasBusinessValidationErrors(validationErrors)) {
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      await createBusiness(values);
      await navigate({ to: '/', replace: true });
    } catch (error) {
      const errorKey = getBusinessErrorKey(error, 'create');
      setServerError(intl.formatMessage({ id: `business.error.${errorKey}` }));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <BusinessSetupLayout
      titleKey={
        isAddingBusiness
          ? 'business.onboarding.addTitle'
          : 'business.onboarding.title'
      }
      subtitleKey={
        isAddingBusiness
          ? 'business.onboarding.addSubtitle'
          : 'business.onboarding.subtitle'
      }
    >
      <OnboardingForm
        values={values}
        errors={errors}
        serverError={serverError}
        isSubmitting={isSubmitting}
        onChange={updateField}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      />
    </BusinessSetupLayout>
  );
}
