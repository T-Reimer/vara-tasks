package storage

type ManifestEntry struct {
	Mtime int64    `json:"mtime"`
	Hash  string   `json:"hash"`
	Files []string `json:"files"`
}

type Manifest struct {
	Projects map[string]ManifestEntry `json:"projects"`
}
