package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"vara-tasks/server/middleware"
)

type AuthHandler struct {
	deps Dependencies
}

type loginRequest struct {
	Code       string `json:"code"`
	ClientID   string `json:"clientId"`
	DeviceName string `json:"deviceName"`
}

type loginResponse struct {
	Token     string `json:"token"`
	ExpiresIn int64  `json:"expiresIn"`
	UserID    string `json:"userId"`
}

type qrcodeResponse struct {
	ServerURL string    `json:"serverUrl"`
	Token     string    `json:"token"`
	UserID    string    `json:"userId"`
	ExpiresAt time.Time `json:"expiresAt"`
}

type userFile struct {
	Username  string        `json:"username"`
	CreatedAt time.Time     `json:"createdAt"`
	Devices   []deviceEntry `json:"devices"`
}

type deviceEntry struct {
	ClientID       string    `json:"clientId"`
	Name           string    `json:"name"`
	TokenCreatedAt time.Time `json:"tokenCreatedAt"`
	LastSeen       time.Time `json:"lastSeen"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}
	if req.Code == "" {
		http.Error(w, "code is required", http.StatusBadRequest)
		return
	}

	username, err := h.deps.Codes.Validate(req.Code, time.Now())
	if err != nil {
		http.Error(w, "invalid or expired code", http.StatusUnauthorized)
		return
	}

	clientID := req.ClientID
	if clientID == "" {
		clientID, err = randomID(8)
		if err != nil {
			http.Error(w, "failed to create client ID", http.StatusInternalServerError)
			return
		}
	}
	deviceName := req.DeviceName
	if deviceName == "" {
		deviceName = "Unknown Device"
	}

	token, expiresAt, err := h.deps.JWT.IssueToken(username, clientID, 24*time.Hour)
	if err != nil {
		http.Error(w, "failed to issue token", http.StatusInternalServerError)
		return
	}

	if err := upsertDevice(h.deps.DataDir, username, deviceEntry{
		ClientID:       clientID,
		Name:           deviceName,
		TokenCreatedAt: time.Now().UTC(),
		LastSeen:       time.Now().UTC(),
	}); err != nil {
		http.Error(w, "failed to persist user device", http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, loginResponse{
		Token:     token,
		ExpiresIn: int64(time.Until(expiresAt).Seconds()),
		UserID:    username,
	})
}

func (h *AuthHandler) QRCode(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok || claims.Username == "" {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}

	// clientID follows Go acronym conventions (uppercase ID).
	// The JSON field is serialized as "clientId" (camelCase) for JS clients.
	clientID, err := randomID(8)
	if err != nil {
		http.Error(w, "failed to create client ID", http.StatusInternalServerError)
		return
	}

	token, expiresAt, err := h.deps.JWT.IssueToken(claims.Username, clientID, 24*time.Hour)
	if err != nil {
		http.Error(w, "failed to issue import token", http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, qrcodeResponse{
		ServerURL: resolveServerURL(r, h.deps.PublicBaseURL),
		Token:     token,
		UserID:    claims.Username,
		ExpiresAt: expiresAt,
	})
}

func resolveServerURL(r *http.Request, configured string) string {
	if configured != "" {
		return strings.TrimRight(configured, "/")
	}

	scheme := "http"
	trustProxyHeaders := strings.EqualFold(os.Getenv("TRUST_PROXY_HEADERS"), "true")
	if trustProxyHeaders {
		forwardedProto := firstForwardedHeaderValue(r.Header.Get("X-Forwarded-Proto"))
		if forwardedProto == "http" || forwardedProto == "https" {
			scheme = forwardedProto
		}
	}
	if scheme == "http" && r.TLS != nil {
		scheme = "https"
	}

	host := r.Host
	if trustProxyHeaders {
		forwardedHost := firstForwardedHeaderValue(r.Header.Get("X-Forwarded-Host"))
		if forwardedHost != "" {
			host = forwardedHost
		}
	}

	return scheme + "://" + host
}

func firstForwardedHeaderValue(value string) string {
	if value == "" {
		return ""
	}
	first := strings.Split(value, ",")[0]
	if first == "" {
		return ""
	}
	trimmed := strings.TrimSpace(first)
	if trimmed == "" {
		return ""
	}
	// Forwarded host/proto headers should be a single token.
	if strings.ContainsAny(trimmed, " \t") {
		return ""
	}
	return trimmed
}

func upsertDevice(dataDir, username string, device deviceEntry) error {
	usersDir := filepath.Join(dataDir, "users")
	if err := os.MkdirAll(usersDir, 0o755); err != nil {
		return err
	}

	path := filepath.Join(usersDir, username+".json")
	user, err := readUser(path)
	if err != nil {
		return err
	}
	if user.Username == "" {
		user.Username = username
		user.CreatedAt = time.Now().UTC()
	}

	replaced := false
	for i := range user.Devices {
		if user.Devices[i].ClientID == device.ClientID {
			user.Devices[i].Name = device.Name
			user.Devices[i].TokenCreatedAt = device.TokenCreatedAt
			user.Devices[i].LastSeen = device.LastSeen
			replaced = true
			break
		}
	}
	if !replaced {
		user.Devices = append(user.Devices, device)
	}

	payload, err := json.MarshalIndent(user, "", "  ")
	if err != nil {
		return err
	}

	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, payload, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func readUser(path string) (userFile, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return userFile{}, nil
		}
		return userFile{}, err
	}
	if len(data) == 0 {
		return userFile{}, nil
	}

	var user userFile
	if err := json.Unmarshal(data, &user); err != nil {
		return userFile{}, err
	}
	return user, nil
}

func randomID(bytesLen int) (string, error) {
	buffer := make([]byte, bytesLen)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	return hex.EncodeToString(buffer), nil
}

func respondJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
