package database

import (
	"secure-cloud-server/models"

	sqlite "github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDatabase() error {
	var err error
	DB, err = gorm.Open(sqlite.Open("../storage/database.db"), &gorm.Config{})
	if err != nil {
		return err
	}

	// Auto-migração das tabelas
	err = DB.AutoMigrate(&models.User{}, &models.UserFile{})
	if err != nil {
		return err
	}

	return nil
}
