//CONNEXION
async function tenterConnexion() {
    const password = document.getElementById('admin-password').value;
    
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });

    if (res.ok) {
        // Cacher l'écran de login
        document.getElementById('login-overlay').style.display = 'none';
        refreshData(); // Charger les données de l'application
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

/**
 * Fonction pour changer de section avec gestion des boutons actifs
 */
function showSection(sectionId) {
    // 1. Cacher toutes les sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    // 2. Retirer l'état "active" de tous les boutons de navigation
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });

    // 3. Afficher la section demandée
    const targetSection = document.getElementById(sectionId);
    targetSection.classList.add('active');

    // 4. Mettre à jour le bouton de navigation correspondant
    // On cherche le bouton qui contient l'appel vers cette section
    buttons.forEach(btn => {
        if(btn.getAttribute('onclick').includes(sectionId)) {
            btn.classList.add('active');
        }
    });
}
/**
 * Fonction pour animer les compteurs du tableau de bord
 * @param {string} id - ID de l'élément HTML
 * @param {number} fin - Nombre final à atteindre
 */
function animerCompteur(id, fin) {
    let debut = 0;
    let duree = 1500; // Durée de l'animation en millisecondes
    let increment = fin / (duree / 16); // Calcul pour 60 images par seconde
    let element = document.getElementById(id);

    let horloge = setInterval(() => {
        debut += increment;
        if (debut >= fin) {
            element.textContent = fin; // Fixe le chiffre final exact
            clearInterval(horloge);
        } else {
            element.textContent = Math.floor(debut); // Affiche l'entier arrondi
        }
    }, 16);
}

// Lancement automatique des animations au chargement
window.onload = function() {
    animerCompteur("nb-bapteme", 0);      // Remplacez par vos vrais chiffres
    animerCompteur("nb-communion", 0);
    animerCompteur("nb-confirmation", 0);
    animerCompteur("nb-solennelle", 0);
};  
/**
 * Redirige l'utilisateur vers la liste et filtre par sacrement
 * @param {string} typeSacrement - Le nom du sacrement cliqué
 */
function ouvrirListeSacrement(typeSacrement) {
    // 1. On utilise la fonction existante pour afficher la section "recherche"
    // (Assurez-vous que l'ID de votre section de recherche est bien 'recherche')
    showSection('recherche');

    // 2. On récupère la barre de recherche dans la section liste
    const barreRecherche = document.getElementById("searchInput");
    
    if (barreRecherche) {
        // 3. On injecte le nom du sacrement dans le champ de recherche
        barreRecherche.value = typeSacrement;
        
        // 4. On déclenche manuellement la fonction de filtrage du tableau
        searchTable(); 
    }
}

// Rappel de votre fonction searchTable pour que le filtrage fonctionne
function searchTable() {
    let input = document.getElementById("searchInput");
    let filter = input.value.toUpperCase();
    let table = document.getElementById("resultsTable");
    let tr = table.getElementsByTagName("tr");

    for (let i = 1; i < tr.length; i++) {
        // On vérifie la colonne 1 (Sacrement) ou 0 (Nom) selon votre structure
        // Ici on va chercher dans toute la ligne pour plus de flexibilité
        let rowText = tr[i].textContent || tr[i].innerText;
        if (rowText.toUpperCase().indexOf(filter) > -1) {
            tr[i].style.display = "";
        } else {
            tr[i].style.display = "none";
        }
    }
}
// Charger les données au démarrage pour les stats et le tableau
document.addEventListener('DOMContentLoaded', refreshData);

