import { SETTINGS_CATEGORIES } from './settingsCategories';

function NavItem({ category, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`settings-nav-item touch-manipulation ${active ? 'settings-nav-item-active' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      <span className={`settings-nav-icon ${category.iconBg}`}>{category.icon}</span>
      <span className="settings-nav-label">{category.title}</span>
    </button>
  );
}

export default function SettingsNav({ activeCategory, onCategoryChange }) {
  return (
    <nav className="settings-nav flex-1 overflow-y-auto pb-4" aria-label="Ayarlar bölümleri">
      {SETTINGS_CATEGORIES.map((cat) => (
        <NavItem
          key={cat.id}
          category={cat}
          active={activeCategory === cat.id}
          onClick={() => onCategoryChange(cat.id)}
        />
      ))}
    </nav>
  );
}
