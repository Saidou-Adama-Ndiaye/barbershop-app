// .\.\infra\mock-payment\server.js
import express from 'express';
import crypto from 'crypto';
import http from 'http';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'db.json');

// ─── Helpers lecture/écriture db.json ────────────────────
const readDb = () => JSON.parse(readFileSync(DB_PATH, 'utf8'));
const writeDb = (data) => writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// ─── Init db.json si vide ─────────────────────────────────
const initDb = () => {
  const db = readDb();
  if (!db.payments) db.payments = [];
  if (!db.transactions) db.transactions = [];
  writeDb(db);
};
initDb();

// ─── App Express ──────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── GET /payments ────────────────────────────────────────
app.get('/payments', (req, res) => {
  const db = readDb();
  res.json(db.payments);
});

// ─── GET /payments/:id ────────────────────────────────────
app.get('/payments/:id', (req, res) => {
  const db = readDb();
  const payment = db.payments.find((p) => p.id === req.params.id);
  if (!payment) return res.status(404).json({ error: 'Paiement introuvable' });
  res.json(payment);
});

// ─── POST /initiate ───────────────────────────────────────
app.post('/initiate', (req, res) => {
  const { amount, currency, phone, entityType, entityId } = req.body;

  if (!amount || !entityId) {
    return res.status(400).json({ error: 'amount et entityId requis' });
  }

  const paymentId     = crypto.randomUUID();
  const transactionId = `WAVE-${Date.now()}`;

  const payment = {
    id: paymentId,
    transactionId,
    amount: Number(amount),
    currency: currency ?? 'XOF',
    phone: phone ?? '+221000000000',
    entityType: entityType ?? 'booking',
    entityId,
    status: 'pending',
    redirectUrl: `http://localhost:3002/pay-simulation?paymentId=${paymentId}`,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  const db = readDb();
  db.payments.push(payment);
  writeDb(db);

  console.log(`💳 Paiement initié: ${paymentId} — ${amount} XOF`);

  return res.status(201).json({
    paymentId,
    transactionId,
    redirectUrl: payment.redirectUrl,
    expiresAt: payment.expiresAt,
  });
});

// ─── POST /confirm/:paymentId ─────────────────────────────
app.post('/confirm/:paymentId', (req, res) => {
  const { paymentId } = req.params;
  const db = readDb();

  const paymentIndex = db.payments.findIndex((p) => p.id === paymentId);
  if (paymentIndex === -1) {
    return res.status(404).json({ error: 'Paiement introuvable' });
  }

  db.payments[paymentIndex].status = 'completed';
  writeDb(db);

  const payment = db.payments[paymentIndex];

  // Générer signature HMAC-SHA256
  const webhookSecret = process.env.WAVE_WEBHOOK_SECRET ?? 'mock_webhook_secret';
  const payload = JSON.stringify({
    paymentId,
    status: 'completed',
    transactionId: payment.transactionId,
    amount: payment.amount,
  });
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  // Envoyer webhook vers NestJS
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/payments/webhook/wave',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'wave-signature': `sha256=${signature}`,
    },
  };

  const webhookReq = http.request(options, (webhookRes) => {
    console.log(`✅ Webhook → NestJS: ${webhookRes.statusCode}`);
  });
  webhookReq.on('error', (e) => {
    console.warn(`⚠️  NestJS non joignable (normal si pas démarré): ${e.message}`);
  });
  webhookReq.write(payload);
  webhookReq.end();

  console.log(`✅ Paiement confirmé: ${paymentId}`);

  return res.json({
    success: true,
    paymentId,
    status: 'completed',
    message: 'Paiement confirmé, webhook envoyé à NestJS',
  });
});

// ─── GET /pay-simulation (UI navigateur) ─────────────────
app.get('/pay-simulation', (req, res) => {
  const { paymentId } = req.query;
  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Wave Payment Simulator</title>
  <style>
    body{font-family:Arial,sans-serif;max-width:420px;margin:80px auto;padding:20px;text-align:center}
    .btn{padding:12px 28px;border:none;border-radius:8px;cursor:pointer;font-size:16px;margin:8px;font-weight:bold}
    .btn-success{background:#22c55e;color:white}
    .btn-fail{background:#ef4444;color:white}
    .card{background:#f3f4f6;border-radius:12px;padding:24px;margin:20px 0;text-align:left}
    #result{margin-top:20px;font-size:15px}
  </style>
</head>
<body>
  <h2>💳 Wave Payment Simulator</h2>
  <div class="card">
    <p><strong>Payment ID :</strong><br><code>${paymentId}</code></p>
    <p>Cliquez pour simuler la réponse du client Wave</p>
  </div>
  <button class="btn btn-success" onclick="confirmPayment('${paymentId}')">
    ✅ Payer (succès)
  </button>
  <button class="btn btn-fail" onclick="document.getElementById('result').innerHTML='<p style=color:red>❌ Paiement annulé</p>'">
    ❌ Annuler
  </button>
  <div id="result"></div>
  <script>
    async function confirmPayment(pid) {
      try {
        const res  = await fetch('/confirm/' + pid, { method: 'POST' });
        const data = await res.json();
        document.getElementById('result').innerHTML =
          '<p style="color:green;font-weight:bold">✅ ' + data.message + '</p>';
      } catch(e) {
        document.getElementById('result').innerHTML =
          '<p style="color:red">Erreur: ' + e.message + '</p>';
      }
    }
  </script>
</body>
</html>`);
});

// ─── Démarrage ────────────────────────────────────────────
app.listen(3002, () => {
  console.log('');
  console.log('🌊 Wave Mock API démarrée sur http://localhost:3002');
  console.log('   GET  /payments              → liste paiements');
  console.log('   GET  /payments/:id          → détail paiement');
  console.log('   POST /initiate              → initier paiement');
  console.log('   POST /confirm/:id           → confirmer + webhook NestJS');
  console.log('   GET  /pay-simulation?paymentId=xxx → UI simulation');
  console.log('');
});