import { useCallback, useEffect, useState } from 'react';
import MetroShell from '../components/metro/MetroShell';
import { apiJson, money } from '../lib/api';
import useEscapeClose from '../hooks/useEscapeClose';

function Status({ value }) {
  const open = Number(value) === 0;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
      open
        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
    }`}>
      {open ? 'Açık' : 'Kapalı'}
    </span>
  );
}

export default function AdditionReports() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  useEscapeClose(() => setDetail(null), Boolean(detail));

  const load = useCallback(async (nextPage = 1, term = '') => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ page: String(nextPage), limit: '50' });
      if (term.trim()) query.set('search', term.trim());
      const { data } = await apiJson(`/app/reports/list?${query}`, { method: 'GET' });
      if (!data?.status) throw new Error(data?.message || 'Adisyonlar alınamadı.');
      setRows(data.data || []);
      setPagination(data.pagination || { page: nextPage, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err?.message || 'Adisyonlar alınamadı.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1, ''); }, [load]);

  const loadDetail = async (addition) => {
    setDetail({ addition, data: null });
    setDetailLoading(true);
    try {
      const { data } = await apiJson('/app/reports/detail', {
        method: 'POST',
        body: JSON.stringify({ addition_id: addition.id }),
      });
      if (!data?.status) throw new Error(data?.message || 'Detay alınamadı.');
      setDetail({ addition, data: data.data });
    } catch (err) {
      setError(err?.message || 'Adisyon detayı alınamadı.');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <MetroShell title="Adisyon Raporu" subtitle="Satış ve ödeme detayları">
      <div className="win11-metro-inner">
        {error && <div className="win11-metro-banner win11-metro-banner-warn mb-4">{error}</div>}
        <form
          className="mb-4 flex gap-2"
          onSubmit={(event) => { event.preventDefault(); setPage(1); load(1, search); }}
        >
          <input
            className="cafe-input min-w-0 flex-1"
            inputMode="numeric"
            placeholder="Adisyon numarası ile ara…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button type="submit" className="cafe-btn cafe-btn-primary">Ara</button>
          {search && (
            <button type="button" className="cafe-btn cafe-btn-ghost" onClick={() => { setSearch(''); setPage(1); load(1, ''); }}>
              Temizle
            </button>
          )}
        </form>

        <section className="win11-metro-card overflow-hidden">
          <div className="win11-metro-card-header">
            <h2 className="win11-metro-card-title">Adisyonlar</h2>
            <span className="ml-auto text-sm opacity-60">{pagination.total} kayıt</span>
          </div>
          <div className="overflow-x-auto">
            <table className="cafe-table min-w-[850px]">
              <thead><tr><th>No.</th><th>Saat</th><th>Masa</th><th>Ürün</th><th>Ödeme</th><th>Tutar</th><th>Durum</th><th /></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={8}>Yükleniyor…</td></tr>}
                {!loading && rows.length === 0 && <tr><td colSpan={8}>Adisyon bulunamadı.</td></tr>}
                {!loading && rows.map((addition) => (
                  <tr key={addition.id}>
                    <td>#{addition.id}</td>
                    <td>{addition.time?.slice(0, 5) || '—'}</td>
                    <td>{addition.table_name ? `${addition.table_category} / ${addition.table_name}` : '—'}</td>
                    <td>{addition.product_count ?? 0}</td>
                    <td>{addition.payment_methods || '—'}</td>
                    <td className="font-semibold">{money(addition.total_sales)}</td>
                    <td><Status value={addition.status} /></td>
                    <td><button type="button" className="cafe-btn cafe-btn-ghost" onClick={() => loadDetail(addition)}>Detay</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--win11-metro-border)] p-4">
              <span className="text-sm opacity-60">Sayfa {pagination.page} / {pagination.totalPages}</span>
              <div className="flex gap-2">
                <button type="button" className="cafe-btn cafe-btn-ghost" disabled={page <= 1} onClick={() => { const next = page - 1; setPage(next); load(next, search); }}>Önceki</button>
                <button type="button" className="cafe-btn cafe-btn-ghost" disabled={page >= pagination.totalPages} onClick={() => { const next = page + 1; setPage(next); load(next, search); }}>Sonraki</button>
              </div>
            </div>
          )}
        </section>
      </div>

      {detail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}>
          <section className="win11-metro-card flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden" role="dialog" aria-modal="true" aria-label="Adisyon detayı">
            <div className="win11-metro-card-header">
              <h2 className="win11-metro-card-title">Adisyon #{detail.addition.id}</h2>
              <button type="button" className="cafe-icon-btn ml-auto" aria-label="Kapat" onClick={() => setDetail(null)}>×</button>
            </div>
            <div className="metro-scroll overflow-y-auto p-5">
              {detailLoading && <p>Yükleniyor…</p>}
              {!detailLoading && detail.data && (
                <div className="space-y-5">
                  <div>
                    <h3 className="mb-2 font-semibold">Ürünler</h3>
                    {detail.data.products?.map((product) => (
                      <div key={product.id} className="flex items-start justify-between gap-4 border-b border-[var(--win11-metro-border)] py-2">
                        <div className="min-w-0">
                          <div>{product.amount}× {product.product_name}</div>
                          {product.variant_display && (
                            <div className="mt-1 text-sm text-[var(--win11-metro-text-muted)]">
                              {product.variant_display}
                            </div>
                          )}
                        </div>
                        <strong className="shrink-0">{money(Number(product.price) * Number(product.amount))}</strong>
                      </div>
                    ))}
                  </div>
                  <div><h3 className="mb-2 font-semibold">Ödemeler</h3>{detail.data.payments?.map((payment) => <div key={payment.id} className="flex justify-between border-b border-[var(--win11-metro-border)] py-2"><span>{payment.payment_method_name || 'Ödeme'}</span><strong>{money(payment.amount)}</strong></div>)}</div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </MetroShell>
  );
}
