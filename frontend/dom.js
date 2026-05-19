// Tous les accès DOM importants sont regroupés ici.
// Si un id ou une classe change dans le HTML, il suffit
// généralement de corriger ce fichier au lieu de chercher partout.
window.AppDom = {
    loginOverlay: document.getElementById('login-overlay'),
    loginForm: document.getElementById('login-form'),
    loginPassword: document.getElementById('admin-password'),
    loginError: document.getElementById('login-error'),
    alertBox: document.getElementById('custom-alert'),
    confirmDialog: document.getElementById('custom-confirm'),
    confirmCancel: document.getElementById('btn-confirm-annuler'),
    confirmDelete: document.getElementById('btn-confirm-oui'),
    mariageForm: document.getElementById('mariage-form'),
    sacrementForm: document.getElementById('sacrement-form'),
    searchInput: document.getElementById('searchInput'),
    resultsBody: document.querySelector('#resultsTable tbody'),
    navButtons: Array.from(document.querySelectorAll('[data-section-target]')),
    sections: Array.from(document.querySelectorAll('.content-section')),
    dashboardCards: Array.from(document.querySelectorAll('[data-filter-type]')),
    dashboardActions: Array.from(document.querySelectorAll('[data-dashboard-target]'))
};
