package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
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
		JWT:           jwtManager,
		Codes:         codeStore,
		DataDir:       cfg.DataDir,
		PublicBaseURL: cfg.PublicBaseURL,
	}

	mux := http.NewServeMux()
	api.RegisterRoutes(mux, deps)
	attachStaticHandler(mux, cfg.StaticDir)

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

func attachStaticHandler(mux *http.ServeMux, staticDir string) {
	if _, err := os.Stat(staticDir); err != nil {
		log.Printf("static directory not available (%s): %v", staticDir, err)
		return
	}

	fileServer := http.FileServer(http.Dir(staticDir))
	mux.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}

		candidate := filepath.Join(staticDir, filepath.Clean(r.URL.Path))
		if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
			fileServer.ServeHTTP(w, r)
			return
		}

		http.ServeFile(w, r, filepath.Join(staticDir, "index.html"))
	}))
	log.Printf("serving static files from %s", staticDir)
}
