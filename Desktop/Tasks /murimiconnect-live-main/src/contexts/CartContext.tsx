import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface CartItem {
  listingId: string;
  title: string;
  price_per_unit: number;
  unit: string;
  quantity: number;
  maxQuantity: number;
  farmerId: string;
  photo?: string;
  province: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (listingId: string) => void;
  updateQuantity: (listingId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  getItem: (listingId: string) => CartItem | undefined;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.listingId === item.listingId);
      if (existing) {
        return prev.map((i) =>
          i.listingId === item.listingId
            ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.maxQuantity) }
            : i
        );
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((listingId: string) => {
    setItems((prev) => prev.filter((i) => i.listingId !== listingId));
  }, []);

  const updateQuantity = useCallback((listingId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.listingId !== listingId));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.listingId === listingId
          ? { ...i, quantity: Math.min(quantity, i.maxQuantity) }
          : i
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const getItem = useCallback(
    (listingId: string) => items.find((i) => i.listingId === listingId),
    [items]
  );

  const itemCount = useMemo(() => items.length, [items]);
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price_per_unit * i.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({ items, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal, getItem }),
    [items, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal, getItem]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
