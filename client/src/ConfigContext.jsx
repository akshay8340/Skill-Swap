import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { applyConfig } from './api';

// Categories, programmes, departments, meeting services and the announcement banner live in the database
// and are edited by admins, so the site never hardcodes them.
const ConfigContext = createContext(null);
export const useConfig = () => useContext(ConfigContext);

const EMPTY = { categories: [], programmes: [], departments: [], topicSuggestions: [], meetingHosts: [], allowedEmailDomains: [], announcement: '' };

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(null);

  const reload = useCallback(
    () =>
      api
        .get('/config')
        .then((r) => { applyConfig(r.data); setConfig(r.data); })
        .catch(() => { applyConfig(EMPTY); setConfig((c) => c || EMPTY); }),
    []
  );

  useEffect(() => { reload(); }, [reload]);

  if (!config) return <div className="center muted">Loading…</div>;
  return <ConfigContext.Provider value={{ config, reload }}>{children}</ConfigContext.Provider>;
}
