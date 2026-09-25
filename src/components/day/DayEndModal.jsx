import {
  DayModalBody,
  DayModalFooter,
  DayModalHeader,
  DayModalOverlay,
  dayBtn,
} from './DayModalShell';

/** posv2 DayEndModal — birebir */
export default function DayEndModal({
  endSteps,
  endStepsWithSystem,
  stepValues,
  cashOnHand,
  cashWithdrawn,
  endNote,
  isLoading,
  canFinish,
  onStepChange,
  onCashOnHandChange,
  onCashWithdrawnChange,
  onNoteChange,
  onClose,
  onSubmit,
}) {
  return (
    <DayModalOverlay onClose={onClose}>
      <DayModalHeader
        title="Günü bitir"
        subtitle="Gün sonu sayım değerlerini girin"
        accent="red"
        onClose={onClose}
        icon={(
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
            />
          </svg>
        )}
      />
      <DayModalBody>
        {endSteps.length > 0 ? (
          <>
            <div className="day-win11-info-banner">
              Ödeme yöntemlerinin gün sonu tutarlarını dikkatli şekilde sayarak girin. Kuruş için
              nokta (.) kullanın. Örn: 9340.30
            </div>

            {endStepsWithSystem.map((step) => (
              <div key={step.id}>
                {step.is_cash ? (
                  <div className="space-y-4">
                    <div className="day-win11-field">
                      <label className="day-win11-label" htmlFor="cash-on-hand">
                        Kasada olan para
                      </label>
                      <div className="day-win11-input-wrap">
                        <input
                          id="cash-on-hand"
                          type="number"
                          value={cashOnHand}
                          onChange={(e) => onCashOnHandChange(e.target.value)}
                          className="day-win11-input"
                          step="0.01"
                        />
                        <span className="day-win11-input-suffix">₺</span>
                      </div>
                    </div>
                    <div className="day-win11-field">
                      <label className="day-win11-label" htmlFor="cash-withdrawn">
                        Kasadan alınan para
                      </label>
                      <div className="day-win11-input-wrap">
                        <input
                          id="cash-withdrawn"
                          type="number"
                          value={cashWithdrawn}
                          onChange={(e) => onCashWithdrawnChange(e.target.value)}
                          className="day-win11-input"
                          step="0.01"
                        />
                        <span className="day-win11-input-suffix">₺</span>
                      </div>
                    </div>
                    <div className="day-win11-field">
                      <label className="day-win11-label" htmlFor={`end-cash-${step.id}`}>
                        Kasada kalan para
                      </label>
                      <div className="day-win11-input-wrap">
                        <input
                          id={`end-cash-${step.id}`}
                          type="number"
                          value={stepValues[step.id] || ''}
                          onChange={(e) => onStepChange(step.id, e.target.value)}
                          className="day-win11-input"
                          step="0.01"
                        />
                        <span className="day-win11-input-suffix">₺</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="day-win11-field">
                    <label className="day-win11-label" htmlFor={`end-step-${step.id}`}>
                      {step.friendly_name || step.name}
                    </label>
                    <div className="day-win11-input-wrap">
                      <input
                        id={`end-step-${step.id}`}
                        type="number"
                        value={stepValues[step.id] || ''}
                        onChange={(e) => onStepChange(step.id, e.target.value)}
                        className="day-win11-input"
                        step="0.01"
                      />
                      <span className="day-win11-input-suffix">₺</span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="day-win11-field">
              <label className="day-win11-label" htmlFor="end-note">
                Not (opsiyonel)
              </label>
              <textarea
                id="end-note"
                value={endNote}
                onChange={(e) => onNoteChange(e.target.value)}
                className="day-win11-textarea"
                placeholder="Gün sonu notları…"
                rows={2}
              />
            </div>
          </>
        ) : (
          <div className="day-win11-empty">Sayım yapılacak ödeme yöntemi bulunmuyor.</div>
        )}
      </DayModalBody>
      <DayModalFooter>
        <button type="button" onClick={onClose} disabled={isLoading} className={dayBtn.ghost}>
          İptal
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading || (endSteps.length > 0 && !canFinish())}
          className={dayBtn.danger}
        >
          {isLoading ? 'İşleniyor…' : 'Günü bitir'}
        </button>
      </DayModalFooter>
    </DayModalOverlay>
  );
}
