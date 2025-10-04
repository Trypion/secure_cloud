package handlers

import (
	"net/http"
	"os"
	"path/filepath"
	"secure-cloud-server/database"
	"secure-cloud-server/models"
	"secure-cloud-server/utils"
	"strconv"

	"github.com/gin-gonic/gin"
)

func UploadFile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	encryptedData := c.PostForm("file")
	filename := c.PostForm("filename")
	salt := c.PostForm("salt")
	iv := c.PostForm("iv")
	authTag := c.PostForm("authTag")

	if encryptedData == "" || filename == "" || salt == "" || iv == "" || authTag == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required parameters"})
		return
	}

	fileID, err := utils.GenerateFileID()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate file ID"})
		return
	}

	storageDir := "../storage/files"
	if err := os.MkdirAll(storageDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create storage directory"})
		return
	}

	// Salvar dados criptografados (como Base64) no arquivo
	storagePath := filepath.Join(storageDir, fileID)
	if err := os.WriteFile(storagePath, []byte(encryptedData), 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Salvar metadados no banco
	userFile := models.UserFile{
		UserID:   userID.(uint),
		Filename: filename,
		StoredAs: fileID,
		Size:     int64(len(encryptedData)), // Tamanho dos dados Base64
		Salt:     salt,
		IV:       iv,
		AuthTag:  authTag,
	}

	if err := database.DB.Create(&userFile).Error; err != nil {
		os.Remove(storagePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file metadata"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "File uploaded successfully",
		"file_id":  userFile.ID,
		"filename": userFile.Filename,
		"size":     userFile.Size,
	})
}

func ListFiles(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var files []models.UserFile
	if err := database.DB.Where("user_id = ?", userID).Find(&files).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get files"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"files": files,
	})
}

func DownloadFile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	fileIDStr := c.Param("id")
	fileID, err := strconv.ParseUint(fileIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	var userFile models.UserFile
	if err := database.DB.Where("id = ? AND user_id = ?", uint(fileID), userID).First(&userFile).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	storagePath := filepath.Join("../storage/files", userFile.StoredAs)
	if _, err := os.Stat(storagePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found in storage"})
		return
	}

	// Ler dados criptografados (Base64 string)
	encryptedData, err := os.ReadFile(storagePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"filename":       userFile.Filename,
		"size":           userFile.Size,
		"salt":           userFile.Salt,
		"iv":             userFile.IV,
		"auth_tag":       userFile.AuthTag,
		"encrypted_data": string(encryptedData), // Retornar como string Base64
	})
}

func DeleteFile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	fileIDStr := c.Param("id")
	fileID, err := strconv.ParseUint(fileIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	// Buscar arquivo no banco
	var userFile models.UserFile
	if err := database.DB.Where("id = ? AND user_id = ?", uint(fileID), userID).First(&userFile).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Remover arquivo do storage
	storagePath := filepath.Join("../storage/files", userFile.StoredAs)
	os.Remove(storagePath) // Ignora erro se arquivo não existir

	// Remover do banco
	if err := database.DB.Delete(&userFile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "File deleted successfully",
	})
}
