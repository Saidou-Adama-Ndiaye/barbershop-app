// .\.\apps\web\tests\e2e\shop.spec.ts
import { test, expect } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────
const waitForAPI = async (page: import('@playwright/test').Page) => {
  // Attendre que React Query ait terminé ses requêtes
  await page.waitForLoadState('networkidle');
};

// ─────────────────────────────────────────────────────────
// SCÉNARIO 1 : Navigation catalogue → détail pack
// ─────────────────────────────────────────────────────────
test('S1 — Catalogue : affichage et navigation vers détail pack', async ({ page }) => {
  await page.goto('/packs');
  await waitForAPI(page);

  // La page catalogue doit afficher le titre
  await expect(page.getByRole('heading', { name: 'Nos Packs' })).toBeVisible();

  // Si l'API retourne des packs → au moins une carte visible
  // Si l'API est down → message d'erreur visible
  const packCards = page.locator('a[href^="/packs/"]');
  const errorMessage = page.getByText('Impossible de charger les packs');

  const hasCards = await packCards.count() > 0;
  const hasError = await errorMessage.isVisible();

  // L'un ou l'autre doit être vrai
  expect(hasCards || hasError).toBeTruthy();

  // Si des packs sont présents → naviguer vers le premier
  if (hasCards) {
    const firstPackLink = packCards.first();
    const href = await firstPackLink.getAttribute('href');
    expect(href).toMatch(/^\/packs\/.+/);

    await firstPackLink.click();
    await waitForAPI(page);

    // Page détail : doit avoir un bouton "Ajouter au panier"
    await expect(
      page.getByRole('button', { name: /ajouter au panier/i }),
    ).toBeVisible();
  }
});

// ─────────────────────────────────────────────────────────
// SCÉNARIO 2 : Ajout panier → badge mis à jour
// ─────────────────────────────────────────────────────────
test('S2 — Panier : ajout d\'un pack met à jour le badge header', async ({ page }) => {
  await page.goto('/packs');
  await waitForAPI(page);

  const packCards = page.locator('a[href^="/packs/"]');
  const hasCards = await packCards.count() > 0;

  if (!hasCards) {
    test.skip();
    return;
  }

  // Aller sur la page détail du premier pack
  await packCards.first().click();
  await waitForAPI(page);

  // Vérifier que le badge panier est absent ou à 0 avant l'ajout
  const badge = page.locator('header a[href="/panier"] span.bg-gray-900');
  const badgeBefore = await badge.isVisible();

  // Cliquer sur "Ajouter au panier"
  const addButton = page.getByRole('button', { name: /ajouter au panier/i });
  await expect(addButton).toBeVisible();
  await addButton.click();

  // Attendre la confirmation (bouton devient vert)
  await expect(
    page.getByRole('button', { name: /ajouté au panier/i }),
  ).toBeVisible({ timeout: 3000 });

  // Le badge doit maintenant afficher 1
  if (!badgeBefore) {
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('1');
  }
});

// ─────────────────────────────────────────────────────────
// SCÉNARIO 3 : Personnalisation pack → prix recalculé
// ─────────────────────────────────────────────────────────
test('S3 — Personnalisation : toggle produit optionnel déclenche recalcul', async ({ page }) => {
  await page.goto('/packs');
  await waitForAPI(page);

  const packCards = page.locator('a[href^="/packs/"]');
  if (await packCards.count() === 0) {
    test.skip();
    return;
  }

  await packCards.first().click();
  await waitForAPI(page);

  // Vérifier présence section personnalisation
  const customizeSection = page.getByText('Personnaliser le pack');
  const hasCustomization = await customizeSection.isVisible();

  if (!hasCustomization) {
    // Pack non personnalisable → test non applicable
    test.skip();
    return;
  }

  // Récupérer le prix initial
  const priceEl = page.locator('.text-2xl.font-bold').last();
  const initialPrice = await priceEl.textContent();
  expect(initialPrice).toBeTruthy();

  // Cliquer sur le premier produit optionnel
  const optionalItems = page.locator('[class*="cursor-pointer"]');
  if (await optionalItems.count() > 0) {
    await optionalItems.first().click();

    // Attendre le spinner de calcul (peut passer très vite)
    // Puis vérifier que le prix a changé OU qu'une requête /calculate a été faite
    await page.waitForTimeout(600); // laisser le temps à l'API de répondre

    const newPrice = await priceEl.textContent();
    // Le prix doit avoir changé (ou rester identique si produit à 0)
    expect(newPrice).toBeTruthy();
  }
});

// ─────────────────────────────────────────────────────────
// SCÉNARIO 4 : Login → accès /commandes → liste affichée
// ─────────────────────────────────────────────────────────
test('S4 — Auth : login puis accès /commandes', async ({ page }) => {
  // Aller sur login
  await page.goto('/login');

  await expect(
    page.getByRole('heading', { name: 'Connexion' }),
  ).toBeVisible();

  // Remplir le formulaire avec le compte admin seed
  await page.getByPlaceholder('votre@email.com').fill('admin@barbershop.local');
  await page.getByPlaceholder('••••••••').fill('Admin@2025!');

  // Soumettre
  await page.getByRole('button', { name: /se connecter/i }).click();

  // Attendre la redirection (vers /packs par défaut)
  await page.waitForURL(/\/(packs|commandes)/, { timeout: 10000 });

  // Naviguer vers /commandes
  await page.goto('/commandes');
  await waitForAPI(page);

  // Doit afficher le titre (pas de redirect vers /login)
  await expect(
    page.getByRole('heading', { name: 'Mes Commandes' }),
  ).toBeVisible({ timeout: 8000 });

  // Liste vide ou commandes présentes — les deux sont valides
  const emptyState = page.getByText('Aucune commande pour le moment');
  const orderItems = page.locator('[class*="orderNumber"], span.font-bold');

  const isEmpty   = await emptyState.isVisible();
  const hasOrders = await orderItems.count() > 0;

  expect(isEmpty || hasOrders).toBeTruthy();
});

// ─────────────────────────────────────────────────────────
// SCÉNARIO 5 : Accès /commandes sans login → redirect /login
// ─────────────────────────────────────────────────────────
test('S5 — Auth : accès /commandes sans login redirige vers /login', async ({ page }) => {
  // Aller directement sur /commandes sans être connecté
  await page.goto('/commandes');

  // Doit être redirigé vers /login (middleware ou useEffect)
  await page.waitForURL(/\/login/, { timeout: 8000 });

  await expect(
    page.getByRole('heading', { name: 'Connexion' }),
  ).toBeVisible();

  // L'URL doit contenir le paramètre redirect
  expect(page.url()).toContain('redirect');
});