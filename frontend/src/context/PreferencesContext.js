import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "app.preferences";

const defaultPreferences = {
  theme: "light",
  language: "vi",
};

const PreferencesContext = createContext({
  theme: "light",
  language: "vi",
  toggleTheme: () => {},
  setTheme: () => {},
  toggleLanguage: () => {},
  setLanguage: () => {},
});

const applyThemeClass = (theme) => {
  const body = document.body;
  body.classList.remove("theme-light", "theme-dark");
  body.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
};

export const PreferencesProvider = ({ children }) => {
  const [prefs, setPrefs] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...defaultPreferences, ...parsed };
      }
    } catch (e) {
      /* ignore broken storage */
    }
    return defaultPreferences;
  });

  useEffect(() => {
    applyThemeClass(prefs.theme);
  }, [prefs.theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      /* ignore quota errors */
    }
  }, [prefs]);

  const setTheme = (theme) => {
    setPrefs((current) => ({ ...current, theme }));
  };

  const toggleTheme = () => {
    setPrefs((current) => ({
      ...current,
      theme: current.theme === "dark" ? "light" : "dark",
    }));
  };

  const setLanguage = (language) => {
    setPrefs((current) => ({ ...current, language }));
  };

  const toggleLanguage = () => {
    setPrefs((current) => ({
      ...current,
      language: current.language === "vi" ? "en" : "vi",
    }));
  };

  const value = useMemo(
    () => ({
      theme: prefs.theme,
      language: prefs.language,
      toggleTheme,
      setTheme,
      toggleLanguage,
      setLanguage,
    }),
    [prefs.theme, prefs.language]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => useContext(PreferencesContext);

export default PreferencesContext;
