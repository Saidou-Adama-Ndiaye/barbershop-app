/**
 * Tests unitaires — cart.store.ts
 * Exécution : npx jest tests/cart.store.test.ts
 */

import { useCartStore } from '../../lib/store/cart.store';

// Reset le store avant chaque test
beforeEach(() => {
  useCartStore.setState({ items: [], totalItems: 0, totalAmount: 0 });
});

const mockItem = {
  packId:    'pack-001',
  packName:  'Pack Rasage Pro',
  packSlug:  'pack-rasage-pro',
  quantity:   1,
  unitPrice:  45000,
};

// ─── addItem ──────────────────────────────────────────────
describe('addItem', () => {
  test('ajoute un item au panier vide', () => {
    useCartStore.getState().addItem(mockItem);
    const { items, totalItems, totalAmount } = useCartStore.getState();

    expect(items).toHaveLength(1);
    expect(items[0].packId).toBe('pack-001');
    expect(totalItems).toBe(1);
    expect(totalAmount).toBe(45000);
  });

  test('incrémente la quantité si item déjà présent', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().addItem(mockItem);

    const { items, totalItems, totalAmount } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    expect(totalItems).toBe(2);
    expect(totalAmount).toBe(90000);
  });

  test('ajoute deux items différents', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().addItem({
      ...mockItem,
      packId:    'pack-002',
      packName:  'Pack Barbe Expert',
      unitPrice:  30000,
    });

    const { items, totalItems, totalAmount } = useCartStore.getState();
    expect(items).toHaveLength(2);
    expect(totalItems).toBe(2);
    expect(totalAmount).toBe(75000);
  });
});

// ─── removeItem ───────────────────────────────────────────
describe('removeItem', () => {
  test('supprime un item existant', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().removeItem('pack-001');

    const { items, totalItems, totalAmount } = useCartStore.getState();
    expect(items).toHaveLength(0);
    expect(totalItems).toBe(0);
    expect(totalAmount).toBe(0);
  });

  test('ne modifie pas le panier si packId inexistant', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().removeItem('pack-999');

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
  });
});

// ─── updateQty ────────────────────────────────────────────
describe('updateQty', () => {
  test('met à jour la quantité', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().updateQty('pack-001', 5);

    const { items, totalItems, totalAmount } = useCartStore.getState();
    expect(items[0].quantity).toBe(5);
    expect(totalItems).toBe(5);
    expect(totalAmount).toBe(225000);
  });

  test("supprime l'item si quantité = 0", () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().updateQty('pack-001', 0);

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(0);
  });

  test("supprime l'item si quantité négative", () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().updateQty('pack-001', -1);

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(0);
  });
});

// ─── clear ────────────────────────────────────────────────
describe('clear', () => {
  test('vide complètement le panier', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().addItem({ ...mockItem, packId: 'pack-002', unitPrice: 20000 });
    useCartStore.getState().clear();

    const { items, totalItems, totalAmount } = useCartStore.getState();
    expect(items).toHaveLength(0);
    expect(totalItems).toBe(0);
    expect(totalAmount).toBe(0);
  });
});