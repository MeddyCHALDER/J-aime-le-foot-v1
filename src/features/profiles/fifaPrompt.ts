/** Maillots proposés : couleurs « inspirées de », jamais d'écusson ni de marque (marques déposées). */
export const JERSEY_PRESETS: Array<{ label: string; colors: string; swatch: [string, string] }> = [
  {
    label: 'J’aime le foot',
    colors: 'vert lime avec col et manches noirs',
    swatch: ['#C6FF00', '#12140F'],
  },
  {
    label: 'Style Marseille',
    colors: 'blanc avec col et bandes d’épaules bleu ciel',
    swatch: ['#FFFFFF', '#2FAEE0'],
  },
  {
    label: 'Style Paris',
    colors: 'bleu marine avec une large bande verticale rouge au centre bordée de blanc',
    swatch: ['#0B1E4B', '#D7192D'],
  },
  {
    label: 'Style Milan',
    colors: 'rayures verticales rouges et noires',
    swatch: ['#C8102E', '#111111'],
  },
  {
    label: 'Style Barcelone',
    colors: 'rayures verticales bleu foncé et grenat',
    swatch: ['#004D98', '#A50044'],
  },
  {
    label: 'Bleu France',
    colors: 'bleu nuit uni avec un col fin blanc',
    swatch: ['#12223F', '#FFFFFF'],
  },
];

/** Prompt à coller dans ChatGPT avec le selfie en pièce jointe. */
export function buildFifaPrompt(jerseyColors: string) {
  const colors = jerseyColors.trim() || JERSEY_PRESETS[0].colors;
  return `Transforme la photo jointe en portrait officiel de joueur de football, style photo de carte FIFA.

IMPORTANT – garde exactement mon visage : mêmes traits, même couleur de peau, même coupe de cheveux, même barbe, même forme de visage. Ne m'embellis pas, ne me rajeunis pas, ne m'amincis pas. On doit me reconnaître immédiatement.

Cadrage : portrait vertical au format 4:5, de face, regard droit vers l'objectif, expression neutre et sérieuse, cadré des épaules jusqu'au-dessus de la tête, tête centrée.

Tenue : maillot de football moderne en tissu technique, col en V, ${colors}. Sans aucun logo, écusson, sponsor, marque, texte ni numéro.

Décor : fond studio gris clair uni, éclairage photo professionnel doux et homogène, sans ombres dures.

Rendu : photo réaliste, haute définition, aspect photo officielle de début de saison. Pas d'illustration, pas de dessin, pas de texte sur l'image.`;
}

/** Phrases à renvoyer dans la même conversation si le résultat n'est pas bon. */
export const FIFA_FIXES: Array<{ problem: string; text: string }> = [
  {
    problem: 'Le visage ne te ressemble pas',
    text: 'Le visage ne me ressemble pas. Refais l’image en gardant exactement le visage de ma photo, sans aucune modification des traits.',
  },
  {
    problem: 'Mauvais cadrage',
    text: 'Recadre de face, des épaules jusqu’au-dessus de la tête, tête bien centrée, format 4:5.',
  },
  {
    problem: 'Un logo ou du texte est apparu',
    text: 'Retire tout logo, écusson, marque et texte du maillot.',
  },
];

export const CHATGPT_URL = 'https://chatgpt.com/';
