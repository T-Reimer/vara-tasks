package auth

import (
	"crypto/rand"
	"errors"
	"os"
	"path/filepath"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	Username string
	ClientID string
	Expires  time.Time
}

type Manager struct {
	secret []byte
}

type tokenClaims struct {
	Username string `json:"username"`
	ClientID string `json:"clientId"`
	jwt.RegisteredClaims
}

func NewManager(secretPath string) (*Manager, error) {
	secret, err := loadOrCreateSecret(secretPath)
	if err != nil {
		return nil, err
	}
	return &Manager{secret: secret}, nil
}

func (m *Manager) IssueToken(username, clientID string, ttl time.Duration) (string, time.Time, error) {
	expiresAt := time.Now().Add(ttl)
	claims := tokenClaims{
		Username: username,
		ClientID: clientID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(m.secret)
	if err != nil {
		return "", time.Time{}, err
	}
	return signed, expiresAt, nil
}

func (m *Manager) ParseToken(tokenString string) (Claims, error) {
	parsed, err := jwt.ParseWithClaims(tokenString, &tokenClaims{}, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return m.secret, nil
	})
	if err != nil {
		return Claims{}, err
	}

	claims, ok := parsed.Claims.(*tokenClaims)
	if !ok || !parsed.Valid {
		return Claims{}, errors.New("invalid claims")
	}

	return Claims{
		Username: claims.Username,
		ClientID: claims.ClientID,
		Expires:  claims.ExpiresAt.Time,
	}, nil
}

func loadOrCreateSecret(secretPath string) ([]byte, error) {
	if data, err := os.ReadFile(secretPath); err == nil && len(data) > 0 {
		return data, nil
	}

	if err := os.MkdirAll(filepath.Dir(secretPath), 0o755); err != nil {
		return nil, err
	}

	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		return nil, err
	}

	if err := os.WriteFile(secretPath, secret, 0o600); err != nil {
		return nil, err
	}
	return secret, nil
}
