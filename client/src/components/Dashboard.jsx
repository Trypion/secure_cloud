import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import FileUpload from './FileUpload';
import FileList from './FileList';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFileUploaded = () => {
    // Atualizar lista de arquivos
    setRefreshTrigger(prev => prev + 1);
  };

  const handleLogout = () => {
    if (confirm('Tem certeza que deseja sair?')) {
      logout();
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Secure Cloud</h1>
          <div className="user-info">
            <span>Bem-vindo, <strong>{user?.username}</strong>!</span>
            <button onClick={handleLogout} className="logout-button">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-content">
          <div className="upload-section">
            <FileUpload onFileUploaded={handleFileUploaded} />
          </div>
          
          <div className="files-section">
            <FileList refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </main>

      <footer className="dashboard-footer">
        <p>
          <strong>Segurança:</strong> Todos os seus arquivos são criptografados 
          localmente antes do upload e descriptografados apenas no seu dispositivo.
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;