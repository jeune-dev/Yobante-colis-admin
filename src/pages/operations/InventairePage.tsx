import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import Icon from '@/components/Icon';
import { Badge, Card, Chips, Empty, ErrorBox, Field, Loader, Stat, toast } from '@/components/ui';
import { CATEGORIES_COURT, ETATS_MARCHANDISE, libelle } from '@/lib/labels';
import { ouvrirDocument, telecharger } from '@/lib/format';
import { useRotationsOptions } from '@/lib/options';
import ResponsiveTable from '@/components/ResponsiveTable';

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
    queryFn: () => api.get<{ tournees: { id: string; reference: string; titre: string }[] }>('/admin/tournees-collecte', { limit: 100 })
      .then((r) => r.tournees.map((t) => ({ value: t.id, label: `${t.reference} — ${t.titre}` }))),
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
                <ResponsiveTable
                  lignes={q.data.lignes}
                  cleLigne={(_, i) => i}
                  colonnes={[
                    { cle: 'colis', titre: 'Colis', className: 'mono', cellule: (l) => l.reference },
                    { cle: 'categorie', titre: 'Cat.', mobile: 'badge', cellule: (l) => <Badge ton="bleu">{CATEGORIES_COURT[l.categorie] ?? l.categorie}</Badge> },
                    { cle: 'produit', titre: 'Produit', cellule: (l) => l.produit },
                    { cle: 'quantite', titre: 'Qté', cellule: (l) => l.quantite },
                    { cle: 'etat', titre: 'État', cellule: (l) => libelle(ETATS_MARCHANDISE, l.etat) },
                    { cle: 'destinataire', titre: 'Destinataire', className: 'small', cellule: (l) => l.destinataire },
                    { cle: 'destination', titre: 'Destination', className: 'small', cellule: (l) => l.villeArrivee },
                  ]}
                />
              )}
            </Card>
            <Card title="Synthèse par produit" flush>
              <ResponsiveTable
                lignes={q.data.synthese}
                cleLigne={(_, i) => i}
                colonnes={[
                  { cle: 'produit', titre: 'Produit', cellule: (s) => s.produit },
                  { cle: 'etat', titre: 'État', className: 'small', cellule: (s) => libelle(ETATS_MARCHANDISE, s.etat) },
                  { cle: 'quantite', titre: 'Qté', cellule: (s) => s.quantite },
                  { cle: 'colis', titre: 'Colis', cellule: (s) => s.colis },
                ]}
              />
            </Card>
          </div>
        </>
      )}
    </>
  );
}
