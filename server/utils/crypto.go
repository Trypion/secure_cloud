package utils

import (
	"crypto/rand"
	"encoding/hex"
	"log"

	"golang.org/x/crypto/scrypt"
)

// Gera um salt aleatório de 32 bytes
func GenerateSalt() (string, error) {
	salt := make([]byte, 32)
	_, err := rand.Read(salt)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(salt), nil
}

// Aplica scrypt ao token PBKDF2
func HashPassword(pbkdf2Token string, salt string) (string, error) {
	saltBytes, err := hex.DecodeString(salt)
	if err != nil {
		return "", err
	}

	tokenBytes, err := hex.DecodeString(pbkdf2Token)
	if err != nil {
		return "", err
	}

	// Configurações do scrypt: N=16384, r=8, p=1, 32 bytes
	hash, err := scrypt.Key(tokenBytes, saltBytes, 16384, 8, 1, 32)
	if err != nil {
		return "", err
	}

	return hex.EncodeToString(hash), nil
}

// Verifica se o token PBKDF2 corresponde ao hash armazenado
func VerifyPassword(pbkdf2Token string, salt string, storedHash string) bool {
	hash, err := HashPassword(pbkdf2Token, salt)
	if err != nil {
		log.Printf("Erro ao gerar hash: %v", err)
		return false
	}

	return hash == storedHash
}

func GenerateFileID() (string, error) {
	bytes := make([]byte, 16)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
