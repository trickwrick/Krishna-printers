export const MODULES = [
  { key: 'jobCard', label: 'Job Card' },
  { key: 'invoice', label: 'Invoice' },
  { key: 'challan', label: 'Challan' },
  { key: 'payments', label: 'Payments' },
  { key: 'paperStock', label: 'Paper Stock' },
  { key: 'statements', label: 'Statements' },
  { key: 'estimates', label: 'Estimates' },
  { key: 'itemList', label: 'Item List' },
  { key: 'settings', label: 'Settings' },
  { key: 'staffTeam', label: 'Staff & Team' },
];

export const ACTIONS = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'print', label: 'Print' },
];

export const emptyPermissions = () => {
  const permissions = {};
  MODULES.forEach(({ key }) => {
    permissions[key] = { view: false, create: false, edit: false, delete: false, print: false };
  });
  return permissions;
};

export const fullPermissions = () => {
  const permissions = emptyPermissions();
  MODULES.forEach(({ key }) => {
    ACTIONS.forEach(({ key: action }) => {
      permissions[key][action] = true;
    });
  });
  return permissions;
};

let _cachedUserRaw;
let _cachedUserObj = null;

export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem('currentUser');
    if (raw === _cachedUserRaw) return _cachedUserObj;
    _cachedUserRaw = raw;
    _cachedUserObj = raw ? JSON.parse(raw) : null;
    return _cachedUserObj;
  } catch {
    return null;
  }
};

export const hasPermission = (moduleKey, action = 'view') => {
  const user = getCurrentUser();
  if (!user) return true;
  if (moduleKey === 'dashboard') return user.roleName === 'Admin';
  if (user.roleName === 'Admin') return true;
  return !!user.permissions?.[moduleKey]?.[action];
};

export const canAccessDashboard = () => hasPermission('dashboard', 'view');

export const isAdminUser = () => {
  const user = getCurrentUser();
  return !user || user.roleName === 'Admin';
};

export const getDefaultRoute = () => {
  if (canAccessDashboard()) return '/';
  if (hasPermission('jobCard', 'view')) return '/job-card-list';
  if (hasPermission('invoice', 'view')) return '/invoice/list';
  if (hasPermission('challan', 'view')) return '/challan/list';
  if (hasPermission('payments', 'view')) return '/payment-type';
  if (hasPermission('paperStock', 'view')) return '/paper-stock';
  if (hasPermission('statements', 'view')) return '/statements/invoice';
  if (hasPermission('estimates', 'view')) return '/estimates';
  return '/contact-support';
};

export const canAccessStaffTeam = () => hasPermission('staffTeam', 'view');
export const canManageStaff = () => hasPermission('staffTeam', 'edit') || hasPermission('staffTeam', 'create');
