import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useIntl } from 'react-intl';

import { useCurrentUser, useLogout } from '../../features/auth/hooks/useAuth';
import { SUPPORTED_LOCALES, type AppLocale } from '../i18n/config';
import { useAppLocale } from '../i18n/useAppLocale';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const intl = useIntl();
  const navigate = useNavigate();
  const { locale, setLocale } = useAppLocale();
  const currentUser = useCurrentUser();
  const logout = useLogout();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const t = (id: string) => intl.formatMessage({ id });

  async function handleLogout() {
    setProfileMenuOpen(false);
    await logout.mutateAsync().catch(() => undefined);
    await navigate({
      to: '/login',
      search: { redirect: '/' },
      replace: true,
    });
  }

  return (
    <header className="app-header">
      <button
        type="button"
        className="mobile-menu-button"
        onClick={onMenuClick}
        aria-label={t('navigation.open')}
      >
        ☰
      </button>

      <div className="header-breadcrumb">
        <span className="breadcrumb-muted">{t('header.workspace')}</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{t('navigation.dashboard')}</span>
      </div>

      <div className="header-actions">
        <label className="header-search">
          <span className="search-icon">⌕</span>
          <input
            type="search"
            placeholder={t('common.searchAnything')}
            aria-label={t('common.search')}
          />
          <span className="search-shortcut">⌘ K</span>
        </label>

        <button
          type="button"
          className="header-icon-button"
          aria-label={t('header.notifications')}
          title={t('header.notifications')}
        >
          ♧
          <span className="notification-dot" />
        </button>

        <div className="header-divider" />

        <label className="locale-selector">
          <span className="sr-only">{t('common.language')}</span>
          <select
            value={locale}
            onChange={(event) => setLocale(event.target.value as AppLocale)}
          >
            {Object.entries(SUPPORTED_LOCALES).map(([code, label]) => (
              <option value={code} key={code}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="profile-menu-wrap">
          <button
            type="button"
            className="profile-button"
            aria-haspopup="menu"
            aria-expanded={profileMenuOpen}
            aria-label={t('auth.profile.user')}
            onClick={() => setProfileMenuOpen((current) => !current)}
          >
            <span className="profile-avatar">S</span>
            <span className="profile-details">
              <span className="profile-name">
                {currentUser.data?.email ?? t('auth.profile.user')}
              </span>
            </span>
            <span className="profile-chevron">⌄</span>
          </button>

          {profileMenuOpen && (
            <div className="profile-menu" role="menu">
              <button
                type="button"
                className="profile-menu-item"
                role="menuitem"
                disabled={logout.isPending}
                onClick={handleLogout}
              >
                {t(logout.isPending ? 'auth.loggingOut' : 'auth.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
