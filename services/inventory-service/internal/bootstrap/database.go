package bootstrap

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/jackc/pgx/v5/pgxpool"
)

func ConnectDatabase(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("connect database: %w", err)
	}

	if err = pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return pool, nil
}

func RunMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	migrationPath := filepath.Join("migrations", "001_init.sql")
	sqlBytes, err := os.ReadFile(migrationPath)
	if err != nil {
		return fmt.Errorf("read migration: %w", err)
	}

	_, err = pool.Exec(ctx, string(sqlBytes))
	if err != nil {
		return fmt.Errorf("apply migration: %w", err)
	}

	return nil
}
