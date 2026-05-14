package storage

import (
	"os"
	"path/filepath"
)

func EnsureDataDirs(dataDir string) error {
	dirs := []string{
		filepath.Join(dataDir, "projects"),
		filepath.Join(dataDir, "global"),
		filepath.Join(dataDir, "users"),
	}
	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return err
		}
	}
	return nil
}
