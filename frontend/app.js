// Point d'entrée du frontend.
// Ce fichier ne contient pas la logique détaillée:
// il branche simplement les événements et orchestre les modules.
(function bootstrapApp(global) {
    const { AppApi, AppDom, AppRecords, AppUi, SACREMENT_TYPES } = global;

    document.addEventListener('DOMContentLoaded', initApplication);

    // Lance l'initialisation globale de l'interface après chargement du DOM.
    function initApplication() {
        bindEvents();
        AppUi.resetStats();
        restoreSession();
    }

    // Branche tous les événements utilisateur sur les handlers applicatifs.
    function bindEvents() {
        AppDom.loginForm.addEventListener('submit', handleLoginSubmit);
        AppDom.passwordForm.addEventListener('submit', handlePasswordChangeSubmit);
        document.querySelectorAll('[data-password-toggle]').forEach((button) => {
            button.addEventListener('click', handlePasswordToggle);
        });
        AppDom.logoutButton.addEventListener('click', handleLogoutClick);
        AppDom.mariageForm.addEventListener('submit', handleMariageSubmit);
        AppDom.sacrementForm.addEventListener('submit', handleSacrementSubmit);
        AppDom.editSacrementForm.addEventListener('submit', handleEditSacrementSubmit);
        AppDom.editMariageForm.addEventListener('submit', handleEditMariageSubmit);
        AppDom.searchInput.addEventListener('input', handleSearchInput);
        AppDom.resultsPrevPage.addEventListener('click', () => handleTablePageChange('results', -1));
        AppDom.resultsNextPage.addEventListener('click', () => handleTablePageChange('results', 1));
        AppDom.archivesPrevPage.addEventListener('click', () => handleTablePageChange('archives', -1));
        AppDom.archivesNextPage.addEventListener('click', () => handleTablePageChange('archives', 1));
        AppDom.archivesExportCsv.addEventListener('click', handleArchiveExport);
        AppDom.confirmCancel.addEventListener('click', AppUi.closeDeleteConfirmation);
        AppDom.confirmDelete.addEventListener('click', AppRecords.deleteSelectedRecord);
        AppDom.editSacrementCancel.addEventListener('click', handleCancelEdit);
        AppDom.editSacrementClose.addEventListener('click', handleCancelEdit);
        AppDom.editMariageCancel.addEventListener('click', handleCancelEdit);
        AppDom.editMariageClose.addEventListener('click', handleCancelEdit);
        AppDom.pdfPreviewClose.addEventListener('click', AppRecords.closePdfPreview);
        AppDom.pdfPreviewCancel.addEventListener('click', AppRecords.closePdfPreview);
        AppDom.pdfPreviewDownload.addEventListener('click', AppRecords.downloadPdfPreview);

        AppDom.navButtons.forEach((button) => {
            button.addEventListener('click', async () => {
                AppRecords.cancelEditing();
                AppUi.showSection(button.dataset.sectionTarget);
                await AppRecords.refreshData();
            });
        });

        AppDom.dashboardActions.forEach((button) => {
            button.addEventListener('click', async () => {
                AppRecords.cancelEditing();
                AppUi.showSection(button.dataset.dashboardTarget);
                await AppRecords.refreshData();
            });
        });

        AppDom.dashboardCards.forEach((card) => {
            card.addEventListener('click', () => AppRecords.filterByType(card.dataset.filterType));
        });
    }

    function handlePasswordToggle(event) {
        const button = event.currentTarget;
        const input = button.parentElement.querySelector('input');
        const isVisible = input.type === 'text';

        input.type = isVisible ? 'password' : 'text';
        button.setAttribute('aria-pressed', String(!isVisible));
        button.setAttribute('aria-label', isVisible ? 'Afficher le mot de passe' : 'Masquer le mot de passe');
    }

    // Vérifie si une session admin existe déjà pour éviter une reconnexion.
    async function restoreSession() {
        try {
            const session = await AppApi.apiRequest('/api/session');

            if (session.authenticated) {
                AppUi.setAuthenticated(true);
                await AppRecords.refreshData();
            }
        } catch (error) {
            AppUi.showToast("Impossible de vérifier la session.", 'error');
        }
    }

    // Authentifie l'utilisateur puis charge les données si le mot de passe est valide.
    async function handleLoginSubmit(event) {
        event.preventDefault();

        try {
            await AppApi.apiRequest('/api/login', {
                method: 'POST',
                body: { password: AppDom.loginPassword.value }
            });

            AppDom.loginPassword.value = '';
            AppDom.loginError.hidden = true;
            AppUi.setAuthenticated(true);
            await AppRecords.refreshData();
        } catch (error) {
            AppDom.loginError.hidden = false;
            AppDom.loginError.textContent = error.message || 'Mot de passe incorrect';
        }
    }

    async function handlePasswordChangeSubmit(event) {
        event.preventDefault();
        const submitButton = event.submitter;
        AppUi.setButtonLoading(submitButton, true);

        if (AppDom.newPassword.value !== AppDom.confirmPassword.value) {
            AppUi.showToast('La confirmation du mot de passe est différente.', 'error');
            AppUi.setButtonLoading(submitButton, false);
            return;
        }

        try {
            await AppApi.apiRequest('/api/admin-password', {
                method: 'PUT',
                body: {
                    currentPassword: AppDom.currentPassword.value,
                    newPassword: AppDom.newPassword.value
                }
            });

            AppDom.currentPassword.value = '';
            AppDom.newPassword.value = '';
            AppDom.confirmPassword.value = '';
            AppUi.showToast('Mot de passe modifié avec succès.');
        } catch (error) {
            AppUi.showToast(error.message || 'Erreur lors de la modification du mot de passe.', 'error');
        } finally {
            AppUi.setButtonLoading(submitButton, false);
        }
    }

    async function handleLogoutClick() {
        try {
            await AppApi.apiRequest('/api/logout', {
                method: 'POST'
            });

            AppUi.setAuthenticated(false);
        } catch (error) {
            AppUi.showToast(error.message || 'Erreur lors de la déconnexion.', 'error');
        }
    }

    // Construit puis envoie un enregistrement de mariage au backend.
    async function handleMariageSubmit(event) {
        event.preventDefault();
        const submitButton = event.submitter;
        AppUi.setButtonLoading(submitButton, true);

        const payload = {
            type: SACREMENT_TYPES.MARIAGE,
            numero: getValue('mariage-numero'),
            epoux: getValue('mariage-epoux'),
            epouse: getValue('mariage-epouse'),
            pere_epoux: getValue('mariage-pere-epoux'),
            mere_epoux: getValue('mariage-mere-epoux'),
            pere_epouse: getValue('mariage-pere-epouse'),
            mere_epouse: getValue('mariage-mere-epouse'),
            temoinsEpoux: [
                getValue('mariage-temoin-epoux-1'),
                getValue('mariage-temoin-epoux-2')
            ],
            temoinsEpouse: [
                getValue('mariage-temoin-epouse-1'),
                getValue('mariage-temoin-epouse-2')
            ],
            date_mariage: getValue('mariage-date'),
            missionnaire: getValue('mariage-missionnaire'),
            lieu: getValue('mariage-lieu'),
            civil_numero: getValue('mariage-civil-numero'),
            civil_date: getValue('mariage-civil-date'),
            civil_lieu: getValue('mariage-civil-lieu')
        };

        try {
            await AppRecords.createMariage(payload);
            AppDom.mariageForm.reset();
            await AppRecords.refreshData();
            AppUi.showSection('accueil');
            AppUi.showToast('Mariage enregistré.');
        } catch (error) {
            AppUi.showToast(error.message || "Erreur lors de l'enregistrement du mariage.", 'error');
        } finally {
            AppUi.setButtonLoading(submitButton, false);
        }
    }

    // Construit puis envoie un enregistrement de sacrement au backend.
    async function handleSacrementSubmit(event) {
        event.preventDefault();
        const submitButton = event.submitter;
        AppUi.setButtonLoading(submitButton, true);

        const payload = {
            type: getValue('sacrement-type'),
            numero: getValue('sacrement-numero'),
            interesse: getValue('sacrement-interesse'),
            date_naissance: getValue('sacrement-date-naissance'),
            pere: getValue('sacrement-pere'),
            mere: getValue('sacrement-mere'),
            adresse: getValue('sacrement-adresse'),
            lieu: getValue('sacrement-lieu'),
            date_sacrement: getValue('sacrement-date'),
            parrain: getValue('sacrement-parrain'),
            marraine: getValue('sacrement-marraine'),
            mon_pere: getValue('sacrement-celebrant')
        };

        try {
            await AppRecords.createSacrement(payload);
            AppDom.sacrementForm.reset();
            await AppRecords.refreshData();
            AppUi.showSection('accueil');
            AppUi.showToast('Sacrement enregistré avec succès.');
        } catch (error) {
            AppUi.showToast(error.message || "Erreur lors de l'enregistrement du sacrement.", 'error');
        } finally {
            AppUi.setButtonLoading(submitButton, false);
        }
    }

    // Relance le rendu du tableau selon le texte saisi dans la recherche.
    function handleSearchInput() {
        AppUi.setTablePage('results', 1);
        AppUi.renderTable(AppRecords.getFilteredRecords(AppDom.searchInput.value));
    }

    function handleTablePageChange(pageKey, delta) {
        AppUi.goToTablePage(pageKey, delta, () => {
            if (pageKey === 'results') {
                AppUi.renderTable(AppRecords.getFilteredRecords(AppDom.searchInput.value));
                return;
            }

            AppUi.renderArchives(AppRecords.getArchiveRecords());
        });
    }

    function handleArchiveExport() {
        AppRecords.exportArchiveTable();
    }

    // Annule une modification en cours et revient à la liste filtrée.
    function handleCancelEdit() {
        AppRecords.cancelEditing();
    }

    async function handleEditSacrementSubmit(event) {
        event.preventDefault();
        const submitButton = event.submitter;
        AppUi.setButtonLoading(submitButton, true);

        try {
            await AppRecords.saveEditedSacrement();
            AppRecords.cancelEditing();
            await AppRecords.refreshData();
            AppUi.showToast('Sacrement modifié avec succès.');
        } catch (error) {
            AppUi.showToast(error.message || 'Erreur lors de la modification.', 'error');
        } finally {
            AppUi.setButtonLoading(submitButton, false);
        }
    }

    async function handleEditMariageSubmit(event) {
        event.preventDefault();
        const submitButton = event.submitter;
        AppUi.setButtonLoading(submitButton, true);

        try {
            await AppRecords.saveEditedMariage();
            AppRecords.cancelEditing();
            await AppRecords.refreshData();
            AppUi.showToast('Mariage modifié avec succès.');
        } catch (error) {
            AppUi.showToast(error.message || 'Erreur lors de la modification.', 'error');
        } finally {
            AppUi.setButtonLoading(submitButton, false);
        }
    }

    // Lit proprement la valeur d'un champ HTML et supprime les espaces inutiles.
    function getValue(id) {
        const element = document.getElementById(id);
        return element ? element.value.trim() : '';
    }
}(window));
