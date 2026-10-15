import { useState } from "react";

export function useLocalStorage(key: string, initialValue: string) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? item : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValueSave = (valueToStore: string) => {
    try {
      setValue(valueToStore);
      if (valueToStore) {
        window.localStorage.setItem(key, valueToStore);
      } else {
        window.localStorage.removeItem(key);
      }
    } catch (error) {}
  };

  return [value, setValueSave] as const;
}
