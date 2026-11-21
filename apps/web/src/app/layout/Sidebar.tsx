import { Link } from '@tanstack/react-router';
import { useIntl } from 'react-intl';

import { useActiveBusinessContext } from '../../features/business/hooks/useActiveBusinessContext';
import { ADD_BUSINESS_INTENT } from '../../features/business/utils/business-routing';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}

const navigation = [
  {
    label: 'navigation.overview',
    items: [{ label: 'navigation.dashboard', icon: '◫', active: true }],
  },
  {
    label: 'navigation.operations',
    items: [
      { label: 'navigation.billing', icon: '▤', active: false },
      { label: 'navigation.products', icon: '▧', active: false },
      { label: 'navigation.inventory', icon: '▦', active: false },
      { label: 'navigation.purchases', icon: '⇩', active: false },
      { label: 'navigation.suppliers', icon: '♧', active: false },
    ],
  },
  {
    label: 'navigation.insights',
    items: [{ label: 'navigation.reports', icon: '▥', active: false }],
  },
];
export default function Sidebar({
  collapsed,
  mobileOpen,
  onToggle,
  onNavigate,
}: SidebarProps) {
  const intl = useIntl();
  const { context, storeId } = useActiveBusinessContext();
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);

  const businessName = context?.business.name ?? t('store.name');
  const storeName =
    context?.stores.find((store) => store.id === storeId)?.name ??
    t('store.branch');
  const workspaceLabel = `${t('sidebar.activeBusiness')}: ${businessName} · ${t('sidebar.activeStore')}: ${storeName}`;

  return (
    <aside
      className={[
        'sidebar',
        collapsed ? 'sidebar--collapsed' : '',
        mobileOpen ? 'sidebar--mobile-open' : '',
      ].join(' ')}
    >
      <div className="sidebar-brand">
        <div className="brand-mark">R</div>

        {!collapsed && (
          <div className="brand-copy">
            <span className="brand-name">{t('app.name')}</span>
            <span className="brand-caption">{t('sidebar.brandCaption')}</span>
          </div>
        )}

        <button
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label={t(
            collapsed ? 'navigation.expand' : 'navigation.collapse',
          )}
          title={t(collapsed ? 'navigation.expand' : 'navigation.collapse')}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>

      <div className="business-switcher" title={workspaceLabel}>
        <div className="business-switcher-summary">
          <div
            className="business-avatar"
            aria-label={t('sidebar.activeBusiness')}
          >
            {businessName.charAt(0).toUpperCase()}
          </div>

          {!collapsed && (
            <>
              <div className="business-info">
                <span className="business-name">{businessName}</span>
                <span className="business-location">{storeName}</span>
              </div>
              <span className="business-chevron">⌄</span>
            </>
          )}
        </div>

        <Link
          to="/onboarding"
          search={{ intent: ADD_BUSINESS_INTENT }}
          onClick={onNavigate}
          className="business-switcher-add"
          title={t('sidebar.addBusiness')}
          aria-label={t('sidebar.addBusiness')}
        >
          <span aria-hidden="true">＋</span>
          {!collapsed && <span>{t('sidebar.addBusiness')}</span>}
        </Link>
      </div>

      <nav className="sidebar-navigation" aria-label={t('navigation.main')}>
        {navigation.map((section) => (
          <div className="nav-section" key={t(section.label)}>
            {!collapsed && (
              <span className="nav-section-label">{t(section.label)}</span>
            )}

            {section.items.map((item) =>
              item.active ? (
                <Link
                  key={item.label}
                  to="/"
                  onClick={onNavigate}
                  className="nav-item nav-item--active"
                  title={collapsed ? t(item.label) : undefined}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!collapsed && <span>{t(item.label)}</span>}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  className="nav-item nav-item--upcoming"
                  disabled
                  title={t('common.comingSoonItem', { item: t(item.label) })}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!collapsed && <span>{t(item.label)}</span>}
                </button>
              ),
            )}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="nav-item nav-item--upcoming"
          disabled
          title={t('common.comingSoonItem', { item: t('navigation.settings') })}
        >
          <span className="nav-icon">⚙</span>
          {!collapsed && <span>{t('navigation.settings')}</span>}
        </button>

        {!collapsed && (
          <div className="sidebar-version">{t('app.name')} · v1.0</div>
        )}
      </div>
    </aside>
  );
}
