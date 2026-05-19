const path = require('path');
const Datastore = require('nedb-promises');

// Les bases restent très simples, mais leur création est isolée ici
// pour éviter de mélanger stockage et définition des routes.
function createDatabases(rootDir) {
    return {
        sacrements: Datastore.create({
            filename: path.join(rootDir, 'sacrements.db'),
            autoload: true
        }),
        mariages: Datastore.create({
            filename: path.join(rootDir, 'mariages.db'),
            autoload: true
        })
    };
}

async function seedSacrementsIfEmpty(db) {
    const count = await db.sacrements.count({});

    if (count > 0) {
        return;
    }

    await db.sacrements.insert([
        {
            type: 'Baptême',
            interesse: 'Rakoto Jean Baptiste',
            date_naissance: '2017-03-14',
            pere: 'Rakoto Paul',
            mere: 'Rasoanaivo Marie',
            adresse: 'Anosibe, Antananarivo',
            lieu: 'EKAR MD Jerome Anosibe',
            date_sacrement: '2025-04-06',
            parrain: 'Rabe Andry',
            marraine: 'Razanamihaja Claire',
            mon_pere: 'P. Jerome'
        },
        {
            type: 'Première Communion',
            interesse: 'Rabe Elina',
            date_naissance: '2015-09-22',
            pere: 'Rabe Joseph',
            mere: 'Raveloson Anna',
            adresse: 'Mahamasina, Antananarivo',
            lieu: 'EKAR MD Jerome Anosibe',
            date_sacrement: '2025-05-18',
            parrain: 'Rakotomalala Hery',
            marraine: 'Randrianarisoa Lala',
            mon_pere: 'P. Michel'
        },
        {
            type: 'Confirmation',
            interesse: 'Razafy Miora',
            date_naissance: '2013-11-02',
            pere: 'Razafy Daniel',
            mere: 'Ramanantsoa Lucie',
            adresse: '67 Ha, Antananarivo',
            lieu: 'EKAR MD Jerome Anosibe',
            date_sacrement: '2025-06-09',
            parrain: 'Ratsimba Solo',
            marraine: 'Rasoazanany Fara',
            mon_pere: 'Mgr Thomas'
        },
        {
            type: 'Communion Solennelle',
            interesse: 'Randria Tiana',
            date_naissance: '2012-01-30',
            pere: 'Randria Haja',
            mere: 'Rabenoro Sahondra',
            adresse: 'Isotry, Antananarivo',
            lieu: 'EKAR MD Jerome Anosibe',
            date_sacrement: '2025-07-13',
            parrain: 'Rakotondranaivo Feno',
            marraine: 'Rasoamiaramanana Voahangy',
            mon_pere: 'P. Augustin'
        }
    ]);
}

module.exports = {
    createDatabases,
    seedSacrementsIfEmpty
};
