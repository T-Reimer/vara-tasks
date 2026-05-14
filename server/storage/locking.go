package storage

import (
	"sync"
	"time"
)

type lockPool struct {
	mu    sync.Mutex
	locks map[string]chan struct{}
}

type UnlockFunc func()

var globalLocks = &lockPool{locks: map[string]chan struct{}{}}

func AcquireWithTimeout(path string, timeout time.Duration) (UnlockFunc, bool) {
	lock := getLock(path)

	select {
	case <-lock:
		return func() { lock <- struct{}{} }, true
	case <-time.After(timeout):
		return nil, false
	}
}

func getLock(path string) chan struct{} {
	globalLocks.mu.Lock()
	defer globalLocks.mu.Unlock()

	if existing, ok := globalLocks.locks[path]; ok {
		return existing
	}
	created := make(chan struct{}, 1)
	created <- struct{}{}
	globalLocks.locks[path] = created
	return created
}