async function refreshData() {
    const response = await fetch('/api/sacrements');
    const data = await response.json();
    
    updateStats(data);
    fillTable(data);
}
// Charger la liste des personnes dès que l'on clique sur l'onglet sacrement
function chargerListePersonnes() {
    fetch('/api/personnes')
        .then(res => res.json())
        .then(personnes => {
            const select = document.getElementById('select-personne');
            select.innerHTML = '<option value="">-- Choisir une personne --</option>';
            personnes.forEach(p => {
                select.innerHTML += `<option value="${p.nom}">${p.nom}</option>`;
            });
        });
}
// Fonction pour enregistrer une personne
async function enregistrerPersonne(event) {
    event.preventDefault();

    // 1. Récupération des données par ID
    const data = {
        nom: document.getElementById('p-nom').value,
        date_naissance: document.getElementById('p-date').value,
        lieu_naissance: document.getElementById('p-lieu').value
    };

    // 2. Vérification rapide
    if (!data.nom || !data.date_naissance) {
        alert("Veuillez remplir au moins le nom et la date.");
        return;
    }

    try {
        const res = await fetch('/api/personnes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            alert("✅ Personne enregistrée dans la base de données !");
            // Réinitialiser le formulaire
            document.getElementById('p-nom').value = "";
            document.getElementById('p-date').value = "";
            document.getElementById('p-lieu').value = "";
            
            // Recharger la liste pour l'onglet sacrement et changer de vue
            chargerListePersonnes();
            showSection('sacrement');
        } else {
            alert("❌ Erreur lors de l'enregistrement.");
        }
    } catch (error) {
        console.error("Erreur:", error);
        alert("Impossible de contacter le serveur.");
    }
}
// Envoyer les données du formulaire
async function submitSacrement() {
    const formContainer = document.querySelector('.sacrement-form');
    const data = {
        type: document.querySelector('#sacrement select').value,
        interesse: document.getElementById('select-personne').value, // On prend le nom choisi
        pere: document.querySelector('#sacrement input[placeholder="Nom du Père"]').value,
        mere: document.querySelector('#sacrement input[placeholder="Nom de la Mère"]').value,
        parrain: document.querySelector('#sacrement input[placeholder="Parrain"]').value,
        marraine: document.querySelector('#sacrement input[placeholder="Marraine"]').value,
        date_sacrement: document.querySelector('#sacrement input[type="date"]').value,
        lieu: document.querySelector('#sacrement input[placeholder="Paroisse / Lieu"]').value
    };

    const response = await fetch('/api/sacrements', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });

    if (response.ok) {
        alert("Enregistré !");
        refreshData();
        showSection('accueil');
    }
}

// Mettre à jour les compteurs dynamiquement
function updateStats(data) {
    const counts = {
        'Baptême': 0,
        'Première Communion': 0,
        'Confirmation': 0,
        'Communion Solennelle': 0
    };
    
    data.forEach(item => { if(counts[item.type] !== undefined) counts[item.type]++; });

    animerCompteur("nb-bapteme", counts['Baptême']);
    animerCompteur("nb-communion", counts['Première Communion']);
    animerCompteur("nb-confirmation", counts['Confirmation']);
    animerCompteur("nb-solennelle", counts['Communion Solennelle']);
}

// Remplir le tableau de recherche

