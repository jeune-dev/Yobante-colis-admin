import { useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui';

/** Lit les filtres d'une URL : un paramètre absent prend sa valeur par défaut. */
export function lireFiltres<T extends Record<string, string>>(params: URLSearchParams, defauts: T): T {
  return Object.fromEntries(Object.keys(defauts).map((k) => [k, params.get(k) ?? defauts[k]])) as T;
}

/**
 * Applique des changements de filtres à une URL.
 * - Une valeur égale à la valeur par défaut retire le paramètre (URL courte).
 * - Une valeur vide alors que la valeur par défaut ne l'est pas est conservée
 *   (`?statut=`) : sinon la valeur par défaut reviendrait et « Tous » serait impossible.
 * - Changer un filtre ramène à la première page.
 */
export function appliquerFiltres(
  actuels: URLSearchParams,
  defauts: Record<string, string>,
  changements: Record<string, string | number>
) {
  const next = new URLSearchParams(actuels);
  for (const [cle, brute] of Object.entries(changements)) {
    const valeur = String(brute ?? '');
    const defaut = cle === 'page' ? '1' : defauts[cle] ?? '';
    if (valeur === defaut || (valeur === '' && defaut === '')) next.delete(cle);
    else next.set(cle, valeur);
  }
  if (Object.keys(changements).some((c) => c !== 'page')) next.delete('page');
  return next;
}

/**
 * Filtres d'une liste conservés dans l'URL : la page reste partageable et le
 * bouton « retour » depuis un détail retrouve la liste telle qu'on l'a laissée.
 */
export function useFiltres<T extends Record<string, string>>(defauts: T) {
  const [params, setParams] = useSearchParams();

  const filtres = lireFiltres(params, defauts);
  const page = Number(params.get('page') || 1);

  // On repart de l'URL réelle à chaque appel, pas des paramètres du dernier rendu :
  // plusieurs appels dans un même clic se cumulent au lieu de s'écraser.
  const modifier = useCallback(
    (changements: Partial<Record<keyof T | 'page', string | number>>) =>
      setParams(
        appliquerFiltres(new URLSearchParams(window.location.search), defauts, changements as Record<string, string | number>),
        { replace: true }
      ),
    // `defauts` est un littéral recréé à chaque rendu : son contenu, lui, ne change pas
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setParams]
  );

  const set = useCallback(
    (cle: keyof T | 'page', valeur: string | number) => modifier({ [cle]: valeur } as Partial<Record<keyof T | 'page', string | number>>),
    [modifier]
  );

  return { filtres, page, set, modifier, setPage: (p: number) => set('page', p) };
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
  // Verrou synchrone : `isPending` n'est visible qu'au rendu suivant, un double clic
  // rapide (ou un bouton de ligne non désactivé) lancerait sinon deux fois l'opération.
  const enCours = useRef(false);
  const mutation = useMutation({
    mutationFn: async (v: V) => {
      try {
        return await fn(v);
      } finally {
        enCours.current = false;
      }
    },
    onSuccess: () => {
      if (succes) toast.success(succes);
      invalider.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e) => toast.error(e),
  });
  const { mutate: lancer } = mutation;
  const mutate = useCallback(
    (...args: Parameters<typeof lancer>) => {
      if (enCours.current) return;
      enCours.current = true;
      lancer(...args);
    },
    [lancer]
  ) as typeof lancer;
  return { ...mutation, mutate };
}
