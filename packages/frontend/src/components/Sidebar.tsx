import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Megaphone, Users, Settings, LogOut,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone, end: false },
  { to: '/leads', label: 'Leads', icon: Users, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
];

interface SidebarProps {
  collapsed: boolean;
}

export default function Sidebar({ collapsed }: SidebarProps) {
  const { logout, user, isConnected } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    navigate('/login');
  };

  return (
    <aside 
      className={`shrink-0 flex flex-col h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => 
              `nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer ${
                isActive ? 'active' : ''
              } ${collapsed ? 'justify-center px-0' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className={`px-3 pb-4 space-y-2 border-t border-[var(--border-color)] pt-3 ${collapsed ? 'items-center' : ''}`}>
        {/* Connection status */}
        {!collapsed ? (
          <div className="flex items-center gap-2 px-3 py-1.5">
            {isConnected ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-xs text-zinc-400">Connected</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                <span className="text-xs text-zinc-500">Offline</span>
              </>
            )}
          </div>
        ) : (
          <div className="flex justify-center py-1.5" title={isConnected ? 'Connected' : 'Offline'}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-zinc-600'}`} />
          </div>
        )}

        {/* User info */}
        <div className={`flex items-center gap-2.5 px-3 py-1.5 ${collapsed ? 'justify-center px-0' : ''}`}>
          <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-[11px] font-semibold text-zinc-300 shrink-0">
            {user?.username?.[0]?.toUpperCase() ?? 'A'}
          </div>
          {!collapsed && <span className="text-sm text-zinc-400 truncate">{user?.username ?? 'Admin'}</span>}
        </div>

        <button
          onClick={handleLogout}
          className={`nav-link w-full text-red-400 hover:text-red-300 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
            collapsed ? 'justify-center px-0' : ''
          }`}
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
