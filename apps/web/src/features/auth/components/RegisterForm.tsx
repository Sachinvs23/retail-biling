import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useIntl } from 'react-intl';

import { useRegister } from '../hooks/useAuth';
import { getAuthErrorKey } from '../utils/auth-error';
import {
  normalizeEmail,
  validateRegister,
  type RegisterField,
  type RegisterValues,
  type ValidationMessageKey,
} from '../validation';

import './AuthForm.css';

const EMPTY_VALUES: RegisterValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export function RegisterForm() {
  const intl = useIntl();
  const navigate = useNavigate();
  const register = useRegister();

  const [values, setValues] = useState<RegisterValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<RegisterField, ValidationMessageKey>>
  >({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const t = (id: string) => intl.formatMessage({ id });
  const validationMessage = (key?: ValidationMessageKey) =>
    key ? t(`auth.validation.${key}`) : undefined;

  function updateField(field: RegisterField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setServerError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateRegister(values);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      await register.mutateAsync({
        name: values.name.trim(),
        email: normalizeEmail(values.email),
        password: values.password,
      });
      await navigate({ to: '/', replace: true });
    } catch (error) {
      const errorKey = getAuthErrorKey(error, 'register');
      setServerError(t(`auth.error.${errorKey}`));
    }
  }

  const isSubmitting = register.isPending;
  const passwordVisibilityLabel = t(
    showPassword ? 'auth.field.hidePassword' : 'auth.field.showPassword',
  );
  const confirmVisibilityLabel = t(
    showConfirmPassword ? 'auth.field.hidePassword' : 'auth.field.showPassword',
  );

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="register-title">
        <div className="auth-aside">
          <div className="auth-brand">
            <span className="auth-brand-mark" aria-hidden="true">
              R
            </span>
            <span>{t('app.name')}</span>
          </div>

          <div className="auth-aside-copy">
            <h2 className="auth-aside-title">
              {t('auth.register.asideTitle')}
            </h2>
            <p className="auth-aside-subtitle">
              {t('auth.register.asideSubtitle')}
            </p>
          </div>
        </div>

        <div className="auth-main">
          <h1 className="auth-title" id="register-title">
            {t('auth.register.title')}
          </h1>
          <p className="auth-subtitle">{t('auth.register.subtitle')}</p>

          <form className="auth-form" noValidate onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="register-name">
                {t('auth.field.fullName')}
              </label>
              <input
                className="auth-input"
                id="register-name"
                type="text"
                autoComplete="name"
                value={values.name}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={
                  fieldErrors.name ? 'register-name-error' : undefined
                }
                onChange={(event) => updateField('name', event.target.value)}
              />
              {fieldErrors.name && (
                <span className="auth-field-error" id="register-name-error">
                  {validationMessage(fieldErrors.name)}
                </span>
              )}
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="register-email">
                {t('auth.field.email')}
              </label>
              <input
                className="auth-input"
                id="register-email"
                type="email"
                autoComplete="email"
                value={values.email}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={
                  fieldErrors.email ? 'register-email-error' : undefined
                }
                onChange={(event) => updateField('email', event.target.value)}
              />
              {fieldErrors.email && (
                <span className="auth-field-error" id="register-email-error">
                  {validationMessage(fieldErrors.email)}
                </span>
              )}
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="register-password">
                {t('auth.field.password')}
              </label>
              <div className="auth-input-wrap">
                <input
                  className="auth-input auth-input--with-action"
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={values.password}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={
                    fieldErrors.password ? 'register-password-error' : undefined
                  }
                  onChange={(event) =>
                    updateField('password', event.target.value)
                  }
                />
                <button
                  className="auth-visibility"
                  type="button"
                  disabled={isSubmitting}
                  aria-label={passwordVisibilityLabel}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {passwordVisibilityLabel}
                </button>
              </div>
              {fieldErrors.password && (
                <span className="auth-field-error" id="register-password-error">
                  {validationMessage(fieldErrors.password)}
                </span>
              )}
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="register-confirm-password">
                {t('auth.field.confirmPassword')}
              </label>
              <div className="auth-input-wrap">
                <input
                  className="auth-input auth-input--with-action"
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={values.confirmPassword}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={
                    fieldErrors.confirmPassword
                      ? 'register-confirm-password-error'
                      : undefined
                  }
                  onChange={(event) =>
                    updateField('confirmPassword', event.target.value)
                  }
                />
                <button
                  className="auth-visibility"
                  type="button"
                  disabled={isSubmitting}
                  aria-label={confirmVisibilityLabel}
                  onClick={() => setShowConfirmPassword((current) => !current)}
                >
                  {confirmVisibilityLabel}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <span
                  className="auth-field-error"
                  id="register-confirm-password-error"
                >
                  {validationMessage(fieldErrors.confirmPassword)}
                </span>
              )}
            </div>

            {serverError && (
              <div className="auth-alert" role="alert">
                {serverError}
              </div>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={isSubmitting}
            >
              {t(
                isSubmitting
                  ? 'auth.register.submitting'
                  : 'auth.register.submit',
              )}
            </button>
          </form>

          <p className="auth-footer">
            {t('auth.register.haveAccount')}{' '}
            <Link className="auth-link" to="/login" search={{ redirect: '/' }}>
              {t('auth.register.loginLink')}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
