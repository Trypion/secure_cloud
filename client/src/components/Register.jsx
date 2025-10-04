import React, { useState } from 'react';
import { authService } from '../services/api';
import { hashPassword } from '../utils/crypto';
import QRCode from 'qrcode';

const Register = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [qrCodeDataURL, setQrCodeDataURL] = useState('');
  const [totpSecret, setTotpSecret] = useState('');

  const generateQRCode = async (otpauthUrl) => {
    try {
      const qrDataURL = await QRCode.toDataURL(otpauthUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataURL(qrDataURL);
    } catch (err) {
      console.error('Erro ao gerar QR Code:', err);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { pbkdf2Token } = hashPassword(formData.password);
      
      const response = await authService.register(formData.username, pbkdf2Token);
           
      setSuccess('Usuário registrado com sucesso!');
      setTotpSecret(response.totp_secret);
      
      // Gerar QR Code visual
      if (response.qr_code_url) {
        await generateQRCode(response.qr_code_url);
      }
      
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao registrar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <h2>Registro</h2>
      
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      
      {!success && (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Usuário:</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Senha:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Senha:</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          
          <button type="submit" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrar'}
          </button>
        </form>
      )}
      
      {success && (
        <div className="totp-setup">
          <h3>Configure o 2FA</h3>
          <p>Escaneie o QR Code com seu aplicativo autenticador:</p>
          
          {qrCodeDataURL && (
            <div className="qr-code-container">
              <img 
                src={qrCodeDataURL} 
                alt="QR Code para 2FA" 
              />
            </div>
          )}
          
          <p>Ou insira manualmente o código:</p>
          <code>{totpSecret}</code>          
          
          <div className="actions">
            <button onClick={onSwitchToLogin}>
              Ir para Login
            </button>
          </div>
        </div>
      )}
      
      {!success && (
        <div className="switch-auth">
          <p>Já tem uma conta?</p>
          <button onClick={onSwitchToLogin}>
            Fazer Login
          </button>
        </div>
      )}
    </div>
  );
};

export default Register;