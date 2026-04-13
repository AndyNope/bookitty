// Shared localStorage helpers for Lager ↔ Rechnungen
// Must stay in sync with the types in src/pages/Lager.tsx

const ITEMS_KEY     = 'bookitty.stock.items';
const MOVEMENTS_KEY = 'bookitty.stock.movements';

export interface StockItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  vatRate: number;
  stock: number;
  minStock: number;
  account: string;
  category: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  date: string;
  type: 'Eingang' | 'Ausgang' | 'Korrektur';
  quantity: number;
  reference: string;
  note: string;
}

export function loadStockItems(): StockItem[] {
  try { return JSON.parse(localStorage.getItem(ITEMS_KEY) ?? '[]'); } catch { return []; }
}

export function saveStockItems(items: StockItem[]): void {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

export function addStockMovement(mov: Omit<StockMovement, 'id'>): void {
  try {
    const raw  = localStorage.getItem(MOVEMENTS_KEY);
    const movs: StockMovement[] = raw ? JSON.parse(raw) : [];
    movs.unshift({ id: Math.random().toString(36).slice(2, 9), ...mov });
    localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movs));
  } catch {/**/ }
}

/** Reduce stock for a sold line item and record an "Ausgang" movement. */
export function deductStock(itemId: string, quantity: number, invoiceNumber: string): void {
  const items   = loadStockItems();
  const updated = items.map(s =>
    s.id === itemId ? { ...s, stock: Math.max(0, s.stock - quantity) } : s
  );
  saveStockItems(updated);
  const today = new Date().toISOString().slice(0, 10);
  addStockMovement({
    itemId,
    date: today,
    type: 'Ausgang',
    quantity,
    reference: invoiceNumber,
    note: `Automatisch aus Rechnung ${invoiceNumber}`,
  });
}
