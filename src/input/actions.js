// =====================================================
//  Actions sémantiques — indépendantes du périphérique
// =====================================================
// Une action est un NOM. Elle est liée à des périphériques
// dans bindings.js, et consommée par le reste du jeu via
// input.<champ> (voir manager.js).
//
// Ajouter un périphérique = ajouter des bindings.
// Ajouter une action = ajouter une entrée ici + un binding.

export const ACTIONS = {
  // Mouvement
  MOVE_FORWARD: 'move_forward',
  MOVE_BACK:    'move_back',
  MOVE_LEFT:    'move_left',
  MOVE_RIGHT:   'move_right',
  SPRINT:       'sprint',

  // Caméra
  CAMERA:       'camera',        // axe analogique (dyaw, dpitch)
  ZOOM_IN:      'zoom_in',
  ZOOM_OUT:     'zoom_out',

  // Actions principales
  JUMP:         'jump',          // pressed + held (saut / plané / vol)
  INTERACT:     'interact',      // pressed + held (contextuel)
  SCAN:         'scan',          // held (vue spectrale)
  TRANSFORM:    'transform',     // pressed (roue de formes)
  SPIRIT:       'spirit',        // pressed (retour à soi / planète-esprit)

  // Prise de contrôle (Phase 5)
  ENTER_BODY:   'enter_body',    // pressed (entrer dans un animal proche)
  EXIT_BODY:    'exit_body',     // pressed (sortir d'un animal)

  // Système
  PAUSE:        'pause',
  PHOTO:        'photo',
  SAVE:         'save'
};

// Actions "pressed" (front montant d'une frame) — les autres sont "held"
export const PRESSED_ACTIONS = new Set([
  ACTIONS.JUMP,
  ACTIONS.INTERACT,
  ACTIONS.TRANSFORM,
  ACTIONS.SPIRIT,
  ACTIONS.ENTER_BODY,
  ACTIONS.EXIT_BODY,
  ACTIONS.PAUSE,
  ACTIONS.PHOTO,
  ACTIONS.SAVE,
  ACTIONS.ZOOM_IN,
  ACTIONS.ZOOM_OUT
]);
