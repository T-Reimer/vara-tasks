package api

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type FilesHandler struct {
	deps Dependencies
}

func (h *FilesHandler) Handle(w http.ResponseWriter, r *http.Request) {
	relPath := strings.TrimPrefix(r.URL.Path, "/api/files/")
	if relPath == "" {
		http.Error(w, "file path is required", http.StatusBadRequest)
		return
	}

	clean := filepath.Clean(relPath)
	if strings.HasPrefix(clean, "..") {
		http.Error(w, "invalid file path", http.StatusBadRequest)
		return
	}

	fullPath := filepath.Join(h.deps.DataDir, clean)
	if _, err := os.Stat(fullPath); err != nil {
		if os.IsNotExist(err) {
			http.NotFound(w, r)
			return
		}
		http.Error(w, "failed to read file", http.StatusInternalServerError)
		return
	}

	http.ServeFile(w, r, fullPath)
}
