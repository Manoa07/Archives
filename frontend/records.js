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
            AppUi.renderArchiveMariage(getArchiveMariageRecords());
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
            .sort(compareRecordDates);
    }

    // Retourne les archives dans l'ordre d'insertion renvoyé par la base.
    function getArchiveRecords() {
        return [...AppState.sacrements].sort(compareArchiveRecords);
    }

    // Retourne les mariages à afficher dans la section archive mariage.
    function getArchiveMariageRecords() {
        return [...AppState.mariages].sort(compareRecordDates);
    }

    // Exporte tout le tableau d'archives au format PDF.
    function exportArchiveTable() {
        const records = getArchiveRecords();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const headers = [
            'Date',
            'Nom, prénom',
            'Parents',
            'Domicile',
            'Date de naissance',
            'Parrain',
            'Marraine',
            'Missionnaire',
            'Sacrement',
            'Mariage',
            'Décès',
            'Numéro'
        ];

        const rows = records.map((record, index) => {
            const isMariage = record.type === SACREMENT_TYPES.MARIAGE;

            return [
                formatDisplayDate(resolveRecordDate(record)),
                resolveRecordName(record),
                resolveParents(record, isMariage),
                isMariage ? '' : (record.adresse || 'Non precise'),
                resolveBirthDate(record),
                resolveParrain(record, isMariage),
                resolveMarraine(record, isMariage),
                resolveMissionnaire(record, isMariage),
                isMariage ? '' : (record.type || 'Non precise'),
                isMariage ? 'Oui' : '',
                record.deces || '',
                record.numero || String(index + 1)
            ];
        });

        const margins = { top: 22, right: 8, bottom: 14, left: 8 };
        const pageWidth = 297;
        const pageHeight = 210;
        const usableWidth = pageWidth - margins.left - margins.right;
        const colWidths = [18, 33, 36, 25, 14, 24, 24, 26, 22, 14, 19, 12];
        const headerHeight = 9;
        const minRowHeight = 8;
        const lineHeight = 3.7;
        let y = margins.top;

        const drawPageHeader = (pageNumber, totalPages) => {
            doc.setTextColor(26, 67, 109);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(15);
            doc.text('Archives - tableau complet', margins.left, 11);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(90, 90, 90);
            doc.text(`Page ${pageNumber} / ${totalPages}`, pageWidth - margins.right, 11, { align: 'right' });

            doc.setDrawColor(26, 67, 109);
            doc.setLineWidth(0.3);
            doc.line(margins.left, 18, pageWidth - margins.right, 18);
            doc.setTextColor(0, 0, 0);
        };

        const measureRowHeight = (row) => Math.max(
            minRowHeight,
            ...row.map((value, index) => {
                const lines = doc.splitTextToSize(String(value || ''), colWidths[index] - 2);
                return lines.length * lineHeight + 3;
            })
        );

        const rowsPerPage = [];
        let currentPageRows = [];
        let currentY = y;
        rows.forEach((row) => {
            const rowHeight = measureRowHeight(row);
            if (currentY + rowHeight > pageHeight - margins.bottom) {
                rowsPerPage.push(currentPageRows);
                currentPageRows = [];
                currentY = margins.top + headerHeight;
            }
            currentPageRows.push({ row, rowHeight });
            currentY += rowHeight;
        });
        if (currentPageRows.length) {
            rowsPerPage.push(currentPageRows);
        }

        rowsPerPage.forEach((pageRows, pageIndex) => {
            if (pageIndex > 0) {
                doc.addPage();
            }

            drawPageHeader(pageIndex + 1, rowsPerPage.length);

            let rowY = margins.top + 14;
            drawTableHeader(rowY);
            rowY += headerHeight;

            pageRows.forEach(({ row, rowHeight }, rowIndex) => {
                drawTableRow(row, rowY, rowHeight, rowIndex % 2 === 0);
                rowY += rowHeight;
            });
        });

        doc.save(`archives_tableau_${formatExportDate()}.pdf`);

        function drawTableHeader(headerY) {
            let x = margins.left;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            headers.forEach((header, index) => {
                doc.setFillColor(26, 67, 109);
                doc.setTextColor(255, 255, 255);
                doc.rect(x, headerY, colWidths[index], headerHeight, 'FD');
                doc.text(headers[index], x + 1, headerY + 5.8);
                x += colWidths[index];
            });
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
        }

        function drawTableRow(row, rowY, rowHeight, shaded) {
            let x = margins.left;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            row.forEach((value, index) => {
                const cellWidth = colWidths[index];
                const lines = doc.splitTextToSize(String(value || ''), cellWidth - 2);
                const fillColor = shaded ? 248 : 255;

                doc.setFillColor(fillColor, fillColor, fillColor);
                doc.setDrawColor(210, 210, 210);
                doc.rect(x, rowY, cellWidth, rowHeight, 'FD');
                doc.text(lines, x + 1, rowY + 4);
                x += cellWidth;
            });
        }
    }

    // Ouvre la section recherche en présélectionnant un type de sacrement.
    function filterByType(type) {
        AppUi.showSection('recherche');
        AppDom.searchInput.value = type;
        AppUi.setTablePage('results', 1);
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
            numero: getInputValue('edit-sacrement-numero'),
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
            numero: getInputValue('edit-mariage-numero'),
            epoux: getInputValue('edit-mariage-epoux'),
            epouse: getInputValue('edit-mariage-epouse'),
            pere_epoux: getInputValue('edit-mariage-pere-epoux'),
            mere_epoux: getInputValue('edit-mariage-mere-epoux'),
            pere_epouse: getInputValue('edit-mariage-pere-epouse'),
            mere_epouse: getInputValue('edit-mariage-mere-epouse'),
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
            lieu: getInputValue('edit-mariage-lieu'),
            civil_numero: getInputValue('edit-mariage-civil-numero'),
            civil_date: getInputValue('edit-mariage-civil-date'),
            civil_lieu: getInputValue('edit-mariage-civil-lieu')
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
        const doc = new jsPDF({ format: 'a5' });

        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.rect(10, 10, 128, 190);
        doc.setFont('Times New Roman');
        doc.setFontSize(13);
        doc.text('EKAR MD JEROME Anosibe', 74, 35, { align: 'center' });
        doc.text('Distrika MAHAMASINA', 74, 42, { align: 'center' });
        doc.setFontSize(16);
        doc.text('FANAMARINANA NY NAHAVITANA BATEMY', 74, 55, { align: 'center' });
        doc.setFontSize(13);
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
        let y = 70;
        lines.forEach(([label, value]) => {
            doc.text(`${label} : ${value || ''}`, 15, y);
            y += 9;
        });
        doc.setFontSize(12);
        doc.text('..........................', 100, 185);
        doc.text('Ny pretra mitondra faritany', 100, 195);
        previewPdf(doc, `Fanamarinana_Batemy_${record.interesse || 'certificat'}.pdf`);
    }

    //Génère un format PDF pour les mariages
    function generatePdfMariage(record){
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ format: 'a5' });
        doc.rect(10, 10, 128, 190);
        doc.setFont('Times New Roman');
        doc.setFontSize(13);
        doc.text('EKAR MD JEROME Anosibe', 74, 35, { align: 'center' });
        doc.text('Distrika MAHAMASINA', 74, 42, { align: 'center' });
        doc.setFontSize(16);
        doc.text('FANAMARINANA', 74, 55, { align: 'center' });
        doc.setFontSize(13);

        const lines = [
            ['Andriamtoa', record.epoux],
            ['Ramatoa', record.epouse],
            ['Rain-dahy', [record.pere_epoux, record.pere_epouse].filter(Boolean).join(' / ')],
            ['Reny', [record.mere_epoux, record.mere_epouse].filter(Boolean).join(' / ')],
            ['dia efa nandray ny SAKRAMENTA ny', 'Mariazy'],
            ["Teto",record.lieu],
            ['Tamin ny', record.date_mariage],
            ["Nohamasinin'i", record.missionnaire],
            ['Anio', new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })],
        ];
        let y = 70;
        lines.forEach(([label, value]) => {
            doc.text(`${label} : ${value || ''}`, 15, y);
            y += 9;
        });
        doc.setFontSize(12);
        doc.text("Ny PRETRA", 100, 170);
        previewPdf(doc, `Fanamarinana_Mariazy_${record.epoux || 'certificat'}_sy_${record.epouse || 'certificat'}.pdf`);
    }

    //Genère un format PDF pour les autres sacrements
    function generatePdf(record) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ format: 'a5' });
        doc.rect(10, 10, 128, 190);
        doc.setFont('Times New Roman');
        doc.setFontSize(13);
        doc.text('EKAR MD JEROME Anosibe', 74, 35, { align: 'center' });
        doc.text('Distrika MAHAMASINA', 74, 42, { align: 'center' });
        doc.setFontSize(16);
        doc.text('FANAMARINANA', 74, 55, { align: 'center' });
        doc.setFontSize(13);

        const lines = [
            ['Anarana', record.interesse],
            ['Ray', record.pere],
            ['Reny', record.mere],
            ['Monina ao', record.adresse],
            ["Natao tao", record.lieu],
            ['dia efa nandray ny SAKRAMENTA ny', record.type],
            ['Ny', record.date_sacrement]
        ];
         let y = 70;
        lines.forEach(([label, value]) => {
            doc.text(`${label} : ${value || ''}`, 15, y);
            y += 9;
        });
        doc.setFontSize(12);
        doc.text("Ny PRETRA", 100, 170);
        previewPdf(doc, `Fanamarinana_${record.type || 'certificat'}_${record.interesse || 'certificat'}.pdf`);
    }

    // Ouvre le modal de prévisualisation du PDF avant téléchargement.
    function previewPdf(doc, filename) {
        const blob = doc.output('blob');
        const blobUrl = URL.createObjectURL(blob);

        // Stocke l'URL et le nom pour le bouton de téléchargement.
        AppState.pdfPreviewUrl = blobUrl;
        AppState.pdfPreviewFilename = filename;

        // Affiche le PDF dans l'iframe du modal.
        AppDom.pdfPreviewFrame.src = blobUrl;
        AppDom.pdfPreviewModal.hidden = false;
        AppDom.pdfPreviewModal.style.display = 'flex';
    }

    // Ferme le modal de prévisualisation et libère la mémoire.
    function closePdfPreview() {
        AppDom.pdfPreviewModal.hidden = true;
        AppDom.pdfPreviewModal.style.display = 'none';
        AppDom.pdfPreviewFrame.src = '';

        if (AppState.pdfPreviewUrl) {
            URL.revokeObjectURL(AppState.pdfPreviewUrl);
            AppState.pdfPreviewUrl = null;
        }

        AppState.pdfPreviewFilename = null;
    }

    // Télécharge le PDF prévisualisé puis ferme la fenêtre de prévisualisation.
    function downloadPdfPreview() {
        if (!AppState.pdfPreviewUrl) {
            return;
        }

        const link = document.createElement('a');
        link.href = AppState.pdfPreviewUrl;
        link.download = AppState.pdfPreviewFilename || 'certificat.pdf';
        link.click();

        // Ferme automatiquement le modal après le téléchargement.
        closePdfPreview();
    }

    // Compare deux enregistrements selon leur date métier pour garder un affichage stable.
    function compareArchiveRecords(left, right) {
        const leftPriority = getArchivePriority(left);
        const rightPriority = getArchivePriority(right);

        if (leftPriority !== rightPriority) {
            return leftPriority - rightPriority;
        }

        return compareRecordDates(left, right);
    }

    // Place les baptêmes avant les autres sacrements dans l'affichage des archives.
    function getArchivePriority(record) {
        return record.type === SACREMENT_TYPES.BAPTEME ? 0 : 1;
    }

    // Retourne la date de naissance enregistrée, ou un libellé explicite si absente.
    function resolveBirthDate(record) {
        return record.date_naissance || 'Non precise';
    }

    // Compare deux enregistrements selon leur date métier pour garder un affichage stable.
    function compareRecordDates(left, right) {
        const leftTime = toTimestamp(left.date_sacrement || left.date_mariage);
        const rightTime = toTimestamp(right.date_sacrement || right.date_mariage);

        if (!leftTime && rightTime) {
            return 1;
        }

        if (leftTime && !rightTime) {
            return -1;
        }

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
        setValue('edit-mariage-numero', record.numero);
        setValue('edit-mariage-epouse', record.epouse);
        setValue('edit-mariage-pere-epoux', record.pere_epoux);
        setValue('edit-mariage-mere-epoux', record.mere_epoux);
        setValue('edit-mariage-pere-epouse', record.pere_epouse);
        setValue('edit-mariage-mere-epouse', record.mere_epouse);
        setValue('edit-mariage-temoin-epoux-1', record.temoinsEpoux?.[0]);
        setValue('edit-mariage-temoin-epoux-2', record.temoinsEpoux?.[1]);
        setValue('edit-mariage-temoin-epouse-1', record.temoinsEpouse?.[0]);
        setValue('edit-mariage-temoin-epouse-2', record.temoinsEpouse?.[1]);
        setValue('edit-mariage-date', record.date_mariage);
        setValue('edit-mariage-missionnaire', record.missionnaire);
        setValue('edit-mariage-lieu', record.lieu);
        setValue('edit-mariage-civil-numero', record.civil_numero);
        setValue('edit-mariage-civil-date', record.civil_date);
        setValue('edit-mariage-civil-lieu', record.civil_lieu);
    }

    function fillSacrementEditForm(record) {
        setValue('edit-sacrement-type', record.type);
        setValue('edit-sacrement-numero', record.numero);
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

    function resolveRecordName(record) {
        if (record.type === SACREMENT_TYPES.MARIAGE) {
            return [record.epoux, record.epouse].filter(Boolean).join(' / ') || 'Non precise';
        }

        return record.interesse || 'Non precise';
    }

    function resolveRecordDate(record) {
        return record.date_sacrement || record.date_mariage || 'Non precise';
    }

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

    function resolveParents(record, isMariage) {
        if (isMariage) {
            const parents = [
                record.pere_epoux,
                record.mere_epoux,
                record.pere_epouse,
                record.mere_epouse
            ].filter(Boolean);

            return parents.join(' / ') || 'Non precise';
        }

        return [record.pere, record.mere].filter(Boolean).join(' / ') || 'Non precise';
    }

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

    function resolveParrain(record, isMariage) {
        if (isMariage) {
            return (record.temoinsEpoux || []).filter(Boolean).join(' / ') || '';
        }

        return record.parrain || '';
    }

    function resolveMarraine(record, isMariage) {
        if (isMariage) {
            return (record.temoinsEpouse || []).filter(Boolean).join(' / ') || '';
        }

        return record.marraine || '';
    }

    function resolveMissionnaire(record, isMariage) {
        if (isMariage) {
            return record.missionnaire || '';
        }

        return record.mon_pere || 'Non precise';
    }

    function formatExportDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatReadableDate(date) {
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    global.AppRecords = {
        refreshData,
        getArchiveRecords,
        exportArchiveTable,
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
        generatePdf,
        closePdfPreview,
        downloadPdfPreview
    };
}(window));
