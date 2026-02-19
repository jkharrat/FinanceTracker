import React, { createContext, useContext, useCallback, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Toast, { ToastType } from '../components/Toast';
import { hapticSuccess, hapticError } from '../utils/haptics';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(0);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = `toast-${++nextIdRef.current}`;
    setToasts((prev) => [...prev.slice(-2), { id, type, message }]);
    if (type === 'success') hapticSuccess();
    else if (type === 'error') hapticError();
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.toastLayer} pointerEvents="box-none">
        {toasts.map((t) => (
          <Toast key={t.id} id={t.id} type={t.type} message={t.message} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  toastLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
});
