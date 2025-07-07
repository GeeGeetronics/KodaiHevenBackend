// SelectedItemsContext.tsx

import React, { createContext, useContext, useState } from 'react';

export type TableRow = {
  sno?: number;
  code: string;
  desc: string;
  qty?: number;
  price?: number;
  total: number;
  remarks: string;
  section: string;
  id?: number;
  Cancel_Status?: string;
};

type SelectedItemsContextType = {
  selectedItems: TableRow[];
  setSelectedItems: React.Dispatch<React.SetStateAction<TableRow[]>>;
  clearSelectedItems: () => void; // ✅ Add this
};

const SelectedItemsContext = createContext<SelectedItemsContextType | undefined>(undefined);

export const SelectedItemsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedItems, setSelectedItems] = useState<TableRow[]>([]);

  const clearSelectedItems = () => setSelectedItems([]); // ✅ Clear function

  return (
    <SelectedItemsContext.Provider value={{ selectedItems, setSelectedItems, clearSelectedItems }}>
      {children}
    </SelectedItemsContext.Provider>
  );
};

export const useSelectedItems = () => {
  const context = useContext(SelectedItemsContext);
  if (!context) throw new Error('useSelectedItems must be used within SelectedItemsProvider');
  return context;
};
