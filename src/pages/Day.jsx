import { useCallback, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import DayDetailModal from '../components/day/DayDetailModal';
import DayEndModal from '../components/day/DayEndModal';
import DayStartModal from '../components/day/DayStartModal';
import { dayBtn } from '../components/day/DayModalShell';
import { useAuth } from '../context/AuthContext';
import { endDay, getDayEndSummary, getDaySummary, startDay } from '../lib/api';
import { PERMS } from '../lib/permissions';
import { ROUTES } from '../lib/routes';

function buildInitialStepValues(startSteps = [], endSteps = []) {
  const values = {};
  [...startSteps, ...endSteps].forEach((step) => {
    values[step.id] = '';
  });
  return values;
}

/**
 * Gün işlemleri — doğrudan cloud /app/days/*
 */
export default function Day() {
  const { can, isLoggedIn } = useAuth();
  const location = useLocation();
  const canStart = can(PERMS.DAY_OPEN);
  const canEnd = can(PERMS.DAY_CLOSE);
  const canViewSummary = canStart || canEnd || can(PERMS.VIEW_REPORTS);
  const canAccessPage = canStart || canEnd || canViewSummary;
  const redirectHint =
    location.state?.reason === 'day_closed'
      ? location.state?.message || 'Satış için önce günü başlatın.'
      : '';


  const [dayStarted, setDayStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [pageError, setPageError] = useState('');

  const [days, setDays] = useState([]);
  const [startSteps, setStartSteps] = useState([]);
  const [endSteps, setEndSteps] = useState([]);
  const [endStepsWithSystem, setEndStepsWithSystem] = useState([]);
  const [stepValues, setStepValues] = useState({});
  const [cashOnHand, setCashOnHand] = useState('');
  const [cashWithdrawn, setCashWithdrawn] = useState('');
  const [startNote, setStartNote] = useState('');
  const [endNote, setEndNote] = useState('');

  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const handleWheel = () => {
      if (document.activeElement?.type === 'number') {
        document.activeElement.blur();
      }
    };
    document.addEventListener('wheel', handleWheel);
    return () => document.removeEventListener('wheel', handleWheel);
  }, []);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setPageError('');
    try {
      const res = await getDaySummary();
      if (!res?.status) {
        setPageError(
          res?.message ||
            'Gün özeti alınamadı. Online PIN, days yetkisi ve days tablosu gerekir.'
        );
        return;
      }

      const summary = res.data || {};
      setDays(summary.data || summary.days || []);
      setStartSteps(summary.start_steps || []);
      setEndSteps(summary.end_steps || []);
      setDayStarted(summary.current_day === 1 || summary.current_day === true);
      setStepValues(buildInitialStepValues(summary.start_steps, summary.end_steps));
    } catch (error) {
      setPageError(error?.message || 'İnternet bağlantınızı kontrol edin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !canAccessPage) return undefined;
    loadSummary();
    return undefined;
  }, [isLoggedIn, canAccessPage, loadSummary]);

  const loadEndSummary = useCallback(async () => {
    try {
      const res = await getDayEndSummary();
      if (res?.status) {
        setEndStepsWithSystem(res.data?.end_steps || []);
      } else {
        setEndStepsWithSystem(endSteps);
      }
    } catch (error) {
      console.error('[days/end-summary]', error);
      setEndStepsWithSystem(endSteps);
    }
  }, [endSteps]);

  const handleStepChange = (stepId, value) => {
    setStepValues((prev) => ({ ...prev, [stepId]: value }));
  };

  const resetStartModal = () => {
    setStepValues((prev) => {
      const next = { ...prev };
      startSteps.forEach((step) => {
        next[step.id] = '';
      });
      return next;
    });
    setStartNote('');
    setActionError('');
  };

  const resetEndModal = () => {
    setStepValues((prev) => {
      const next = { ...prev };
      endSteps.forEach((step) => {
        next[step.id] = '';
      });
      return next;
    });
    setCashOnHand('');
    setCashWithdrawn('');
    setEndNote('');
    setActionError('');
  };

  const canFinish = () => {
    const steps = endStepsWithSystem.length ? endStepsWithSystem : endSteps;
    const allStepsFilled = steps.every(
      (step) => stepValues[step.id] && stepValues[step.id].toString().trim() !== ''
    );
    const cashStep = steps.find((step) => step.is_cash);
    const cashOnHandFilled = !cashStep || (cashOnHand && cashOnHand.toString().trim() !== '');
    const cashWithdrawnFilled = !cashStep || (cashWithdrawn && cashWithdrawn.toString().trim() !== '');
    return allStepsFilled && cashOnHandFilled && cashWithdrawnFilled;
  };

  const openStartModal = () => {
    if (!canStart) return;
    setActionError('');
    setShowStartModal(true);
  };

  const openEndModal = async () => {
    if (!canEnd) return;
    setActionError('');
    await loadEndSummary();
    setShowEndModal(true);
  };

  const handleStartDay = async () => {
    const allFilled = startSteps.every(
      (step) => stepValues[step.id] && stepValues[step.id].toString().trim() !== ''
    );
    if (!allFilled) {
      setActionError('Lütfen tüm alanları doldurun.');
      return;
    }

    setIsLoading(true);
    setActionError('');
    try {
      const res = await startDay({
        step_values: Object.fromEntries(
          startSteps.map((step) => [step.id, stepValues[step.id]])
        ),
        note: startNote,
      });

      if (!res?.status) {
        setActionError(res?.message || 'Gün başlatılamadı.');
        return;
      }

      setDayStarted(true);
      setShowStartModal(false);
      resetStartModal();
      await loadSummary();
    } catch (error) {
      setActionError(error?.message || 'İnternet bağlantınızı kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndDay = async () => {
    const allFilled = endSteps.every(
      (step) => stepValues[step.id] && stepValues[step.id].toString().trim() !== ''
    );
    const cashStep = endSteps.find((step) => step.is_cash);
    const needsCashOnHand = cashStep && (!cashOnHand || cashOnHand.toString().trim() === '');
    const needsCashWithdrawn = cashStep && (!cashWithdrawn || cashWithdrawn.toString().trim() === '');

    if (!allFilled || needsCashOnHand || needsCashWithdrawn) {
      setActionError('Lütfen tüm alanları doldurun.');
      return;
    }

    setIsLoading(true);
    setActionError('');
    try {
      const res = await endDay({
        step_values: Object.fromEntries(
          endSteps.map((step) => [step.id, stepValues[step.id]])
        ),
        cash_on_hand: cashOnHand,
        cash_withdrawn: cashWithdrawn,
        note: endNote,
      });

      if (!res?.status) {
        setActionError(res?.message || 'Gün bitirilirken bir hata oluştu.');
        return;
      }

      setDayStarted(false);
      setShowEndModal(false);
      resetEndModal();
      await loadSummary();
    } catch (error) {
      setActionError(error?.message || 'İnternet bağlantınızı kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoggedIn) {
    return <Navigate to={ROUTES.metro} replace />;
  }

  if (!canAccessPage) {
    return <Navigate to={ROUTES.metro} replace />;
  }

  return (
    <div className="metro-shell metro-win11-shell day-win11-shell flex min-h-0 flex-1 flex-col">
      <main className="win11-metro-main metro-scroll flex-1 overflow-y-auto">
        <div className="win11-metro-inner">
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="win11-metro-loading-ring win11-metro-loading-ring-sm" />
            </div>
          ) : (
            <div className="space-y-5">
              {(redirectHint || pageError) && (
                <div className="win11-metro-banner win11-metro-banner-warn">
                  <svg
                    className="h-5 w-5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                    />
                  </svg>
                  <p>{pageError || redirectHint}</p>
                </div>
              )}

              {(canStart || canEnd || canViewSummary) && (
                <section
                  className={`win11-metro-card day-win11-status ${
                    dayStarted ? 'is-open' : 'is-closed'
                  }`}
                >
                  <div className="day-win11-status-inner">
                    <div className="flex min-w-0 items-start gap-4">
                      <div
                        className={`day-win11-status-icon ${dayStarted ? 'is-open' : 'is-closed'}`}
                      >
                        {dayStarted ? (
                          <svg
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2
                          className={`day-win11-status-title ${
                            dayStarted ? 'is-open' : 'is-closed'
                          }`}
                        >
                          {dayStarted ? 'Gün devam ediyor' : 'Gün başlatılmadı'}
                        </h2>
                        <p className="day-win11-status-desc">
                          {dayStarted
                            ? 'Satış işlemleri aktif. Günü sonlandırmak için bitir butonuna tıklayın.'
                            : 'Satış yapabilmek için günü başlatmanız gerekiyor.'}
                        </p>
                      </div>
                    </div>

                    {(canStart || canEnd) && (
                      <div className="day-win11-status-actions">
                        {canStart && (
                          <button
                            type="button"
                            onClick={openStartModal}
                            disabled={dayStarted}
                            className={dayBtn.success}
                          >
                            Günü başlat
                          </button>
                        )}
                        {canEnd && (
                          <button
                            type="button"
                            onClick={openEndModal}
                            disabled={!dayStarted}
                            className={dayBtn.danger}
                          >
                            Günü bitir
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {canViewSummary && (
                <section className="win11-metro-card overflow-hidden">
                  <div className="win11-metro-card-header">
                    <h2 className="win11-metro-card-title">Geçmiş günler</h2>
                    <span className="day-win11-table-meta">Son 10 gün</span>
                  </div>
                  <div className="day-win11-table-wrap">
                    <table className="day-win11-table">
                      <thead>
                        <tr>
                          <th>Tarih</th>
                          <th>Toplam ciro</th>
                          <th>Başlangıç</th>
                          <th>Bitiş</th>
                          <th>Durum</th>
                          <th>İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {days.map((day) => (
                          <tr key={day.id}>
                            <td className="day-win11-table-strong">{day.date}</td>
                            <td className="day-win11-table-money">{day.total_payments}</td>
                            <td>{day.start_date}</td>
                            <td>{day.end_date || '—'}</td>
                            <td>
                              <span
                                className={`day-win11-badge ${
                                  day.status === 1 ? 'is-done' : 'is-open'
                                }`}
                              >
                                {day.status === 1 ? 'Tamamlandı' : 'Devam ediyor'}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDay(day);
                                  setShowDetailModal(true);
                                }}
                                className={dayBtn.link}
                              >
                                Detay
                              </button>
                            </td>
                          </tr>
                        ))}
                        {days.length === 0 && (
                          <tr>
                            <td colSpan={6} className="day-win11-table-empty">
                              Henüz kayıtlı gün bulunmuyor
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>

      {actionError && (showStartModal || showEndModal) && (
        <div className="day-win11-toast" role="alert">
          {actionError}
        </div>
      )}

      {showStartModal && canStart && (
        <DayStartModal
          startSteps={startSteps}
          stepValues={stepValues}
          startNote={startNote}
          isLoading={isLoading}
          onStepChange={handleStepChange}
          onNoteChange={setStartNote}
          onClose={() => {
            setShowStartModal(false);
            resetStartModal();
          }}
          onSubmit={handleStartDay}
        />
      )}

      {showEndModal && canEnd && (
        <DayEndModal
          endSteps={endSteps}
          endStepsWithSystem={endStepsWithSystem}
          stepValues={stepValues}
          cashOnHand={cashOnHand}
          cashWithdrawn={cashWithdrawn}
          endNote={endNote}
          isLoading={isLoading}
          canFinish={canFinish}
          onStepChange={handleStepChange}
          onCashOnHandChange={setCashOnHand}
          onCashWithdrawnChange={setCashWithdrawn}
          onNoteChange={setEndNote}
          onClose={() => {
            setShowEndModal(false);
            resetEndModal();
          }}
          onSubmit={handleEndDay}
        />
      )}

      {showDetailModal && canViewSummary && (
        <DayDetailModal
          day={selectedDay}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedDay(null);
          }}
        />
      )}
    </div>
  );
}
