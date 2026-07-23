package main

import (
	"fmt"
	"log"
	"os"

	"Geospatial-harmuz-watch/server/internal/db"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	err := godotenv.Load("../.env")
	if err != nil {
		log.Println("No .env file found or error loading it")
	}
	
	if os.Getenv("DATABASE_URL") == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	err = db.InitDB()
	if err != nil {
		log.Fatal("DB Init failed:", err)
	}

	email := "ykinwork1@gmail.com"
	password := "yahya123"
	username := "ykinwork1"

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Password hashing failed:", err)
	}

	id := uuid.New().String()
	
	_, err = db.Exec("INSERT INTO users (id, username, email, password_hash, role, status) VALUES (?, ?, ?, ?, 'admin', 'approved') ON CONFLICT (email) DO UPDATE SET password_hash = ?, role = 'admin'", id, username, email, string(hash), string(hash))
	if err != nil {
		log.Fatal("Error inserting admin:", err)
	}
	
	fmt.Println("Admin seeded successfully:", email)
}
