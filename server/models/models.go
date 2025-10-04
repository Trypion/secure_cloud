package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID         uint           `json:"id" gorm:"primaryKey"`
	Username   string         `json:"username" gorm:"unique;not null"`
	Salt       string         `json:"-" gorm:"not null"` // Não retornar no JSON
	Hash       string         `json:"-" gorm:"not null"` // Não retornar no JSON
	TOTPSecret string         `json:"-" gorm:"not null"` // Segredo para TOTP
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`
}

type UserFile struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	UserID    uint           `json:"user_id" gorm:"not null"`
	Filename  string         `json:"filename" gorm:"not null"`
	StoredAs  string         `json:"-" gorm:"not null"` // Nome do arquivo no storage
	Size      int64          `json:"size"`
	Salt      string         `json:"-" gorm:"not null"` // Salt para derivação de chave
	IV        string         `json:"-" gorm:"not null"` // IV para AES-CBC
	AuthTag   string         `json:"-" gorm:"not null"` // HMAC para autenticação
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
	User      User           `json:"-" gorm:"foreignKey:UserID"`
}
