package api

import (
	"encoding/json"
	"net/http"
	"time"
)

type TransactionsHandler struct {
	deps Dependencies
}

type transactionRequest struct {
	Operations []transactionOperation `json:"operations"`
}

type transactionOperation struct {
	Type     string          `json:"type"`
	Path     string          `json:"path"`
	Content  json.RawMessage `json:"content,omitempty"`
	Mtime    int64           `json:"mtime"`
	ClientID string          `json:"clientId"`
}

type transactionResult struct {
	Path     string `json:"path"`
	Success  bool   `json:"success"`
	Mtime    int64  `json:"mtime"`
	Conflict bool   `json:"conflict"`
	Error    string `json:"error,omitempty"`
}

type transactionResponse struct {
	Results []transactionResult `json:"results"`
}

func (h *TransactionsHandler) Handle(w http.ResponseWriter, r *http.Request) {
	var req transactionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	results := make([]transactionResult, 0, len(req.Operations))
	now := time.Now().UnixMilli()
	for _, op := range req.Operations {
		if op.Path == "" || op.Type == "" {
			results = append(results, transactionResult{
				Path:    op.Path,
				Success: false,
				Mtime:   now,
				Error:   "operation path and type are required",
			})
			continue
		}

		results = append(results, transactionResult{
			Path:     op.Path,
			Success:  true,
			Mtime:    now,
			Conflict: false,
		})
	}

	respondJSON(w, http.StatusOK, transactionResponse{Results: results})
}
