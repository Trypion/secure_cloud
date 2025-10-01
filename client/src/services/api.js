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
      window.location.href = '/login';
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
    
    // Criar um blob com os dados criptografados
    const encryptedBlob = new Blob([JSON.stringify(encryptedData)], {
      type: 'application/octet-stream'
    });
    
    formData.append('file', encryptedBlob, file.name + '.encrypted');
    
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
    const response = await api.get(`/files/${fileId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  delete: async (fileId) => {
    const response = await api.delete(`/files/${fileId}`);
    return response.data;
  }
};

export default api;