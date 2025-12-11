import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import Logo from './Logo';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { mode, toggleMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: 'Dashboard', path: '/dashboard' },
    { text: 'Agents', path: '/agents' },
    { text: 'Users', path: '/users' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
    setProfileMenuOpen(false);
  };

  const currentPage = menuItems.find(item => item.path === location.pathname)?.text || 'AcesMaster';

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark">
      {/* Sidebar */}
      <aside className={`hidden md:flex flex-col w-60 bg-white dark:bg-dark-light border-r border-gray-200 dark:border-gray-800`}>
        <div className="p-4">
          <Logo />
        </div>
        <nav className="flex-1 px-2 py-4">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full text-left px-4 py-2 rounded-lg mb-1 transition-colors ${
                location.pathname === item.path
                  ? 'bg-primary text-black font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-lighter'
              }`}
            >
              {item.text}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setMobileOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-60 bg-white dark:bg-dark-light border-r border-gray-200 dark:border-gray-800">
            <div className="p-4">
              <Logo />
            </div>
            <nav className="px-2 py-4">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setMobileOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 rounded-lg mb-1 transition-colors ${
                    location.pathname === item.path
                      ? 'bg-primary text-black font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-lighter'
                  }`}
                >
                  {item.text}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-dark-light border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-lighter"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{currentPage}</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme toggle */}
            <button
              onClick={toggleMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-lighter"
              aria-label="Toggle theme"
            >
              {mode === 'dark' ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {/* Profile menu */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black font-medium"
              >
                A
              </button>
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-light border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg py-1">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800">
                    <p className="text-sm text-gray-900 dark:text-white">admin@acesmaster.com</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-lighter"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
