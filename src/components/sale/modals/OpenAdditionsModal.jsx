import { useEffect, useState } from 'react';
import { saleApi } from '../../../lib/saleApi';
import { formatAdditionId } from '../../../lib/additionFormat';
import { SaleModalBody, SaleModalFooter, SaleModalHeader, SaleModalOverlay, saleBtn } from '../ui/SaleModal';

function formatPrice(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(value || 0);
}

export default function OpenAdditionsModal({ onClose, onSelectAddition }) {
  const [additions, setAdditions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      let serverAdditions = [];

      try {
        const response = await saleApi('/app/addition/list', { method: 'GET' });
        serverAdditions = response.data || [];
      } catch {
        serverAdditions = [];
      }

      if (active) {
        setAdditions(serverAdditions);
        setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleSelect = async (addition) => {
    await window.env.removeKey('is_edit_mode');
    await window.env.addKey('addition_id', addition.id);
    onSelectAddition(addition.id);
    onClose();
  };

  return (
    <SaleModalOverlay onClose={onClose} className="max-w-md">
      <SaleModalHeader title="Açık adisyonlar" subtitle="Devam etmek için seçin" onClose={onClose} />
      <SaleModalBody>
        {isLoading ? (
          <div className="flex flex-col items-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />
            <p className="mt-3 text-sm text-slate-500">Yükleniyor…</p>
          </div>
        ) : additions.length > 0 ? (
          <div className="space-y-2">
            {additions.map((addition) => (
              <button
                key={addition.id}
                type="button"
                onClick={() => handleSelect(addition)}
                className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 text-left transition-colors hover:bg-white/[0.06] active:scale-[0.99] touch-manipulation select-none min-h-[72px]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">
                        {`Adisyon #${formatAdditionId(addition.id)}`}
                      </p>
                    </div>
                    {addition.name && (
                      <p className="truncate text-sm text-slate-500">{addition.name}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right text-xs text-slate-500">
                    <p>{addition.date}</p>
                    <p>{addition.time}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="py-10 text-center text-slate-500">Açık adisyon bulunmuyor.</p>
        )}
      </SaleModalBody>
      <SaleModalFooter>
        <button type="button" onClick={onClose} className={saleBtn.ghost}>Kapat</button>
      </SaleModalFooter>
    </SaleModalOverlay>
  );
}
