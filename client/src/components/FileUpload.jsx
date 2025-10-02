import React, { useState } from 'react';
import { fileService } from '../services/api';
import { encryptFile } from '../utils/crypto';
import PasswordModal from './PasswordModal';

const FileUpload = ({ onFileUploaded }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setError('');
    setSuccess('');
  };

  const handleUpload = () => {
    if (!selectedFile) {
      setError('Selecione um arquivo para upload');
      return;
    }

    // Abrir modal para pedir senha
    setShowPasswordModal(true);
  };

  const handlePasswordConfirm = async (password) => {
    setUploading(true);
    setError('');
    setSuccess('');

    try {
      // Ler o arquivo
      const fileContent = await readFileAsText(selectedFile);

      // Criptografar o arquivo com a senha fornecida
      const encryptedData = encryptFile(fileContent, password);
      
      // Fazer upload
      const response = await fileService.upload(selectedFile, encryptedData);
      
      setSuccess(`Arquivo "${response.filename}" enviado com sucesso!`);
      setSelectedFile(null);
      
      // Limpar input
      document.getElementById('fileInput').value = '';
      
      // Notificar componente pai
      if (onFileUploaded) {
        onFileUploaded();
      }
      
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message || 'Erro ao fazer upload do arquivo');
    } finally {
      setUploading(false);
    }
  };

  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        console.log('Arquivo lido com sucesso:', file.name);
        resolve(e.target.result);
      };
      
      reader.onerror = (e) => {
        console.error('Erro ao ler arquivo:', e);
        reject(new Error('Erro ao ler arquivo: ' + e.target.error));
      };
      
      // Sempre ler como texto para simplificar
      try {
        reader.readAsText(file, 'UTF-8');
      } catch (error) {
        console.error('Erro ao iniciar leitura:', error);
        reject(new Error('Erro ao iniciar leitura do arquivo'));
      }
    });
  };

  return (
    <div className="file-upload">
      <h3>Upload de Arquivo</h3>
      
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      
      <div className="upload-section">
        <input
          type="file"
          id="fileInput"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        
        {selectedFile && (
          <div className="file-info">
            <p><strong>Arquivo selecionado:</strong> {selectedFile.name}</p>
            <p><strong>Tamanho:</strong> {(selectedFile.size / 1024).toFixed(2)} KB</p>
          </div>
        )}
        
        <button 
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="upload-button"
        >
          {uploading ? 'Enviando...' : 'Enviar Arquivo'}
        </button>
      </div>
      
      <div className="upload-info">
        <p><strong>🔐 Segurança:</strong> Sua senha será solicitada no momento do upload para criptografar o arquivo localmente.</p>
        <p><strong>🛡️ Privacidade:</strong> Sua senha nunca é armazenada ou enviada para o servidor.</p>
      </div>

      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handlePasswordConfirm}
        title="Criptografar Arquivo"
        message="Digite sua senha para criptografar o arquivo antes do upload. O arquivo será criptografado localmente e sua senha não será armazenada."
      />
    </div>
  );
};

export default FileUpload;