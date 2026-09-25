export function normalizeParentId(parentId) {
  if (parentId == null || parentId === 0 || parentId === '0') return null;
  return Number(parentId);
}

export function sortCategories(list) {
  return [...list].sort((a, b) => {
    const sortA = Number(a.sort) || 0;
    const sortB = Number(b.sort) || 0;
    if (sortA !== sortB) return sortA - sortB;
    return Number(a.id) - Number(b.id);
  });
}

export function getRootCategories(categories) {
  return sortCategories(categories.filter((c) => normalizeParentId(c.parent_id) == null));
}

export function getChildCategories(categories, parentId) {
  const pid = Number(parentId);
  return sortCategories(categories.filter((c) => Number(c.parent_id) === pid));
}

export function hasChildren(categories, categoryId) {
  return getChildCategories(categories, categoryId).length > 0;
}

export function getDescendantCategoryIds(categories, categoryId) {
  const ids = [Number(categoryId)];
  for (const child of getChildCategories(categories, categoryId)) {
    ids.push(...getDescendantCategoryIds(categories, child.id));
  }
  return ids;
}

function compareProducts(a, b) {
  const sortA = a.sort ?? 0;
  const sortB = b.sort ?? 0;
  if (sortA !== sortB) return sortA - sortB;
  return Number(a.id) - Number(b.id);
}

function sortProductsByCategoryTree(products, categories, rootCategoryId) {
  const order = getDescendantCategoryIds(categories, rootCategoryId);
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...products].sort((a, b) => {
    const catA = rank.get(Number(a.category_id)) ?? Number.MAX_SAFE_INTEGER;
    const catB = rank.get(Number(b.category_id)) ?? Number.MAX_SAFE_INTEGER;
    if (catA !== catB) return catA - catB;
    return compareProducts(a, b);
  });
}

export function getProductsForCategory(products, categories, categoryId, activeParentId = null) {
  if (categoryId == null) return [];

  const isParentWithUnselectedChildren = activeParentId != null
    && Number(activeParentId) === Number(categoryId)
    && hasChildren(categories, categoryId);

  if (isParentWithUnselectedChildren) {
    const categoryIds = new Set(getDescendantCategoryIds(categories, categoryId));
    const matched = products.filter((p) => categoryIds.has(Number(p.category_id)));
    return sortProductsByCategoryTree(matched, categories, categoryId);
  }

  return products
    .filter((p) => Number(p.category_id) === Number(categoryId))
    .sort(compareProducts);
}

export function resolveInitialSelection(categories) {
  const roots = getRootCategories(categories);
  if (!roots.length) return { parentId: null, categoryId: null };

  const firstRoot = roots[0];
  const children = getChildCategories(categories, firstRoot.id);
  if (children.length > 0) {
    return { parentId: firstRoot.id, categoryId: firstRoot.id };
  }

  return { parentId: null, categoryId: firstRoot.id };
}

export function getCategoryLabel(categories, categoryId) {
  const cat = categories.find((c) => Number(c.id) === Number(categoryId));
  if (!cat) return '';
  const parentId = normalizeParentId(cat.parent_id);
  if (!parentId) return cat.name;
  const parent = categories.find((c) => Number(c.id) === parentId);
  return parent ? `${parent.name} › ${cat.name}` : cat.name;
}

export function getAssignableCategories(categories) {
  return sortCategories(categories);
}
