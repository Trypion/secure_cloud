package main

import (
	"embed"
	"io/fs"
	"log"
	"mime"
	"net/http"
	"path/filepath"
	"secure-cloud-server/database"
	"secure-cloud-server/handlers"
	"secure-cloud-server/middleware"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

//go:embed static
var embeddedStatic embed.FS

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

	// Rotas públicas API
	public := r.Group("/api")
	{
		public.POST("/register", handlers.Register)
		public.POST("/login", handlers.Login)
		public.POST("/verify-totp", handlers.VerifyTOTP)
	}

	// Rotas protegidas API
	protected := r.Group("/api")
	protected.Use(middleware.AuthMiddleware())
	{
		protected.POST("/upload", handlers.UploadFile)
		protected.GET("/files", handlers.ListFiles)
		protected.GET("/files/:id", handlers.DownloadFile)
		protected.DELETE("/files/:id", handlers.DeleteFile)
	}

	// Servir frontend estático embedado
	// Espera-se que o build do frontend (Vite) seja copiado para server/static antes do build do Go.
	subFS, err := fs.Sub(embeddedStatic, "static")
	if err != nil {
		log.Println("static embed FS not found:", err)
	} else {
		// Rota dedicada para /assets/* (JS, CSS, etc.) antes do fallback SPA
		r.GET("/assets/*filepath", func(c *gin.Context) {
			p := strings.TrimPrefix(c.Param("filepath"), "/")
			if p == "" {
				c.Status(http.StatusNotFound)
				return
			}
			data, err := fs.ReadFile(subFS, filepath.ToSlash(filepath.Join("assets", p)))
			if err != nil {
				log.Printf("asset miss: %s", p)
				c.Status(http.StatusNotFound)
				return
			}
			c.Data(http.StatusOK, detectMime(p), data)
		})

		// Fallback SPA / demais arquivos
		r.NoRoute(func(c *gin.Context) {
			// Se for rota de API já caiu em 404 de API; aqui tratamos apenas SPA.
			if strings.HasPrefix(c.Request.URL.Path, "/api/") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
				return
			}
			// Tentar servir arquivo exato
			path := c.Request.URL.Path
			if path == "/" { // index
				path = "/index.html"
			}
			// Segurança: impedir path traversal
			clean := filepath.Clean(path)
			if strings.HasPrefix(clean, "..") {
				c.Status(http.StatusBadRequest)
				return
			}
			file := clean[1:] // remover '/'
			data, err := fs.ReadFile(subFS, file)
			if err != nil {
				// Caso seja asset esperado (possui extensão conhecida) devolve 404 ao invés de index.html para evitar MIME incorreto.
				ext := filepath.Ext(file)
				switch ext {
				case ".css", ".js", ".png", ".jpg", ".jpeg", ".svg", ".woff", ".woff2", ".json":
					c.Status(http.StatusNotFound)
					return
				}
				// fallback SPA -> index.html
				index, err2 := fs.ReadFile(subFS, "index.html")
				if err2 != nil {
					c.Status(http.StatusNotFound)
					return
				}
				c.Data(http.StatusOK, "text/html; charset=utf-8", index)
				return
			}
			// Content-Type simples (poderia melhorar usando mime package)
			c.Data(http.StatusOK, detectMime(file), data)
		})
	}

	log.Println("Server starting on port 8080...")
	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}

// detectMime faz uma detecção básica baseada em extensão.
func detectMime(name string) string {
	ext := filepath.Ext(name)
	switch ext { // overrides para garantir charset
	case ".html":
		return "text/html; charset=utf-8"
	}
	if ext == ".js" { // browsers modernos aceitam application/javascript
		return "application/javascript"
	}
	if m := mime.TypeByExtension(ext); m != "" {
		return m
	}
	// Fallback manual para alguns que às vezes faltam
	switch ext {
	case ".css":
		return "text/css"
	case ".svg":
		return "image/svg+xml"
	case ".woff":
		return "font/woff"
	case ".woff2":
		return "font/woff2"
	}
	return "application/octet-stream"
}
