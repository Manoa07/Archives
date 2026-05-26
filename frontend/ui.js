// Helpers purement visuels: sections, notifications, compteurs,
// rendu du tableau et dialogue de confirmation.
(function attachUi(global) {
    const { AppDom, AppState, SACREMENT_TYPES } = global;

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
        renderRecordsIntoBody(AppDom.resultsBody, records, 'all');
    }

    // Rend le tableau d'archives avec toutes les informations disponibles.
    function renderArchives(records) {
        if (!AppDom.archivesBody) {
            return;
        }

        AppDom.archivesBody.innerHTML = '';

        if (!records.length) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 12;
            cell.textContent = 'Aucune archive disponible.';
            cell.className = 'empty-cell';
            row.appendChild(cell);
            AppDom.archivesBody.appendChild(row);
            return;
        }

        records.forEach((record, index) => {
            const row = document.createElement('tr');
            const isMariage = record.type === SACREMENT_TYPES.MARIAGE;

            row.appendChild(createCell(formatDisplayDate(resolveRecordDate(record))));
            row.appendChild(createCell(resolveRecordName(record)));
            row.appendChild(createCell(resolveParents(record, isMariage)));
            row.appendChild(createCell(isMariage ? '' : (record.adresse || 'Non precise')));
            row.appendChild(createCell(resolveAge(record.date_naissance)));
            row.appendChild(createCell(resolveParrain(record, isMariage)));
            row.appendChild(createCell(resolveMarraine(record, isMariage)));
            row.appendChild(createCell(resolveMissionnaire(record, isMariage)));
            row.appendChild(createCell(isMariage ? '' : (record.type || 'Non precise')));
            row.appendChild(createCell(isMariage ? 'Oui' : ''));
            row.appendChild(createCell(record.deces || ''));
            row.appendChild(createCell(String(index + 1)));

            AppDom.archivesBody.appendChild(row);
        });
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
        resolveRecordName,
        resolveRecordDate
    };
}(window));
