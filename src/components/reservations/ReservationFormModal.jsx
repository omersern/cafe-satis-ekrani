import { useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '../sale/ui/ConfirmDialog';
import { SaleModalBody, SaleModalFooter, SaleModalHeader, SaleModalOverlay, saleBtn } from '../sale/ui/SaleModal';
import SaleSelect from '../sale/ui/SaleSelect';
import {
  STATUS_CONFIG,
  STATUS_ORDER,
  fromLocalInputValue,
  reservationApi,
} from '../../lib/reservations';

const fieldClass = `${saleBtn.input}`;

export default function ReservationFormModal({
  open,
  onClose,
  form,
  setForm,
  editingId,
  canManage,
  onSaved,
  onError,
  onSuccess,
}) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [tables, setTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setDeleteOpen(false);
      return;
    }
    reservationApi('/tables/categories/list')
      .then((res) => setCategories((res.data || []).filter((c) => c.status !== 0)))
      .catch(() => setCategories([]));
  }, [open]);

  useEffect(() => {
    if (!open || !form.table_category_id) {
      setTables([]);
      return;
    }
    setTablesLoading(true);
    reservationApi(`/tables/list?limit=100&onlyActive=1&categoryId=${form.table_category_id}`)
      .then((res) => setTables(res.data?.tables || []))
      .catch(() => setTables([]))
      .finally(() => setTablesLoading(false));
  }, [open, form.table_category_id]);

  useEffect(() => {
    if (!open || !form.table_id || form.table_category_id || categories.length === 0) return;
    reservationApi('/tables/list?limit=100&onlyActive=1&categoryId=0')
      .then((res) => {
        const table = (res.data?.tables || []).find((t) => String(t.id) === String(form.table_id));
        if (table?.category_id) {
          setForm((prev) => ({ ...prev, table_category_id: String(table.category_id) }));
        }
      })
      .catch(() => {});
  }, [open, form.table_id, form.table_category_id, categories.length, setForm]);

  const handleSave = async () => {
    if (!canManage) return;
    if (!form.customer_name.trim()) {
      onError?.('Müşteri adı zorunludur.');
      return;
    }
    const startsAt = fromLocalInputValue(form.starts_at);
    const endsAt = fromLocalInputValue(form.ends_at);
    if (!startsAt || !endsAt || endsAt <= startsAt) {
      onError?.('Geçerli başlangıç ve bitiş zamanı girin.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim() || null,
        customer_email: form.customer_email.trim() || null,
        guest_count: parseInt(form.guest_count, 10) || 1,
        table_id: form.table_id ? parseInt(form.table_id, 10) : null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: form.status,
        notes: form.notes.trim() || null,
      };

      if (editingId) {
        await reservationApi('/reservations/update', { method: 'POST', body: { id: editingId, ...payload } });
        onSuccess?.('Rezervasyon güncellendi.');
      } else {
        await reservationApi('/reservations/create', { method: 'POST', body: payload });
        onSuccess?.('Rezervasyon oluşturuldu.');
      }
      onClose();
      onSaved?.();
    } catch (error) {
      onError?.(error.message || 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canManage || !editingId) return;
    setDeleting(true);
    try {
      await reservationApi('/reservations/delete', { method: 'POST', body: { id: editingId } });
      onSuccess?.('Rezervasyon silindi.');
      setDeleteOpen(false);
      onClose();
      onSaved?.();
    } catch (error) {
      onError?.(error.message || 'Silinemedi.');
    } finally {
      setDeleting(false);
    }
  };

  const statusOptions = useMemo(() => STATUS_ORDER.map((key) => ({
    value: key,
    label: STATUS_CONFIG[key].label,
    leading: <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_CONFIG[key].dot}`} aria-hidden />,
  })), []);

  const categoryOptions = useMemo(() => [
    { value: '', label: 'Kategori seçin', muted: true },
    ...categories.map((cat) => ({
      value: String(cat.id),
      label: cat.name,
    })),
  ], [categories]);

  const tableOptions = useMemo(() => [
    { value: '', label: tablesLoading ? 'Yükleniyor…' : 'Masa seçin (opsiyonel)', muted: true },
    ...tables.map((table) => ({
      value: String(table.id),
      label: table.name,
    })),
  ], [tables, tablesLoading]);

  if (!open) return null;

  return (
    <>
      <SaleModalOverlay onClose={onClose} className="max-w-2xl">
        <SaleModalHeader
          title={editingId ? 'Rezervasyonu düzenle' : 'Yeni rezervasyon'}
          onClose={onClose}
        />
        <SaleModalBody>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm text-slate-400">Müşteri adı *</span>
              <input
                className={fieldClass}
                value={form.customer_name}
                onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))}
                placeholder="Ad Soyad"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm text-slate-400">Telefon</span>
              <input
                className={fieldClass}
                value={form.customer_phone}
                onChange={(e) => setForm((p) => ({ ...p, customer_phone: e.target.value }))}
                placeholder="5xx xxx xx xx"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm text-slate-400">E-posta</span>
              <input
                type="email"
                className={fieldClass}
                value={form.customer_email}
                onChange={(e) => setForm((p) => ({ ...p, customer_email: e.target.value }))}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm text-slate-400">Kişi sayısı</span>
              <input
                type="number"
                min={1}
                className={fieldClass}
                value={form.guest_count}
                onChange={(e) => setForm((p) => ({ ...p, guest_count: e.target.value }))}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm text-slate-400">Durum</span>
              <SaleSelect
                value={form.status}
                onChange={(status) => setForm((p) => ({ ...p, status }))}
                options={statusOptions}
                disabled={!canManage}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm text-slate-400">Başlangıç</span>
              <input
                type="datetime-local"
                className={fieldClass}
                value={form.starts_at}
                onChange={(e) => setForm((p) => ({ ...p, starts_at: e.target.value }))}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm text-slate-400">Bitiş</span>
              <input
                type="datetime-local"
                className={fieldClass}
                value={form.ends_at}
                onChange={(e) => setForm((p) => ({ ...p, ends_at: e.target.value }))}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm text-slate-400">Masa kategorisi</span>
              <SaleSelect
                value={form.table_category_id}
                onChange={(table_category_id) => setForm((p) => ({ ...p, table_category_id, table_id: '' }))}
                options={categoryOptions}
                placeholder="Kategori seçin"
                disabled={!canManage}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm text-slate-400">Masa</span>
              <SaleSelect
                value={form.table_id}
                onChange={(table_id) => setForm((p) => ({ ...p, table_id }))}
                options={tableOptions}
                placeholder="Masa seçin (opsiyonel)"
                disabled={!canManage || !form.table_category_id}
                loading={tablesLoading}
              />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm text-slate-400">Not</span>
              <textarea
                rows={3}
                className={`${fieldClass} resize-none`}
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Özel istek, alerji vb."
              />
            </label>
          </div>
        </SaleModalBody>
        <SaleModalFooter>
          <div className="flex w-full items-center justify-between gap-3">
          {editingId && canManage ? (
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              disabled={deleting || saving}
              className={saleBtn.danger}
            >
              Sil
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={saving} className={saleBtn.ghost}>İptal</button>
            {canManage && (
              <button type="button" onClick={handleSave} disabled={saving} className={saleBtn.primary}>
                {saving ? 'Kaydediliyor…' : (editingId ? 'Kaydet' : 'Oluştur')}
              </button>
            )}
          </div>
          </div>
        </SaleModalFooter>
      </SaleModalOverlay>

      <ConfirmDialog
        open={deleteOpen}
        title="Rezervasyonu sil?"
        message={form.customer_name
          ? `"${form.customer_name}" rezervasyonu kalıcı olarak silinecek.`
          : 'Bu rezervasyon kalıcı olarak silinecek.'}
        confirmLabel="Evet, sil"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}
