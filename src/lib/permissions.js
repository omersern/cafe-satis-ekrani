/** Role-based permissions for cafe staff. */

export const ADDITION_PERMISSIONS = {
  DISCOUNT: 'addition.discount',
};

export const PERMS = {
  VIEW_METRO: 'view_metro',
  MANAGE_COMPUTERS: 'manage_computers',
  OPEN_SESSION: 'open_session',
  CLOSE_SESSION: 'close_session',
  SELL_PRODUCTS: 'sell_products',
  VIEW_REPORTS: 'view_reports',
  MANAGE_MEMBERS: 'manage_members',
  MANAGE_TARIFFS: 'manage_tariffs',
  MANAGE_PRODUCTS: 'manage_products',
  SEND_MESSAGES: 'send_messages',
  DAY_OPEN: 'day_open',
  DAY_CLOSE: 'day_close',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_STAFF: 'manage_staff',
  VIEW_RESERVATIONS: 'view_reservations',
  MANAGE_RESERVATIONS: 'manage_reservations',
};

const ADMIN = new Set(Object.values(PERMS));

const CASHIER = new Set([
  PERMS.VIEW_METRO,
  PERMS.MANAGE_COMPUTERS,
  PERMS.OPEN_SESSION,
  PERMS.CLOSE_SESSION,
  PERMS.SELL_PRODUCTS,
  PERMS.VIEW_REPORTS,
  PERMS.MANAGE_MEMBERS,
  PERMS.MANAGE_PRODUCTS,
  PERMS.SEND_MESSAGES,
  PERMS.DAY_OPEN,
  PERMS.VIEW_RESERVATIONS,
]);

const ADMIN_EXTRA = new Set([
  ADDITION_PERMISSIONS.DISCOUNT,
  PERMS.DAY_CLOSE,
  PERMS.MANAGE_TARIFFS,
  PERMS.MANAGE_SETTINGS,
  PERMS.MANAGE_STAFF,
  PERMS.MANAGE_RESERVATIONS,
]);

export function permissionsForRole(role) {
  if (role === 'admin') return new Set([...ADMIN, ...ADMIN_EXTRA]);
  return CASHIER;
}

export function hasPermission(staff, perm) {
  if (!staff) return false;
  return permissionsForRole(staff.role).has(perm);
}
