/**
 * PERMISSION REGISTRY
 * -------------------
 * Every permission string used anywhere in IN-Track is defined here.
 * Controllers reference these constants (never raw strings) so a typo can't
 * silently create a permission that doesn't match what a role actually grants.
 *
 * Naming convention: <module>:<action>
 */
const PERMISSIONS = {
  // Team / RBAC management
  TEAM_INVITE: 'team:invite',
  TEAM_REMOVE: 'team:remove',
  TEAM_VIEW: 'team:view',
  ROLE_CREATE: 'role:create',
  ROLE_EDIT: 'role:edit',
  ROLE_DELETE: 'role:delete',
  ROLE_VIEW: 'role:view',

  // Inventory (used by later modules, defined now so roles can reference them)
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_CREATE: 'inventory:create',
  INVENTORY_EDIT: 'inventory:edit',
  INVENTORY_DELETE: 'inventory:delete',

  // Warehouses / physical locations (Part 1.4). Stock BALANCES held at a
  // location are governed by the INVENTORY_* permissions above (they're
  // inventory data); these WAREHOUSE_* permissions gate the structural
  // side -- creating/renaming/removing the buildings, shelves, and bins
  // themselves.
  WAREHOUSE_VIEW: 'warehouse:view',
  WAREHOUSE_CREATE: 'warehouse:create',
  WAREHOUSE_EDIT: 'warehouse:edit',
  WAREHOUSE_DELETE: 'warehouse:delete',

  // Purchase orders
  PO_VIEW: 'po:view',
  PO_CREATE: 'po:create',
  PO_APPROVE: 'po:approve',

  // Manufacturing
  MANUFACTURING_LOG: 'manufacturing:log',
  RECIPE_MANAGE: 'recipe:manage',

  // Financial
  FINANCE_VIEW: 'finance:view',
  FINANCE_MANAGE: 'finance:manage',

  // Reports/exports
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export'
};

// The wildcard permission — reserved exclusively for the auto-created Owner
// role. Every other role (including "Admin"-style custom roles) must be
// given an explicit list; nothing else may hold '*'.
const WILDCARD = '*';

// A few sensible starting templates a company owner can pick from when
// creating their first custom roles, rather than starting from a blank list.
const ROLE_TEMPLATES = {
  'Warehouse Manager': [
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_CREATE,
    PERMISSIONS.INVENTORY_EDIT,
    PERMISSIONS.WAREHOUSE_VIEW,
    PERMISSIONS.WAREHOUSE_CREATE,
    PERMISSIONS.WAREHOUSE_EDIT,
    PERMISSIONS.PO_VIEW,
    PERMISSIONS.PO_CREATE,
    PERMISSIONS.PO_APPROVE,
    PERMISSIONS.REPORTS_VIEW
  ],
  'Factory Floor Worker': [
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.WAREHOUSE_VIEW,
    PERMISSIONS.MANUFACTURING_LOG
  ],
  'Read-Only Auditor': [
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.WAREHOUSE_VIEW,
    PERMISSIONS.PO_VIEW,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.REPORTS_VIEW
  ]
};

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

module.exports = { PERMISSIONS, WILDCARD, ROLE_TEMPLATES, ALL_PERMISSIONS };
