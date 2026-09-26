import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui';

/**
 * Filtres d'une liste conservés dans l'URL : la page reste partageable et le
 * bouton « retour » depuis un détail retrouve la liste telle qu'on l'a laissée.
 */
export function useFiltres<T extends Record<string, string>>(defauts: T) {
  const [params, setParams] = useSearchParams();

  const filtres = Object.fromEntries(
    Object.keys(defauts).map((k) => [k, params.get(k) ?? defauts[k]])
  ) as T;
  const page = Number(params.get('page') || 1);

  const set = useCallback(
    (cle: keyof T | 'page', valeur: string | number) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (valeur === '' || valeur === undefined) next.delete(String(cle));
          else next.set(String(cle), String(valeur));
          // Changer un filtre ramène à la première page
          if (cle !== 'page') next.delete('page');
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );

  return { filtres, page, set, setPage: (p: number) => set('page', p) };
}

/** Rafraîchit les requêtes dont la clé commence par l'un des préfixes donnés. */
export function useInvalider() {
  const qc = useQueryClient();
  return (...cles: string[]) => cles.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

/**
 * Mutation standard : notification de succès ou d'erreur, puis rafraîchissement
 * des requêtes dont la clé commence par l'un des préfixes donnés.
 */
export function useAction<V = void, R = unknown>(
  fn: (v: V) => Promise<R>,
  { succes, invalider = [] }: { succes?: string; invalider?: string[] } = {}
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      if (succes) toast.success(succes);
      invalider.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e) => toast.error(e),
  });
}
