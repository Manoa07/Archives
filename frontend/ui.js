// Helpers purement visuels: sections, notifications, compteurs,
// rendu du tableau et dialogue de confirmation.
(function attachUi(global) {
    const { AppDom, AppState, SACREMENT_TYPES } = global;

    function showSection(sectionId) {
        AppDom.sections.forEach((section) => {
            section.classList.toggle('active', section.id === sectionId);
        });

        AppDom.navButtons.forEach((button) => {
            button.classList.toggle('active', button.dataset.sectionTarget === sectionId);
        });
    }

    function setAuthenticated(isAuthenticated) {
        AppDom.loginOverlay.hidden = isAuthenticated;
        AppDom.loginOverlay.style.display = isAuthenticated ? 'none' : 'flex';
    }

    function showToast(message, type = 'success') {
        AppDom.alertBox.textContent = message;
        AppDom.alertBox.style.backgroundColor = type === 'error' ? '#e74c3c' : '#2ecc71';
        AppDom.alertBox.style.display = 'block';

        window.setTimeout(() => {
            AppDom.alertBox.style.display = 'none';
        }, 3000);
    }

    function setButtonLoading(button, isLoading) {
        if (!button) {
            return;
        }

        button.disabled = isLoading;
    }

    function openDeleteConfirmation(recordId) {
        AppState.deleteTargetId = recordId;
        AppDom.confirmDialog.style.display = 'flex';
    }

    function setDeleteTarget(recordId, recordType) {
        AppState.deleteTargetId = recordId;
        AppState.deleteTargetType = recordType;
        AppDom.confirmDialog.style.display = 'flex';
    }

    function closeDeleteConfirmation() {
        AppState.deleteTargetId = null;
        AppState.deleteTargetType = null;
        AppDom.confirmDialog.style.display = 'none';
    }

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

    function resetStats() {
        ['nb-bapteme', 'nb-communion', 'nb-confirmation', 'nb-solennelle', 'nb-mariage']
            .forEach((id) => animateCounter(id, 0));
    }

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

    function renderTable(records) {
        renderRecordsIntoBody(AppDom.resultsBody, records, 'all');
    }

    function renderRecordsIntoBody(tbody, records, mode) {
        if (!tbody) {
            return;
        }

        tbody.innerHTML = '';

        records.forEach((record) => {
            const row = document.createElement('tr');
            row.appendChild(createCell(resolveRecordName(record)));
            row.appendChild(createCell(record.type || 'Non precise'));
            row.appendChild(createCell(resolveRecordDate(record)));
            row.appendChild(createActionsCell(record, mode));
            tbody.appendChild(row);
        });
    }

    function createCell(text) {
        const cell = document.createElement('td');
        cell.textContent = text;
        return cell;
    }

    function createActionsCell(record) {
        const cell = document.createElement('td');
        const wrapper = document.createElement('div');
        wrapper.className = 'table-actions';

        if (record.type === SACREMENT_TYPES.BAPTEME) {
            const pdfButton = document.createElement('button');
            pdfButton.type = 'button';
            pdfButton.className = 'btn-action btn-secondary';
            pdfButton.textContent = 'PDF';
            pdfButton.addEventListener('click', () => global.AppRecords.generatePdf(record));
            wrapper.appendChild(pdfButton);
        }

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'btn-action btn-danger';
        deleteButton.textContent = 'Supprimer';
        deleteButton.addEventListener('click', () => setDeleteTarget(record._id, record.type));
        wrapper.appendChild(deleteButton);

        cell.appendChild(wrapper);
        return cell;
    }

    function resolveRecordName(record) {
        if (record.type === SACREMENT_TYPES.MARIAGE) {
            return [record.epoux, record.epouse].filter(Boolean).join(' / ') || 'Non precise';
        }

        return record.interesse || 'Non precise';
    }

    function resolveRecordDate(record) {
        return record.date_sacrement || record.date_mariage || 'Non precise';
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
        resolveRecordName,
        resolveRecordDate
    };
}(window));
