import { createContext, useContext, useMemo, useState } from 'react';

const BannerThemeContext = createContext({
  smokeColor: 'rgba(36, 23, 26, 0.28)',
  setSmokeColor: () => {},
});

export const BannerThemeProvider = ({ children }) => {
  const [smokeColor, setSmokeColor] = useState('rgba(36, 23, 26, 0.28)');

  const value = useMemo(() => ({ smokeColor, setSmokeColor }), [smokeColor]);
  return <BannerThemeContext.Provider value={value}>{children}</BannerThemeContext.Provider>;
};

export const useBannerTheme = () => useContext(BannerThemeContext);
