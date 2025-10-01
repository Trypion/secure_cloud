import React, { useState, useEffect } from 'react';
import { fileService } from '../services/api';
import { decryptFile } from '../utils/crypto';

const FileList = ({ refreshTrigger }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState({});
  const [viewing, setViewing] = useState({});
  const [fileContent, setFileContent] = useState(null);

  useEffect(() => {
    loadFiles();
  }, [refreshTrigger]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await fileService.list();
      setFiles(response.files || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar arquivos');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file) => {
    setDownloading(prev => ({ ...prev, [file.id]: true }));
    
    try {
      // Baixar arquivo criptografado
      const encryptedBlob = await fileService.download(file.id);
      
      // Ler o conteúdo do blob
      const encryptedText = await encryptedBlob.text();
      const encryptedData = JSON.parse(encryptedText);
      
      // Obter senha do usuário para descriptografia
      const userPassword = localStorage.getItem('userPassword');
      if (!userPassword) {
        alert('Sessão expirada. Faça login novamente.');
        return;
      }

      // Descriptografar o arquivo
      const decryptedContent = decryptFile(
        encryptedData.encrypted, 
        userPassword, 
        encryptedData.salt
      );
      
      // Criar blob para download
      const blob = new Blob([decryptedContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Criar link de download
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename.replace('.encrypted', '');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Limpar URL
      URL.revokeObjectURL(url);
      
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao baixar arquivo');
    } finally {
      setDownloading(prev => ({ ...prev, [file.id]: false }));
    }
  };

  const handleViewFile = async (file) => {
    setViewing(prev => ({ ...prev, [file.id]: true }));
    
    try {
      // Baixar arquivo criptografado
      const encryptedBlob = await fileService.download(file.id);
      
      // Ler o conteúdo do blob
      const encryptedText = await encryptedBlob.text();
      const encryptedData = JSON.parse(encryptedText);
      
      // Obter senha do usuário para descriptografia
      const userPassword = localStorage.getItem('userPassword');
      if (!userPassword) {
        alert('Sessão expirada. Faça login novamente.');
        return;
      }

      // Descriptografar o arquivo
      const decryptedContent = decryptFile(
        encryptedData.encrypted, 
        userPassword, 
        encryptedData.salt
      );
      
      // Mostrar conteúdo na tela
      setFileContent({
        filename: file.filename.replace('.encrypted', ''),
        content: decryptedContent,
        size: file.size
      });
      
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao visualizar arquivo');
    } finally {
      setViewing(prev => ({ ...prev, [file.id]: false }));
    }
  };

  const handleDelete = async (file) => {
    if (!confirm(`Tem certeza que deseja excluir "${file.filename}"?`)) {
      return;
    }

    try {
      await fileService.delete(file.id);
      setFiles(files.filter(f => f.id !== file.id));
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir arquivo');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (loading) {
    return <div className="loading">Carregando arquivos...</div>;
  }

  return (
    <div className="file-list">
      <h3>Meus Arquivos</h3>
      
      {error && <div className="error">{error}</div>}
      
      {files.length === 0 ? (
        <div className="no-files">
          <p>Nenhum arquivo encontrado.</p>
          <p>Faça upload de seus primeiros arquivos!</p>
        </div>
      ) : (
        <div className="files-table">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tamanho</th>
                <th>Data de Upload</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {files.map(file => (
                <tr key={file.id}>
                  <td>{file.filename.replace('.encrypted', '')}</td>
                  <td>{formatFileSize(file.size)}</td>
                  <td>{formatDate(file.created_at)}</td>
                  <td>
                    <div className="file-actions">
                      <button
                        onClick={() => handleViewFile(file)}
                        disabled={viewing[file.id]}
                        className="view-button"
                      >
                        {viewing[file.id] ? 'Carregando...' : 'Visualizar'}
                      </button>
                      <button
                        onClick={() => handleDownload(file)}
                        disabled={downloading[file.id]}
                        className="download-button"
                      >
                        {downloading[file.id] ? 'Baixando...' : 'Baixar'}
                      </button>
                      <button
                        onClick={() => handleDelete(file)}
                        className="delete-button"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Modal para visualizar conteúdo do arquivo decifrado */}
      {fileContent && (
        <div className="file-viewer-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h4>📄 Arquivo Decifrado: {fileContent.filename}</h4>
              <button 
                className="close-button"
                onClick={() => setFileContent(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="file-info-viewer">
                <p><strong>📁 Nome:</strong> {fileContent.filename}</p>
                <p><strong>📏 Tamanho:</strong> {formatFileSize(fileContent.size)}</p>
                <p><strong>🔓 Status:</strong> <span style={{color: 'green'}}>Descriptografado com sucesso!</span></p>
              </div>
              <div className="file-content-viewer">
                <h5>📖 Conteúdo do arquivo:</h5>
                <pre className="content-display">{fileContent.content}</pre>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="close-modal-button"
                onClick={() => setFileContent(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileList;