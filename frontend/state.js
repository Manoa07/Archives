// Etat global minimal du frontend.
// On le garde centralisé ici pour éviter que plusieurs fichiers
// recréent chacun leur propre source de vérité.
window.AppState = {
    sacrements: [],
    mariages: [],
    editingRecordId: null,
    editingRecordType: null,
    deleteTargetId: null,
    deleteTargetType: null
};

// Constantes métier utilisées dans plusieurs vues.
window.SACREMENT_TYPES = {
    BAPTEME: 'Baptême',
    COMMUNION: 'Première Communion',
    CONFIRMATION: 'Confirmation',
    COMMUNION_SOLENNELLE: 'Communion Solennelle',
    MARIAGE: 'Mariage'
};
