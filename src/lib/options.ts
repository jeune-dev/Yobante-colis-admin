import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

/**
 * Listes de choix partagées par les formulaires (villes, points, zones, services…).
 * Mises en cache 5 minutes : ce sont des référentiels qui bougent peu.
 */

type Option = { value: string; label: string };
const CINQ_MIN = 5 * 60_000;

export function useVillesOptions(pays?: string) {
  return useQuery({
    queryKey: ['villes', 'options', pays ?? 'toutes'],
    queryFn: async () => {
      const r = await api.get<{ villes: { id: string; nom: string; pays: string }[] }>('/admin/villes', { pays, limit: 100 });
      return r.villes.map<Option>((v) => ({ value: v.id, label: pays ? v.nom : `${v.nom} (${v.pays})` }));
    },
    staleTime: CINQ_MIN,
  });
}

export function usePointsOptions(pays?: string, filtre: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['points-collecte', 'options', pays ?? 'tous', filtre],
    queryFn: async () => {
      const r = await api.get<{ points: { id: string; code: string; nom: string; pays: string }[] }>('/admin/points-collecte', {
        pays, limit: 100, ...filtre,
      });
      return r.points.map<Option>((p) => ({ value: p.id, label: `${p.code} — ${p.nom}` }));
    },
    staleTime: CINQ_MIN,
  });
}

export function useZonesOptions(pays?: string) {
  return useQuery({
    queryKey: ['zones', 'options', pays ?? 'toutes'],
    queryFn: async () => {
      const r = await api.get<{ zones: { id: string; code: string; nom: string; pays: string }[] }>('/admin/zones', { pays, limit: 100 });
      return r.zones.map<Option>((z) => ({ value: z.id, label: `${z.code} — ${z.nom}` }));
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
      const r = await api.get<{ rotations: { id: string; reference: string; statut: string }[] }>('/admin/rotations', { limit: 100, ...filtre });
      return r.rotations.map<Option>((x) => ({ value: x.id, label: x.reference }));
    },
    staleTime: 60_000,
  });
}
