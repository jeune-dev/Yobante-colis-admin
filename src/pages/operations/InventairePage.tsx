import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import Icon from '@/components/Icon';
import { Badge, Card, Chips, Empty, ErrorBox, Field, Loader, Stat, toast } from '@/components/ui';
import { CATEGORIES_COURT, ETATS_MARCHANDISE, libelle } from '@/lib/labels';
import { ouvrirDocument, telecharger } from '@/lib/format';
import { useRotationsOptions, toutesLesPages } from '@/lib/options';

interface Inventaire {
  titre: string;
  nbColis: number;
  quantiteTotale: number;
  lignes: { reference: string; categorie: string; expediteur: string; destinataire: string; villeArrivee: string; produit: string; quantite: number; etat: string }[];
  synthese: { produit: string; etat: string; quantite: number; colis: number }[];
}

export default function InventairePage() {
  const [source, setSource] = useState<'rotation' | 'tournee'>('rotation');
  const [id, setId] = useState('');
  const rotations = useRotationsOptions();
  const tournees = useQuery({
    queryKey: ['tournees-collecte', 'options'],
    queryFn: () => toutesLesPages<{ id: string; reference: string; titre: string }>('/admin/tournees-collecte', 'tournees')
      .then((tournees) => tournees.map((t) => ({ value: t.id, label: `${t.reference} — ${t.titre}` }))),
  });
  const params = source === 'rotation' ? { rotationId: id } : { tourneeCollecteId: id };

  const q = useQuery({
    queryKey: ['inventaire', source, id],
    queryFn: () => api.get<{ inventaire: Inventaire }>('/admin/inventaire', params).then((r) => r.inventaire),
    enabled: !!id,
  });

  const imprimer = async () => {
    try {
      ouvrirDocument(await api.html('/admin/inventaire', { ...params, format: 'html' }));
    } catch (e) {
      toast.error(e);
    }
  };
  const exporter = async () => {
    try {
      telecharger(await api.blob('/admin/inventaire', { ...params, format: 'csv' }), 'inventaire.csv');
    } catch (e) {
      toast.error(e);
    }
  };

  const options = source === 'rotation' ? rotations.data : tournees.data;

  return (
    <>
      <div className="alert info">
        <Icon name="clipboard-list" size={16} />
        <div>Inventaire des produits chargés (quantité, état neuf ou occasion), par conteneur ou par tournée de collecte.</div>
      </div>
      <Card>
        <div className="form-row">
          <Field label="Inventaire de">
            <Chips options={[{ value: 'rotation', label: 'Conteneur' }, { value: 'tournee', label: 'Tournée de collecte' }]}
              value={source} onChange={(v) => { setSource(v); setId(''); }} />
          </Field>
          <Field label={source === 'rotation' ? 'Conteneur' : 'Tournée'}>
            <select className="select" value={id} onChange={(e) => setId(e.target.value)}>
              <option value="">— Choisir —</option>
              {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      <ErrorBox error={q.error} />
      {q.isFetching && <Loader />}
      {q.data && (
        <>
          <div className="hero">
            <strong style={{ fontSize: '1.1rem' }}>{q.data.titre}</strong>
            <div className="actions">
              <button className="btn secondary" onClick={exporter}><Icon name="download" size={15} /> CSV</button>
              <button className="btn" onClick={imprimer}><Icon name="printer" size={15} /> Imprimer</button>
            </div>
          </div>
          <div className="stats">
            <Stat icon="package" value={q.data.nbColis} label="Colis" />
            <Stat icon="grid" ton="violet" value={q.data.quantiteTotale} label="Articles au total" />
          </div>
          <div className="grid grid-main-side">
            <Card title="Détail par colis" flush>
              {!q.data.lignes.length ? <Empty>Aucun produit</Empty> : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Colis</th><th>Cat.</th><th>Produit</th><th>Qté</th><th>État</th><th>Destinataire</th><th>Destination</th></tr></thead>
                    <tbody>
                      {q.data.lignes.map((l, i) => (
                        <tr key={i}>
                          <td className="mono">{l.reference}</td>
                          <td><Badge ton="bleu">{CATEGORIES_COURT[l.categorie] ?? l.categorie}</Badge></td>
                          <td>{l.produit}</td>
                          <td>{l.quantite}</td>
                          <td>{libelle(ETATS_MARCHANDISE, l.etat)}</td>
                          <td className="small">{l.destinataire}</td>
                          <td className="small">{l.villeArrivee}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            <Card title="Synthèse par produit" flush>
              <table>
                <thead><tr><th>Produit</th><th>État</th><th>Qté</th><th>Colis</th></tr></thead>
                <tbody>
                  {q.data.synthese.map((s, i) => (
                    <tr key={i}><td>{s.produit}</td><td className="small">{libelle(ETATS_MARCHANDISE, s.etat)}</td><td>{s.quantite}</td><td>{s.colis}</td></tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
