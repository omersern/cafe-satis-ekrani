import {
  DayModalBody,
  DayModalFooter,
  DayModalHeader,
  DayModalOverlay,
  dayBtn,
} from './DayModalShell';

/** posv2 DayStartModal — birebir */
export default function DayStartModal({
  startSteps,
  stepValues,
  startNote,
  isLoading,
  onStepChange,
  onNoteChange,
  onClose,
  onSubmit,
}) {
  return (
    <DayModalOverlay onClose={onClose}>
      <DayModalHeader
        title="Günü başlat"
        subtitle="Kasa başlangıç değerlerini girin"
        accent="green"
        onClose={onClose}
        icon={(
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      />
      <DayModalBody>
        {startSteps.map((step) => (
          <div key={step.id} className="day-win11-field">
            <label className="day-win11-label" htmlFor={`start-step-${step.id}`}>
              {step.friendly_name || step.name}
              {step.is_cash && <span className="day-win11-label-muted"> (Kasada kalan)</span>}
            </label>
            <div className="day-win11-input-wrap">
              <input
                id={`start-step-${step.id}`}
                type="number"
                value={stepValues[step.id] || ''}
                onChange={(e) => onStepChange(step.id, e.target.value)}
                className="day-win11-input"
                placeholder="0,00"
                step="0.01"
              />
              <span className="day-win11-input-suffix">₺</span>
            </div>
          </div>
        ))}

        {startSteps.length === 0 && (
          <div className="day-win11-empty">
            Başlangıç adımı yok. POSM → Ödeme yöntemlerinde “gün başı sayım” açık hesap tanımlayın.
          </div>
        )}

        <div className="day-win11-field">
          <label className="day-win11-label" htmlFor="start-note">
            Not (opsiyonel)
          </label>
          <textarea
            id="start-note"
            value={startNote}
            onChange={(e) => onNoteChange(e.target.value)}
            className="day-win11-textarea"
            placeholder="Varsa eklemek istediğiniz notlar…"
            rows={2}
          />
        </div>

        <div className="day-win11-hint-box">
          <h5 className="day-win11-hint-title">Kontrol listesi</h5>
          <ul className="day-win11-hint-list">
            <li>Kasadaki mevcut parayı sayın</li>
            <li>POS cihazının çalıştığından emin olun</li>
            <li>Yazıcı kağıtlarını kontrol edin</li>
          </ul>
        </div>
      </DayModalBody>
      <DayModalFooter>
        <button type="button" onClick={onClose} disabled={isLoading} className={dayBtn.ghost}>
          İptal
        </button>
        <button type="button" onClick={onSubmit} disabled={isLoading} className={dayBtn.success}>
          {isLoading ? 'İşleniyor…' : 'Günü başlat'}
        </button>
      </DayModalFooter>
    </DayModalOverlay>
  );
}
