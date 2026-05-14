package config

import "os"

type Config struct {
	Port    string
	DataDir string
}

func Load() Config {
	return Config{
		Port:    getOrDefault("PORT", "8080"),
		DataDir: getOrDefault("DATA_DIR", "./data"),
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
