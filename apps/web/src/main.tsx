import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { LocalGameService } from './service/localService.ts';
import { StoreProvider } from './service/store.tsx';
import './styles.css';

// Playtest build: outcomes are generated in the browser. Swap in the
// Supabase-backed service here once the Edge Functions exist.
const service = new LocalGameService();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider service={service}>
      <App />
    </StoreProvider>
  </StrictMode>,
);
