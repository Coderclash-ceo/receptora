const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// 1. backend/package.json
const backendPkgPath = path.join(root, 'backend', 'package.json');
if (fs.existsSync(backendPkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(backendPkgPath, 'utf8'));
  pkg.name = 'receptora-backend';
  pkg.author = 'Kashyap Makwana';
  pkg.license = 'MIT';
  fs.writeFileSync(backendPkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('Updated backend/package.json');
}

// 2. frontend/package.json
const frontendPkgPath = path.join(root, 'frontend', 'package.json');
if (fs.existsSync(frontendPkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(frontendPkgPath, 'utf8'));
  pkg.name = 'receptora-frontend';
  pkg.author = 'Kashyap Makwana';
  pkg.license = 'MIT';
  fs.writeFileSync(frontendPkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('Updated frontend/package.json');
}

// 3. backend/src/index.js
const indexPath = path.join(root, 'backend', 'src', 'index.js');
if (fs.existsSync(indexPath)) {
  let content = fs.readFileSync(indexPath, 'utf8');
  content = content.replace(/"nudgeos-backend"/g, '"receptora-backend"');
  content = content.replace(/NudgeOS/g, 'RecepTora');
  content = content.replace(/Nudge OS/g, 'RecepTora');
  fs.writeFileSync(indexPath, content);
  console.log('Updated backend/src/index.js');
}

// 4. backend/src/agents/reception/reception.prompt.js
const promptPath = path.join(root, 'backend', 'src', 'agents', 'reception', 'reception.prompt.js');
if (fs.existsSync(promptPath)) {
  let content = fs.readFileSync(promptPath, 'utf8');
  const cleanHeader = '// src/agents/reception/reception.prompt.js\n// RecepTora Receptionist Agent - System Prompt Builder\n\nfunction buildReceptionPrompt';
  content = content.replace(/\/\/ src\/agents\/reception\/reception\.prompt\.js[\s\S]*?function buildReceptionPrompt/, cleanHeader);
  fs.writeFileSync(promptPath, content);
  console.log('Updated reception.prompt.js');
}

// 5. backend/src/agents/reception/reception.calendar.js
const calAdapterPath = path.join(root, 'backend', 'src', 'agents', 'reception', 'reception.calendar.js');
if (fs.existsSync(calAdapterPath)) {
  let content = fs.readFileSync(calAdapterPath, 'utf8');
  const cleanHeader = '// src/agents/reception/reception.calendar.js\n// Reception Calendar Adapter Layer\n// Adapts between Reception Agent tool calling schemas and calendar.service.js\n';
  content = content.replace(/\/\/ src\/agents\/reception\/reception\.calendar\.js[\s\S]*?function to24Hour/, cleanHeader + '\nfunction to24Hour');
  fs.writeFileSync(calAdapterPath, content);
  console.log('Updated reception.calendar.js');
}

// 6. backend/src/agents/retention/retention.agent.js
const retentionPath = path.join(root, 'backend', 'src', 'agents', 'retention', 'retention.agent.js');
if (fs.existsSync(retentionPath)) {
  let content = fs.readFileSync(retentionPath, 'utf8');
  content = content.replace(/\/\/ Task 20 \/ Day 28: Live WhatsApp sending wiring/g, '// Dispatch message when customer has phone number and draftOnly is not requested');
  content = content.replace(/\/\/ Record send in Firestore if Member 2's service provides the logging helper/g, '// Record send in Firestore retention logs');
  content = content.replace(/\/\/ Session-level protection only[\s\S]*?flagged as an M2 dependency\)\./g, '// Session-level in-memory guard against repeat sends within the same execution run.');
  fs.writeFileSync(retentionPath, content);
  console.log('Updated retention.agent.js');
}

// 7. backend/src/agents/insight/insight.agent.js
const insightPath = path.join(root, 'backend', 'src', 'agents', 'insight', 'insight.agent.js');
if (fs.existsSync(insightPath)) {
  let content = fs.readFileSync(insightPath, 'utf8');
  content = content.replace(/\/\/ Aggregation happens in code, NOT in the LLM - per handbook Task 29\/33 design principle\./g, '// Deterministic data aggregation performed in code prior to LLM synthesis.');
  fs.writeFileSync(insightPath, content);
  console.log('Updated insight.agent.js');
}

// 8. backend/src/scheduler/cron.js
const cronPath = path.join(root, 'backend', 'src', 'scheduler', 'cron.js');
if (fs.existsSync(cronPath)) {
  let content = fs.readFileSync(cronPath, 'utf8');
  content = content.replace(/\/\/ --- Task 29 & Task 30: Revenue Agent Daily Job/g, '// --- Daily Revenue Agent Job');
  content = content.replace(/\/\/ --- Task 27 & Task 28: Retention Agent Daily Job/g, '// --- Daily Retention Agent Job');
  fs.writeFileSync(cronPath, content);
  console.log('Updated cron.js');
}

// 9. backend/src/services/whatsapp.service.js
const waPath = path.join(root, 'backend', 'src', 'services', 'whatsapp.service.js');
if (fs.existsSync(waPath)) {
  let content = fs.readFileSync(waPath, 'utf8');
  content = content.replace(/\(reused from M2 architecture\)/g, '(Meta Cloud API)');
  content = content.replace(/"1171981929341103"/g, '""');
  fs.writeFileSync(waPath, content);
  console.log('Updated whatsapp.service.js');
}

// 10. Webhooks verify tokens
const waWebhookPath = path.join(root, 'backend', 'src', 'webhooks', 'whatsapp.webhook.js');
if (fs.existsSync(waWebhookPath)) {
  let content = fs.readFileSync(waWebhookPath, 'utf8');
  content = content.replace(/nudgeos123/g, 'receptora123');
  fs.writeFileSync(waWebhookPath, content);
  console.log('Updated whatsapp.webhook.js');
}

const igWebhookPath = path.join(root, 'backend', 'src', 'webhooks', 'instagram.webhook.js');
if (fs.existsSync(igWebhookPath)) {
  let content = fs.readFileSync(igWebhookPath, 'utf8');
  content = content.replace(/nudgeos123/g, 'receptora123');
  fs.writeFileSync(igWebhookPath, content);
  console.log('Updated instagram.webhook.js');
}

// 11. frontend/index.html
const indexHtmlPath = path.join(root, 'frontend', 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  let content = fs.readFileSync(indexHtmlPath, 'utf8');
  content = content.replace(/<title>.*?<\/title>/gi, '<title>RecepTora | AI WhatsApp Receptionist</title>');
  fs.writeFileSync(indexHtmlPath, content);
  console.log('Updated frontend/index.html');
}

// 12. Frontend page rebrandings (Nudge OS -> RecepTora)
const pagesDir = path.join(root, 'frontend', 'src', 'pages');
if (fs.existsSync(pagesDir)) {
  fs.readdirSync(pagesDir).forEach(file => {
    if (file.endsWith('.jsx')) {
      const filePath = path.join(pagesDir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      if (/Nudge\s*OS|NudgeOS/i.test(content)) {
        content = content.replace(/Nudge OS/g, 'RecepTora');
        content = content.replace(/NudgeOS/g, 'RecepTora');
        content = content.replace(/nudgeos/g, 'receptora');
        fs.writeFileSync(filePath, content);
        console.log(`Updated branding in ${file}`);
      }
    }
  });
}

// 13. Frontend components rebrandings
const componentsDir = path.join(root, 'frontend', 'src', 'components');
if (fs.existsSync(componentsDir)) {
  fs.readdirSync(componentsDir).forEach(file => {
    if (file.endsWith('.jsx')) {
      const filePath = path.join(componentsDir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      if (/Nudge\s*OS|NudgeOS/i.test(content)) {
        content = content.replace(/Nudge OS/g, 'RecepTora');
        content = content.replace(/NudgeOS/g, 'RecepTora');
        content = content.replace(/nudgeos/g, 'receptora');
        fs.writeFileSync(filePath, content);
        console.log(`Updated branding in components/${file}`);
      }
    }
  });
}

console.log('Sanitization complete!');

