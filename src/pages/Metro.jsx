import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import MetroDashboard from '../components/metro/MetroDashboard';
import MetroShell from '../components/metro/MetroShell';
import { apiJson } from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { ROUTES } from '../lib/routes';

export default function Metro() {
  const { hasPermission, ready: permissionsReady } = usePermissions();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setError('');
      const [salesResponse, dashboardResponse] = await Promise.all([
        apiJson('/app/metro/total_sales', { method: 'GET' }),
        apiJson('/app/metro/dashboard', { method: 'GET' }),
      ]);
      const salesResult = salesResponse.data;
      const dashboardResult = dashboardResponse.data;
      if (!salesResponse.response.ok || !salesResult?.status || !salesResult.data) {
        throw new Error(salesResult?.message || 'Ciro bilgisi buluttan alınamadı');
      }
      if (!dashboardResponse.response.ok || !dashboardResult?.status || !dashboardResult.data) {
        throw new Error(dashboardResult?.message || 'Dashboard bilgisi buluttan alınamadı');
      }

      const sales = salesResult.data;
      const dashboard = dashboardResult.data;
      setData({
        sales: {
          ciro: sales.total_payments,
          totalPayments: sales.total_payments,
          totalSales: sales.total_sales,
          ciroHedefUp: Boolean(sales.ciro_hedef_up),
        },
        day: sales.day_status ? { status: 'open', source: 'cloud' } : null,
        kitchenPendingCount: Number(dashboard.kitchenPendingCount || 0),
        lowStocks: dashboard.lowStocks || [],
        hourlyTrend: dashboard.hourlyTrend || [],
      });
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Bulut verilerine bağlanılamadı');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!permissionsReady || !hasPermission('reports.sales')) return undefined;
    refresh();
    window.addEventListener('wpos:tables-refresh', refresh);
    window.addEventListener('wpos:kitchen-refresh', refresh);
    return () => {
      window.removeEventListener('wpos:tables-refresh', refresh);
      window.removeEventListener('wpos:kitchen-refresh', refresh);
    };
  }, [refresh, permissionsReady, hasPermission]);

  if (!permissionsReady) return <MetroShell><div className="p-6 text-sm">Yetkiler yükleniyor…</div></MetroShell>;
  if (!hasPermission('reports.sales')) return <Navigate to={ROUTES.sale} replace />;

  return (
    <MetroShell title="Webbek Cafe" showBack={false}>
      <MetroDashboard data={data} loading={loading} error={error} />
    </MetroShell>
  );
}
