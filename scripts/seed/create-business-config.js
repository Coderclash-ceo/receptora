
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');

const { stdin: input, stdout: output } = require('node:process');

const KEY_PATH = path.join(__dirname, 'new-key.json');
const COLLECTION_NAME = 'businesses2';

async function main() {
  if (!fs.existsSync(KEY_PATH)) {
    throw new Error('new-key.json not found beside this script.');
  }

  const serviceAccount = JSON.parse(
    fs.readFileSync(KEY_PATH, 'utf8')
  );

  if (
    serviceAccount.type !== 'service_account' ||
    !serviceAccount.project_id
  ) {
    throw new Error('Invalid Firebase service-account key.');
  }

  const rl = readline.createInterface({ input, output });
  let app;

  try {
    console.log('Firebase project:', serviceAccount.project_id);
    console.log('Collection:', COLLECTION_NAME);

    const documentId = (
      await rl.question('Document ID (e.g. salon-mumbai): ')
    ).trim();

    const whatsappNumber = (
      await rl.question('Meta WhatsApp Phone Number ID: ')
    ).trim();

    const calendarId = (
      await rl.question('Google Calendar ID: ')
    ).trim();

    const hoursText = await rl.question(
      'Business hours JSON: '
    );

const servicesText = fs.readFileSync(
  path.join(__dirname, 'services.json'),
  'utf8'
);

    const rawToken = await rl.question('API token: ');

    if (
      !documentId ||
      !whatsappNumber ||
      !calendarId ||
      !hoursText.trim() ||
      !servicesText.trim() ||
      !rawToken.trim()
    ) {
      throw new Error('All fields are required.');
    }

    const hours = JSON.parse(hoursText);
    const services = JSON.parse(servicesText);

    if (!Array.isArray(services)) {
      throw new Error('Services must be a JSON array.');
    }

    if (
      !hours ||
      typeof hours !== 'object' ||
      Array.isArray(hours)
    ) {
      throw new Error('Hours must be a JSON object.');
    }

    const apiToken = crypto
      .createHash('sha256')
      .update(rawToken, 'utf8')
      .digest('hex');

    app = initializeApp(
      { credential: cert(serviceAccount) },
      `business-setup-${Date.now()}`
    );

    const db = getFirestore(app);
    const docRef = db
      .collection(COLLECTION_NAME)
      .doc(documentId);

    const existing = await docRef.get();

    if (existing.exists) {
      const answer = await rl.question(
        'Document exists. Overwrite it? Type YES: '
      );

      if (answer.trim() !== 'YES') {
        console.log('Cancelled. No changes made.');
        return;
      }
    }

    await docRef.set({
      whatsappNumber,
      calendarId,
      hours,
      services,
      apiToken,
      updatedAt: new Date().toISOString(),
    });

    console.log(
      `Success: ${COLLECTION_NAME}/${documentId}`
    );
    console.log('Saved fields:', [
      'whatsappNumber',
      'calendarId',
      'hours',
      'services',
      'apiToken',
      'updatedAt',
    ].join(', '));
    console.log('Raw API token was not stored.');
  } finally {
    rl.close();
    if (app) await app.delete();
  }
}

main().catch((error) => {
  console.error('Setup failed:', error.message);
  process.exitCode = 1;
});
