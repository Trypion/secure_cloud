import CryptoJS from "crypto-js";

export const deriveKeyFromPassword = (password, salt) => {
  try {
    const saltWordArray = CryptoJS.enc.Hex.parse(salt);
    const key = CryptoJS.PBKDF2(password, saltWordArray, {
      keySize: 256 / 32, // 32 bytes = 256 bits
      iterations: 4096,
      hasher: CryptoJS.algo.SHA256,
    });

    const keyHex = key.toString(CryptoJS.enc.Hex);
    return keyHex;
  } catch (error) {
    throw new Error("Falha ao derivar chave de criptografia: " + error.message);
  }
};

export const generateSalt = () => {
  try {
    const salt = CryptoJS.lib.WordArray.random(32); // 32 bytes
    const saltHex = salt.toString(CryptoJS.enc.Hex);
    return saltHex;
  } catch (error) {
    throw new Error("Falha ao gerar salt: " + error.message);
  }
};

async function deriveKey(password, salt) {
  const encodedPassword = new TextEncoder().encode(password);
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    encodedPassword,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 600000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  return derivedKey;
}

const toHex = (bytes) =>
  [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
const hexToUint8 = (hex) => {
  const clean = hex.replace(/^0x/, "").toLowerCase();
  if (clean.length % 2 !== 0) throw new Error("Hex inválido");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    out[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return out;
};
const ensureUint8 = (v) => {
  if (v instanceof Uint8Array) return v;
  if (Array.isArray(v)) return new Uint8Array(v);
  if (typeof v === "string") {
    // heurística: se só hex chars -> hex
    return /^[0-9a-fA-F]+$/.test(v)
      ? hexToUint8(v)
      : (() => {
          throw new Error("Formato de string não suportado");
        })();
  }
  if (v instanceof ArrayBuffer) return new Uint8Array(v);
  throw new Error("Tipo não suportado (esperado Uint8Array/hex)");
};
// Criptografia AES para arquivos com autenticação (AES-CBC + HMAC-SHA256)
export const encryptFile = async (fileData, password) => {
  try {
    if (!fileData) {
      throw new Error("Dados do arquivo estão vazios");
    }
    if (!password) {
      throw new Error("Senha não fornecida");
    }

    // Verificar tamanho do arquivo (limite de 50MB para evitar problemas de memória)
    const fileSizeLimit = 50 * 1024 * 1024; // 50MB
    if (
      fileData instanceof ArrayBuffer &&
      fileData.byteLength > fileSizeLimit
    ) {
      throw new Error(
        `Arquivo muito grande. Tamanho: ${(
          fileData.byteLength /
          1024 /
          1024
        ).toFixed(1)}MB. Limite máximo: 50MB`
      );
    }

    // const salt = generateSalt();

    const salt = window.crypto.getRandomValues(new Uint8Array(16)); // 128-bit salt
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for AES-GCM
    const key = await deriveKey(password, salt);

    let dataBytes;
    if (typeof fileData === "string") {
      dataBytes = new TextEncoder().encode(fileData);
    } else if (fileData instanceof Uint8Array) {
      dataBytes = fileData;
    } else if (fileData instanceof ArrayBuffer) {
      dataBytes = new Uint8Array(fileData);
    } else if (fileData instanceof Blob) {
      dataBytes = new Uint8Array(await fileData.arrayBuffer());
    } else {
      throw new Error(
        "Tipo de dado do arquivo não suportado (string/ArrayBuffer/Uint8Array/Blob)"
      );
    }

    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        tagLength: 128, // 128-bit tag length
      },
      key,
      dataBytes
    );

    const full = new Uint8Array(encryptedContent);
    const authTag = full.slice(full.length - 16);
    const ciphertext = full.slice(0, full.length - 16);

    // return in hex format
    return {
      salt: toHex(salt),
      iv: toHex(iv),
      encrypted: toHex(ciphertext),
      authTag: toHex(authTag),
    };
  } catch (error) {
    console.error("Erro detalhado na criptografia:", error);
    console.error("Stack trace:", error.stack);

    // Dar mais detalhes sobre o tipo de erro
    if (error.message.includes("too many arguments")) {
      throw new Error(
        "Arquivo muito grande para processar. Tente um arquivo menor (máximo 10MB recomendado)."
      );
    } else if (
      error.message.includes("out of memory") ||
      error.message.includes("Maximum call stack")
    ) {
      throw new Error(
        "Memória insuficiente para processar este arquivo. Tente um arquivo menor."
      );
    } else if (error.message.includes("Invalid character")) {
      throw new Error(
        "Erro na codificação do arquivo. Verifique se o arquivo não está corrompido."
      );
    } else {
      throw new Error("Falha na criptografia do arquivo: " + error.message);
    }
  }
};

// Descriptografia AES para arquivos com verificação de autenticação (AES-CBC + HMAC-SHA256)
export const decryptFile = async (
  encryptedData,
  password,
  salt,
  iv,
  authTag
) => {
  try {
    // Converter hex strings de volta para Uint8Array
    const encryptedBytes = ensureUint8(encryptedData);
    const saltBytes = ensureUint8(salt);
    const ivBytes = ensureUint8(iv);
    const authTagBytes = ensureUint8(authTag);

    const key = await deriveKey(password, saltBytes);

    // Re-combinar ciphertext e authentication tag
    const dataWithAuthTag = new Uint8Array(
      encryptedBytes.length + authTagBytes.length
    );
    dataWithAuthTag.set(encryptedBytes, 0);
    dataWithAuthTag.set(authTagBytes, encryptedBytes.length);

    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBytes, tagLength: 128 },
      key,
      dataWithAuthTag
    );

    return new Uint8Array(decryptedContent);
  } catch (error) {
    console.error("Erro na descriptografia:", error);

    if (error.message.includes("Senha incorreta")) {
      throw error;
    } else if (
      error.message.includes("Falha na verificação de autenticidade")
    ) {
      throw new Error("Senha incorreta ou arquivo foi modificado.");
    } else if (error.message.includes("dados corrompidos")) {
      throw new Error("Arquivo corrompido ou danificado.");
    } else {
      throw new Error("Erro na descriptografia: " + error.message);
    }
  }
};

export const hashPassword = (password) => {
  const salt = "secure-cloud-frontend-salt";
  const hashedPassword = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32, // 32 bytes = 256 bits
    iterations: 4096,
    hasher: CryptoJS.algo.SHA256,
  });

  return {
    pbkdf2Token: hashedPassword.toString(CryptoJS.enc.Hex),
  };
};
