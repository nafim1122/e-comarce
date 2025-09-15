This project includes Dockerfiles for the frontend and backend and a docker-compose file to run both locally.

Quick start (requires Docker and Docker Compose):

1) Build and run both services:

```bash
docker-compose up --build
```

2) Open the frontend (served by nginx) at:

http://localhost:5173/

3) The backend API will be available at:

http://localhost:5000/

Notes:
- The frontend Dockerfile expects a Vite build command that outputs to `dist` (adjust if your build output is different).
- Ensure any runtime environment (Firebase credentials, DB URIs) are provided to the `backend` service via environment variables or a secrets mechanism before running in production.
