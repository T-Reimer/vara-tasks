package main

import (
	"flag"
	"fmt"
	"log"
	"path/filepath"
	"time"

	"vara-tasks/server/auth"
)

func main() {
	count := flag.Int("count", 1, "number of codes to generate")
	username := flag.String("username", "trevor", "username to bind generated codes to")
	ttl := flag.Duration("ttl", 5*time.Minute, "code validity window")
	dataDir := flag.String("data-dir", "./data", "server data directory")
	flag.Parse()

	store, err := auth.NewCodeStore(filepath.Join(*dataDir, "auth-codes.json"))
	if err != nil {
		log.Fatalf("failed to initialize code store: %v", err)
	}

	entries, err := store.GenerateMany(*count, *username, *ttl)
	if err != nil {
		log.Fatalf("failed to generate codes: %v", err)
	}

	for _, entry := range entries {
		fmt.Printf("CODE: %s\n", entry.Code)
		fmt.Printf("USER: %s\n", entry.Username)
		fmt.Printf("EXPIRES: %s\n\n", entry.ExpiresAt.UTC().Format(time.RFC3339))
	}
}
