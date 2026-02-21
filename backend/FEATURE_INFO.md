# Backend Feature Branch

This branch contains the complete backend implementation for Kubecent - Kubernetes cost optimization and monitoring platform.

## Contents
- FastAPI Python application
- OpenCost client integration
- Grafana client integration
- RESTful API endpoints
- Cost analysis services
- Monitoring services

## Key Files
- `app/` - Application source code
- `app/api/` - API endpoints
- `app/clients/` - External service clients
- `app/services/` - Business logic services
- `app/core/` - Core configuration and utilities
- `app/models/` - Data models
- `requirements.txt` - Python dependencies
- `run.py` - Application entry point

## Development
```bash
cd backend
pip install -r requirements.txt
python run.py
```

## API Documentation
Once running, visit: http://localhost:8000/docs
