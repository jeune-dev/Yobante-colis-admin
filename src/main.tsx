import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { Confirmations, Toasts } from './components/ui';
import ErrorBoundary from './components/ErrorBoundary';
// Police Inter, comme l'administration boutique, hébergée avec l'application
// (la CSP de production bloque Google Fonts)
import '@fontsource-variable/inter';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Inutile de réessayer une requête refusée (droits, validation, introuvable)
      retry: (n, err) => n < 1 && !((err as { status?: number }).status! < 500),
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
        <Toasts />
        <Confirmations />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
