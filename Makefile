.PHONY: dev build start lint typecheck check db-generate db-migrate db-push db-studio db-seed docker-seed install clean

# Development
dev:
	pnpm dev

build:
	pnpm build

start:
	pnpm start

# Code quality
lint:
	pnpm lint

typecheck:
	npx tsc --noEmit

check: lint typecheck

# Database
db-generate:
	pnpm db:generate

db-migrate:
	pnpm db:migrate

db-push:
	pnpm db:push

db-studio:
	pnpm db:studio

db-seed:
	pnpm db:seed

# Docker
docker-seed:
	docker compose --profile seed run --rm seed

# Setup
install:
	pnpm install

clean:
	rm -rf .next node_modules/.cache
