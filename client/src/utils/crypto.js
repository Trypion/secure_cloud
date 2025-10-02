import CryptoJS from 'crypto-js';

// Configurações do PBKDF2: SHA256, 4096 iterações, 32 bytes
export const deriveKeyFromPassword = (password, salt) => {
  try {
    // Validar entradas
    if (!password || typeof password !== 'string') {
      throw new Error('Senha inválida');
    }
    if (!salt || typeof salt !== 'string') {
      throw new Error('Salt inválido');
    }
    
    const saltWordArray = CryptoJS.enc.Hex.parse(salt);
    const key = CryptoJS.PBKDF2(password, saltWordArray, {
      keySize: 256/32, // 32 bytes = 256 bits
      iterations: 4096,
      hasher: CryptoJS.algo.SHA256
    });
    
    const keyHex = key.toString(CryptoJS.enc.Hex);
    return keyHex;
  } catch (error) {
    throw new Error('Falha ao derivar chave de criptografia: ' + error.message);
  }
};

// Gera um salt aleatório para o usuário
export const generateSalt = () => {
  try {
    const salt = CryptoJS.lib.WordArray.random(32); // 32 bytes
    const saltHex = salt.toString(CryptoJS.enc.Hex);
    return saltHex;
  } catch (error) {
    throw new Error('Falha ao gerar salt: ' + error.message);
  }
};

// Criptografia AES para arquivos
export const encryptFile = (fileData, password) => {
  try {
    // Validar entradas
    if (!fileData) {
      throw new Error('Dados do arquivo estão vazios');
    }
    if (!password) {
      throw new Error('Senha não fornecida');
    }

    const salt = generateSalt();
    const key = deriveKeyFromPassword(password, salt);
    
    // Validar se a chave foi gerada corretamente
    if (!key || key.length !== 64) { // 32 bytes = 64 hex chars
      throw new Error('Chave de criptografia inválida');
    }
    
    const keyWordArray = CryptoJS.enc.Hex.parse(key);
    
    // Validar se o WordArray foi criado corretamente
    if (!keyWordArray || !keyWordArray.words || keyWordArray.words.length === 0) {
      throw new Error('Falha ao processar chave de criptografia');
    }
    
    // Converter arquivo para base64 se necessário
    let dataToEncrypt = fileData;
    if (fileData instanceof ArrayBuffer) {
      const uint8Array = new Uint8Array(fileData);
      dataToEncrypt = btoa(String.fromCharCode.apply(null, uint8Array));
    }
    
    // Garantir que os dados são uma string
    if (typeof dataToEncrypt !== 'string') {
      dataToEncrypt = String(dataToEncrypt);
    }
    
    const encrypted = CryptoJS.AES.encrypt(dataToEncrypt, keyWordArray, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    const result = {
      encrypted: encrypted.toString(),
      salt: salt
    };

    return result;
    
  } catch (error) {
    throw new Error('Falha na criptografia do arquivo: ' + error.message);
  }
};

// Descriptografia AES para arquivos
export const decryptFile = (encryptedData, password, salt) => {
  try {
    // Validar entradas
    if (!encryptedData) {
      throw new Error('Dados criptografados estão vazios');
    }
    if (!password) {
      throw new Error('Senha não fornecida');
    }
    if (!salt) {
      throw new Error('Salt não fornecido');
    }
    
    const key = deriveKeyFromPassword(password, salt);
    
    // Validar se a chave foi gerada corretamente
    if (!key || key.length !== 64) { // 32 bytes = 64 hex chars
      throw new Error('Chave de descriptografia inválida');
    }
    
    const keyWordArray = CryptoJS.enc.Hex.parse(key);
    
    // Validar se o WordArray foi criado corretamente
    if (!keyWordArray || !keyWordArray.words || keyWordArray.words.length === 0) {
      throw new Error('Falha ao processar chave de descriptografia');
    }
    
    const decrypted = CryptoJS.AES.decrypt(encryptedData, keyWordArray, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedText) {
      throw new Error('Falha na descriptografia - senha incorreta ou dados corrompidos');
    }

    console.log('Descriptografia concluída com sucesso');
    return decryptedText;
    
  } catch (error) {
    console.error('Erro na descriptografia:', error);
    throw new Error('Falha na descriptografia do arquivo: ' + error.message);
  }
};

// Função para aplicar PBKDF2 antes de enviar para o backend
export const hashPasswordForBackend = (password) => {
  // Aplicar PBKDF2 na senha antes de enviar ao backend
  // O backend aplicará scrypt com salt único por usuário
  const salt = "secure-cloud-frontend-salt"; // Salt fixo para PBKDF2 no frontend
  const hashedPassword = CryptoJS.PBKDF2(password, salt, {
    keySize: 256/32, // 32 bytes = 256 bits
    iterations: 4096,
    hasher: CryptoJS.algo.SHA256
  });

  return {
    pbkdf2Token: hashedPassword.toString(CryptoJS.enc.Hex)
  };
};