// Mise à jour du tableau avec un bouton d'action
// function fillTable(data) {
//     const tbody = document.querySelector("#resultsTable tbody");
//     tbody.innerHTML = data.map(item => `
//         <tr>
//             <td>${item.interesse}</td>
//             <td>${item.type}</td>
//             <td>${item.date_sacrement}</td>
//             <td>
//                 <button class="btn-action" style="padding: 5px 10px; font-size: 12px;" 
//                     onclick='genererPDF(${JSON.stringify(item)})'>
//                     📄 PDF
//                 </button>
//             </td>
//         </tr>
//     `).join('');
// }
// 1. Modifier le remplissage du tableau
function fillTable(data) {
    const tbody = document.querySelector("#resultsTable tbody");
    
    tbody.innerHTML = data.map(item => {
        // Bouton PDF uniquement pour les baptêmes
        const boutonPDF = item.type === "Baptême" 
            ? `<button class="btn-action" style=" padding: 5px 10px; margin-right: 5px;" 
                onclick='genererPDF(${JSON.stringify(item)})'>📜 PDF</button>`
            : "";

        // Bouton Supprimer pour tous les enregistrements
        const boutonSuppr = `<button class="btn-action" style="background-color: #e74c3c; padding: 5px 10px;" 
            onclick="supprimerSacrement(${item.id})">🗑️</button>`;

        return `
            <tr>
                <td>${item.interesse}</td>
                <td>${item.type}</td>
                <td>${item.date_sacrement}</td>
                <td>
                    <div style="display: flex;">
                        ${boutonPDF}
                        ${boutonSuppr}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 2. Fonction pour appeler l'API de suppression
async function supprimerSacrement(id) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet enregistrement définitivement ?")) {
        try {
            const response = await fetch(`/api/sacrements/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert("Enregistrement supprimé.");
                refreshData(); // Recharger les données et les compteurs
            } else {
                alert("Erreur lors de la suppression.");
            }
        } catch (error) {
            console.error("Erreur:", error);
        }
    }
}
// Gardez la fonction genererCertificatBapteme(donnees) que nous avons créée précédemment
// Fonction pour créer le certificat PDF
function genererPDF(donnees) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const policeTitre = "Times New Roman";
    const policeTexte = "Times New Roman";

     // --- Cadre Simple (Rectangle) ---
     doc.setDrawColor(0);
     doc.setLineWidth(0.3);
     doc.rect(20, 20, 170, 250); // Cadre extérieur centré sur la page
           //Titre Ekar
     doc.setFont(policeTexte);
     doc.setFontSize(15);
     doc.text("ECAR Saint Jérôme ANOSIBE", 95, 45, {align: "right"});

    // --- Titre ---
    doc.setFont(policeTitre);
    doc.setFontSize(22);
    doc.text("Acte de Baptême", 105, 65, { align: "center" });

    // --- Contenu (Style manuscrit épuré) ---
    doc.setFontSize(16);
    let y = 80;
    const xLabel = 30;

    const lignes = [
        { label: "Nom", valeur: "" },
        { label: "Prénom", valeur: donnees.interesse },
        { label: "Nom du Père", valeur: donnees.pere },
        { label: "Nom de la mère", valeur: donnees.mere },
        { label: "Marraine", valeur: donnees.marraine },
        { label: "Parrain", valeur: donnees.parrain },
        { label: "Date du Baptême", valeur: donnees.date_sacrement },
        { label: "Paroisse", valeur: donnees.lieu }
    ];

    lignes.forEach(ligne => {
        doc.text(`${ligne.label} : ${ligne.valeur}`, xLabel, y);
        y += 15;
    });

    doc.save(`Acte_Bapteme_${donnees.interesse}.pdf`);
}
// function genererPDF(donnees) {
//     const { jsPDF } = window.jspdf;
//     const doc = new jsPDF({
//         orientation: "p",
//         unit: "mm",
//         format: "a4"
//     });

//     // --- Configuration des polices ---
//     


    // --- Titre ---
//     doc.setFont(policeTitre);
//     doc.setFontSize(20);
//     doc.text("Acte de Baptême", 105, 65, { align: "center" });

//     // --- Corps du texte (Design épuré) ---
//     doc.setFont(policeTexte);
//     doc.setFontSize(16);
//     const xLabel = 35; // Alignement gauche des étiquettes
//     const x = 85; // Début des pointillés
//     const ecart = 15; // Espace vertical entre les lignes
//     let y = 85;
//     // Fonction utilitaire pour dessiner une ligne du certificat
//     const dessinerLigne = (label, valeur) => {
//         doc.text(label + " :", xLabel, y);
        
//         if(valeur) {
//             doc.setFont(policeTexte, "bolditalic");
//             doc.text(valeur.toString(), x + 2, y - 1); // Information sur l'acte
//             doc.setFont(policeTexte, "italic");
//         }
//         y += ecart;
//     };

//     // Remplissage des données selon votre photo
//     dessinerLigne("Nom", donnees.interesse);
//     dessinerLigne("Nom du Père", donnees.pere);
//     dessinerLigne("Nom de la mère", donnees.mere);
//     dessinerLigne("Parrain", donnees.parrain);
//     dessinerLigne("Marraine", donnees.marraine);
//     dessinerLigne("Date du Baptême", donnees.date_sacrement);
    
//     // Pour le lieu, on termine par "..." comme sur la photo
//     doc.text(`Lieu... ${donnees.lieu}`, xLabel, y);

//     // --- Signature ---
//     doc.setFontSize(14);
//     doc.text("Le Curé .....................", 120, 240);

//     // Téléchargement
//     doc.save(`Acte_Bapteme_${donnees.interesse.replace(/\s+/g, '_')}.pdf`);
// }
// Gardez vos fonctions showSection et animerCompteur existantes

//Auto suppression des informations sur le formulaire 
document.querySelector("form-grid").reset();
