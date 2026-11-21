import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useIntl } from 'react-intl';

import { useLogin } from '../hooks/useAuth';
import { getAuthErrorKey } from '../utils/auth-error';
import { resolveSafeRedirect } from '../utils/redirect';
import {
  normalizeEmail,
  validateLogin,
  type LoginField,
  type LoginValues,
  type ValidationMessageKey,
} from '../validation';

import './AuthForm.css';

const EMPTY_VALUES: LoginValues = { email: '', password: '' };

export function LoginForm() {
  const intl = useIntl();
  const navigate = useNavigate();
  const search = useSearch({ from: '/login' });
  const login = useLogin();

  const [values, setValues] = useState<LoginValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<LoginField, ValidationMessageKey>>
  >({});
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const t = (id: string) => intl.formatMessage({ id });
  const validationMessage = (key?: ValidationMessageKey) =>
    key ? t(`auth.validation.${key}`) : undefined;

  function updateField(field: LoginField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setServerError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateLogin(values);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const redirectTo = resolveSafeRedirect(search.redirect);

    try {
      await login.mutateAsync({
        email: normalizeEmail(values.email),
        password: values.password,
      });
      await navigate({ href: redirectTo, replace: true });
    } catch (error) {
      const errorKey = getAuthErrorKey(error, 'login');
      setServerError(t(`auth.error.${errorKey}`));
    }
  }

  const isSubmitting = login.isPending;

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-aside">
          <div className="auth-brand">
            <span className="auth-brand-mark" aria-hidden="true">
              R
            </span>
            <span>{t('app.name')}</span>
          </div>

          <div className="auth-aside-copy">
            <h2 className="auth-aside-title">{t('auth.brandTitle')}</h2>
            <p className="auth-aside-subtitle">{t('auth.brandSubtitle')}</p>
          </div>
        </div>

        <div className="auth-main">
          <h1 className="auth-title" id="login-title">
            {t('auth.login.title')}
          </h1>
          <p className="auth-subtitle">{t('auth.login.subtitle')}</p>

          <form className="auth-form" noValidate onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="login-email">
                {t('auth.field.email')}
              </label>
              <input
                className="auth-input"
                id="login-email"
                type="email"
                autoComplete="email"
                value={values.email}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={
                  fieldErrors.email ? 'login-email-error' : undefined
                }
                onChange={(event) => updateField('email', event.target.value)}
              />
              {fieldErrors.email && (
                <span className="auth-field-error" id="login-email-error">
                  {validationMessage(fieldErrors.email)}
                </span>
              )}
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="login-password">
                {t('auth.field.password')}
              </label>
              <div className="auth-input-wrap">
                <input
                  className="auth-input auth-input--with-action"
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={values.password}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={
                    fieldErrors.password ? 'login-password-error' : undefined
                  }
                  onChange={(event) =>
                    updateField('password', event.target.value)
                  }
                />
                <button
                  className="auth-visibility"
                  type="button"
                  disabled={isSubmitting}
                  aria-label={t(
                    showPassword
                      ? 'auth.field.hidePassword'
                      : 'auth.field.showPassword',
                  )}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {t(
                    showPassword
                      ? 'auth.field.hidePassword'
                      : 'auth.field.showPassword',
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <span className="auth-field-error" id="login-password-error">
                  {validationMessage(fieldErrors.password)}
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
              {t(isSubmitting ? 'auth.login.submitting' : 'auth.login.submit')}
            </button>
          </form>

          <p className="auth-footer">
            {t('auth.login.noAccount')}{' '}
            <Link className="auth-link" to="/register">
              {t('auth.login.registerLink')}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
