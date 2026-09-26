import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '@/logo.png';
import { api } from '@/api/client';
import { ErrorBox, Field, toast } from '@/components/ui';

const REGLE_MDP = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,72}$/;

/** Réinitialisation en deux temps : code à 6 chiffres envoyé par email, puis nouveau mot de passe. */
export default function MotDePasseOubliePage() {
  const navigate = useNavigate();
  const [etape, setEtape] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [mdp, setMdp] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState<unknown>(null);
  const [envoi, setEnvoi] = useState(false);

  const demander = async (e: FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Si un compte existe, un code vient de vous être envoyé par email.');
      setEtape('code');
    } catch (err) {
      setErreur(err);
    } finally {
      setEnvoi(false);
    }
  };

  const reinitialiser = async (e: FormEvent) => {
    e.preventDefault();
    setErreur(null);
    if (mdp !== confirmation) return setErreur(new Error('Les deux mots de passe ne correspondent pas'));
    if (!REGLE_MDP.test(mdp)) return setErreur(new Error('8 caractères min., avec une majuscule, un chiffre et un caractère spécial'));
    setEnvoi(true);
    try {
      await api.post('/auth/reset-password', { email, code, newPassword: mdp });
      toast.success('Mot de passe réinitialisé : vous pouvez vous connecter.');
      navigate('/login');
    } catch (err) {
      setErreur(err);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <main className="login-page">
      <form className="reset-card" onSubmit={etape === 'email' ? demander : reinitialiser}>
        <div className="login-brand-simple">
          <img src={logo} alt="Yobante" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>Mot de passe oublié</div>
            <div className="muted small">{etape === 'email' ? 'Recevez un code de réinitialisation par email' : `Code envoyé à ${email}`}</div>
          </div>
        </div>
        <ErrorBox error={erreur} />
        {etape === 'email' ? (
          <Field label="Email du compte">
            <input className="input" type="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        ) : (
          <>
            <Field label="Code reçu (6 chiffres)">
              <input className="input mono" inputMode="numeric" maxLength={6} autoFocus required value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            </Field>
            <Field label="Nouveau mot de passe" hint="8 caractères min., une majuscule, un chiffre et un caractère spécial.">
              <input className="input" type="password" autoComplete="new-password" required value={mdp} onChange={(e) => setMdp(e.target.value)} />
            </Field>
            <Field label="Confirmation">
              <input className="input" type="password" autoComplete="new-password" required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
            </Field>
          </>
        )}
        <button className="btn" style={{ width: '100%' }} disabled={envoi}>
          {envoi ? 'Envoi…' : etape === 'email' ? 'Recevoir un code' : 'Réinitialiser'}
        </button>
        <div className="small" style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between' }}>
          <Link to="/login">← Retour à la connexion</Link>
          {etape === 'code' && <a style={{ cursor: 'pointer' }} onClick={() => setEtape('email')}>Renvoyer un code</a>}
        </div>
      </form>
    </main>
  );
}
