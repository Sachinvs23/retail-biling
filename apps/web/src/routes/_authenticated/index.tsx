import { createFileRoute } from '@tanstack/react-router';
import HomePage from '../../features/dashboard/pages/Homepage';

export const Route = createFileRoute('/_authenticated/')({
  component: HomePage,
});
