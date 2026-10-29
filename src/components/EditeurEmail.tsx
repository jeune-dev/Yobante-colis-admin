/* ──────────────────────────────────────────────────────────
   Éditeur visuel des emails (TipTap) : l'admin écrit un texte mis en
   forme, sans jamais voir de balise. Les variables `{{prenom}}` sont des
   pastilles insécables ; l'éditeur reçoit et renvoie le HTML attendu par
   l'API, variables comprises.
   ────────────────────────────────────────────────────────── */
import { forwardRef, useEffect, useImperativeHandle, useState, type CSSProperties } from 'react';
import { EditorContent, Extension, Node, mergeAttributes, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import History from '@tiptap/extension-history';
import Icon from './Icon';
import { depuisEditeur, versEditeur } from '@/lib/editeurEmail';

/** Texte brut de l'objet (une seule ligne, sans balise). */
const texteObjet = (editeur: Editor) =>
  depuisEditeur(editeur.getHTML())
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const echapper = (texte: string) => texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ── Extensions ──────────────────────────────────────────────────────── */

/** Pastille de variable : un seul bloc, supprimé ou déplacé d'un coup. */
const Variable = Node.create<{ libelle: (nom: string) => string }>({
  name: 'variable',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addOptions: () => ({ libelle: (nom: string) => nom }),
  addAttributes: () => ({
    nom: { default: null, parseHTML: (el) => el.getAttribute('data-variable') },
  }),
  parseHTML: () => [{ tag: 'span[data-variable]' }],
  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-variable': node.attrs.nom, class: 'variable-pastille' }),
      this.options.libelle(node.attrs.nom),
    ];
  },
  renderText: ({ node }) => `{{${node.attrs.nom}}}`,
});

/** Conserve les styles déjà présents dans les modèles (grand code de vérification…). */
const StylesConserves = Extension.create({
  name: 'stylesConserves',
  addGlobalAttributes: () => [
    {
      types: ['paragraph', 'heading', 'bold'],
      attributes: {
        style: {
          default: null,
          parseHTML: (el) => el.getAttribute('style'),
          renderHTML: (attrs) => (attrs.style ? { style: attrs.style } : {}),
        },
      },
    },
  ],
});

/** Objet : une seule ligne, Entrée ne crée pas de paragraphe. */
const UneLigne = Extension.create({
  name: 'uneLigne',
  addKeyboardShortcuts: () => ({ Enter: () => true, 'Shift-Enter': () => true }),
});

/* ── Composants ──────────────────────────────────────────────────────── */

export interface EditeurRef {
  /** Insère une variable à l'emplacement du curseur. */
  inserer: (nom: string) => void;
}

interface Props {
  valeur: string;
  onChange: (valeur: string) => void;
  libelle: (nom: string) => string;
  onFocus?: () => void;
  id?: string;
}

