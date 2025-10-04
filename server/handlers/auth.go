package handlers

import (
	"log"
	"net/http"
	"secure-cloud-server/database"
	"secure-cloud-server/models"
	"secure-cloud-server/utils"

	"github.com/gin-gonic/gin"
	"github.com/pquerna/otp/totp"
)

type RegisterRequest struct {
	Username    string `json:"username" binding:"required"`
	PBKDF2Token string `json:"pbkdf2_token" binding:"required"`
}

type LoginRequest struct {
	Username    string `json:"username" binding:"required"`
	PBKDF2Token string `json:"pbkdf2_token" binding:"required"`
}

type TOTPRequest struct {
	Username string `json:"username" binding:"required"`
	Code     string `json:"code" binding:"required"`
}

type RegisterResponse struct {
	Message    string `json:"message"`
	QRCodeURL  string `json:"qr_code_url"`
	TOTPSecret string `json:"totp_secret"`
}

func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existingUser models.User
	if err := database.DB.Where("username = ?", req.Username).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"})
		return
	}

	// Gerar salt
	salt, err := utils.GenerateSalt()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate salt"})
		return
	}

	// Hash da senha com scrypt
	hash, err := utils.HashPassword(req.PBKDF2Token, salt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Gerar segredo TOTP
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "SecureCloud",
		AccountName: req.Username,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate TOTP secret"})
		return
	}

	// Criar usuário
	user := models.User{
		Username:   req.Username,
		Salt:       salt,
		Hash:       hash,
		TOTPSecret: key.Secret(),
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, RegisterResponse{
		Message:    "User registered successfully",
		QRCodeURL:  key.URL(),
		TOTPSecret: key.Secret(),
	})
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("Erro ao fazer bind do JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Verificar senha
	if !utils.VerifyPassword(req.PBKDF2Token, user.Salt, user.Hash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Password verified, please provide TOTP code",
		"requires_totp": true,
	})
}

func VerifyTOTP(c *gin.Context) {
	var req TOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Verificar código TOTP
	valid := totp.Validate(req.Code, user.TOTPSecret)
	if !valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid TOTP code"})
		return
	}

	// Gerar JWT
	token, err := utils.GenerateToken(user.ID, user.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"token":   token,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
		},
	})
}
