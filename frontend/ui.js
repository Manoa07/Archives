// Helpers purement visuels: sections, notifications, compteurs,
// rendu du tableau et dialogue de confirmation.
(function attachUi(global) {
    const { AppDom, AppState, SACREMENT_TYPES } = global;
    const TABLE_PAGE_SIZE = 20;

    // Affiche une section et synchronise l'état actif du menu principal.
    function showSection(sectionId) {
        AppDom.sections.forEach((section) => {
            section.classList.toggle('active', section.id === sectionId);
        });

        AppDom.navButtons.forEach((button) => {
            button.classList.toggle('active', button.dataset.sectionTarget === sectionId);
        });
    }

    // Affiche ou masque l'écran de connexion selon l'état d'authentification.
    function setAuthenticated(isAuthenticated) {
        AppDom.loginOverlay.hidden = isAuthenticated;
        AppDom.loginOverlay.style.display = isAuthenticated ? 'none' : 'flex';
    }

    // Affiche un message temporaire de succès ou d'erreur.
    function showToast(message, type = 'success') {
        AppDom.alertBox.textContent = message;
        AppDom.alertBox.style.backgroundColor = type === 'error' ? '#e74c3c' : '#2ecc71';
        AppDom.alertBox.style.display = 'block';

        window.setTimeout(() => {
            AppDom.alertBox.style.display = 'none';
        }, 3000);
    }

    // Désactive temporairement un bouton pendant une opération asynchrone.
    function setButtonLoading(button, isLoading) {
        if (!button) {
            return;
        }

        button.disabled = isLoading;
    }

    // Ouvre la fenêtre de confirmation de suppression pour un enregistrement donné.
    function openDeleteConfirmation(recordId) {
        AppState.deleteTargetId = recordId;
        AppDom.confirmDialog.style.display = 'flex';
    }

    // Mémorise l'identifiant et le type du document à supprimer avant confirmation.
    function setDeleteTarget(recordId, recordType) {
        AppState.deleteTargetId = recordId;
        AppState.deleteTargetType = recordType;
        AppDom.confirmDialog.style.display = 'flex';
    }

    // Ferme la fenêtre de confirmation et nettoie la sélection courante.
    function closeDeleteConfirmation() {
        AppState.deleteTargetId = null;
        AppState.deleteTargetType = null;
        AppDom.confirmDialog.style.display = 'none';
    }

    // Anime un compteur numérique pour rendre le dashboard plus lisible.
    function animateCounter(id, target) {
        const element = document.getElementById(id);

        if (!element) {
            return;
        }

        const durationMs = 600;
        const frameMs = 16;
        const step = target / Math.max(1, durationMs / frameMs);
        let current = 0;

        const timer = setInterval(() => {
            current += step;

            if (current >= target) {
                element.textContent = target;
                clearInterval(timer);
                return;
            }

            element.textContent = Math.floor(current);
        }, frameMs);
    }

    // Réinitialise tous les compteurs du tableau de bord à zéro.
    function resetStats() {
        ['nb-bapteme', 'nb-communion', 'nb-confirmation', 'nb-solennelle', 'nb-mariage']
            .forEach((id) => animateCounter(id, 0));
    }

    // Calcule les totaux par type et met à jour les cartes statistiques.
    function renderDashboard(records) {
        const counts = {
            [SACREMENT_TYPES.BAPTEME]: 0,
            [SACREMENT_TYPES.COMMUNION]: 0,
            [SACREMENT_TYPES.CONFIRMATION]: 0,
            [SACREMENT_TYPES.COMMUNION_SOLENNELLE]: 0,
            [SACREMENT_TYPES.MARIAGE]: 0
        };

        records.forEach((record) => {
            if (counts[record.type] !== undefined) {
                counts[record.type] += 1;
            }
        });

        animateCounter('nb-bapteme', counts[SACREMENT_TYPES.BAPTEME]);
        animateCounter('nb-communion', counts[SACREMENT_TYPES.COMMUNION]);
        animateCounter('nb-confirmation', counts[SACREMENT_TYPES.CONFIRMATION]);
        animateCounter('nb-solennelle', counts[SACREMENT_TYPES.COMMUNION_SOLENNELLE]);
        animateCounter('nb-mariage', counts[SACREMENT_TYPES.MARIAGE]);
    }

    // Rend le tableau principal à partir d'une liste d'enregistrements.
    function renderTable(records) {
        renderPaginatedRecords({
            tbody: AppDom.resultsBody,
            pager: AppDom.resultsPager,
            prevButton: AppDom.resultsPrevPage,
            nextButton: AppDom.resultsNextPage,
            label: AppDom.resultsPageLabel,
            records,
            mode: 'all',
            pageKey: 'results'
        });
    }

    // Rend le tableau d'archives avec toutes les informations disponibles.
    function renderArchives(records) {
        renderPaginatedRecords({
            tbody: AppDom.archivesBody,
            pager: AppDom.archivesPager,
            prevButton: AppDom.archivesPrevPage,
            nextButton: AppDom.archivesNextPage,
            label: AppDom.archivesPageLabel,
            records,
            mode: 'archives',
            pageKey: 'archives'
        });
    }

    // Rend la section archive dédiée aux mariages.
    function renderArchiveMariage(records) {
        renderPaginatedRecords({
            tbody: AppDom.archiveMariageBody,
            pager: AppDom.archiveMariagePager,
            prevButton: AppDom.archiveMariagePrevPage,
            nextButton: AppDom.archiveMariageNextPage,
            label: AppDom.archiveMariagePageLabel,
            records,
            mode: 'archiveMariage',
            pageKey: 'archiveMariage'
        });
    }

    function renderPaginatedRecords({ tbody, pager, prevButton, nextButton, label, records, mode, pageKey }) {
        if (!tbody) {
            return;
        }

        const totalPages = Math.max(1, Math.ceil(records.length / TABLE_PAGE_SIZE));
        const currentPage = Math.min(AppState.tablePages[pageKey] || 1, totalPages);
        AppState.tablePages[pageKey] = currentPage;
        const startIndex = (currentPage - 1) * TABLE_PAGE_SIZE;
        const pageRecords = records.slice(startIndex, startIndex + TABLE_PAGE_SIZE);

        tbody.innerHTML = '';

        if (!records.length) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = mode === 'archives' ? 12 : mode === 'archiveMariage' ? 8 : 4;
            cell.textContent = mode === 'archives'
                ? 'Aucune archive disponible.'
                : mode === 'archiveMariage'
                    ? 'Aucun mariage disponible.'
                    : 'Aucun résultat.';
            cell.className = 'empty-cell';
            row.appendChild(cell);
            tbody.appendChild(row);
            updatePaginationControls({ pager, prevButton, nextButton, label, currentPage: 1, totalPages: 1 });
            return;
        }

        if (mode === 'archives') {
            pageRecords.forEach((record, index) => {
                const row = document.createElement('tr');
                const isMariage = record.type === SACREMENT_TYPES.MARIAGE;

                row.appendChild(createCell(formatDisplayDate(resolveRecordDate(record))));
                row.appendChild(createCell(resolveRecordName(record)));
                row.appendChild(createCell(resolveParents(record, isMariage)));
                row.appendChild(createCell(isMariage ? '' : (record.adresse || 'Non precise')));
                row.appendChild(createCell(resolveBirthDate(record)));
                row.appendChild(createCell(resolveParrain(record, isMariage)));
                row.appendChild(createCell(resolveMarraine(record, isMariage)));
                row.appendChild(createCell(resolveMissionnaire(record, isMariage)));
                row.appendChild(createCell(isMariage ? '' : (record.type || 'Non precise')));
                row.appendChild(createCell(resolveMariageInfo(record)));
                row.appendChild(createCell(record.deces || ''));
                row.appendChild(createCell(resolveRecordNumero(record, startIndex + index + 1)));

                tbody.appendChild(row);
            });
        } else if (mode === 'archiveMariage') {
            pageRecords.forEach((record, index) => {
                const row = document.createElement('tr');

                row.appendChild(createCell(formatDisplayDate(resolveRecordDate(record))));
                row.appendChild(createCell(resolveRecordNumero(record)));
                row.appendChild(createCell(resolveRecordName(record)));
                row.appendChild(createCell(resolveParents(record, true)));
                row.appendChild(createCell((record.temoinsEpoux || []).filter(Boolean).join(' / ') || 'Non precise'));
                row.appendChild(createCell((record.temoinsEpouse || []).filter(Boolean).join(' / ') || 'Non precise'));
                row.appendChild(createCell(resolveMissionnaire(record, true)));
                row.appendChild(createCell(record.lieu || 'Non precise'));

                tbody.appendChild(row);
            });
        } else {
            pageRecords.forEach((record) => {
                const row = document.createElement('tr');
                row.appendChild(createCell(resolveRecordName(record)));
                row.appendChild(createCell(record.type || 'Non precise'));
                row.appendChild(createCell(formatDisplayDate(resolveRecordDate(record))));
                row.appendChild(createActionsCell(record, mode));
                tbody.appendChild(row);
            });
        }

        updatePaginationControls({ pager, prevButton, nextButton, label, currentPage, totalPages });
    }

    function updatePaginationControls({ pager, prevButton, nextButton, label, currentPage, totalPages }) {
        if (!pager || !prevButton || !nextButton || !label) {
            return;
        }

        pager.hidden = totalPages <= 1;
        label.textContent = `Page ${currentPage} / ${totalPages}`;
        prevButton.disabled = currentPage <= 1;
        nextButton.disabled = currentPage >= totalPages;
    }

    function setTablePage(pageKey, page) {
        AppState.tablePages[pageKey] = Math.max(1, page);
    }

    function goToTablePage(pageKey, delta, rerender) {
        setTablePage(pageKey, (AppState.tablePages[pageKey] || 1) + delta);
        rerender();
    }

    // Reconstruit le corps d'un tableau HTML avec les enregistrements fournis.
    function renderRecordsIntoBody(tbody, records, mode) {
        if (!tbody) {
            return;
        }

        tbody.innerHTML = '';

        if (!records.length) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 4;
            cell.textContent = 'Aucun résultat.';
            cell.className = 'empty-cell';
            row.appendChild(cell);
            tbody.appendChild(row);
            return;
        }

        records.forEach((record) => {
            const row = document.createElement('tr');
            row.appendChild(createCell(resolveRecordName(record)));
            row.appendChild(createCell(record.type || 'Non precise'));
            row.appendChild(createCell(formatDisplayDate(resolveRecordDate(record))));
            row.appendChild(createActionsCell(record, mode));
            tbody.appendChild(row);
        });
    }

    // Crée une cellule simple contenant un texte.
    function createCell(text) {
        const cell = document.createElement('td');
        cell.textContent = text;
        return cell;
    }

    // Construit la cellule d'actions avec PDF et suppression selon le type.
    function createActionsCell(record) {
        const cell = document.createElement('td');
        const wrapper = document.createElement('div');
        wrapper.className = 'table-actions';

        if (record.type === SACREMENT_TYPES.BAPTEME) {
            const pdfButton = document.createElement('button');
            pdfButton.type = 'button';
            pdfButton.className = 'btn-action btn-secondary';
            pdfButton.textContent = 'PDF';
            pdfButton.addEventListener('click', () => global.AppRecords.generatePdfBaptem(record));
            wrapper.appendChild(pdfButton);
        } else if (record.type === SACREMENT_TYPES.MARIAGE) {
            const pdfButton = document.createElement('button');
            pdfButton.type = 'button';
            pdfButton.className = 'btn-action btn-secondary';
            pdfButton.textContent = 'PDF';
            pdfButton.addEventListener('click', () => global.AppRecords.generatePdfMariage(record));
            wrapper.appendChild(pdfButton);
        } else {
            const pdfButton = document.createElement('button');
            pdfButton.type = 'button';
            pdfButton.className = 'btn-action btn-secondary';
            pdfButton.textContent = 'PDF';
            pdfButton.addEventListener('click', () => global.AppRecords.generatePdf(record));
            wrapper.appendChild(pdfButton);
        }

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'btn-action btn-edit';
        editButton.textContent = 'Modifier';
        editButton.addEventListener('click', () => global.AppRecords.startEditingRecord(record._id, record.type));
        wrapper.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'btn-action btn-danger';
        deleteButton.textContent = 'Supprimer';
        deleteButton.addEventListener('click', () => setDeleteTarget(record._id, record.type));
        wrapper.appendChild(deleteButton);

        cell.appendChild(wrapper);
        return cell;
    }

    // Retourne le nom principal à afficher selon qu'il s'agit d'un mariage ou non.
    function resolveRecordName(record) {
        if (record.type === SACREMENT_TYPES.MARIAGE) {
            return [record.epoux, record.epouse].filter(Boolean).join(' / ') || 'Non precise';
        }

        return record.interesse || 'Non precise';
    }

    // Retourne la date du sacrement pertinente pour l'affichage dans le tableau.
    function resolveRecordDate(record) {
        return record.date_sacrement || record.date_mariage || 'Non precise';
    }

    // Met en forme une date ISO pour un affichage plus lisible.
    function formatDisplayDate(value) {
        if (!value || value === 'Non precise') {
            return 'Non precise';
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString('fr-FR');
    }

    // Assemble les parents lorsqu'ils existent, sinon affiche les témoins de mariage.
    function resolveParents(record, isMariage) {
        if (isMariage) {
            const temoins = [
                ...(record.temoinsEpoux || []),
                ...(record.temoinsEpouse || [])
            ].filter(Boolean);

            return temoins.join(' / ') || 'Non precise';
        }

        return [record.pere, record.mere].filter(Boolean).join(' / ') || 'Non precise';
    }

    // Calcule l'âge approximatif à partir de la date de naissance.
    function resolveAge(dateNaissance) {
        if (!dateNaissance) {
            return '';
        }

        const birthDate = new Date(dateNaissance);

        if (Number.isNaN(birthDate.getTime())) {
            return '';
        }

        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age -= 1;
        }

        return age >= 0 ? `${age} ans` : '';
    }

    // Réutilise la colonne parrain pour les témoins du côté époux lorsqu'il s'agit d'un mariage.
    function resolveParrain(record, isMariage) {
        if (isMariage) {
            return (record.temoinsEpoux || []).filter(Boolean).join(' / ') || '';
        }

        return record.parrain || '';
    }

    // Réutilise la colonne marraine pour les témoins du côté épouse lorsqu'il s'agit d'un mariage.
    function resolveMarraine(record, isMariage) {
        if (isMariage) {
            return (record.temoinsEpouse || []).filter(Boolean).join(' / ') || '';
        }

        return record.marraine || '';
    }

    // Retourne l'officiant du sacrement ou du mariage selon le type de document.
    function resolveMissionnaire(record, isMariage) {
        if (isMariage) {
            return record.missionnaire || '';
        }

        return record.mon_pere || 'Non precise';
    }

    // Retourne la date de naissance affichable selon le type d'enregistrement.
    function resolveBirthDate(record) {
        return record.date_naissance || 'Non precise';
    }

    // Retourne le numéro enregistré, avec un fallback stable pour les anciennes données.
    function resolveRecordNumero(record, fallback = 'Non precise') {
        return record.numero || fallback;
    }

    // Compare les informations de la base mariages pour afficher le nom du conjoint
    // dans la colonne "Mariage" de la section Archives.
    // Étape 1 : le nom de l'interesse doit correspondre à l'époux ou l'épouse.
    // Étape 2 : les parents fortifient la correspondance (si un seul parent est
    // renseigné dans le mariage suite à un décès, on compare juste ce parent).
    function resolveMariageInfo(record) {
        if (record.type === SACREMENT_TYPES.MARIAGE) {
            return 'Oui';
        }

        const interesse = (record.interesse || '').trim().toUpperCase();
        const pere = (record.pere || '').trim().toUpperCase();
        const mere = (record.mere || '').trim().toUpperCase();

        if (!interesse) {
            return '';
        }

        // Étape 1 : trouver les mariages où le nom de l'interesse correspond
        // exactement à l'époux ou à l'épouse.
        const mariagesCandidats = AppState.mariages.filter((mariage) => {
            const epoux = (mariage.epoux || '').trim().toUpperCase();
            const epouse = (mariage.epouse || '').trim().toUpperCase();

            return epoux === interesse || epouse === interesse;
        });

        if (!mariagesCandidats.length) {
            return '';
        }

        // Étape 2 : fortifier la correspondance avec les parents.
        // On cherche un mariage candidat dont les parents correspondent aussi.
        // Si c'est l'époux qui correspond au nom, on compare avec les parents de l'époux.
        // Si c'est l'épouse qui correspond au nom, on compare avec les parents de l'épouse.
        let mariageTrouve = mariagesCandidats.find((mariage) => {
            const epoux = (mariage.epoux || '').trim().toUpperCase();
            const epouse = (mariage.epouse || '').trim().toUpperCase();

            if (epoux === interesse) {
                return parentsCorrespondent(pere, mere, mariage.pere_epoux, mariage.mere_epoux);
            }

            return parentsCorrespondent(pere, mere, mariage.pere_epouse, mariage.mere_epouse);
        });

        // Si aucun candidat ne correspond par les parents, on garde le premier candidat
        // (le nom est la base de la correspondance, les parents servent à fortifier).
        if (!mariageTrouve) {
            mariageTrouve = mariagesCandidats[0];
        }

        // Affiche le nom du conjoint (l'autre personne du mariage).
        const epoux = (mariageTrouve.epoux || '').trim();
        const epouse = (mariageTrouve.epouse || '').trim();

        if (epoux.toUpperCase() === interesse) {
            return epouse || 'Non precise';
        }

        return epoux || 'Non precise';
    }

    // Vérifie si les parents d'un sacrement correspondent aux parents d'un époux/épouse.
    // Gère le cas où un seul parent est renseigné dans le mariage (ex: décès de l'autre parent).
    // - Si un seul parent est renseigné d'un côté, on compare uniquement ce parent.
    // - Si les deux parents sont renseignés des deux côtés, les deux doivent correspondre.
    function parentsCorrespondent(pereSacrement, mereSacrement, pereMariage, mereMariage) {
        const pereS = (pereSacrement || '').trim().toUpperCase();
        const mereS = (mereSacrement || '').trim().toUpperCase();
        const pereM = (pereMariage || '').trim().toUpperCase();
        const mereM = (mereMariage || '').trim().toUpperCase();

        // Aucun parent renseigné d'un côté ou de l'autre → pas de fortification possible.
        if ((!pereS && !mereS) || (!pereM && !mereM)) {
            return false;
        }

        // Compare les parents renseignés des deux côtés.
        // Un parent absent d'un côté (ex: décès) est ignoré dans la comparaison.
        const pereCorrespond = !pereS || !pereM || pereS === pereM;
        const mereCorrespond = !mereS || !mereM || mereS === mereM;

        // Si les deux parents sont renseignés des deux côtés, les deux doivent correspondre.
        if (pereS && mereS && pereM && mereM) {
            return pereCorrespond && mereCorrespond;
        }

        // Sinon, les parents renseignés des deux côtés doivent correspondre.
        return pereCorrespond && mereCorrespond;
    }

    global.AppUi = {
        showSection,
        setAuthenticated,
        showToast,
        setButtonLoading,
        openDeleteConfirmation,
        setDeleteTarget,
        closeDeleteConfirmation,
        resetStats,
        renderDashboard,
        renderTable,
        renderArchives,
        renderArchiveMariage,
        setTablePage,
        goToTablePage,
        resolveRecordName,
        resolveRecordDate,
        resolveMariageInfo
    };
}(window));
