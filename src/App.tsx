import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './global/router/Routes';
import { AuthProvider } from './context/AuthContext';
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
