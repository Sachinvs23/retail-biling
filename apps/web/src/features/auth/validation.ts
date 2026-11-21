export interface LoginValues {
  email: string;
  password: string;
}

export interface RegisterValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type LoginField = keyof LoginValues;
export type RegisterField = keyof RegisterValues;

export type ValidationMessageKey =
  | 'emailRequired'
  | 'emailInvalid'
  | 'passwordRequired'
  | 'passwordTooShort'
  | 'passwordTooLong'
  | 'nameRequired'
  | 'nameTooLong'
  | 'confirmPasswordRequired'
  | 'passwordMismatch';

export type LoginErrors = Partial<Record<LoginField, ValidationMessageKey>>;
export type RegisterErrors = Partial<
  Record<RegisterField, ValidationMessageKey>
>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 100;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateLogin(values: LoginValues): LoginErrors {
  const errors: LoginErrors = {};
  const email = normalizeEmail(values.email);

  if (!email) {
    errors.email = 'emailRequired';
  } else if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    errors.email = 'emailInvalid';
  }

  if (!values.password) {
    errors.password = 'passwordRequired';
  }

  return errors;
}

export function validateRegister(values: RegisterValues): RegisterErrors {
  const errors: RegisterErrors = {};
  const name = values.name.trim();
  const email = normalizeEmail(values.email);

  if (!name) {
    errors.name = 'nameRequired';
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = 'nameTooLong';
  }

  if (!email) {
    errors.email = 'emailRequired';
  } else if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    errors.email = 'emailInvalid';
  }

  if (!values.password) {
    errors.password = 'passwordRequired';
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = 'passwordTooShort';
  } else if (values.password.length > MAX_PASSWORD_LENGTH) {
    errors.password = 'passwordTooLong';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'confirmPasswordRequired';
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'passwordMismatch';
  }

  return errors;
}
