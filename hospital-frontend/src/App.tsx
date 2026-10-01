import React from 'react';
import { AuthProvider } from './app/AuthContext';
import { ToastProvider } from './app/ToastContext';
import { AppRouter } from './app/router';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
