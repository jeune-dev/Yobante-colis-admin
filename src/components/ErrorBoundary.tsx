import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Change de valeur (ex. l'URL) pour effacer l'erreur quand on quitte la page fautive. */
  cle?: string;
}

interface Etat {
  erreur: Error | null;
  cle?: string;
}

/**
 * Filet de sécurité : une erreur de rendu (donnée d'API inattendue, bug) affiche un
 * message au lieu d'une page blanche, sans masquer la navigation.
 */
export default class ErrorBoundary extends Component<Props, Etat> {
  state: Etat = { erreur: null, cle: this.props.cle };

  static getDerivedStateFromError(erreur: Error): Partial<Etat> {
    return { erreur };
  }

  static getDerivedStateFromProps(props: Props, etat: Etat): Partial<Etat> | null {
    return props.cle !== etat.cle ? { erreur: null, cle: props.cle } : null;
  }

  componentDidCatch(erreur: Error, info: ErrorInfo) {
    // Trace pour le diagnostic en développement ; aucune donnée n'est envoyée à un tiers
    if (import.meta.env.DEV) console.error(erreur, info.componentStack);
  }

  render() {
    if (!this.state.erreur) return this.props.children;
    return (
      <div className="alert error" role="alert" style={{ flexDirection: 'column' }}>
        <strong>Cette page a rencontré une erreur inattendue.</strong>
        <span className="small">Rechargez la page. Si le problème persiste, signalez-le avec l'adresse de la page.</span>
        <button className="btn secondary sm" style={{ alignSelf: 'flex-start', marginTop: 8 }} onClick={() => window.location.reload()}>
          Recharger
        </button>
      </div>
    );
  }
}
