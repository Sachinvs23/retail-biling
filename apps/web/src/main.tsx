import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { I18nProvider } from './app/i18n/I18nProvider';
import { QueryProvider } from './app/providers/QueryProvider';
import { queryClient } from './app/providers/query-client';

import { ThemeProvider } from './app/theme/ThemeProvider';
import { routeTree } from './routeTree.gen';
import './index.css';

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <I18nProvider>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </I18nProvider>
    </QueryProvider>
  </StrictMode>,
);
