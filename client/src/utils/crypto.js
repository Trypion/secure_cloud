import CryptoJS from 'crypto-js';

export const deriveKeyFromPassword = (password, salt) => {
  try {
    const saltWordArray = CryptoJS.enc.Hex.parse(salt);
    const key = CryptoJS.PBKDF2(password, saltWordArray, {
      keySize: 256 / 32, // 32 bytes = 256 bits
      iterations: 4096,
      hasher: CryptoJS.algo.SHA256
    });

    const keyHex = key.toString(CryptoJS.enc.Hex);
    return keyHex;
  } catch (error) {
    throw new Error('Falha ao derivar chave de criptografia: ' + error.message);
  }
};

export const generateSalt = () => {
  try {
    const salt = CryptoJS.lib.WordArray.random(32); // 32 bytes
    const saltHex = salt.toString(CryptoJS.enc.Hex);
    return saltHex;
  } catch (error) {
    throw new Error('Falha ao gerar salt: ' + error.message);
  }
};

// Criptografia AES para arquivos com autenticação (AES-CBC + HMAC-SHA256)
export const encryptFile = (fileData, password) => {
  try {
    if (!fileData) {
      throw new Error('Dados do arquivo estão vazios');
    }
    if (!password) {
      throw new Error('Senha não fornecida');
    }

    // Verificar tamanho do arquivo (limite de 50MB para evitar problemas de memória)
    const fileSizeLimit = 50 * 1024 * 1024; // 50MB
    if (fileData instanceof ArrayBuffer && fileData.byteLength > fileSizeLimit) {
      throw new Error(`Arquivo muito grande. Tamanho: ${(fileData.byteLength / 1024 / 1024).toFixed(1)}MB. Limite máximo: 50MB`);
    }

    const salt = generateSalt();
    const key = deriveKeyFromPassword(password, salt);

    const encKeyWordArray = CryptoJS.enc.Hex.parse(key.substring(0, 64)); // Primeiros 32 bytes para AES
    const hmacKey = CryptoJS.PBKDF2(password + 'hmac', CryptoJS.enc.Hex.parse(salt), {
      keySize: 256 / 32, // 32 bytes
      iterations: 4096,
      hasher: CryptoJS.algo.SHA256
    });

    if (!encKeyWordArray || !encKeyWordArray.words || encKeyWordArray.words.length === 0) {
      throw new Error('Falha ao processar chave de criptografia');
    }

    // Converter arquivo para base64 se necessário
    let dataToEncrypt = fileData;
    if (fileData instanceof ArrayBuffer) {
      const uint8Array = new Uint8Array(fileData);

      // Método mais seguro: conversão por chunks pequenos
      let binary = '';
      const chunkSize = 1024; // 1KB chunks para máxima compatibilidade

      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        for (let j = 0; j < chunk.length; j++) {
          binary += String.fromCharCode(chunk[j]);
        }
      }

      dataToEncrypt = btoa(binary);
    }

    if (typeof dataToEncrypt !== 'string') {
      dataToEncrypt = String(dataToEncrypt);
    }

    const iv = CryptoJS.lib.WordArray.random(16); // 16 bytes = 128 bits para AES-CBC

    // Criptografar usando AES-CBC
    const encrypted = CryptoJS.AES.encrypt(dataToEncrypt, encKeyWordArray, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    // Calcular HMAC-SHA256 do texto cifrado para autenticação
    const ciphertextHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
    const ivHex = iv.toString(CryptoJS.enc.Hex);
    const dataToAuthenticate = ivHex + ciphertextHex;
    const authTag = CryptoJS.HmacSHA256(dataToAuthenticate, hmacKey);

    const result = {
      encrypted: encrypted.toString(),
      salt: salt,
      iv: ivHex,
      authTag: authTag.toString(CryptoJS.enc.Hex) // HMAC para autenticação
    };

    return result;

  } catch (error) {
    console.error('Erro detalhado na criptografia:', error);
    console.error('Stack trace:', error.stack);

    // Dar mais detalhes sobre o tipo de erro
    if (error.message.includes('too many arguments')) {
      throw new Error('Arquivo muito grande para processar. Tente um arquivo menor (máximo 10MB recomendado).');
    } else if (error.message.includes('out of memory') || error.message.includes('Maximum call stack')) {
      throw new Error('Memória insuficiente para processar este arquivo. Tente um arquivo menor.');
    } else if (error.message.includes('Invalid character')) {
      throw new Error('Erro na codificação do arquivo. Verifique se o arquivo não está corrompido.');
    } else {
      throw new Error('Falha na criptografia do arquivo: ' + error.message);
    }
  }
};

// Descriptografia AES para arquivos com verificação de autenticação (AES-CBC + HMAC-SHA256)
export const decryptFile = (encryptedData, password, salt, iv, authTag) => {
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
    if (!iv) {
      throw new Error('IV não fornecido');
    }
    if (!authTag) {
      throw new Error('Tag de autenticação não fornecido');
    }

    const key = deriveKeyFromPassword(password, salt);

    if (!key || key.length !== 64) { // 32 bytes = 64 hex chars
      throw new Error('Chave de descriptografia inválida');
    }

    // Derivar chaves separadas para criptografia e HMAC
    const encKeyWordArray = CryptoJS.enc.Hex.parse(key.substring(0, 64)); // Primeiros 32 bytes para AES
    const hmacKey = CryptoJS.PBKDF2(password + 'hmac', CryptoJS.enc.Hex.parse(salt), {
      keySize: 256 / 32, // 32 bytes
      iterations: 4096,
      hasher: CryptoJS.algo.SHA256
    });

    if (!encKeyWordArray || !encKeyWordArray.words || encKeyWordArray.words.length === 0) {
      throw new Error('Falha ao processar chave de descriptografia');
    }

    // Verificar autenticidade usando HMAC
    const ciphertextBase64 = encryptedData;
    const ciphertextHex = CryptoJS.enc.Base64.parse(ciphertextBase64).toString(CryptoJS.enc.Hex);
    const dataToAuthenticate = iv + ciphertextHex;
    const computedAuthTag = CryptoJS.HmacSHA256(dataToAuthenticate, hmacKey);

    if (computedAuthTag.toString(CryptoJS.enc.Hex) !== authTag) {
      throw new Error('Senha incorreta! Verifique sua senha e tente novamente.');
    }

    const ivWordArray = CryptoJS.enc.Hex.parse(iv);

    const decrypted = CryptoJS.AES.decrypt(encryptedData, encKeyWordArray, {
      iv: ivWordArray,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

    if (!decryptedText) {
      throw new Error('Senha incorreta! Não foi possível descriptografar o arquivo.');
    }

    return decryptedText;

  } catch (error) {
    console.error('Erro na descriptografia:', error);

    if (error.message.includes('Senha incorreta')) {
      throw error;
    } else if (error.message.includes('Falha na verificação de autenticidade')) {
      throw new Error('Senha incorreta ou arquivo foi modificado.');
    } else if (error.message.includes('dados corrompidos')) {
      throw new Error('Arquivo corrompido ou danificado.');
    } else {
      throw new Error('Erro na descriptografia: ' + error.message);
    }
  }
};

export const hashPassword = (password) => { 
  const salt = "secure-cloud-frontend-salt"; 
  const hashedPassword = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32, // 32 bytes = 256 bits
    iterations: 4096,
    hasher: CryptoJS.algo.SHA256
  });

  return {
    pbkdf2Token: hashedPassword.toString(CryptoJS.enc.Hex)
  };
};