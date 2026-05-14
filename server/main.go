package main

import (
	"log"
	"net/http"
	"path/filepath"
	"time"

	"vara-tasks/server/api"
	"vara-tasks/server/auth"
	"vara-tasks/server/config"
	"vara-tasks/server/middleware"
	"vara-tasks/server/storage"
)

func main() {
	cfg := config.Load()
	if err := storage.EnsureDataDirs(cfg.DataDir); err != nil {
		log.Fatalf("failed to prepare data directories: %v", err)
	}

	jwtManager, err := auth.NewManager(filepath.Join(cfg.DataDir, "jwt-secret.key"))
	if err != nil {
		log.Fatalf("failed to initialize JWT manager: %v", err)
	}

	codeStore, err := auth.NewCodeStore(filepath.Join(cfg.DataDir, "auth-codes.json"))
	if err != nil {
		log.Fatalf("failed to initialize auth code store: %v", err)
	}

	deps := api.Dependencies{
		JWT:     jwtManager,
		Codes:   codeStore,
		DataDir: cfg.DataDir,
	}

	mux := http.NewServeMux()
	api.RegisterRoutes(mux, deps)

	handler := middleware.Logging(mux)
	server := &http.Server{
		Addr:              cfg.Address(),
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
	}

	log.Printf("server listening on %s", cfg.Address())
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}
