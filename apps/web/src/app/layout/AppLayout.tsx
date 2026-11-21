import { useState } from 'react';
import { Outlet } from '@tanstack/react-router';
import { useIntl } from 'react-intl';

import Sidebar from './Sidebar';
import Header from './Header';

import './AppLayout.css';

export default function AppLayout() {
  const intl = useIntl();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onToggle={() => setSidebarCollapsed((current) => !current)}
        onNavigate={() => setMobileMenuOpen(false)}
      />

      {mobileMenuOpen && (
        <button
          className="sidebar-overlay"
          aria-label={intl.formatMessage({ id: 'navigation.close' })}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="app-main">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
