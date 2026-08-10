const path = require('path');
const Datastore = require('nedb-promises');

// Les bases restent très simples, mais leur création est isolée ici
// pour éviter de mélanger stockage et définition des routes.
function createDatabases(rootDir) {
    return {
        sacrements: Datastore.create({
            filename: path.join(rootDir, 'sacrements.db'),
            autoload: true,
            timestampData: true
        }),
        mariages: Datastore.create({
            filename: path.join(rootDir, 'mariages.db'),
            autoload: true,
            timestampData: true
        })
    };
}

// Ajoute createdAt aux anciens documents qui n'en ont pas encore, dans leur ordre actuel.
async function backfillCreatedAtIfMissing(db) {
    await backfillCollection(db.sacrements);
    await backfillCollection(db.mariages);
}

// Renseigne createdAt/updatedAt sur une collection existante sans casser l'ordre d'enregistrement.
async function backfillCollection(collection) {
    const docs = await collection.find({});
    const missingDocs = docs.filter((doc) => !doc.createdAt);

    if (!missingDocs.length) {
        return;
    }

    const baseTime = Date.now() - (missingDocs.length * 1000);

    for (const [index, doc] of missingDocs.entries()) {
        const createdAt = new Date(baseTime + (index * 1000));

        await collection.update(
            { _id: doc._id },
            { $set: { createdAt, updatedAt: createdAt } }
        );
    }
}

module.exports = {
    createDatabases,
    backfillCreatedAtIfMissing
};
