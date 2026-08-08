import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  Bell,
  UserCircle,
  LayoutDashboard,
  Briefcase,
  FileText,
  Truck,
  Wallet,
  Layers,
  FileLock,
  ChevronDown,
  List,
  PlusSquare,
  Calculator,
  Settings,
  ChevronRight,
  Building,
  Menu as MenuIcon,
  X as CloseIcon,
  LogOut,
  Headphones,
  Users,
  BarChart,
  Database,
  Calendar,
} from 'lucide-react';
import Dashboard from './Dashboard';
import JobCardForm from './JobCardForm';
import JobCardListing from './JobCardListing';
import AddInvoice from './AddInvoice';
import InvoiceList from './InvoiceList';
import AddChallan from './AddChallan';
import ChallanList from './ChallanList';
import Login from './Login';
import SettingsPage from './Settings';
import SiteSettings from './SiteSettings';
import SocialSettings from './SocialSettings';
import PaymentTypeManagement from './PaymentTypeManagement';
import PaperStockManagement from './PaperStockManagement';
import PlateStockManagement from './PlateStockManagement';
import Statements from './Statements';
import PaperStockStatements from './PaperStockStatements';
import PlateStockStatements from './PlateStockStatements';
import Estimates from './Estimates';
import AddEstimate from './AddEstimate';
import ItemListManagement from './ItemListManagement';
import ContactSupport from './ContactSupport';
import Report from './Report';
import StaffTeamManagement from './StaffTeamManagement';
import { clearSession, saveSession, getLegacyAdminUser } from './utils/authSession';
import { hasPermission, canAccessStaffTeam, canAccessDashboard, getDefaultRoute, isAdminUser } from './utils/permissions';
import { STAFF_TEAM_ENABLED } from './utils/featureFlags';
import { API_BASE_URL } from './utils/apiBase';

const DEFAULT_SITE_TITLE = 'Krishna Printers';

