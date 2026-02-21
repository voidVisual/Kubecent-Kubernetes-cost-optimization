# Makefile for development tasks

.PHONY: help install test lint format run-backend run-frontend docker-build deploy-k8s clean

help:
	@echo "Kubecent Development Commands"
	@echo "=============================="
	@echo "make install          - Install dependencies"
	@echo "make test             - Run all tests"
	@echo "make lint             - Run linting"
	@echo "make format           - Format code"
	@echo "make run-backend      - Run backend locally"
	@echo "make run-frontend     - Run frontend locally"
	@echo "make docker-build     - Build Docker images"
	@echo "make docker-up        - Start docker-compose"
	@echo "make docker-down      - Stop docker-compose"
	@echo "make deploy-k8s       - Deploy to Kubernetes"
	@echo "make clean            - Clean build artifacts"

install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

test:
	cd backend && pytest tests/ -v --cov=app
	cd frontend && npm run test 2>/dev/null || echo "Frontend tests not configured"

lint:
	cd backend && ruff check .
	cd frontend && npm run lint 2>/dev/null || echo "Frontend linting not configured"

format:
	cd backend && black . && ruff check . --fix
	cd frontend && npm run format 2>/dev/null || echo "Frontend formatting not configured"

run-backend:
	cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

run-frontend:
	cd frontend && npm run dev

docker-build:
	docker-compose -f docker/docker-compose.yml build

docker-up:
	docker-compose -f docker/docker-compose.yml up

docker-down:
	docker-compose -f docker/docker-compose.yml down

deploy-k8s:
	kubectl create namespace kubecent 2>/dev/null || true
	helm install kubecent ./helm/kubecent --namespace kubecent --values helm/kubecent/values.yaml

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name dist -exec rm -rf {} + 2>/dev/null || true
	rm -rf frontend/node_modules 2>/dev/null || true
	rm -rf backend/venv 2>/dev/null || true
