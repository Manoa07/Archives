// Logique métier liée aux enregistrements:
// chargement, filtrage, création, suppression et PDF.
(function attachRecords(global) {
    const { AppApi, AppDom, AppState, AppUi, SACREMENT_TYPES } = global;

    // Recharge toutes les données affichées puis met à jour dashboard et tableau.
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
            AppUi.renderArchives(getArchiveRecords());
        } catch (error) {
            if (error.status === 403) {
                AppUi.setAuthenticated(false);
                return;
            }

            AppUi.showToast('Erreur lors du chargement des données.', 'error');
        }
    }

    // Filtre tous les enregistrements à partir du nom, du type ou de la date.
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

    // Fusionne les sacrements et les mariages dans une seule liste exploitable par l'UI.
    function getAllRecords() {
        return [...AppState.sacrements, ...AppState.mariages]
            .sort((left, right) => compareRecordDates(right, left));
    }

    // Retourne les archives dans l'ordre d'insertion renvoyé par la base.
    function getArchiveRecords() {
        return [...AppState.sacrements];
    }

    // Ouvre la section recherche en présélectionnant un type de sacrement.
    function filterByType(type) {
        AppUi.showSection('recherche');
        AppDom.searchInput.value = type;
        AppUi.renderTable(getFilteredRecords(type));
    }

    // Crée un mariage via l'API backend.
    async function createMariage(payload) {
        return AppApi.apiRequest('/api/mariages', {
            method: 'POST',
            body: payload
        });
    }

    // Crée un sacrement via l'API backend.
    async function createSacrement(payload) {
        return AppApi.apiRequest('/api/sacrements', {
            method: 'POST',
            body: payload
        });
    }

    // Met à jour un mariage existant via l'API backend.
    async function updateMariage(recordId, payload) {
        return AppApi.apiRequest(`/api/mariages/${recordId}`, {
            method: 'PUT',
            body: payload
        });
    }

    // Met à jour un sacrement existant via l'API backend.
    async function updateSacrement(recordId, payload) {
        return AppApi.apiRequest(`/api/sacrements/${recordId}`, {
            method: 'PUT',
            body: payload
        });
    }

    // Passe l'interface en mode édition et remplit le formulaire correspondant.
    function startEditingRecord(recordId, recordType) {
        const record = findRecordById(recordId, recordType);

        if (!record) {
            AppUi.showToast("Enregistrement introuvable pour la modification.", 'error');
            return;
        }

        cancelEditing();
        AppState.editingRecordId = recordId;
        AppState.editingRecordType = recordType;

        if (recordType === SACREMENT_TYPES.MARIAGE) {
            fillMariageEditForm(record);
            AppDom.editMariageModal.hidden = false;
            AppDom.editMariageModal.style.display = 'flex';
            return;
        }

        fillSacrementEditForm(record);
        AppDom.editSacrementModal.hidden = false;
        AppDom.editSacrementModal.style.display = 'flex';
    }

    // Quitte le mode édition et remet les formulaires dans leur état de création.
    function cancelEditing() {
        AppState.editingRecordId = null;
        AppState.editingRecordType = null;
        AppDom.editSacrementForm.reset();
        AppDom.editMariageForm.reset();
        AppDom.editSacrementModal.hidden = true;
        AppDom.editSacrementModal.style.display = 'none';
        AppDom.editMariageModal.hidden = true;
        AppDom.editMariageModal.style.display = 'none';
    }

    // Sauvegarde le sacrement en cours d'édition depuis sa fenêtre dédiée.
    async function saveEditedSacrement() {
        if (!AppState.editingRecordId || AppState.editingRecordType === SACREMENT_TYPES.MARIAGE) {
            return;
        }

        await updateSacrement(AppState.editingRecordId, {
            type: getInputValue('edit-sacrement-type'),
            interesse: getInputValue('edit-sacrement-interesse'),
            date_naissance: getInputValue('edit-sacrement-date-naissance'),
            pere: getInputValue('edit-sacrement-pere'),
            mere: getInputValue('edit-sacrement-mere'),
            adresse: getInputValue('edit-sacrement-adresse'),
            lieu: getInputValue('edit-sacrement-lieu'),
            date_sacrement: getInputValue('edit-sacrement-date'),
            parrain: getInputValue('edit-sacrement-parrain'),
            marraine: getInputValue('edit-sacrement-marraine'),
            mon_pere: getInputValue('edit-sacrement-celebrant')
        });
    }

    // Sauvegarde le mariage en cours d'édition depuis sa fenêtre dédiée.
    async function saveEditedMariage() {
        if (!AppState.editingRecordId || AppState.editingRecordType !== SACREMENT_TYPES.MARIAGE) {
            return;
        }

        await updateMariage(AppState.editingRecordId, {
            type: SACREMENT_TYPES.MARIAGE,
            epoux: getInputValue('edit-mariage-epoux'),
            epouse: getInputValue('edit-mariage-epouse'),
            temoinsEpoux: [
                getInputValue('edit-mariage-temoin-epoux-1'),
                getInputValue('edit-mariage-temoin-epoux-2')
            ],
            temoinsEpouse: [
                getInputValue('edit-mariage-temoin-epouse-1'),
                getInputValue('edit-mariage-temoin-epouse-2')
            ],
            date_mariage: getInputValue('edit-mariage-date'),
            missionnaire: getInputValue('edit-mariage-missionnaire'),
            lieu: getInputValue('edit-mariage-lieu')
        });
    }

    // Supprime l'enregistrement sélectionné dans la boîte de confirmation.
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

    // Génère un certificat PDF pour un acte de baptême.
    function generatePdfBaptem(record) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.rect(20, 20, 170, 250);
        doc.setFont('Times New Roman');
        doc.setFontSize(15);
        doc.text('EKAR MD JEROME Anosibe', 95, 45, { align: 'right' });
        doc.setFontSize(19);
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
            ['Afaka malalaka hanambady', '...............................................']
        ];
        let y = 80;
        lines.forEach(([label, value]) => {
            doc.text(`${label} : ${value || ''}`, 30, y);
            y += 10;
        });
        doc.setFontSize(14);
        doc.text('..........................', 120, 230)
        doc.setFontSize(14);
        doc.text('Ny pretra mitondra faritany', 120, 240);
        doc.save(`Fanamarinana_Batemy_${record.interesse || 'certificat'}.pdf`);
    }

    //Génère un format PDF pour les mariages
    function generatePdfMariage(record){
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.rect(20, 20, 170, 250);
        doc.setFont('Times New Roman');
        doc.setFontSize(15);
        doc.text('EKAR MD JEROME Anosibe', 95, 45, { align: 'right' });
        doc.setFontSize(19);
        doc.text('FANAMARINANA', 105, 65, { align: 'center' });
        doc.setFontSize(16);

        const lines = [
            ['Andriamtoa', record.epoux],
            ['Ramatoa', record.epouse],
            ['dia efa nandray ny SAKRAMENTA ny', 'Mariazy'],
            ["Teto",record.lieu],
            ['Tamin ny', record.date_mariage],
            ["Nohamasinin'i", record.missionnaire],
            ['Anio', new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })],
        ];
        let y = 80;
        lines.forEach(([label, value]) => {
            doc.text(`${label} : ${value || ''}`, 30, y);
            y += 10;
        });
        doc.setFontSize(14);
        doc.text("Ny PRETRA", 120, 170);
        doc.save(`Fanamarinana_Mariazy_${record.epoux || 'certificat'}_sy_${record.epouse || 'certificat'}.pdf`);
    }

    //Genère un format PDF pour les autres sacrements
    function generatePdf(record) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.rect(20, 20, 170, 250);
        doc.setFont('Times New Roman');
        doc.setFontSize(15);
        doc.text('EKAR MD JEROME Anosibe', 95, 45, { align: 'right' });
        doc.setFontSize(19);
        doc.text('FANAMARINANA', 105, 65, { align: 'center' });
        doc.setFontSize(16);

        const lines = [
            ['Anarana', record.interesse],
            ['Ray', record.pere],
            ['Reny', record.mere],
            ['Monina ao', record.adresse],
            ["Natao tao", record.lieu],
            ['dia efa nandray ny SAKRAMENTA ny', record.type],
            ['Ny', record.date_sacrement]
        ];
         let y = 80;
        lines.forEach(([label, value]) => {
            doc.text(`${label} : ${value || ''}`, 30, y);
            y += 10;
        });
        doc.setFontSize(14);
        doc.text("Ny PRETRA", 120, 170);
        doc.save(`Fanamarinana_${record.type || 'certificat'}_${record.interesse || 'certificat'}.pdf`);
    }

    // Compare deux enregistrements selon leur date métier pour garder un affichage stable.
    function compareRecordDates(left, right) {
        const leftTime = toTimestamp(left.date_sacrement || left.date_mariage);
        const rightTime = toTimestamp(right.date_sacrement || right.date_mariage);

        return leftTime - rightTime;
    }

    // Convertit une date texte en timestamp exploitable pour le tri.
    function toTimestamp(value) {
        if (!value) {
            return 0;
        }

        const timestamp = new Date(value).getTime();
        return Number.isNaN(timestamp) ? 0 : timestamp;
    }

    function findRecordById(recordId, recordType) {
        const source = recordType === SACREMENT_TYPES.MARIAGE ? AppState.mariages : AppState.sacrements;
        return source.find((record) => record._id === recordId) || null;
    }

    function fillMariageEditForm(record) {
        setValue('edit-mariage-epoux', record.epoux);
        setValue('edit-mariage-epouse', record.epouse);
        setValue('edit-mariage-temoin-epoux-1', record.temoinsEpoux?.[0]);
        setValue('edit-mariage-temoin-epoux-2', record.temoinsEpoux?.[1]);
        setValue('edit-mariage-temoin-epouse-1', record.temoinsEpouse?.[0]);
        setValue('edit-mariage-temoin-epouse-2', record.temoinsEpouse?.[1]);
        setValue('edit-mariage-date', record.date_mariage);
        setValue('edit-mariage-missionnaire', record.missionnaire);
        setValue('edit-mariage-lieu', record.lieu);
    }

    function fillSacrementEditForm(record) {
        setValue('edit-sacrement-type', record.type);
        setValue('edit-sacrement-interesse', record.interesse);
        setValue('edit-sacrement-date-naissance', record.date_naissance);
        setValue('edit-sacrement-pere', record.pere);
        setValue('edit-sacrement-mere', record.mere);
        setValue('edit-sacrement-adresse', record.adresse);
        setValue('edit-sacrement-lieu', record.lieu);
        setValue('edit-sacrement-date', record.date_sacrement);
        setValue('edit-sacrement-parrain', record.parrain);
        setValue('edit-sacrement-marraine', record.marraine);
        setValue('edit-sacrement-celebrant', record.mon_pere);
    }

    function setValue(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.value = value || '';
        }
    }

    function getInputValue(id) {
        const element = document.getElementById(id);
        return element ? element.value.trim() : '';
    }

    global.AppRecords = {
        refreshData,
        getArchiveRecords,
        getFilteredRecords,
        getAllRecords,
        filterByType,
        createMariage,
        createSacrement,
        updateMariage,
        updateSacrement,
        startEditingRecord,
        cancelEditing,
        saveEditedSacrement,
        saveEditedMariage,
        deleteSelectedRecord,
        generatePdfBaptem,
        generatePdfMariage,
        generatePdf
    };
}(window));
