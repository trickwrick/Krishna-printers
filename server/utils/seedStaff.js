import Role from '../models/Role.js';
import User from '../models/User.js';
import { fullPermissions, managerPermissions, staffPermissions } from './permissionDefaults.js';

export async function seedStaffAndRoles() {
  const roleDefs = [
    { name: 'Admin', description: 'Full access to all modules', isSystem: true, permissions: fullPermissions() },
    { name: 'Manager', description: 'Manage daily operations without staff/settings delete', isSystem: true, permissions: managerPermissions() },
    { name: 'Staff', description: 'Limited access for daily data entry', isSystem: true, permissions: staffPermissions() },
  ];

  const roles = {};
  for (const def of roleDefs) {
    let role = await Role.findOne({ name: def.name });
    if (!role) {
      role = await Role.create(def);
    } else if (!role.isSystem) {
      role.isSystem = def.isSystem;
      role.description = def.description;
      await role.save();
    }
    roles[def.name] = role;
  }

  const adminEmail = 'krishna.printers@gmail.com';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: 'Admin',
      email: adminEmail,
      password: 'KP#Trickwrick@2026',
      team: 'Management',
      roleId: roles.Admin._id,
      roleName: 'Admin',
      isActive: true,
    });
  } else {
    let changed = false;
    if (!admin.roleId) {
      admin.roleId = roles.Admin._id;
      admin.roleName = 'Admin';
      changed = true;
    }
    if (admin.isActive === undefined || admin.isActive === false) {
      admin.isActive = true;
      changed = true;
    }
    if (changed) await admin.save();
  }

  return { roles, admin };
}
