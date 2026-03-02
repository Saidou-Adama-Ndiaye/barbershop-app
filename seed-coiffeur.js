/**
 * seed-coiffeur.js
 * ─────────────────────────────────────────────────────────────
 * Crée un coiffeur en base + ses disponibilités pour tester
 * le calendrier de réservation.
 *
 * Usage :
 *   node seed-coiffeur.js
 *
 * Prérequis :
 *   npm install bcrypt pg   (dans le dossier où vous lancez le script)
 *
 * Config : éditer les variables en haut du fichier si besoin.
 * ─────────────────────────────────────────────────────────────
 */

const bcrypt = require('bcrypt');
const { Client } = require('pg');

// ─── CONFIG ── adaptez si votre .env.local est différent ─────
const DB = {
  host:     'localhost',
  port:     5432,
  user:     'barber_user',
  password: 'barber_secret_2025',
  database: 'barbershop_dev',
};

// ─── COIFFEUR À CRÉER ─────────────────────────────────────────
const COIFFEUR = {
  email:     'mamadou.diallo@barbershop.sn',
  // Mot de passe respectant les règles : 1 majuscule, 1 chiffre, 1 spécial
  password:  'Coiffeur@2025',
  firstName: 'Mamadou',
  lastName:  'Diallo',
  phone:     '+221771234567',
};

// ─── DISPONIBILITÉS ───────────────────────────────────────────
// dayOfWeek : 0=Dimanche, 1=Lundi, 2=Mardi, 3=Mercredi,
//             4=Jeudi,    5=Vendredi, 6=Samedi
const DISPONIBILITES = [
  { dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }, // Lundi
  { dayOfWeek: 2, startTime: '09:00', endTime: '18:00' }, // Mardi
  { dayOfWeek: 3, startTime: '09:00', endTime: '18:00' }, // Mercredi
  { dayOfWeek: 4, startTime: '09:00', endTime: '18:00' }, // Jeudi
  { dayOfWeek: 5, startTime: '09:00', endTime: '18:00' }, // Vendredi
  { dayOfWeek: 6, startTime: '09:00', endTime: '13:00' }, // Samedi matin
  // Dimanche (0) non travaillé → pas de ligne
];

// ─────────────────────────────────────────────────────────────

