# 🧔 BarberShop — Produits & Accessoires

Application web et mobile pour barbier (Marché UEMOA / Sénégal).

## Modules
- **Module 1** — Vente de Packs de Produits (E-commerce)
- **Module 2** — Réservation de Services
- **Module 3** — Formations Vidéo (E-learning)

## Stack
- **Backend** : NestJS + PostgreSQL + Redis
- **Frontend** : Next.js 14 + TailwindCSS
- **Mobile** : Flutter

## Démarrage rapide
```powershell
docker compose -f infra/docker-compose.yml up -d
cd apps/api && npm install && npm run start:dev
```

## Accès locaux
| Service | URL |
|---------|-----|
| API + Swagger | http://localhost:3000/api/docs |
| Base de données | http://localhost:8080 |
| Emails (MailHog) | http://localhost:8025 |
| Redis UI | http://localhost:5540 |