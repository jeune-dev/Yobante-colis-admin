import { QueryClient } from '@tanstack/react-query';
import { surFinDeSession } from '@/auth/store';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Inutile de réessayer une requête refusée (droits, validation, introuvable)
      retry: (n, err) => n < 1 && !((err as { status?: number }).status! < 500),
    },
  },
});

// Fin de session : plus aucune donnée du compte précédent ne doit rester en mémoire
surFinDeSession(() => queryClient.clear());
