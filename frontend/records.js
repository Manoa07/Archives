// Logique métier liée aux enregistrements:
// chargement, filtrage, création, suppression et PDF.
(function attachRecords(global) {
    const { AppApi, AppDom, AppState, AppUi, SACREMENT_TYPES } = global;

    async function refreshData() {
        try {
            const [sacrements, mariages] = await Promise.all([
                AppApi.apiRequest('/api/sacrements'),
                AppApi.apiRequest('/api/mariages')
            ]);

            AppState.sacrements = sacrements;
            AppState.mariages = mariages.filter((mariage) => mariage.type === SACREMENT_TYPES.MARIAGE);

            AppUi.renderDashboard(getAllRecords());
            AppUi.renderTable(getFilteredRecords(AppDom.searchInput.value));
        } catch (error) {
            if (error.status === 403) {
                AppUi.setAuthenticated(false);
                return;
            }

            AppUi.showToast('Erreur lors du chargement des données.', 'error');
        }
    }

    function getFilteredRecords(searchTerm = '') {
        const normalizedSearch = searchTerm.trim().toUpperCase();
        const records = getAllRecords();

        if (!normalizedSearch) {
            return records;
        }

        return records.filter((record) => {
            const searchableText = [
                AppUi.resolveRecordName(record),
                record.type,
                AppUi.resolveRecordDate(record)
            ]
                .filter(Boolean)
                .join(' ')
                .toUpperCase();

            return searchableText.includes(normalizedSearch);
        });
    }

    function getAllRecords() {
        return [...AppState.sacrements, ...AppState.mariages];
    }

    function filterByType(type) {
        AppUi.showSection('recherche');
        AppDom.searchInput.value = type;
        AppUi.renderTable(getFilteredRecords(type));
    }

    async function createMariage(payload) {
        return AppApi.apiRequest('/api/mariages', {
            method: 'POST',
            body: payload
        });
    }

    async function createSacrement(payload) {
        return AppApi.apiRequest('/api/sacrements', {
            method: 'POST',
            body: payload
        });
    }

    async function deleteSelectedRecord() {
        if (!AppState.deleteTargetId) {
            AppUi.closeDeleteConfirmation();
            return;
        }

        try {
            const endpoint = AppState.deleteTargetType === SACREMENT_TYPES.MARIAGE
                ? `/api/mariages/${AppState.deleteTargetId}`
                : `/api/sacrements/${AppState.deleteTargetId}`;

            await AppApi.apiRequest(endpoint, {
                method: 'DELETE'
            });

            AppUi.closeDeleteConfirmation();
            await refreshData();
            AppUi.showToast('Enregistrement supprimé avec succès.');
        } catch (error) {
            AppUi.closeDeleteConfirmation();
            AppUi.showToast(error.message || 'Erreur lors de la suppression.', 'error');
        }
    }

    function generatePdf(record) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.rect(20, 20, 170, 250);
        doc.setFont('Times New Roman');
        doc.setFontSize(15);
        doc.text('EKAR MD JEROME Anosibe', 95, 45, { align: 'right' });
        doc.setFontSize(22);
        doc.text('FANAMARINANA NY NAHAVITANA BATEMY', 105, 65, { align: 'center' });
        doc.setFontSize(16);

        const lines = [
            ['Anarana', record.interesse],
            ['Ray', record.pere],
            ['Reny', record.mere],
            ['Monina ao', record.adresse],
            ["Natao Batemy tao", record.lieu],
            ['Andro nahaterahana', record.date_naissance],
            ['Sy nanaovana Batemy', record.date_sacrement],
            ["Ray amn'ny Batemy", record.parrain],
            ["Reny amn'ny Batemy", record.marraine],
            ["Batemy nataon'i", record.mon_pere],
        ];

        let y = 80;
        lines.forEach(([label, value]) => {
            doc.text(`${label} : ${value || ''}`, 30, y);
            y += 15;
        });

        doc.setFontSize(14);
        doc.text('Le Curé .....................', 120, 240);
        doc.save(`Acte_Bapteme_${record.interesse || 'certificat'}.pdf`);
    }

    global.AppRecords = {
        refreshData,
        getFilteredRecords,
        getAllRecords,
        filterByType,
        createMariage,
        createSacrement,
        deleteSelectedRecord,
        generatePdf
    };
}(window));
