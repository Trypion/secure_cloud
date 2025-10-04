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
      // Ler o arquivo como ArrayBuffer para trabalhar com dados binários
      const fileContent = await readFileAsArrayBuffer(selectedFile);

      // Criptografar o arquivo com a senha fornecida
      const encryptedData = encryptFile(fileContent, password);
      
      // Fazer upload (agora passando a senha também)
      const response = await fileService.upload(selectedFile, encryptedData);
      
      setSuccess(`Arquivo "${response.filename}" enviado e criptografado com sucesso!`);
      setSelectedFile(null);
      
      // Limpar input
      document.getElementById('fileInput').value = '';
      
      // Notificar componente pai
      if (onFileUploaded) {
        onFileUploaded();
      }
      
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Erro ao fazer upload do arquivo');
    } finally {
      setUploading(false);
    }
  };

  const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {     
        resolve(e.target.result);
      };
      
      reader.onerror = (e) => {
        console.error('Erro ao ler arquivo:', e);
        reject(new Error('Erro ao ler arquivo: ' + e.target.error));
      };
      
      // Ler como ArrayBuffer para dados binários
      try {
        reader.readAsArrayBuffer(file);
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

      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handlePasswordConfirm}
        title="Criptografar Arquivo"
        message="Digite uma senha para criptografar o arquivo antes do upload."
      />
    </div>
  );
};

export default FileUpload;