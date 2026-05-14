package api

import (
	"net/http"
)

type SyncHandler struct {
	deps Dependencies
}

type syncFile struct {
	Path  string `json:"path"`
	Mtime int64  `json:"mtime"`
	Size  int64  `json:"size"`
	Hash  string `json:"hash"`
}

type syncResponse struct {
	Files []syncFile `json:"files"`
}

func (h *SyncHandler) Handle(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, syncResponse{Files: []syncFile{}})
}
