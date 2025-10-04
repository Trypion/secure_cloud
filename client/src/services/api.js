import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

// Configurar axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para lidar com erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const authService = {
  register: async (username, pbkdf2Token) => {
    const response = await api.post('/register', {
      username,
      pbkdf2_token: pbkdf2Token
    });
    return response.data;
  },

  login: async (username, pbkdf2Token) => {
    const response = await api.post('/login', {
      username,
      pbkdf2_token: pbkdf2Token
    });
    return response.data;
  },

  verifyTOTP: async (username, code) => {
    const response = await api.post('/verify-totp', {
      username,
      code
    });
    return response.data;
  }
};

export const fileService = {
  upload: async (file, encryptedData) => {
    const formData = new FormData();
    
    // Enviar dados criptografados como string Base64
    formData.append('file', encryptedData.encrypted);
    formData.append('filename', file.name);
    formData.append('salt', encryptedData.salt);
    formData.append('iv', encryptedData.iv);
    formData.append('authTag', encryptedData.authTag);
    
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  list: async () => {
    const response = await api.get('/files');
    return response.data;
  },

  download: async (fileId) => {
    const response = await api.get(`/files/${fileId}`);
    return response.data;
  },

  delete: async (fileId) => {
    const response = await api.delete(`/files/${fileId}`);
    return response.data;
  }
};

export default api;