/** Contenu de l'email : texte mis en forme avec barre d'outils. */
export const EditeurContenu = forwardRef<EditeurRef, Props>(function EditeurContenu(
  { valeur, onChange, libelle, onFocus, id },
  ref
) {
  const [saisieLien, setSaisieLien] = useState<string | null>(null);
  const editeur = useEditor({
    extensions: [
      StarterKit.configure({ code: false, codeBlock: false, blockquote: false, horizontalRule: false, strike: false }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: 'Rédigez le message envoyé au client…' }),
      Variable.configure({ libelle }),
      StylesConserves,
    ],
    content: versEditeur(valeur),
    editorProps: {
      attributes: { class: 'editeur-texte', id: id ?? '', 'aria-multiline': 'true', role: 'textbox', 'aria-labelledby': `${id}-libelle` },
    },
    onUpdate: ({ editor }) => onChange(depuisEditeur(editor.getHTML())),
    onFocus: () => onFocus?.(),
  });

  useImperativeHandle(ref, () => ({
    inserer: (nom) => editeur?.chain().focus().insertContent({ type: 'variable', attrs: { nom } }).insertContent(' ').run(),
  }));

  // Valeur remplacée de l'extérieur (rétablissement du modèle par défaut)
  useEffect(() => {
    if (editeur && depuisEditeur(editeur.getHTML()) !== valeur) {
      editeur.commands.setContent(versEditeur(valeur), false);
    }
  }, [editeur, valeur]);

  if (!editeur) return null;

  // Champ d'adresse affiché sous la barre (pas de fenêtre du navigateur)
  const lien = () => setSaisieLien((editeur.getAttributes('link').href as string | undefined) ?? 'https://');
  const appliquerLien = () => {
    const url = (saisieLien ?? '').trim();
    if (!url || url === 'https://') editeur.chain().focus().extendMarkRange('link').unsetLink().run();
    else editeur.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    setSaisieLien(null);
  };

  const boutons: { icone: ReactIcone; titre: string; actif?: boolean; action: () => void; separe?: boolean }[] = [
    { icone: { texte: 'G', style: { fontWeight: 700 } }, titre: 'Gras', actif: editeur.isActive('bold'), action: () => editeur.chain().focus().toggleBold().run() },
    { icone: { texte: 'I', style: { fontStyle: 'italic', fontFamily: 'Georgia, serif' } }, titre: 'Italique', actif: editeur.isActive('italic'), action: () => editeur.chain().focus().toggleItalic().run() },
    { icone: { texte: 'S', style: { textDecoration: 'underline' } }, titre: 'Souligné', actif: editeur.isActive('underline'), action: () => editeur.chain().focus().toggleUnderline().run() },
    { icone: { nom: 'list' }, titre: 'Liste à puces', actif: editeur.isActive('bulletList'), action: () => editeur.chain().focus().toggleBulletList().run(), separe: true },
    { icone: { nom: 'list-ordered' }, titre: 'Liste numérotée', actif: editeur.isActive('orderedList'), action: () => editeur.chain().focus().toggleOrderedList().run() },
    { icone: { nom: 'link' }, titre: 'Lien', actif: editeur.isActive('link'), action: lien, separe: true },
    { icone: { nom: 'undo' }, titre: 'Annuler', action: () => editeur.chain().focus().undo().run(), separe: true },
    { icone: { nom: 'redo' }, titre: 'Rétablir', action: () => editeur.chain().focus().redo().run() },
  ];

  return (
    <div className="editeur">
      <div className="editeur-barre" role="toolbar" aria-label="Mise en forme">
        {boutons.map((b) => (
          <span key={b.titre} className="editeur-barre-groupe">
            {b.separe && <span className="editeur-barre-sep" aria-hidden="true" />}
            <button
              type="button"
              className={`editeur-outil${b.actif ? ' actif' : ''}`}
              title={b.titre}
              aria-label={b.titre}
              aria-pressed={b.actif}
              onMouseDown={(e) => e.preventDefault()}
              onClick={b.action}
            >
              {'texte' in b.icone ? <span style={b.icone.style}>{b.icone.texte}</span> : <Icon name={b.icone.nom} size={16} />}
            </button>
          </span>
        ))}
      </div>
      {saisieLien !== null && (
        <div className="editeur-lien">
          <Icon name="link" size={15} />
          <input
            className="input"
            autoFocus
            value={saisieLien}
            placeholder="https://… ou {{lien}}"
            onChange={(e) => setSaisieLien(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                appliquerLien();
              }
              if (e.key === 'Escape') {
                // Ne ferme que le champ du lien, pas la fenêtre d'édition
                e.stopPropagation();
                setSaisieLien(null);
              }
            }}
          />
          <button type="button" className="btn sm" onClick={appliquerLien}>
            Appliquer
          </button>
          <button type="button" className="btn ghost sm" onClick={() => setSaisieLien(null)}>
            Annuler
          </button>
        </div>
      )}
      <EditorContent editor={editeur} />
    </div>
  );
});

type ReactIcone = { texte: string; style: CSSProperties } | { nom: string };

/** Objet de l'email : une ligne, variables en pastilles. */
export const EditeurObjet = forwardRef<EditeurRef, Props>(function EditeurObjet(
  { valeur, onChange, libelle, onFocus, id },
  ref
) {
  const editeur = useEditor({
    extensions: [Document, Paragraph, Text, History, UneLigne, Variable.configure({ libelle })],
    content: `<p>${versEditeur(echapper(valeur))}</p>`,
    editorProps: { attributes: { class: 'editeur-ligne', id: id ?? '', role: 'textbox', 'aria-labelledby': `${id}-libelle` } },
    onUpdate: ({ editor }) => onChange(texteObjet(editor)),
    onFocus: () => onFocus?.(),
  });

  useImperativeHandle(ref, () => ({
    inserer: (nom) => editeur?.chain().focus().insertContent({ type: 'variable', attrs: { nom } }).run(),
  }));

  useEffect(() => {
    if (editeur && texteObjet(editeur) !== valeur) {
      editeur.commands.setContent(`<p>${versEditeur(echapper(valeur))}</p>`, false);
    }
  }, [editeur, valeur]);

  return <EditorContent editor={editeur} className="champ-editeur" />;
});
