import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '@/logo.png';
import { api } from '@/api/client';
import Icon from '@/components/Icon';
import { ErrorBox, toast } from '@/components/ui';

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

  // Champ au style de la page de connexion : libellé, icône, aide éventuelle
  const champ = (id: string, label: string, icone: string, input: ReactNode, aide?: string) => (
    <div className="login-field">
      <label className="login-label" htmlFor={id}>{label}</label>
      <div className="login-input-wrap">
        <Icon name={icone} size={16} />
        {input}
      </div>
      {aide && <p className="login-aide">{aide}</p>}
    </div>
  );

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="reset-heading">
        <header className="login-card-head">
          {/* Bandeau en dégradé bleu, seulement derrière le logo */}
          <div className="login-card-banniere">
            <span className="login-card-logo">
              <img src={logo} alt="" aria-hidden="true" />
            </span>
          </div>
          <h1 id="reset-heading" className="login-card-title">Mot de passe oublié</h1>
          <p className="login-card-sub">
            {etape === 'email' ? 'Recevez un code de réinitialisation par email' : `Code envoyé à ${email}`}
          </p>
        </header>

        <form className="login-form" onSubmit={etape === 'email' ? demander : reinitialiser}>
          <ErrorBox error={erreur} />
          {etape === 'email' ? (
            champ('reset-email', 'Email du compte', 'mail',
              <input id="reset-email" className="login-input" type="email" autoComplete="email" inputMode="email"
                placeholder="votre@email.com" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />)
          ) : (
            <>
              {champ('reset-code', 'Code reçu (6 chiffres)', 'inbox',
                <input id="reset-code" className="login-input mono" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                  placeholder="000000" autoFocus required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />)}
              {champ('reset-mdp', 'Nouveau mot de passe', 'lock',
                <input id="reset-mdp" className="login-input" type="password" autoComplete="new-password"
                  placeholder="••••••••" required value={mdp} onChange={(e) => setMdp(e.target.value)} />,
                '8 caractères min., une majuscule, un chiffre et un caractère spécial.')}
              {champ('reset-confirmation', 'Confirmation', 'lock',
                <input id="reset-confirmation" className="login-input" type="password" autoComplete="new-password"
                  placeholder="••••••••" required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />)}
            </>
          )}

          <button className="login-submit" disabled={envoi}>
            {envoi ? 'Envoi…' : etape === 'email' ? 'Recevoir un code' : 'Réinitialiser'}
          </button>

          <div className="login-liens">
            <Link to="/login">← Retour à la connexion</Link>
            {etape === 'code' && <button type="button" className="lien" onClick={() => setEtape('email')}>Renvoyer un code</button>}
          </div>
        </form>

        <p className="login-card-foot">
          Accès réservé aux administrateurs Yobante
          <br />© {new Date().getFullYear()} Yobante · Administration
        </p>
      </section>
    </main>
  );
}
