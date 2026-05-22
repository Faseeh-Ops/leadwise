import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSocket } from '../hooks/useSocket';
import { useAppStore } from '../store/appStore';
import { Sun, Moon, Menu } from 'lucide-react';
import { useState } from 'react';
import logoUrl from '../assets/logo.png';

export default function Layout() {
  useSocket();
  const { theme, toggleTheme } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg-app)]">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-6 shrink-0 bg-[var(--bg-card)] z-30">
        <div className="flex items-center gap-4">
          {/* Sidebar Toggle Button */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn-ghost p-1.5 rounded-md flex items-center justify-center border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] transition-colors"
            title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          >
            <Menu className="w-4 h-4 text-zinc-500 hover:text-zinc-300" />
          </button>

          {/* Permanent Logo Branding */}
          <div className="flex items-center">
            <img src={logoUrl} alt="Leadwise Logo" className="h-10 w-auto object-contain" />
          </div>
        </div>

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme} 
          className="btn-ghost p-2 rounded-lg flex items-center justify-center border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] transition-colors"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-yellow-400" />
          ) : (
            <Moon className="w-4 h-4 text-zinc-500" />
          )}
        </button>
      </header>

      {/* Main Panel */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar collapsed={!sidebarOpen} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-screen-2xl w-full mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
