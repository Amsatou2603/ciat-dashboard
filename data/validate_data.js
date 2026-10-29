const fs = require('node:fs');
const path = require('node:path');

const dataPath = path.join(__dirname, 'donnees_ciat.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const failures = [];

function check(label, issues) {
    if (issues.length === 0) {
        console.log(`OK  ${label}`);
        return;
    }

    failures.push(...issues.map(issue => `${label}: ${issue}`));
    console.error(`KO  ${label}`);
    issues.forEach(issue => console.error(`    ${issue}`));
}

function duplicates(values) {
    const seen = new Set();
    const repeated = new Set();
    values.forEach(value => {
        if (seen.has(value)) repeated.add(value);
        seen.add(value);
    });
    return [...repeated];
}

function isIsoDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day;
}

const collections = [
    ['cohortes', data.cohortes],
    ['domaines', data.domaines],
    ['porteurs_projets', data.porteurs_projets],
    ['projets', data.projets],
    ['financements', data.financements],
    ['partenariats', data.partenariats],
    ['evenements', data.evenements]
];

check('Présence des collections et note de périmètre', [
    ...collections.filter(([, rows]) => !Array.isArray(rows)).map(([name]) => `collection absente ou invalide: ${name}`),
    ...(typeof data.metadata?.note_perimetre === 'string' ? [] : ['metadata.note_perimetre absent'])
]);

for (const [name, rows] of collections) {
    if (!Array.isArray(rows)) continue;
    if (rows.some(row => !row || typeof row !== 'object')) {
        check(`Structure de ${name}`, ['au moins un enregistrement n’est pas un objet']);
        continue;
    }
    if (['cohortes', 'domaines', 'porteurs_projets', 'projets', 'evenements'].includes(name)) {
        const repeated = duplicates(rows.map(row => row.id).filter(Boolean));
        check(`Identifiants uniques (${name})`, repeated.map(id => `identifiant répété: ${id}`));
    }
}

const requiredFields = {
    cohortes: ['id', 'nom', 'annee', 'date_debut', 'date_fin', 'nb_candidatures', 'nb_selectionnes', 'statut'],
    domaines: ['id', 'nom', 'code', 'couleur', 'sous_domaines'],
    porteurs_projets: ['id', 'nom', 'prenom', 'genre', 'age', 'formation', 'email', 'telephone'],
    projets: ['id', 'titre', 'description', 'domaine_id', 'sous_domaine_id', 'cohorte_id', 'porteur_id', 'statut', 'date_soumission', 'date_selection', 'budget_demande', 'budget_accorde', 'budget_depense', 'progression', 'note_evaluation', 'retard_jours', 'objectifs_atteints', 'objectifs_total', 'jalons'],
    financements: ['annee', 'budget_total_alloue', 'budget_total_depense', 'sources'],
    partenariats: ['partenaire', 'type', 'specialite', 'date_debut', 'actif'],
    evenements: ['id', 'titre', 'date', 'type', 'participants']
};

for (const [name, fields] of Object.entries(requiredFields)) {
    const rows = data[name];
    if (!Array.isArray(rows)) continue;
    const issues = [];
    rows.forEach((row, index) => {
        fields.filter(field => !(field in row)
            || (row[field] === null
                && !(name === 'projets' && (
                    field === 'note_evaluation'
                    || (['domaine_id', 'sous_domaine_id'].includes(field)
                        && row.domaine_id === null && row.sous_domaine_id === null)
                )))
            || row[field] === '').forEach(field => issues.push(`${name}[${index}] : champ absent ou vide ${field}`));
    });
    check(`Complétude (${name})`, issues);
}

