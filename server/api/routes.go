package api

import (
	"net/http"

	"vara-tasks/server/auth"
	"vara-tasks/server/middleware"
)

type Dependencies struct {
	JWT     *auth.Manager
	Codes   *auth.CodeStore
	DataDir string
}

func RegisterRoutes(mux *http.ServeMux, deps Dependencies) {
	authHandler := &AuthHandler{deps: deps}
	txHandler := &TransactionsHandler{deps: deps}
	syncHandler := &SyncHandler{deps: deps}
	filesHandler := &FilesHandler{deps: deps}

	protected := middleware.RequireJWT(deps.JWT)

	mux.HandleFunc("POST /api/auth/login", authHandler.Login)
	mux.Handle("GET /api/auth/qrcode", protected(http.HandlerFunc(authHandler.QRCode)))

	mux.Handle("POST /api/transactions", protected(http.HandlerFunc(txHandler.Handle)))
	mux.Handle("GET /api/sync", protected(http.HandlerFunc(syncHandler.Handle)))
	mux.Handle("GET /api/files/", protected(http.HandlerFunc(filesHandler.Handle)))
}
