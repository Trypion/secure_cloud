import React, { useState } from 'react';
import { authService } from '../services/api';
import { hashPassword } from '../utils/crypto';
import { useAuth } from '../context/AuthContext';

const Login = ({ onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTOTP, setShowTOTP] = useState(false);
  const [pendingUsername, setPendingUsername] = useState('');
  
  const { login } = useAuth();

  const handleChange = (e) => {
    // Limpar erro quando usuário começar a digitar
    if (error) {
      setError('');
    }
    
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { pbkdf2Token } = hashPassword(formData.password);      
      const response = await authService.login(formData.username, pbkdf2Token);    

      if (response.requires_totp) {
        setShowTOTP(true);
        setPendingUsername(formData.username);
        // NÃO salvar a senha no localStorage por segurança
      }
      
    } catch (err) {
      console.error('Erro no login:', err);
      
      // Tratamento mais específico de erros
      if (err.response?.status === 401) {
        setError('Usuário ou senha incorretos');
      } else if (err.response?.status === 500) {
        setError('Erro interno do servidor. Tente novamente.');
      } else if (err.message === 'Network Error') {
        setError('Erro de conexão. Verifique sua internet.');
      } else {
        setError(err.response?.data?.error || 'Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTOTPSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.verifyTOTP(pendingUsername, totpCode);
      
      // Login bem-sucedido
      login(response.user, response.token);
      
    } catch (err) {
      console.error('Erro no TOTP:', err);
      
      // Tratamento mais específico de erros TOTP
      if (err.response?.status === 401) {
        setError('Código TOTP inválido ou expirado');
      } else if (err.response?.status === 500) {
        setError('Erro interno do servidor. Tente novamente.');
      } else {
        setError(err.response?.data?.error || 'Erro na verificação 2FA');
      }
    } finally {
      setLoading(false);
    }
  };

  if (showTOTP) {
    return (
      <div className="login-container">
        <h2>Autenticação 2FA</h2>
        
        {error && <div className="error">{error}</div>}
        
        <form onSubmit={handleTOTPSubmit}>
          <div className="form-group">
            <label htmlFor="totpCode">Código TOTP:</label>
            <input
              type="text"
              id="totpCode"
              value={totpCode}
              onChange={(e) => {
                // Limpar erro quando usuário começar a digitar
                if (error) {
                  setError('');
                }
                setTotpCode(e.target.value);
              }}
              placeholder="Digite o código de 6 dígitos"
              maxLength="6"
              required
            />
          </div>
          
          <button type="submit" disabled={loading}>
            {loading ? 'Verificando...' : 'Verificar'}
          </button>
        </form>
        
        <button 
          onClick={() => {
            setShowTOTP(false);
            setTotpCode('');
            setPendingUsername('');
          }}
          className="back-button"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="login-container">
      <h2>Login</h2>
      
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleLoginSubmit}>
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
        
        <button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      
      <div className="switch-auth">
        <p>Não tem uma conta?</p>
        <button onClick={onSwitchToRegister}>
          Registrar
        </button>
      </div>
    </div>
  );
};

export default Login;