async function main() {
  const client = new Client(DB);

  try {
    await client.connect();
    console.log('✅ Connecté à PostgreSQL\n');

    // ── 1. Vérifier si l'email existe déjà ──────────────────
    const check = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [COIFFEUR.email.toLowerCase()]
    );

    let coiffeurId;

    if (check.rows.length > 0) {
      coiffeurId = check.rows[0].id;
      console.log(`⚠️  Utilisateur déjà existant : ${COIFFEUR.email}`);
      console.log(`   ID   : ${coiffeurId}`);
      console.log(`   Rôle : ${check.rows[0].role}`);
      console.log('   → Mise à jour du rôle vers coiffeur_professionnel si nécessaire...');

      await client.query(
        `UPDATE users
         SET role = 'coiffeur_professionnel', is_active = true, updated_at = NOW()
         WHERE id = $1`,
        [coiffeurId]
      );
      console.log('   ✅ Rôle mis à jour\n');

    } else {
      // ── 2. Hasher le mot de passe (bcrypt, 12 rounds = même valeur que user.entity.ts) ──
      console.log('🔐 Hashage du mot de passe (bcrypt, 12 rounds)...');
      const passwordHash = await bcrypt.hash(COIFFEUR.password, 12);
      console.log('   ✅ Hash généré\n');

      // ── 3. Insérer le coiffeur ────────────────────────────
      console.log(`👤 Création du coiffeur : ${COIFFEUR.firstName} ${COIFFEUR.lastName}`);

      const insertUser = await client.query(
        `INSERT INTO users (
          id,
          email,
          password_hash,
          first_name,
          last_name,
          phone,
          role,
          is_active,
          is_verified,
          created_at,
          updated_at
        )
        VALUES (
          gen_random_uuid(),
          $1, $2, $3, $4, $5,
          'coiffeur_professionnel',
          true,
          true,
          NOW(),
          NOW()
        )
        RETURNING id, email, role`,
        [
          COIFFEUR.email.toLowerCase(),
          passwordHash,
          COIFFEUR.firstName,
          COIFFEUR.lastName,
          COIFFEUR.phone,
        ]
      );

      coiffeurId = insertUser.rows[0].id;
      console.log(`   ✅ Coiffeur créé`);
      console.log(`   ID    : ${coiffeurId}`);
      console.log(`   Email : ${insertUser.rows[0].email}`);
      console.log(`   Rôle  : ${insertUser.rows[0].role}\n`);
    }

    // ── 4. Supprimer les anciennes disponibilités (évite les doublons) ──
    const deleted = await client.query(
      'DELETE FROM staff_availability WHERE staff_id = $1',
      [coiffeurId]
    );
    if (deleted.rowCount > 0) {
      console.log(`🗑️  ${deleted.rowCount} ancienne(s) disponibilité(s) supprimée(s)`);
    }

    // ── 5. Insérer les disponibilités ────────────────────────
    const jourLabels = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
    console.log('📅 Insertion des disponibilités :\n');

    for (const dispo of DISPONIBILITES) {
      await client.query(
        `INSERT INTO staff_availability (
          id, staff_id, day_of_week, start_time, end_time, is_active, created_at
        )
        VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW())`,
        [coiffeurId, dispo.dayOfWeek, dispo.startTime, dispo.endTime]
      );
      console.log(
        `   ✅ ${jourLabels[dispo.dayOfWeek].padEnd(10)} ${dispo.startTime} → ${dispo.endTime}`
      );
    }

    // ── 6. Vérification finale ───────────────────────────────
    console.log('\n─────────────────────────────────────────────────────');
    console.log('📋 RÉCAPITULATIF — Données insérées en base\n');

    const verif = await client.query(
      `SELECT
         u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.is_verified,
         COUNT(sa.id) AS nb_dispos
       FROM users u
       LEFT JOIN staff_availability sa ON sa.staff_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [coiffeurId]
    );

    const row = verif.rows[0];
    console.log(`Nom          : ${row.first_name} ${row.last_name}`);
    console.log(`Email        : ${row.email}`);
    console.log(`ID           : ${row.id}`);
    console.log(`Rôle         : ${row.role}`);
    console.log(`Actif        : ${row.is_active}`);
    console.log(`Vérifié      : ${row.is_verified}`);
    console.log(`Disponibilités : ${row.nb_dispos} jours configurés`);

    console.log('\n─────────────────────────────────────────────────────');
    console.log('🔑 IDENTIFIANTS DE CONNEXION\n');
    console.log(`   Email    : ${COIFFEUR.email}`);
    console.log(`   Password : ${COIFFEUR.password}`);
    console.log('\n─────────────────────────────────────────────────────');
    console.log('🧪 TEST RAPIDE — Copiez cette URL dans Postman / curl :\n');
    console.log(`   POST http://localhost:3000/bookings/availability?staffId=${coiffeurId}&date=YYYY-MM-DD&serviceId=VOTRE_SERVICE_ID`);
    console.log('\n   Remplacez YYYY-MM-DD par un lundi à vendredi prochain.');
    console.log('   Ex : ' + getNextMonday());
    console.log('\n─────────────────────────────────────────────────────\n');

  } catch (err) {
    console.error('\n❌ ERREUR :', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('   → PostgreSQL ne tourne pas ou les credentials sont incorrects.');
      console.error('   → Vérifiez DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD en haut du script.');
    }
    if (err.code === '23505') {
      console.error('   → Contrainte unique violée (email ou phone déjà utilisé).');
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Connexion PostgreSQL fermée.');
  }
}

// ─── Helper : prochain lundi ──────────────────────────────────
function getNextMonday() {
  const d = new Date();
  const day = d.getDay(); // 0=dim
  const diff = day === 1 ? 7 : (8 - day) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

main();