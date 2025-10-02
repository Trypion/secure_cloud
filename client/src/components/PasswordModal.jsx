import React, { useState } from 'react';

const PasswordModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Por favor, digite sua senha');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onConfirm(password);
      setPassword('');
      onClose();
    } catch (err) {
      setError(err.message || 'Senha incorreta ou erro na operação');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="password-modal-overlay">
      <div className="password-modal-content">
        <div className="password-modal-header">
          <h3>🔐 {title}</h3>
          <button 
            className="password-modal-close"
            onClick={handleClose}
            type="button"
          >
            ✕
          </button>
        </div>
        
        <div className="password-modal-body">
          <p>{message}</p>
          
          {error && <div className="error">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="modalPassword">Sua senha:</label>
              <input
                type="password"
                id="modalPassword"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha para continuar"
                autoFocus
                disabled={loading}
                required
              />
            </div>
            
            <div className="password-modal-actions">
              <button 
                type="button" 
                onClick={handleClose}
                className="cancel-button"
                disabled={loading}
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="confirm-button"
                disabled={loading}
              >
                {loading ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="password-modal-footer">
          <small>🛡️ Sua senha é usada apenas para criptografia local e nunca é armazenada.</small>
        </div>
      </div>
    </div>
  );
};

export default PasswordModal;