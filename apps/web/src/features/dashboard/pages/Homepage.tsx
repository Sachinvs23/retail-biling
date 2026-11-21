import { useIntl } from 'react-intl';
import './Homepage.css';

const weeklySales = [
  { day: 1, amount: 12500 },
  { day: 2, amount: 18200 },
  { day: 3, amount: 14800 },
  { day: 4, amount: 22100 },
  { day: 5, amount: 17600 },
  { day: 6, amount: 28500 },
  { day: 0, amount: 24580 },
];
const transactions = [
  {
    id: 'INV-1048',
    customer: 'customer.walkIn',
    time: [10, 42],
    amount: 1250,
    method: 'upi',
    status: 'paid',
  },
  {
    id: 'INV-1047',
    customer: 'customer.arun',
    time: [10, 25],
    amount: 840,
    method: 'cash',
    status: 'paid',
  },
  {
    id: 'INV-1046',
    customer: 'customer.priya',
    time: [9, 58],
    amount: 2450,
    method: 'credit',
    status: 'pending',
  },
  {
    id: 'INV-1045',
    customer: 'customer.walkIn',
    time: [9, 32],
    amount: 560,
    method: 'upi',
    status: 'paid',
  },
];
const lowStockProducts = [
  { name: 'product.atta', sku: 'PRD-0012', stock: 4, unit: 'kg', minimum: 10 },
  { name: 'product.oil', sku: 'PRD-0038', stock: 3, unit: 'l', minimum: 8 },
  { name: 'product.sugar', sku: 'PRD-0021', stock: 5, unit: 'kg', minimum: 10 },
];

function Homepage() {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);
  const currency = (amount: number) =>
    intl.formatNumber(amount, {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    });
  const quantity = (amount: number, unit: string) =>
    `${intl.formatNumber(amount)} ${t(`units.${unit}`)}`;
  const maxSales = Math.max(...weeklySales.map((item) => item.amount));
  const metrics = [
    {
      id: 'dashboard.sales',
      value: 24580,
      change: '+12.8%',
      detail: 'dashboard.comparedYesterday',
      icon: '₹',
      trend: 'up',
    },
    {
      id: 'dashboard.orders',
      value: 48,
      change: '+8.2%',
      detail: 'dashboard.comparedYesterday',
      icon: '▤',
      trend: 'up',
    },
    {
      id: 'dashboard.averageOrderValue',
      value: 512.08,
      change: '+4.6%',
      detail: 'dashboard.comparedYesterday',
      icon: '↗',
      trend: 'up',
      currency: true,
    },
    {
      id: 'dashboard.outstandingPayments',
      value: 8450,
      change: t('dashboard.customersCount', { count: 12 }),
      detail: 'dashboard.paymentsPending',
      icon: '◷',
      trend: 'neutral',
    },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">
            {intl
              .formatDate(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
              .toLocaleUpperCase()}
          </p>
          <h1>{t('dashboard.greeting')}</h1>
          <p className="dashboard-subtitle">{t('dashboard.subtitle')}</p>
        </div>
        <span className="dashboard-period">{t('dashboard.today')} ▾</span>
      </div>
      <section
        className="metric-grid"
        aria-label={t('dashboard.businessOverview')}
      >
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.id}>
            <div className="metric-card-top">
              <span className="metric-label">{t(metric.id)}</span>
              <span className="metric-icon">{metric.icon}</span>
            </div>
            <strong className="metric-value">
              {metric.currency
                ? currency(metric.value)
                : metric.id === 'dashboard.orders'
                  ? intl.formatNumber(metric.value)
                  : currency(metric.value)}
            </strong>
            <div className="metric-footer">
              <span className={`metric-change metric-change--${metric.trend}`}>
                {metric.change}
              </span>
              <span className="metric-detail">{t(metric.detail)}</span>
            </div>
          </article>
        ))}
      </section>
      <section className="dashboard-main-grid">
        <article className="dashboard-panel sales-panel">
          <div className="panel-heading">
            <div>
              <h2>{t('dashboard.salesOverview')}</h2>
              <p>{t('dashboard.salesLastSevenDays')}</p>
            </div>
            <span className="panel-total">{currency(138280)}</span>
          </div>
          <div className="sales-chart">
            {weeklySales.map((item) => (
              <div className="sales-chart-column" key={item.day}>
                <span className="sales-chart-value">
                  {currency(item.amount)}
                </span>
                <div className="sales-chart-track">
                  <div
                    className="sales-chart-bar"
                    style={{ height: `${(item.amount / maxSales) * 100}%` }}
                  />
                </div>
                <span className="sales-chart-label">
                  {intl.formatDate(new Date(2026, 10, 1 + item.day), {
                    weekday: 'short',
                  })}
                </span>
              </div>
            ))}
          </div>
        </article>
        <article className="dashboard-panel quick-actions-panel">
          <div className="panel-heading">
            <div>
              <h2>{t('dashboard.quickActions')}</h2>
              <p>{t('dashboard.commonOperations')}</p>
            </div>
          </div>
          <div className="quick-actions">
            {['bill', 'product', 'purchase'].map((action, index) => (
              <div className="quick-action" key={action}>
                <span className="quick-action-icon">
                  {['＋', '▧', '⇩'][index]}
                </span>
                <span>
                  <strong>{t(`dashboard.action.${action}`)}</strong>
                  <small>{t(`dashboard.action.${action}Description`)}</small>
                </span>
                <span className="coming-soon">{t('common.soon')}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
      <section className="dashboard-bottom-grid">
        <article className="dashboard-panel transactions-panel">
          <div className="panel-heading">
            <div>
              <h2>{t('dashboard.recentTransactions')}</h2>
              <p>{t('dashboard.latestBills')}</p>
            </div>
            <span className="panel-link">{t('common.viewAll')} →</span>
          </div>
          <div className="table-scroll">
            <table className="dashboard-table">
              <thead>
                <tr>
                  {[
                    'invoice',
                    'customer',
                    'time',
                    'amount',
                    'method',
                    'status',
                  ].map((id) => (
                    <th key={id}>{t(`dashboard.column.${id}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="invoice-id">{transaction.id}</td>
                    <td>{t(transaction.customer)}</td>
                    <td>
                      {intl.formatTime(
                        new Date(
                          2026,
                          10,
                          1,
                          transaction.time[0],
                          transaction.time[1],
                        ),
                        { hour: 'numeric', minute: '2-digit' },
                      )}
                    </td>
                    <td className="transaction-amount">
                      {currency(transaction.amount)}
                    </td>
                    <td>{t(`payment.${transaction.method}`)}</td>
                    <td>
                      <span
                        className={`status-pill status-pill--${transaction.status}`}
                      >
                        {t(`paymentStatus.${transaction.status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <article className="dashboard-panel stock-panel">
          <div className="panel-heading">
            <div>
              <h2>{t('dashboard.lowStock')}</h2>
              <p>{t('dashboard.productsAttention')}</p>
            </div>
            <span className="stock-count">
              {intl.formatNumber(lowStockProducts.length)}
            </span>
          </div>
          <div className="stock-list">
            {lowStockProducts.map((product) => (
              <div className="stock-item" key={product.sku}>
                <div className="stock-item-info">
                  <strong>{t(product.name)}</strong>
                  <small>{product.sku}</small>
                </div>
                <div className="stock-item-quantity">
                  <strong>{quantity(product.stock, product.unit)}</strong>
                  <small>
                    {t('dashboard.minimumQuantity', {
                      quantity: quantity(product.minimum, product.unit),
                    })}
                  </small>
                </div>
              </div>
            ))}
          </div>
          <p className="stock-note">{t('dashboard.replenishStock')}</p>
        </article>
      </section>
      <p className="dashboard-demo-note">{t('dashboard.demoNote')}</p>
    </div>
  );
}
export default Homepage;
