package config

import "os"

type Config struct {
	Port          string
	DataDir       string
	StaticDir     string
	PublicBaseURL string
}

func Load() Config {
	return Config{
		Port:          getOrDefault("PORT", "8080"),
		DataDir:       getOrDefault("DATA_DIR", "./data"),
		StaticDir:     getOrDefault("STATIC_DIR", "../dist"),
		PublicBaseURL: os.Getenv("PUBLIC_BASE_URL"),
	}
}

func (c Config) Address() string {
	return ":" + c.Port
}

func getOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
