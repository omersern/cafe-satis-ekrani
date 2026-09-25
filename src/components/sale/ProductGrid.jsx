import { saleBtn } from './ui/SaleModal';

export default function ProductGrid({
  rootCategories,
  subCategories,
  products,
  activeParentId,
  activeCategoryId,
  onParentClick,
  onSubCategoryClick,
  onProductClick,
  onOpenAdditions,
  onCreateNewAddition,
  onEditAddition,
  variantGroups,
  bundleGroups,
  tableInfo,
}) {
  const hasTable = Boolean(tableInfo?.name);
  const showSubCategories = subCategories.length > 0;

  const renderCategoryPill = (cat, isActive) => (
    <button
      key={cat.id}
      type="button"
      onClick={() => onParentClick(cat.id)}
      className={saleBtn.pill(isActive)}
    >
      {cat.name}
    </button>
  );

  return (
    <div className="sale-win11-product-grid-wrap p-3 sm:p-4">
      <header className="mb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white sm:text-3xl" />
        {!hasTable && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEditAddition}
              className={`${saleBtn.action('edit')}`}
              title="Adisyon düzenle"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="hidden sm:inline">Düzenle</span>
            </button>
            <button
              type="button"
              onClick={onOpenAdditions}
              className={saleBtn.action('secondary')}
            >
              Açık Adisyonlar
            </button>
            <button
              type="button"
              onClick={onCreateNewAddition}
              className={`${saleBtn.action('round')}`}
            >
              +
            </button>
          </div>
        )}
      </header>

      <div className="mb-3 overflow-x-auto pb-1 scrollbar-hide">
        <div className="flex flex-wrap gap-2">
          {rootCategories.map((cat) => {
            const isActive = showSubCategories
              ? activeParentId === cat.id
              : activeCategoryId === cat.id;
            return renderCategoryPill(cat, isActive);
          })}
        </div>
      </div>

      {showSubCategories && (
        <div className="mb-3 flex gap-1.5 overflow-x-auto sale-subcat-rail pb-1 pl-3">
          {subCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSubCategoryClick(cat.id)}
              className={saleBtn.pill(activeCategoryId === cat.id && activeCategoryId !== activeParentId)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <div className="rounded-lg border border-[var(--sale-border)] bg-[var(--sale-surface)] py-16 text-center">
          <p className="text-[var(--sale-fg-subtle)]">Bu kategoride ürün bulunmuyor.</p>
        </div>
      ) : (
        <div className="sale-win11-product-grid">
          {products.map((prod) => {
            const hasVariants = variantGroups?.some((vg) => vg.product_id === prod.id);
            const isBundle = prod.is_bundle === 1 || prod.is_bundle === '1' || prod.is_bundle === true
              || bundleGroups?.some((bg) => Number(bg.product_id) === Number(prod.id));
            return (
              <div
                key={prod.id}
                onClick={() => onProductClick(prod)}
                className={`sale-win11-product sale-win11-product-compact product-item cursor-pointer${isBundle ? ' sale-win11-product--menu' : ' relative'}`}
              >
                {isBundle && (
                  <span className="sale-win11-product-badge sale-win11-product-badge-menu">Menü</span>
                )}
                {hasVariants && !isBundle && (
                  <span className="sale-win11-product-badge sale-win11-product-badge-variant" aria-hidden />
                )}
                <h3 className="sale-win11-product-name">{prod.name}</h3>
                <p className="sale-win11-product-price">
                  {prod.sell_price}
                  {' '}
                  ₺
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
