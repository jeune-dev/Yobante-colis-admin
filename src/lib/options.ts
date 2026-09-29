import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

/**
 * Listes de choix partagées par les formulaires (villes, points, zones, services…).
 * Mises en cache 5 minutes : ce sont des référentiels qui bougent peu.
 */

type Option = { value: string; label: string };
const CINQ_MIN = 5 * 60_000;
// Le backend plafonne `limit` à 100 : au-delà, les pages suivantes sont chargées pour
// que les listes de choix restent complètes (borne de sécurité : 20 pages).
const PAR_PAGE = 100;
const PAGES_MAX = 20;

export async function toutesLesPages<T>(url: string, cle: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const lignes: T[] = [];
  for (let page = 1; page <= PAGES_MAX; page++) {
    const r = await api.get<Record<string, unknown> & { pagination?: { totalPages: number } }>(url, { ...params, page, limit: PAR_PAGE });
    lignes.push(...((r[cle] as T[]) ?? []));
    if (!r.pagination || page >= r.pagination.totalPages) break;
  }
  return lignes;
}

export function useVillesOptions(pays?: string) {
  return useQuery({
    queryKey: ['villes', 'options', pays ?? 'toutes'],
    queryFn: async () => {
      const villes = await toutesLesPages<{ id: string; nom: string; pays: string }>('/admin/villes', 'villes', { pays });
      return villes.map<Option>((v) => ({ value: v.id, label: pays ? v.nom : `${v.nom} (${v.pays})` }));
    },
    staleTime: CINQ_MIN,
  });
}

export function usePointsOptions(pays?: string, filtre: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['points-collecte', 'options', pays ?? 'tous', filtre],
    queryFn: async () => {
      const points = await toutesLesPages<{ id: string; code: string; nom: string; pays: string }>('/admin/points-collecte', 'points', {
        pays, ...filtre,
      });
      return points.map<Option>((p) => ({ value: p.id, label: `${p.code} — ${p.nom}` }));
    },
    staleTime: CINQ_MIN,
  });
}

export function useZonesOptions(pays?: string) {
  return useQuery({
    queryKey: ['zones', 'options', pays ?? 'toutes'],
    queryFn: async () => {
      const zones = await toutesLesPages<{ id: string; code: string; nom: string; pays: string }>('/admin/zones', 'zones', { pays });
      return zones.map<Option>((z) => ({ value: z.id, label: `${z.code} — ${z.nom}` }));
    },
    staleTime: CINQ_MIN,
  });
}

export function useServicesOptions() {
  return useQuery({
    queryKey: ['services', 'options'],
    queryFn: async () => {
      const r = await api.get<{ services: { id: string; code: string; nom: string }[] }>('/admin/services');
      return r.services.map<Option>((s) => ({ value: s.id, label: `${s.nom} (${s.code})` }));
    },
    staleTime: CINQ_MIN,
  });
}

export function useCoursiersOptions(pays?: string) {
  return useQuery({
    queryKey: ['coursiers-disponibles', pays],
    queryFn: async () => {
      const r = await api.get<{ coursiers: { id: string; nom: string; prenom: string; telephone?: string }[] }>(
        '/admin/personnel/coursiers-disponibles', { pays }
      );
      return r.coursiers.map<Option>((c) => ({ value: c.id, label: `${c.prenom} ${c.nom}${c.telephone ? ` · ${c.telephone}` : ''}` }));
    },
    enabled: !!pays,
    staleTime: 60_000,
  });
}

export function useRotationsOptions(filtre: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['rotations', 'options', filtre],
    queryFn: async () => {
      const rotations = await toutesLesPages<{ id: string; reference: string; statut: string }>('/admin/rotations', 'rotations', filtre);
      return rotations.map<Option>((x) => ({ value: x.id, label: x.reference }));
    },
    staleTime: 60_000,
  });
}
