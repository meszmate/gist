.PHONY: dev build start lint typecheck check db-generate db-migrate db-push db-studio install clean

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

# Setup
install:
	pnpm install

clean:
	rm -rf .next node_modules/.cache
