import { useEffect, useState } from 'react';
import { listTariffs, money, startTableTimer } from '../../../lib/api';
import { SaleModalOverlay } from '../ui/SaleModal';

const DURATIONS = [
  { label: '30 dakika', short: '30 dk', value: 30 },
  { label: '1 saat', short: '60 dk', value: 60 },
  { label: '2 saat', short: '120 dk', value: 120 },
  { label: 'Sınırsız', short: 'Süre sınırı yok', value: null },
];

function nowHHMM() {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function timeToIso(value) {
  if (!value) return new Date().toISOString();
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date.getTime() > Date.now() ? new Date().toISOString() : date.toISOString();
}

export default function StartTableModal({ tableId, tableName, isPc = false, deviceType, onClose, onStarted, onError }) {
  const [tariffs, setTariffs] = useState([]);
  const [tariffId, setTariffId] = useState('');
  const [startTime, setStartTime] = useState(nowHHMM());
  const [minutes, setMinutes] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isPc) setMinutes(null);
  }, [isPc, tableId]);

  useEffect(() => {
    let active = true;
    listTariffs(deviceType ? { serviceType: deviceType } : {})
      .then((response) => {
        if (!active) return;
        const list = response?.data || [];
        setTariffs(list);
        setTariffId(String(list.find((item) => item.isDefault)?.id || list[0]?.id || ''));
      })
      .catch(() => onError?.('Tarifeler yüklenemedi.'));
    return () => { active = false; };
  }, [deviceType, onError]);

  const handleStart = async () => {
    if (!tariffId) return onError?.('Tarife seçin.');
    setBusy(true);
    try {
      const response = await startTableTimer(tableId, {
        tariffId: Number(tariffId),
        startedAt: timeToIso(startTime),
        plannedMinutes: isPc ? minutes : null,
      });
      if (!response?.status) throw new Error(response?.message || 'Masa açılamadı');
      onStarted?.(response.data.additionId);
    } catch (error) {
      onError?.(error?.message || 'Masa açılamadı');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SaleModalOverlay onClose={busy ? undefined : onClose} className="max-w-xl">
      <form className="compact-session-modal" onSubmit={(event) => { event.preventDefault(); if (!busy) handleStart(); }}>
        <div className="compact-modal-head"><div><h2>{tableName || 'Masa'} aç</h2><p>Tarife ve başlangıç bilgileri</p></div><button type="button" onClick={onClose} aria-label="Kapat">×</button></div>
        <div className="compact-modal-body">
          <div className="compact-form-row">
            <label><span>Başlangıç</span><input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
          </div>
          <fieldset className="compact-tariffs">
            <legend>Tarife</legend>
            <div>{tariffs.map((tariff) => {
              const selected = String(tariffId) === String(tariff.id);
              return <label key={tariff.id} className={selected ? 'is-active' : ''}><input type="radio" name="table-tariff" checked={selected} onChange={() => setTariffId(String(tariff.id))} /><i aria-hidden="true" /><span>{tariff.name}</span><strong>{money(tariff.hourlyRate)}/saat</strong></label>;
            })}</div>
          </fieldset>
          {isPc && <fieldset className="compact-duration"><legend>Süre</legend><div>{DURATIONS.map((option) => <button key={option.label} type="button" className={minutes === option.value ? 'is-active' : ''} aria-pressed={minutes === option.value} onClick={() => setMinutes(option.value)}>{option.label}</button>)}</div></fieldset>}
          {!tariffs.length && <p className="compact-error">Bu servis tipi için tarife bulunamadı.</p>}
        </div>
        <div className="compact-modal-footer"><button type="button" className="be-button secondary" onClick={onClose} disabled={busy}>Vazgeç</button><button type="submit" className="be-button primary" disabled={busy || !tariffId}>{busy ? 'Açılıyor…' : 'Masayı aç'}</button></div>
      </form>
    </SaleModalOverlay>
  );
}
