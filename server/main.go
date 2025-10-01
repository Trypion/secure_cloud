package main

import (
	"log"
	"secure-cloud-server/database"
	"secure-cloud-server/handlers"
	"secure-cloud-server/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Inicializar banco de dados
	if err := database.InitDatabase(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// Configurar Gin
	r := gin.Default()

	// Configurar CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Rotas públicas
	public := r.Group("/api")
	{
		public.POST("/register", handlers.Register)
		public.POST("/login", handlers.Login)
		public.POST("/verify-totp", handlers.VerifyTOTP)
	}

	// Rotas protegidas
	protected := r.Group("/api")
	protected.Use(middleware.AuthMiddleware())
	{
		protected.POST("/upload", handlers.UploadFile)
		protected.GET("/files", handlers.ListFiles)
		protected.GET("/files/:id", handlers.DownloadFile)
		protected.DELETE("/files/:id", handlers.DeleteFile)
	}

	log.Println("Server starting on port 8080...")
	r.Run(":8080")
}
