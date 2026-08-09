import React, { createContext, useContext, useEffect, useState } from 'react';

type BaseTheme = 'dark' | 'light' | 'system';
type ThemePack = 'default' | 'cosmic-blue' | 'emerald-wellness' | 'sunset-energy' | 'midnight-focus';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultBaseTheme?: BaseTheme;
  defaultThemePack?: ThemePack;
  storageKey?: string;
};

type ThemeProviderState = {
  baseTheme: BaseTheme;
  themePack: ThemePack;
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  setBaseTheme: (theme: BaseTheme) => void;
  setThemePack: (pack: ThemePack) => void;
  setHighContrast: (val: boolean) => void;
  setReducedMotion: (val: boolean) => void;
  setLargeText: (val: boolean) => void;
};

const initialState: ThemeProviderState = {
  baseTheme: 'system',
  themePack: 'default',
  highContrast: false,
  reducedMotion: false,
  largeText: false,
  setBaseTheme: () => null,
  setThemePack: () => null,
  setHighContrast: () => null,
  setReducedMotion: () => null,
  setLargeText: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultBaseTheme = 'system',
  defaultThemePack = 'default',
  storageKey = 'innerverse-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [baseTheme, setBaseTheme] = useState<BaseTheme>(
    () => {
      try { return (localStorage.getItem(`${storageKey}-base`) as BaseTheme) || defaultBaseTheme; } catch (e) { return defaultBaseTheme; }
    }
  );

  const [themePack, setThemePack] = useState<ThemePack>(
    () => {
      try { return (localStorage.getItem(`${storageKey}-pack`) as ThemePack) || defaultThemePack; } catch (e) { return defaultThemePack; }
    }
  );

  const [highContrast, setHighContrast] = useState<boolean>(() => {
     try { return localStorage.getItem(`${storageKey}-hc`) === 'true'; } catch (e) { return false; }
  });

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
     try { return localStorage.getItem(`${storageKey}-rm`) === 'true'; } catch (e) { return false; }
  });

  const [largeText, setLargeText] = useState<boolean>(() => {
     try { return localStorage.getItem(`${storageKey}-lt`) === 'true'; } catch (e) { return false; }
  });

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('bg-background', 'text-foreground');
    root.classList.remove('light', 'dark', 'high-contrast', 'reduced-motion', 'large-text');

    root.removeAttribute('data-theme');

    let effectiveBaseTheme = baseTheme;

    if (baseTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';
      effectiveBaseTheme = systemTheme;
    }

    if (effectiveBaseTheme === 'dark') {
       root.classList.add('dark');
    }

    if (themePack !== 'default') {
      root.setAttribute('data-theme', themePack);
    }

    if (highContrast) root.classList.add('high-contrast');
    if (reducedMotion) root.classList.add('reduced-motion');
    if (largeText) root.classList.add('large-text');
    
  }, [baseTheme, themePack, highContrast, reducedMotion, largeText]);

  useEffect(() => {
     try {
       localStorage.setItem(`${storageKey}-base`, baseTheme);
       localStorage.setItem(`${storageKey}-pack`, themePack);
       localStorage.setItem(`${storageKey}-hc`, String(highContrast));
       localStorage.setItem(`${storageKey}-rm`, String(reducedMotion));
       localStorage.setItem(`${storageKey}-lt`, String(largeText));
     } catch (e) {
       console.error("Local storage error:", e);
     }
  }, [baseTheme, themePack, highContrast, reducedMotion, largeText, storageKey]);

  return (
    <ThemeProviderContext.Provider {...props} value={{ baseTheme, themePack, highContrast, reducedMotion, largeText, setBaseTheme, setThemePack, setHighContrast, setReducedMotion, setLargeText }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
