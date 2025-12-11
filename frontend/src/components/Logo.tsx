import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const Logo: React.FC = () => {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <div className="flex items-center justify-center w-28 h-auto rounded-lg overflow-hidden">
      <img
        src={isDark ? '/logo-dark-mode.png' : '/logo-light-mode.png'}
        alt="AcesMaster Logo"
        className="w-full h-auto object-contain"
      />
    </div>
  );
};

export default Logo;
