import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import logo from '@/logo.png';
import { api } from '@/api/client';
import { ROLES_ADMIN, useAuth, type Utilisateur } from './store';
import Icon from '@/components/Icon';
import { ErrorBox } from '@/components/ui';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  utilisateur: Utilisateur;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { accessToken, setSession, clear } = useAuth();
  const [identifiant, setIdentifiant] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [erreur, setErreur] = useState<unknown>(null);
  const [envoi, setEnvoi] = useState(false);

  if (accessToken) return <Navigate to="/" replace />;

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      // Le backend accepte un email ou un numéro de téléphone comme identifiant
      const res = await api.post<LoginResponse>('/auth/login', { identifiant, password });
      if (!ROLES_ADMIN.includes(res.utilisateur.role)) {
        clear();
        throw new Error("Ce compte n'a pas accès à l'administration.");
      }
      setSession(res.accessToken, res.refreshToken, res.utilisateur);
      navigate('/', { replace: true });
    } catch (err) {
      setErreur(err);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-shell">
        <section className="login-showcase" aria-label="Yobante administration">
          <div className="login-showcase-content">
            <div className="login-mark">
              <img src={logo} alt="Yobante" />
            </div>
            <h1 className="login-headline">
              Pilotez vos expéditions <span>Yobante</span> depuis un seul espace
            </h1>
            <p className="login-description">
              La plateforme d'administration unifiée pour vos colis, vos conteneurs et votre réseau.
            </p>
            <ul className="login-benefits">
              <li><span><Icon name="check" size={14} /></span> Suivi des colis et des expéditions</li>
              <li><span><Icon name="check" size={14} /></span> Gestion des conteneurs et réclamations</li>
              <li><span><Icon name="check" size={14} /></span> Pilotage de vos équipes et opérations</li>
            </ul>
          </div>
          <p className="login-copyright">© {new Date().getFullYear()} Yobante · Administration</p>
        </section>

        <section className="login-panel" aria-labelledby="login-heading">
          <form className="login-form" onSubmit={soumettre}>
            <header className="login-form-heading">
              <h2 id="login-heading">Connexion</h2>
              <p>Accédez à votre espace d'administration</p>
            </header>

            <ErrorBox error={erreur} />

            <div className="login-field">
              <label className="login-label" htmlFor="login-identifiant">Email ou téléphone</label>
              <div className="login-input-wrap">
                <Icon name="mail" size={17} />
                <input
                  id="login-identifiant"
                  className="login-input"
                  type="text"
                  autoFocus
                  autoComplete="username"
                  placeholder="votre@email.com"
                  value={identifiant}
                  onChange={(e) => setIdentifiant(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="login-password">Mot de passe</label>
              <div className="login-input-wrap">
                <Icon name="lock" size={17} />
                <input
                  id="login-password"
                  className="login-input"
                  type={passwordVisible ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  className="login-password-toggle"
                  type="button"
                  aria-label={passwordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  aria-pressed={passwordVisible}
                  onClick={() => setPasswordVisible((visible) => !visible)}
                >
                  <Icon name={passwordVisible ? 'eye-off' : 'eye'} size={17} />
                </button>
              </div>
            </div>
            <Link to="/mot-de-passe-oublie" className="login-forgot">Mot de passe oublié ?</Link>

            <button className="login-submit" disabled={envoi}>
              {envoi ? 'Connexion…' : 'Se connecter'}
            </button>
            <p className="login-footnote">Accès réservé aux administrateurs Yobante</p>
          </form>
        </section>
      </div>
    </main>
  );
}
