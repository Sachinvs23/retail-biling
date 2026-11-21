import { createFileRoute } from '@tanstack/react-router';

import LoginPage from '../features/auth/pages/LoginPage';
import { resolveSafeRedirect } from '../features/auth/utils/redirect';

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: resolveSafeRedirect(search.redirect),
  }),

  component: LoginPage,
});
