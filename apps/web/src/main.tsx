import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { LocalGameService } from './service/localService.ts';
import { SupabaseGameService } from './service/supabaseService.ts';
import { StoreProvider } from './service/store.tsx';
import './styles.css';

// With Supabase configured (apps/web/.env.local), the game runs on the
// server; otherwise it falls back to the browser playtest.
const configuredUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// A path such as "/supabase" means “through this site's dev proxy”.
const url = configuredUrl ? new URL(configuredUrl, location.origin).href.replace(/\/$/, '') : undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const service =
  url && anonKey
    ? new SupabaseGameService(url, anonKey, import.meta.env.VITE_LUCKDLE_DEV_TOOLS === 'true')
    : new LocalGameService();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider service={service}>
      <App />
    </StoreProvider>
  </StrictMode>,
);
