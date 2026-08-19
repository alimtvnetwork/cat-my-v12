setup-backend:
	cd BE && uv sync

test-backend:
	cd BE && uv run pytest tests/ -v

lint-backend:
	cd BE && uv run ruff check .

dev-backend:
	cd BE && uv run python -m BE.main
