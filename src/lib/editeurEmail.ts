/* Conversion entre le HTML des modèles d'email (variables `{{x}}`) et celui
   de l'éditeur visuel (variables en pastilles `<span data-variable>`). */

/** `{{x}}` du texte → pastille ; les attributs (`href="{{lien}}"`) restent tels quels. */
export function versEditeur(html: string) {
  return html
    .split(/(<[^>]*>)/g)
    .map((morceau) =>
      morceau.startsWith('<') ? morceau : morceau.replace(/\{\{\s*(\w+)\s*\}\}/g, '<span data-variable="$1"></span>')
    )
    .join('');
}

/** Pastille → `{{x}}`, pour l'enregistrement. */
export function depuisEditeur(html: string) {
  return html.replace(/<span[^>]*data-variable="(\w+)"[^>]*>.*?<\/span>/g, '{{$1}}');
}
