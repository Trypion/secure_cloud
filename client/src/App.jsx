import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import './App.css';

function AuthWrapper() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Dashboard />;
  }

  return (
    <div className="auth-container">
      {isLoginMode ? (
        <Login onSwitchToRegister={() => setIsLoginMode(false)} />
      ) : (
        <Register onSwitchToLogin={() => setIsLoginMode(true)} />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <AuthWrapper />
      </div>
    </AuthProvider>
  );
}

export default App;