check('Titres de projets uniques', duplicates(data.projets.map(project => project.titre)).map(title => `titre répété: ${title}`));
check('Partenaires et années de financement uniques', [
    ...duplicates(data.partenariats.map(partner => partner.partenaire)).map(name => `partenaire répété: ${name}`),
    ...duplicates(data.financements.map(finance => finance.annee)).map(year => `année de financement répétée: ${year}`)
]);
const expectedTaxonomy = {
    TIC: [
        'Analyse des performances digitales',
        'Administration de bases de données',
        'Administration systèmes, sécurité et cloud',
        'Réseaux, sécurité et IoT',
        'Développement backend',
        'Développement frontend'
    ],
    Automobile: [
        'Électromécanique automobile',
        'Carrosserie et peinture',
        'Froid et climatisation automobile',
        'Électromécanique et électronique automobile'
    ]
};
const actualTaxonomy = Object.fromEntries(data.domaines.map(domain => [
    domain.nom,
    Array.isArray(domain.sous_domaines) ? domain.sous_domaines.map(item => item.nom) : []
]));
check('Taxonomie TIC et Automobile', [
    ...Object.keys(expectedTaxonomy).filter(name => !actualTaxonomy[name]).map(name => `domaine manquant: ${name}`),
    ...Object.entries(expectedTaxonomy).flatMap(([domain, expected]) => {
        const actual = actualTaxonomy[domain] || [];
        return [
            ...expected.filter(name => !actual.includes(name)).map(name => `${domain}: sous-domaine manquant ${name}`),
            ...actual.filter(name => !expected.includes(name)).map(name => `${domain}: sous-domaine non demandé ${name}`)
        ];
    }),
    ...data.domaines.filter(domain => !expectedTaxonomy[domain.nom]).map(domain => `domaine non demandé: ${domain.nom}`)
]);
const subdomainEntries = data.domaines.flatMap(domain =>
    Array.isArray(domain.sous_domaines)
        ? domain.sous_domaines.map(subdomain => [subdomain.id, domain.id])
        : []
);
const subdomainIds = new Map(subdomainEntries);
check('Identifiants uniques des sous-domaines', duplicates(subdomainEntries.map(([id]) => id)).map(id => `identifiant répété: ${id}`));
check('Périmètre de classification des projets', [
    ...data.projets.filter(project => (project.domaine_id === null) !== (project.sous_domaine_id === null))
        .map(project => `${project.id}: classement partiellement renseigné`)
]);

