import { fullPermissions, getCurrentUser } from './permissions';

export const saveSession = (user) => {
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('currentUser', JSON.stringify(user));
};

export const preserveSession = () => {
  const user = getCurrentUser();
  if (user) {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('currentUser', JSON.stringify(user));
  }
};

export const clearSession = () => {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('currentUser');
};

export const getLegacyAdminUser = () => ({
  id: 'local-admin',
  name: 'Admin',
  email: 'krishna@gmail.com',
  roleName: 'Admin',
  team: 'Management',
  permissions: fullPermissions(),
});

export const tryLegacyLogin = (email, password) => {
  const storedAdmin = JSON.parse(localStorage.getItem('adminAuth') || 'null');
  const fallback = storedAdmin || { email: 'krishna@gmail.com', password: 'krishna@123' };
  if (email === fallback.email && password === fallback.password) {
    const user = getLegacyAdminUser();
    saveSession(user);
    return user;
  }
  return null;
};
