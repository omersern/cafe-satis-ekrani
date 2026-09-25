import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import AboutSettings from '../components/settings/AboutSettings';
import AppearanceSettings from '../components/settings/AppearanceSettings';
import CloudSettings from '../components/settings/CloudSettings';
import GeneralSettings from '../components/settings/GeneralSettings';
import SettingsNav from '../components/settings/SettingsNav';
import { getSettingsCategory } from '../components/settings/settingsCategories';
import { useAuth } from '../context/AuthContext';
import { PERMS } from '../lib/permissions';
import { ROUTES } from '../lib/routes';

function SettingsContent({ category }) {
  switch (category) {
    case 'bulut':
      return <CloudSettings />;
    case 'genel':
      return <GeneralSettings />;
    case 'gorunum':
      return <AppearanceSettings />;
    case 'hakkinda':
      return <AboutSettings />;
    default:
      return null;
  }
}

/**
 * posv2-tauri Ayarlar shell’i:
 * sol sidebar + kategori panelleri (Win11 Settings).
 */
export default function Settings() {
  const { isLoggedIn, can, isAdmin } = useAuth();
  const [activeCategory, setActiveCategory] = useState('bulut');
  const meta = getSettingsCategory(activeCategory);

  // posv2: yalnızca admin; cafe: MANAGE_SETTINGS veya admin
  const allowed = isAdmin || can(PERMS.MANAGE_SETTINGS);

  if (!isLoggedIn) {
    return <Navigate to={ROUTES.metro} replace />;
  }

  if (!allowed) {
    return <Navigate to={ROUTES.metro} replace />;
  }

  return (
    <div className="settings-shell flex h-full min-h-0 overflow-hidden">
      <aside className="settings-sidebar flex w-[272px] shrink-0 flex-col">
        <div className="settings-sidebar-top shrink-0 px-3 pt-3">
          <h1 className="settings-app-title">Ayarlar</h1>
        </div>
        <SettingsNav activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
      </aside>

      <main className="settings-main min-w-0 flex-1 overflow-hidden">
        <div className="settings-main-scroll h-full overflow-y-auto">
          <div className="settings-main-inner">
            <div className="settings-page-header">
              <h2 className="settings-page-title">{meta.title}</h2>
              {meta.description && <p className="settings-page-desc">{meta.description}</p>}
            </div>
            <SettingsContent category={activeCategory} />
          </div>
        </div>
      </main>
    </div>
  );
}
