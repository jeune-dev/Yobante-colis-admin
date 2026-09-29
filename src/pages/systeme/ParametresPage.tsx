import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { estSuperAdmin, useAuth } from '@/auth/store';
import Icon from '@/components/Icon';
import { Card, Chips, Empty, ErrorBox, Loader, toast } from '@/components/ui';
import { useInvalider } from '@/lib/hooks';

interface Parametre {
  id: string;
  cle: string;
  valeur: string;
  type: 'texte' | 'nombre' | 'booleen' | 'json';
  categorie: string;
  libelle?: string;
  description?: string;
  modifiable: boolean;
}

const typer = (p: Parametre, v: string) => (p.type === 'nombre' ? Number(v) : p.type === 'booleen' ? v === 'true' : v);

export default function ParametresPage() {
  const superAdmin = estSuperAdmin(useAuth((s) => s.utilisateur));
  const invalider = useInvalider();
  const [categorie, setCategorie] = useState('');
  // Valeurs modifiées et pas encore enregistrées, par clé
  const [brouillon, setBrouillon] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);

  const q = useQuery({
    queryKey: ['parametres'],
    queryFn: () => api.get<{ parametres: Parametre[] }>('/admin/parametres').then((r) => r.parametres),
  });

  const modifies = (q.data ?? []).filter((p) => brouillon[p.cle] !== undefined && brouillon[p.cle] !== p.valeur);

  const enregistrer = async (liste: Parametre[]) => {
    for (const p of liste) {
      if (p.type === 'nombre' && (String(brouillon[p.cle] ?? '').trim() === '' || !Number.isFinite(Number(brouillon[p.cle])))) {
        return toast.error(`« ${p.libelle ?? p.cle} » : nombre attendu`);
      }
      if (p.type === 'json') {
        try {
          JSON.parse(brouillon[p.cle]);
        } catch {
          return toast.error(`« ${p.libelle ?? p.cle} » : JSON invalide`);
        }
      }
    }
    setEnvoi(true);
    try {
      if (liste.length === 1) {
        await api.put(`/admin/parametres/${liste[0].cle}`, { valeur: typer(liste[0], brouillon[liste[0].cle]) });
      } else {
        await api.put('/admin/parametres/lot', { valeurs: Object.fromEntries(liste.map((p) => [p.cle, typer(p, brouillon[p.cle])])) });
      }
      toast.success(`${liste.length} paramètre(s) enregistré(s)`);
      setBrouillon((b) => {
        const reste = { ...b };
        liste.forEach((p) => delete reste[p.cle]);
        return reste;
      });
      invalider('parametres');
    } catch (e) {
      toast.error(e);
    } finally {
      setEnvoi(false);
    }
  };

  const initialiser = async () => {
    try {
      const r = await api.post<{ crees: number }>('/admin/parametres/initialiser', {});
      toast.success(r.crees ? `${r.crees} paramètre(s) créé(s)` : 'Tous les paramètres existent déjà');
      invalider('parametres');
    } catch (e) {
      toast.error(e);
    }
  };

  // isPending (pas isLoading) : un nouvel essai mis en pause (onglet masqué, hors ligne)
  // laisse la requête sans donnée ni erreur, et `q.data` serait indéfini
  if (q.isPending) return <Loader />;
  if (q.error) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;

  const categories = [...new Set((q.data ?? []).map((p) => p.categorie))];
  const parCategorie = (q.data ?? [])
    .filter((p) => !categorie || p.categorie === categorie)
    .reduce<Record<string, Parametre[]>>((acc, p) => {
      (acc[p.categorie] ??= []).push(p);
      return acc;
    }, {});

  return (
    <>
      {!superAdmin && (
        <div className="alert info">
          <Icon name="lock" size={16} />
          <div>Lecture seule : seul un super administrateur peut modifier les réglages.</div>
        </div>
      )}
      <div className="toolbar">
        <Chips
          options={[{ value: '', label: 'Toutes' }, ...categories.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))]}
          value={categorie}
          onChange={setCategorie}
        />
        {superAdmin && (
          <div className="actions" style={{ marginLeft: 'auto' }}>
            <button className="btn secondary" onClick={initialiser}><Icon name="refresh-cw" size={15} /> Créer les paramètres manquants</button>
            <button className="btn" disabled={!modifies.length || envoi} onClick={() => enregistrer(modifies)}>
              Enregistrer {modifies.length ? `(${modifies.length})` : ''}
            </button>
          </div>
        )}
      </div>

      {!q.data?.length && <Empty>Aucun paramètre en base : le backend utilise ses valeurs de repli. Utilisez « Créer les paramètres manquants ».</Empty>}

      {Object.entries(parCategorie).map(([cat, params]) => (
        <Card key={cat} title={cat.charAt(0).toUpperCase() + cat.slice(1)} flush>
          <div className="table-wrap">
            <table>
              <tbody>
                {params.map((p) => {
                  const editable = superAdmin && p.modifiable;
                  const valeur = brouillon[p.cle] ?? p.valeur;
                  const change = (v: string) => setBrouillon({ ...brouillon, [p.cle]: v });
                  const modifie = valeur !== p.valeur;
                  return (
                    <tr key={p.id}>
                      <td style={{ width: '45%' }}>
                        <strong>{p.libelle ?? p.cle}</strong>
                        {modifie && <span className="small" style={{ color: 'var(--gold)' }}> · modifié</span>}
                        <div className="muted small">{p.description}</div>
                        <div className="mono muted" style={{ fontSize: '0.7rem' }}>{p.cle}</div>
                      </td>
                      <td>
                        {p.type === 'booleen' ? (
                          <select className="select" disabled={!editable} value={valeur} onChange={(e) => change(e.target.value)} style={{ maxWidth: 160 }}>
                            <option value="true">Oui</option>
                            <option value="false">Non</option>
                          </select>
                        ) : p.type === 'json' ? (
                          <textarea className="textarea mono" disabled={!editable} value={valeur} onChange={(e) => change(e.target.value)} />
                        ) : (
                          <input className="input" type={p.type === 'nombre' ? 'number' : 'text'} step="any" disabled={!editable}
                            value={valeur} onChange={(e) => change(e.target.value)} style={{ maxWidth: 320 }} />
                        )}
                      </td>
                      <td style={{ width: 110 }}>
                        {editable && modifie && (
                          <button className="btn sm" disabled={envoi} onClick={() => enregistrer([p])}>Enregistrer</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </>
  );
}
