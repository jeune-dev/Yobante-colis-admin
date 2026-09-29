import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, avecVersion } from '@/api/client';
import Icon from '@/components/Icon';
import { Badge, Card, Empty, ErrorBox, Field, Loader, Modal, toast, ligneCliquable } from '@/components/ui';
import { dateHeure } from '@/lib/format';
import { useInvalider } from '@/lib/hooks';

interface Modele {
  code: string;
  description?: string;
  variables: string[];
  personnalise: boolean;
  isActive: boolean;
  sujet: string;
  corpsHtml: string;
  sujetParDefaut: string;
  corpsParDefaut: string;
  modifieLe?: string | null;
}

export default function ModelesEmailsPage() {
  const [edition, setEdition] = useState<Modele | null>(null);
  const q = useQuery({
    queryKey: ['modeles-emails'],
    queryFn: () => api.get<{ modeles: Modele[] }>('/admin/modeles-emails').then((r) => r.modeles),
  });

  return (
    <>
      <div className="alert info">
        <Icon name="mail" size={16} />
        <div>Chaque email envoyé aux clients part d'un modèle. Personnalisez le sujet et le contenu ; les variables entre accolades, comme <code>{'{{prenom}}'}</code>, sont remplacées à l'envoi.</div>
      </div>
      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : q.error ? null : !q.data?.length ? <Empty>Aucun modèle</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Modèle</th><th>Sujet</th><th>Variables</th><th>Version</th><th /></tr></thead>
              <tbody>
                {q.data.map((m) => (
                  <tr key={m.code} className="cliquable" {...ligneCliquable(() => setEdition(m))}>
                    <td><span className="mono">{m.code}</span><div className="muted small">{m.description}</div></td>
                    <td className="small">{m.sujet}</td>
                    <td className="small mono">{m.variables.map((v) => `{{${v}}}`).join(' ')}</td>
                    <td>
                      {m.personnalise ? <Badge ton="violet">Personnalisé</Badge> : <Badge>Par défaut</Badge>}
                      {!m.isActive && <> <Badge ton="rouge">Désactivé</Badge></>}
                      {m.modifieLe && <div className="muted small">{dateHeure(m.modifieLe)}</div>}
                    </td>
                    <td><Icon name="pencil" size={14} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {edition && <DialogueModele modele={edition} onClose={() => setEdition(null)} />}
    </>
  );
}

function DialogueModele({ modele, onClose }: { modele: Modele; onClose: () => void }) {
  const invalider = useInvalider();
  const [sujet, setSujet] = useState(modele.sujet);
  const [corpsHtml, setCorps] = useState(modele.corpsHtml);
  const [isActive, setActive] = useState(modele.isActive);
  const [apercu, setApercu] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const voir = async () => {
    try {
      setApercu(await api.postHtml(`/admin/modeles-emails/${modele.code}/apercu`, { sujet, corpsHtml }));
    } catch (e) {
      toast.error(e);
    }
  };
  const enregistrer = async () => {
    setEnvoi(true);
    try {
      // Un modèle jamais personnalisé n'a pas de version : aucun verrou dans ce cas
      await api.put(
        `/admin/modeles-emails/${modele.code}`,
        { sujet, corpsHtml, isActive },
        avecVersion((modele as { updatedAt?: string }).updatedAt)
      );
      toast.success('Modèle enregistré');
      invalider('modeles-emails');
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setEnvoi(false);
    }
  };
  const reinitialiser = async () => {
    if (!confirm('Revenir au modèle par défaut ? La personnalisation sera perdue.')) return;
    try {
      await api.delete(`/admin/modeles-emails/${modele.code}`);
      toast.success('Modèle par défaut rétabli');
      invalider('modeles-emails');
      onClose();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal large title={modele.code} onClose={onClose} footer={
      <>
        {modele.personnalise && <button className="btn ghost" onClick={reinitialiser} style={{ marginRight: 'auto' }}>Rétablir le modèle par défaut</button>}
        <button className="btn secondary" onClick={voir}><Icon name="eye" size={14} /> Aperçu</button>
        <button className="btn" onClick={enregistrer} disabled={envoi}>Enregistrer</button>
      </>
    }>
      <p className="small muted" style={{ marginBottom: 10 }}>{modele.description}</p>
      <p className="small" style={{ marginBottom: 10 }}>
        Variables : {modele.variables.map((v) => (
          <button key={v} type="button" className="chip mono" style={{ marginRight: 4 }} onClick={() => setCorps((c) => `${c}{{${v}}}`)}>{`{{${v}}}`}</button>
        ))}
      </p>
      <Field label="Sujet"><input className="input" value={sujet} onChange={(e) => setSujet(e.target.value)} /></Field>
      <Field label="Contenu HTML">
        <textarea className="textarea mono" style={{ minHeight: 260 }} value={corpsHtml} onChange={(e) => setCorps(e.target.value)} />
      </Field>
      <label className="check"><input type="checkbox" checked={isActive} onChange={(e) => setActive(e.target.checked)} /> Envoi activé</label>
      {apercu && (
        <>
          <div className="section-label">Aperçu (valeurs d'exemple)</div>
          <iframe title="Aperçu" srcDoc={apercu} sandbox="" style={{ width: '100%', height: 420, border: '1px solid var(--border)', borderRadius: 8, background: '#fff' }} />
        </>
      )}
    </Modal>
  );
}
