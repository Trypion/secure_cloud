import React, { useState } from 'react';
import { fileService } from '../services/api';
import { encryptFile } from '../utils/crypto';

const FileUpload = ({ onFileUploaded }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setError('');
    setSuccess('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Selecione um arquivo para upload');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      // Ler o arquivo
      console.log('Lendo arquivo:', selectedFile.name);
      const fileContent = await readFileAsText(selectedFile);
      console.log('Arquivo lido, conteúdo length:', fileContent.length);
      
      // Obter senha do usuário para criptografia
      const userPassword = localStorage.getItem('userPassword');
      console.log('Senha recuperada do localStorage:', userPassword ? 'Sim' : 'Não');
      
      if (!userPassword) {
        setError('Sessão expirada. Faça login novamente.');
        setUploading(false);
        return;
      }

      // Criptografar o arquivo
      console.log('Iniciando criptografia...');
      const encryptedData = encryptFile(fileContent, userPassword);
      console.log('Criptografia concluída');
      
      // Fazer upload
      console.log('Iniciando upload...');
      const response = await fileService.upload(selectedFile, encryptedData);
      console.log('Upload concluído:', response);
      
      setSuccess(`Arquivo "${response.filename}" enviado com sucesso!`);
      setSelectedFile(null);
      
      // Limpar input
      document.getElementById('fileInput').value = '';
      
      // Notificar componente pai
      if (onFileUploaded) {
        onFileUploaded();
      }
      
    } catch (err) {
      console.error('Erro no upload:', err);
      console.error('Stack trace:', err.stack);
      setError(err.response?.data?.error || err.message || 'Erro ao fazer upload do arquivo');
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
        <p><strong>Nota:</strong> Os arquivos são criptografados automaticamente antes do upload para garantir sua segurança.</p>
      </div>
    </div>
  );
};

export default FileUpload;