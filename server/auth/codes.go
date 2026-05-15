package auth

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"math/big"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type CodeEntry struct {
	Code      string    `json:"code"`
	Username  string    `json:"username"`
	ExpiresAt time.Time `json:"expiresAt"`
	Used      bool      `json:"used"`
}

type CodeStore struct {
	path string
	mu   sync.Mutex
}

func NewCodeStore(path string) (*CodeStore, error) {
	store := &CodeStore{path: path}
	if err := store.ensureFile(); err != nil {
		return nil, err
	}
	return store, nil
}

func (s *CodeStore) GenerateOne(username string, ttl time.Duration) (CodeEntry, error) {
	entries, err := s.GenerateMany(1, username, ttl)
	if err != nil {
		return CodeEntry{}, err
	}
	return entries[0], nil
}

func (s *CodeStore) GenerateMany(count int, username string, ttl time.Duration) ([]CodeEntry, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	entries, err := s.load()
	if err != nil {
		return nil, err
	}
	entries = pruneStale(entries, time.Now())

	created := make([]CodeEntry, 0, count)
	for i := 0; i < count; i++ {
		code, err := generateCode(20)
		if err != nil {
			return nil, err
		}
		entry := CodeEntry{
			Code:      code,
			Username:  username,
			ExpiresAt: time.Now().Add(ttl),
			Used:      false,
		}
		entries = append(entries, entry)
		created = append(created, entry)
	}

	if err := s.save(entries); err != nil {
		return nil, err
	}
	return created, nil
}

func (s *CodeStore) Validate(code string, now time.Time) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	entries, err := s.load()
	if err != nil {
		return "", err
	}

	for i := range entries {
		if entries[i].Code != code {
			continue
		}
		if entries[i].Used {
			return "", errors.New("code already used")
		}
		if now.After(entries[i].ExpiresAt) {
			return "", errors.New("code expired")
		}

		username := entries[i].Username
		entries[i].Used = true
		if err := s.save(pruneStale(entries, now)); err != nil {
			return "", err
		}
		return username, nil
	}

	return "", errors.New("code not found")
}

func (s *CodeStore) ensureFile() error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return err
	}
	if _, err := os.Stat(s.path); errors.Is(err, os.ErrNotExist) {
		return os.WriteFile(s.path, []byte("[]"), 0o600)
	}
	return nil
}

func (s *CodeStore) load() ([]CodeEntry, error) {
	data, err := os.ReadFile(s.path)
	if err != nil {
		return nil, err
	}
	if len(data) == 0 {
		return []CodeEntry{}, nil
	}

	var entries []CodeEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		return nil, err
	}
	return entries, nil
}

func (s *CodeStore) save(entries []CodeEntry) error {
	data, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return err
	}
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}

func pruneStale(entries []CodeEntry, now time.Time) []CodeEntry {
	active := make([]CodeEntry, 0, len(entries))
	for _, e := range entries {
		if !e.Used && !now.After(e.ExpiresAt) {
			active = append(active, e)
		}
	}
	return active
}

func generateCode(length int) (string, error) {
	// Exclude easily confused characters: 0, O, I, l, etc.
	const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	code := make([]byte, length)
	max := big.NewInt(int64(len(alphabet)))
	for i := range code {
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		code[i] = alphabet[n.Int64()]
	}
	return string(code), nil
}