const DropdownMenu = ({ title, icon: Icon, items, isActive }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveSubMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      className="relative"
      ref={dropdownRef}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 xl:px-2.5 2xl:px-3 h-9 text-[13px] font-medium rounded-md transition-colors whitespace-nowrap flex-nowrap shrink-0 ${isOpen || isActive
          ? 'bg-blue-50 text-blue-600'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
      >
        <Icon size={16} className="shrink-0" />
        <span className="leading-none whitespace-nowrap">{title}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : 'text-gray-400'}`}
        />
      </button>

      <div
        className={`absolute top-full left-0 w-max transition-all duration-200 ease-out z-100 ${isOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-2 invisible pointer-events-none'}`}
      >
        {/* Transparent bridge to prevent flickering */}
        <div className="h-2 w-full" />

        <div className="min-w-55 bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_-4px_rgba(0,0,0,0.15)] p-2 space-y-1">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="relative group/sub"
              onMouseEnter={() => item.isSubDropdown && setActiveSubMenu(idx)}
              onMouseLeave={() => item.isSubDropdown && setActiveSubMenu(null)}
            >
              <button
                onClick={() => {
                  if (item.isSubDropdown) {
                    setActiveSubMenu(activeSubMenu === idx ? null : idx);
                  } else if (item.onClick) {
                    item.onClick();
                    setIsOpen(false);
                  }
                }}
                className={`flex items-center justify-between w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors group ${activeSubMenu === idx ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                  }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon && <item.icon size={16} className={`${activeSubMenu === idx ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'} transition-colors`} />}
                  <span className="font-semibold">{item.label}</span>
                </div>
                {item.isSubDropdown ? (
                  <ChevronRight size={14} className={`${activeSubMenu === idx ? 'text-blue-600 rotate-90 scale-110' : 'text-gray-400 group-hover:text-blue-600'} transition-all`} />
                ) : (
                  item.rightIcon && <item.rightIcon size={14} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                )}
              </button>

              {/* Submenu rendering */}
              {item.isSubDropdown && (activeSubMenu === idx) && (
                <div className="absolute lg:right-[calc(100%-8px)] lg:left-auto lg:top-0 left-0 top-full mt-1 min-w-45 bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_-4px_rgba(0,0,0,0.15)] p-2 space-y-1 z-60 animate-in fade-in slide-in-from-right-2 duration-200">
                  {item.subItems.map((sub, sidx) => (
                    <button
                      key={sidx}
                      onClick={() => {
                        sub.onClick();
                        setIsOpen(false);
                        setActiveSubMenu(null);
                      }}
                      className="flex items-center w-full px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors"
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ProfileMenu = ({ settingsItems, staffTeamItems, showStaffTeam, location, onContactSupport, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStaffOpen, setIsStaffOpen] = useState(false);
  const menuRef = useRef(null);
  const closeTimerRef = useRef(null);

  const isSettingsActive = location.pathname.startsWith('/settings');
  const isStaffActive = location.pathname.startsWith('/staff-team');

  const closeSubmenus = () => {
    setIsSettingsOpen(false);
    setIsStaffOpen(false);
  };

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openMenu = () => {
    clearCloseTimer();
    setIsOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      closeSubmenus();
    }, 280);
  };

  const closeAll = () => {
    clearCloseTimer();
    setIsOpen(false);
    closeSubmenus();
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        closeAll();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearCloseTimer();
    };
  }, []);

  const renderFlyout = (config) => {
    const {
      isSubOpen,
      setSubOpen,
      otherClose,
      isActive,
      icon: Icon,
      label,
      items,
    } = config;

    return (
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            clearCloseTimer();
            openMenu();
            otherClose();
            setSubOpen((prev) => !prev);
          }}
          className={`flex items-center justify-between w-full px-3 py-2.5 text-sm rounded-lg transition-colors ${
            isSubOpen || isActive
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <Icon size={16} className={isSubOpen || isActive ? 'text-blue-600' : 'text-gray-400'} />
            <span className="font-semibold">{label}</span>
          </div>
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${
              isSubOpen ? 'text-blue-600 rotate-180' : 'text-gray-400'
            }`}
          />
        </button>

        {isSubOpen && (
          <>
            <div className="absolute right-full top-0 w-3 h-full" aria-hidden />
            <div
              className="absolute right-[calc(100%+10px)] top-0 min-w-52.5 bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_-4px_rgba(0,0,0,0.15)] p-2 space-y-1 z-70"
              onMouseEnter={() => {
                clearCloseTimer();
                openMenu();
                setSubOpen(true);
              }}
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    item.onClick();
                    closeAll();
                  }}
                  className={`flex items-center w-full px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div
      ref={menuRef}
      className="flex items-center gap-2 bg-gray-50 pl-2 pr-3 py-1.5 rounded-full border border-gray-200 cursor-pointer hover:bg-gray-100 transition relative"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className="flex items-center"
        onClick={() => {
          clearCloseTimer();
          setIsOpen((prev) => {
            if (prev) closeSubmenus();
            return !prev;
          });
        }}
        aria-label="Profile menu"
      >
        <UserCircle size={24} className="text-blue-600" />
      </button>

      <div
        className={`absolute top-full right-0 w-55 z-60 transition-opacity duration-150 ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
      >
        <div className="pt-2">
          <div className="bg-white border border-gray-100 rounded-xl shadow-2xl p-2 space-y-1">
            {renderFlyout({
              isSubOpen: isSettingsOpen,
              setSubOpen: setIsSettingsOpen,
              otherClose: () => setIsStaffOpen(false),
              isActive: isSettingsActive,
              icon: Settings,
              label: 'Settings',
              items: settingsItems,
            })}

            {showStaffTeam && renderFlyout({
              isSubOpen: isStaffOpen,
              setSubOpen: setIsStaffOpen,
              otherClose: () => setIsSettingsOpen(false),
              isActive: isStaffActive,
              icon: Users,
              label: 'Staff & Team',
              items: staffTeamItems,
            })}

            <button
              type="button"
              onClick={() => {
                onContactSupport();
                closeAll();
              }}
              className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg transition-colors ${
                location.pathname === '/contact-support'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <Headphones size={16} className={location.pathname === '/contact-support' ? 'text-blue-600' : 'text-gray-400'} />
              <span className="font-semibold">Contact &amp; Support</span>
            </button>

            <div className="border-t border-gray-100 my-1" />

            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);

  // Auth Protection
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  // Site Settings Integration
  const [siteSettings, setSiteSettings] = useState(() => {
    const defaultSettings = {
      siteTitle: DEFAULT_SITE_TITLE,
      logo: '/logo.png',
      whiteLogo: '/logo.png',
      favicon: '/logo.png'
    };
    const saved = localStorage.getItem('siteSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        siteTitle: DEFAULT_SITE_TITLE,
        logo: parsed.logo || defaultSettings.logo,
        whiteLogo: parsed.whiteLogo || defaultSettings.whiteLogo,
        favicon: parsed.favicon || defaultSettings.favicon
      };
    }
    return defaultSettings;
  });

  useEffect(() => {
    if (localStorage.getItem('isLoggedIn') === 'true' && !localStorage.getItem('currentUser')) {
      saveSession(getLegacyAdminUser());
    }
  }, []);

  useEffect(() => {
    // Update Document Title
    document.title = siteSettings.siteTitle || DEFAULT_SITE_TITLE;

    // Update Favicon
    if (siteSettings.favicon) {
      const link = document.querySelector("link[rel~='icon']");
      if (link) {
        link.href = siteSettings.favicon;
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = siteSettings.favicon;
        document.getElementsByTagName('head')[0].appendChild(newLink);
      }
    }

    // Listen for manual updates from the settings page
    const handleSettingsUpdate = () => {
      const saved = localStorage.getItem('siteSettings');
      if (saved) setSiteSettings(JSON.parse(saved));
    };

    window.addEventListener('siteSettingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('siteSettingsUpdated', handleSettingsUpdate);
  }, [siteSettings]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // If not logged in, only show Login page
  if (!isLoggedIn) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  // If logged in and on /login, redirect to default home
  if (isLoggedIn && location.pathname === '/login') {
    return <Routes><Route path="*" element={<Navigate to={getDefaultRoute()} replace />} /></Routes>;
  }

  const allNavigationItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    {
      name: 'Job Card',
      icon: Briefcase,
      path: '/job-card-list',
      matchPath: '/job-card',
    },
    {
      name: 'Invoices',
      icon: FileText,
      hidden: true,
      isDropdown: true,
      dropdownItems: [
        { label: 'Invoice Listings', icon: List, onClick: () => navigate('/invoice/list') },
        { label: 'Add New', icon: PlusSquare, onClick: () => navigate('/invoice/add') },
      ],
    },
    {
      name: 'Challan',
      icon: Truck,
      isDropdown: true,
      dropdownItems: [
        { label: 'Challan Listings', icon: List, onClick: () => navigate('/challan/list') },
        { label: 'Add New', icon: PlusSquare, onClick: () => navigate('/challan/add') },
      ],
    },
    { name: 'Payments', icon: Wallet, path: '/payment-type' },
    {
      name: 'Stock',
      icon: Layers,
      isDropdown: true,
      dropdownItems: [
        { label: 'Paper Stock', icon: Layers, onClick: () => navigate('/paper-stock') },
        { label: 'Plate Stock', icon: Database, onClick: () => navigate('/plate-stock') },
      ],
    },
    {
      name: 'Statements',
      icon: FileLock,
      isDropdown: true,
      dropdownItems: [
        { label: 'Paper Stock Statements', icon: Layers, onClick: () => navigate('/statements/paper-stock') },
        { label: 'Plate Stock Statements', icon: Database, onClick: () => navigate('/statements/plate-stock') },
      ],
    },
    {
      name: 'Estimate & Quotation',
      icon: Calculator,
      isDropdown: true,
      dropdownItems: [
        { label: 'Listing', icon: List, onClick: () => navigate('/estimates') },
        { label: 'Add New', icon: PlusSquare, onClick: () => navigate('/estimates/add') },
      ],
    },
    {
      name: 'Report',
      icon: BarChart,
      isDropdown: true,
      dropdownItems: [
        { label: 'Job Card Report', icon: FileText, onClick: () => navigate('/report?type=job-card') },
        { label: 'Daily Work Report', icon: Calendar, onClick: () => navigate('/report?type=daily-work') },
      ],
    },
  ];

  const navigationItems = allNavigationItems.filter((item) => {
    if (item.hidden) return false;
    if (item.name === 'Dashboard') return canAccessDashboard();
    const moduleByName = {
      'Job Card': 'jobCard',
      Invoices: 'invoice',
      Challan: 'challan',
      Payments: 'payments',
      'Stock': 'paperStock',
      Statements: 'statements',
      'Estimate & Quotation': 'estimates',
      'Report': 'report',
    };
    if (item.isDropdown && item.dropdownItems.length === 0) return false;
    const moduleKey = moduleByName[item.name];
    return !moduleKey || hasPermission(moduleKey, 'view');
  });

  const moduleByNavName = {
    'Job Card': 'jobCard',
    Invoices: 'invoice',
    Challan: 'challan',
    Payments: 'payments',
    'Stock': 'paperStock',
    Statements: 'statements',
    'Estimate & Quotation': 'estimates',
    'Report': 'report',
  };

  const displayNavigationItems = isAdminUser()
    ? navigationItems
    : navigationItems.flatMap((item) => {
        if (!item.isDropdown) return [item];
        const moduleKey = moduleByNavName[item.name];
        return item.dropdownItems
          .filter((sub) => {
            const isAddAction = /add new|add /i.test(sub.label);
            if (isAddAction && moduleKey) return hasPermission(moduleKey, 'create');
            return true;
          })
          .map((sub) => ({
            name: sub.label,
            icon: sub.icon || item.icon,
            onClick: sub.onClick,
            matchPath: item.name === 'Estimate & Quotation' && sub.label === 'Add New'
              ? '/estimates/add'
              : item.name === 'Estimate & Quotation'
              ? '/estimates'
              : sub.label.includes('Job Card Report') ? '/report?type=job-card'
              : sub.label.includes('Daily Work Report') ? '/report?type=daily-work'
              : sub.label.includes('Job Card') ? '/job-card'
              : sub.label.includes('Invoice') ? '/invoice'
              : sub.label.includes('Challan') ? '/challan'
              : sub.label.includes('Paper Stock') ? '/statements/paper-stock'
              : sub.label.includes('Statements') ? '/statements'
              : '',
          }));
      });

  const profileSettingsItems = [
    { label: 'Change Password', path: '/settings/password', onClick: () => navigate('/settings/password') },
    { label: 'Recycle Bin', path: '/settings/recycle-bin', onClick: () => navigate('/settings/recycle-bin') },
  ];

  const staffTeamItems = [
    { label: 'Manage Staff & Teams', path: '/staff-team/manage', onClick: () => navigate('/staff-team/manage') },
    { label: 'Roles', path: '/staff-team/roles', onClick: () => navigate('/staff-team/roles') },
    { label: 'Permissions', path: '/staff-team/permissions', onClick: () => navigate('/staff-team/permissions') },
  ];

  const showStaffTeamMenu = STAFF_TEAM_ENABLED && canAccessStaffTeam();

  const handleLogout = () => {
    clearSession();
    navigate('/login');
    window.location.reload();
  };

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications`);
      const data = res.ok ? await res.json() : [];
      const notificationList = Array.isArray(data) ? data : [];
      setNotifications(notificationList);
      setUnreadCount(notificationList.filter(n => !n.isRead).length);
    } catch (err) {
      console.error("Notif Error:", err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 5000); // Polling every 5s for real-time feel

      const handleCustomFetch = () => fetchNotifications();
      window.addEventListener('fetchNotifications', handleCustomFetch);

      return () => {
        clearInterval(interval);
        window.removeEventListener('fetchNotifications', handleCustomFetch);
      };
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/notifications/read-all`, { method: 'PUT' });
      fetchNotifications();
    } catch (err) {
      console.error("Read Error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fa] font-sans pb-10 text-gray-800 overflow-x-clip">
      {/* Top Navbar */}
      <nav className="w-full bg-white border-b border-gray-200 px-1.5 sm:px-2 py-2.5 flex items-center gap-1.5 sm:gap-2 sticky top-0 z-50">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="xl:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            {isMobileMenuOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
          </button>

          <div className="flex items-center gap-2 text-xl font-bold text-gray-900 tracking-tight">
            {siteSettings.logo ? (
              <img src={siteSettings.logo} alt="Site Logo" className="h-8 w-auto object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white shrink-0">
                <Building size={20} />
              </div>
            )}
            <span className="truncate hidden sm:block">
              {(!siteSettings.siteTitle || siteSettings.siteTitle === DEFAULT_SITE_TITLE) ? (
                <>
                  <span className="text-[#111827] font-black">Krishna</span>{' '}
                  <span className="text-[rgb(25,199,191)] font-black">Printers</span>
                </>
              ) : (
                siteSettings.siteTitle
              )}
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden xl:flex flex-1 min-w-0 items-center justify-center gap-1 xl:gap-1.5 2xl:gap-2.5 whitespace-nowrap flex-nowrap">
          {displayNavigationItems.map((item, idx) => {
            const isActive = item.matchPath
              ? location.pathname.includes(item.matchPath)
              : location.pathname === item.path || (item.path && location.pathname.startsWith(item.path) && item.path !== '/');

            if (item.isDropdown) {
              return (
                <DropdownMenu
                  key={item.name}
                  title={item.name}
                  icon={item.icon}
                  items={item.dropdownItems}
                  isActive={
                    (item.name === 'Job Card' && location.pathname.includes('/job-card')) ||
                    (item.name === 'Invoices' && location.pathname.includes('/invoice')) ||
                    (item.name === 'Challan' && location.pathname.includes('/challan')) ||
                    (item.name === 'Statements' && location.pathname.includes('/statements')) ||
                    (item.name === 'Estimate & Quotation' && location.pathname.includes('/estimates')) ||
                    (item.name === 'Report' && location.pathname.includes('/report'))
                  }
                />
              );
            }

            return (
              <button
                key={item.name}
                onClick={() => {
                  if (item.onClick) item.onClick();
                  else if (item.path) navigate(item.path);
                }}
                className={`flex items-center gap-1.5 px-2 xl:px-2.5 2xl:px-3 h-9 text-[13px] font-medium rounded-md transition-colors whitespace-nowrap flex-nowrap shrink-0 ${isActive || (idx === 0 && location.pathname === '/' && isAdminUser())
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <item.icon size={16} className="shrink-0" />
                <span className="leading-none whitespace-nowrap">{item.name}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-auto">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="text-gray-500 hover:text-gray-700 transition p-2 relative flex items-center justify-center"
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] h-4 min-w-4 flex items-center justify-center font-bold px-1 rounded-full border-2 border-white z-10 shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute top-full right-0 mt-3 w-80 bg-white border border-gray-100 rounded-2xl shadow-2xl z-60 overflow-hidden transform animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">Notifications</h3>
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto pl-1 pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 italic text-sm">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer relative ${!n.isRead ? 'bg-blue-50/30' : ''}`}
                      >
                        {!n.isRead && <div className="absolute top-4 right-4 w-2 h-2 bg-blue-600 rounded-full" />}
                        <p className={`text-sm ${!n.isRead ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                          {n.message}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1 font-medium">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <ProfileMenu
            settingsItems={profileSettingsItems}
            staffTeamItems={staffTeamItems}
            showStaffTeam={showStaffTeamMenu}
            location={location}
            onContactSupport={() => navigate('/contact-support')}
            onLogout={handleLogout}
          />
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      <div
        className={`fixed inset-0 bg-black/50 z-55 transition-opacity duration-300 xl:hidden ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
          }`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <div
          className={`absolute left-0 top-0 h-full w-72 bg-white shadow-2xl transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xl font-bold text-gray-900">Menu</span>
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-gray-600">
              <CloseIcon size={24} />
            </button>
          </div>
          <div className="p-4 overflow-y-auto h-[calc(100%-80px)]">
            <div className="space-y-2">
              {displayNavigationItems.map((item) => (
                <div key={item.name}>
                  {item.isDropdown ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-3 px-4 py-2 text-sm font-bold text-gray-400 uppercase tracking-wider mt-4 first:mt-0">
                        {item.name}
                      </div>
                      {item.dropdownItems.map((subItem) => (
                        <div key={subItem.label}>
                          {subItem.isSubDropdown ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider mt-2 first:mt-0 ml-4">
                                {subItem.label}
                              </div>
                              {subItem.subItems.map((ss) => (
                                <button
                                  key={ss.label}
                                  onClick={() => {
                                    if (ss.onClick) ss.onClick();
                                    setIsMobileMenuOpen(false);
                                  }}
                                  className="flex items-center gap-3 w-[calc(100%-1.5rem)] ml-6 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition"
                                >
                                  {ss.label}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                if (subItem.onClick) subItem.onClick();
                                setIsMobileMenuOpen(false);
                              }}
                              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition"
                            >
                              {subItem.icon && <subItem.icon size={18} />}
                              {subItem.label}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (item.onClick) item.onClick();
                        else if (item.path) navigate(item.path);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold rounded-xl transition ${
                        (item.matchPath && location.pathname.includes(item.matchPath))
                        || location.pathname === item.path
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon size={18} />
                      {item.name}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 space-y-1">
              <button
                type="button"
                onClick={() => setIsMobileSettingsOpen((prev) => !prev)}
                className={`flex items-center justify-between w-full px-4 py-2.5 text-sm rounded-xl transition ${
                  isMobileSettingsOpen || location.pathname.startsWith('/settings')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Settings size={16} className={isMobileSettingsOpen ? 'text-blue-600' : 'text-gray-400'} />
                  <span className="font-semibold">Settings</span>
                </div>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${
                    isMobileSettingsOpen ? 'text-blue-600 rotate-180' : 'text-gray-400'
                  }`}
                />
              </button>
              {isMobileSettingsOpen && profileSettingsItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    item.onClick();
                    setIsMobileMenuOpen(false);
                    setIsMobileSettingsOpen(false);
                  }}
                  className={`flex items-center gap-3 w-[calc(100%-1.5rem)] ml-6 px-4 py-2.5 text-sm font-semibold rounded-xl transition ${
                    location.pathname === item.path
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {showStaffTeamMenu && (
                <>
                  <div className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider mt-3">
                    <Users size={14} />
                    Staff &amp; Team
                  </div>
                  {staffTeamItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        item.onClick();
                        setIsMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 w-[calc(100%-1.5rem)] ml-6 px-4 py-2.5 text-sm font-semibold rounded-xl transition ${
                        location.pathname === item.path
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </>
              )}
              <button
                onClick={() => {
                  navigate('/contact-support');
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold rounded-xl transition ${
                  location.pathname === '/contact-support'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Headphones size={18} />
                Contact &amp; Support
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition mt-2"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Routing Content */}
        <Routes>
          <Route path="/" element={canAccessDashboard() ? <Dashboard /> : <Navigate to={getDefaultRoute()} replace />} />
          <Route path="/job-card" element={<JobCardForm />} />
          <Route path="/job-card-list" element={<JobCardListing />} />
          <Route path="/invoice/add" element={<AddInvoice />} />
          <Route path="/invoice/list" element={<InvoiceList />} />
          <Route path="/challan/add" element={<AddChallan />} />
          <Route path="/challan/list" element={<ChallanList />} />
          <Route path="/contact-support" element={<ContactSupport />} />
          <Route path="/settings/password" element={<SettingsPage />} />
          <Route path="/settings/site" element={<SiteSettings />} />
          <Route path="/settings/social" element={<SocialSettings />} />
          {STAFF_TEAM_ENABLED && (
            <>
          <Route path="/staff-team" element={<Navigate to="/staff-team/manage" replace />} />
          <Route path="/staff-team/manage" element={<StaffTeamManagement page="manage" />} />
          <Route path="/staff-team/roles" element={<StaffTeamManagement page="roles" />} />
          <Route path="/staff-team/permissions" element={<StaffTeamManagement page="permissions" />} />
            </>
          )}
          <Route path="/payment-type" element={<PaymentTypeManagement />} />
          <Route path="/paper-stock" element={<PaperStockManagement />} />
          <Route path="/plate-stock" element={<PlateStockManagement />} />
          <Route path="/statements" element={<Navigate to="/statements/invoice" replace />} />
          <Route path="/statements/invoice" element={<Statements defaultTab="invoices" />} />
          <Route path="/statements/paper-stock" element={<PaperStockStatements />} />
          <Route path="/statements/plate-stock" element={<PlateStockStatements />} />
          <Route path="/report" element={<Report />} />
          <Route path="/estimates" element={<Estimates />} />
          <Route path="/estimates/add" element={<AddEstimate />} />
          <Route path="/item-list" element={<ItemListManagement />} />
        </Routes>
      </div>
    </div>
  );
}



