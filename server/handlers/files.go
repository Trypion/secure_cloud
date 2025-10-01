package handlers

import (
	"io"
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

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to get file"})
		return
	}
	defer file.Close()

	// Gerar ID único para o arquivo
	fileID, err := utils.GenerateFileID()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate file ID"})
		return
	}

	// Criar diretório se não existir
	storageDir := "../storage/files"
	if err := os.MkdirAll(storageDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create storage directory"})
		return
	}

	// Salvar arquivo
	storagePath := filepath.Join(storageDir, fileID)
	dst, err := os.Create(storagePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create file"})
		return
	}
	defer dst.Close()

	fileSize, err := io.Copy(dst, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Salvar informações no banco
	userFile := models.UserFile{
		UserID:   userID.(uint),
		Filename: header.Filename,
		StoredAs: fileID,
		Size:     fileSize,
	}

	if err := database.DB.Create(&userFile).Error; err != nil {
		// Remover arquivo se falhar ao salvar no banco
		os.Remove(storagePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file info"})
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

	// Buscar arquivo no banco
	var userFile models.UserFile
	if err := database.DB.Where("id = ? AND user_id = ?", uint(fileID), userID).First(&userFile).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Verificar se o arquivo existe no storage
	storagePath := filepath.Join("../storage/files", userFile.StoredAs)
	if _, err := os.Stat(storagePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found in storage"})
		return
	}

	// Servir o arquivo
	c.Header("Content-Disposition", "attachment; filename="+userFile.Filename)
	c.File(storagePath)
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