check('Statuts et couleurs des domaines', [
    ...data.cohortes.filter(cohort => !['Terminée', 'En cours'].includes(cohort.statut)).map(cohort => `${cohort.id}: statut invalide`),
    ...data.projets.filter(project => !['Idée', 'En cours', 'Prototype validé', 'Déployé', 'Abandonné'].includes(project.statut)).map(project => `${project.id}: statut invalide`),
    ...data.domaines.filter(domain => !/^#[0-9A-Fa-f]{6}$/.test(domain.couleur)).map(domain => `${domain.id}: couleur invalide`),
    ...duplicates(data.domaines.map(domain => domain.couleur)).map(color => `couleur répétée: ${color}`)
]);

const cohortIds = new Set(data.cohortes.map(row => row.id));
const domainIds = new Set(data.domaines.map(row => row.id));
const ownerIds = new Set(data.porteurs_projets.map(row => row.id));
check('Clés étrangères des projets', data.projets.flatMap(project => [
    ...(cohortIds.has(project.cohorte_id) ? [] : [`${project.id}: cohorte inconnue ${project.cohorte_id}`]),
    ...(project.domaine_id === null && project.sous_domaine_id === null
        ? []
        : domainIds.has(project.domaine_id) && subdomainIds.get(project.sous_domaine_id) === project.domaine_id
            ? []
            : [`${project.id}: domaine/sous-domaine absent ou incohérent`]),
    ...(ownerIds.has(project.porteur_id) ? [] : [`${project.id}: porteur inconnu ${project.porteur_id}`])
]));

check('Cohortes et candidatures', data.cohortes.flatMap(cohort => [
    ...(isIsoDate(cohort.date_debut) && isIsoDate(cohort.date_fin) && cohort.date_fin >= cohort.date_debut
        ? [] : [`${cohort.id}: dates invalides ou inversées`]),
    ...(Number.isInteger(cohort.nb_candidatures) && Number.isInteger(cohort.nb_selectionnes)
        && cohort.nb_candidatures >= 0 && cohort.nb_selectionnes >= 0 && cohort.nb_selectionnes <= cohort.nb_candidatures
        ? [] : [`${cohort.id}: volumes de candidatures/sélections incohérents`])
]));

check('Budgets, objectifs et indicateurs projet', data.projets.flatMap(project => [
    ...(Number.isInteger(project.budget_demande) && Number.isInteger(project.budget_accorde) && Number.isInteger(project.budget_depense)
        && project.budget_demande > 0 && project.budget_accorde <= project.budget_demande && project.budget_depense <= project.budget_accorde
        ? [] : [`${project.id}: ordre des budgets invalide`]),
    ...(project.objectifs_total > 0 && project.objectifs_atteints >= 0 && project.objectifs_atteints <= project.objectifs_total
        ? [] : [`${project.id}: objectifs incohérents`]),
    ...(Number.isInteger(project.progression) && project.progression >= 0 && project.progression <= 100
        ? [] : [`${project.id}: progression hors de 0–100`]),
    ...(project.note_evaluation === null || (project.note_evaluation >= 0 && project.note_evaluation <= 20)
        ? [] : [`${project.id}: note hors de 0–20`]),
    ...(Number.isInteger(project.retard_jours) && project.retard_jours >= 0
        ? [] : [`${project.id}: retard négatif`]),
    ...(Math.abs(project.progression - (project.objectifs_atteints / project.objectifs_total * 100)) <= 15
        ? [] : [`${project.id}: progression éloignée du ratio d’objectifs de plus de 15 points`])
]));

check('Dates et jalons des projets', data.projets.flatMap(project => [
    ...(isIsoDate(project.date_soumission) && isIsoDate(project.date_selection) && project.date_selection >= project.date_soumission
        ? [] : [`${project.id}: dates de soumission/sélection invalides`]),
    ...(!Array.isArray(project.jalons) || project.jalons.length < 3 || project.jalons.length > 4
        ? [`${project.id}: nombre de jalons hors de 3–4`]
        : project.jalons.flatMap(milestone => [
            ...(!isIsoDate(milestone.date_prevue) ? [`${project.id}/${milestone.nom}: date prévue invalide`] : []),
            ...(milestone.date_reelle !== null && !isIsoDate(milestone.date_reelle) ? [`${project.id}/${milestone.nom}: date réelle invalide`] : []),
            ...(milestone.statut === 'Terminé' && !milestone.date_reelle ? [`${project.id}/${milestone.nom}: terminé sans date réelle`] : [])
        ]))
]));

check('Profil et coordonnées des porteurs', data.porteurs_projets.flatMap(owner => [
    ...(!['M', 'F'].includes(owner.genre) ? [`${owner.id}: genre invalide`] : []),
    ...(owner.age < 18 || owner.age > 35 ? [`${owner.id}: âge hors de 18–35`] : []),
    ...(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.email) ? [`${owner.id}: email invalide`] : []),
    ...(!/^\+221\d{9}$/.test(owner.telephone) ? [`${owner.id}: téléphone invalide`] : [])
]));

check('Agrégats financiers et ventilation par source', data.financements.flatMap(finance => {
    const sourceTotal = Object.values(finance.sources).reduce((total, amount) => total + amount, 0);
    return [
        ...(finance.budget_total_alloue > 0 && finance.budget_total_depense >= 0 && finance.budget_total_depense <= finance.budget_total_alloue
            ? [] : [`${finance.annee}: montants annuels incohérents`]),
        ...(sourceTotal === finance.budget_total_alloue ? [] : [`${finance.annee}: somme des sources différente du budget alloué`])
    ];
}));

check('Partenariats et événements', [
    ...data.partenariats.filter(partner => typeof partner.actif !== 'boolean').map(partner => `statut actif invalide: ${partner.partenaire}`),
    ...data.evenements.filter(event => !isIsoDate(event.date) || event.participants <= 0).map(event => `données événement invalides: ${event.id}`)
]);

const selectionCount = data.cohortes.reduce((total, cohort) => total + cohort.nb_selectionnes, 0);
console.log(`Info : ${data.projets.length} projets détaillés pour ${selectionCount} sélections agrégées; les périmètres sont distincts.`);
console.log(`Résumé : ${data.cohortes.length} cohortes, ${data.projets.length} projets détaillés, ${data.porteurs_projets.length} porteurs, ${data.partenariats.length} partenariats, ${data.evenements.length} événements.`);

if (failures.length > 0) {
    console.error(`Échec : ${failures.length} anomalie(s) de qualité.`);
    process.exitCode = 1;
} else {
    console.log('Tous les contrôles de qualité sont réussis.');
}
