## Docker and PostgreSQL Setup

### 1. Overview

Docker is used to run a PostgreSQL database in a containerized environment.

This allows the development team to use the same database configuration without manually installing PostgreSQL on every computer.

Docker Compose is used to configure and manage the PostgreSQL container.

### 2. Starting Docker Desktop

Before starting the database, make sure Docker Desktop is installed and running.

On Windows:

1. Open Docker Desktop.
2. Wait until the Docker Engine is running.
3. Open a terminal in the `backend` directory.

### 3. Starting the PostgreSQL Container

To start the PostgreSQL database, run:

```powershell
docker compose up -d
```

The `-d` option runs the container in the background.

### 4. Checking the Container Status

To check whether the PostgreSQL container is running:

```powershell
docker ps
```

The PostgreSQL container should appear in the list.

### 5. Stopping the Container

To stop the PostgreSQL container:

```powershell
docker compose stop
```

To stop and remove the container:

```powershell
docker compose down
```

**Note:** `docker compose down` does not remove the named database volume, so database data is preserved.

To remove the container and its database volume as well:

```powershell
docker compose down -v
```

**Warning:** This command permanently deletes the database data stored in the Docker volume.

### 6. Viewing PostgreSQL Logs

To view the PostgreSQL container logs:

```powershell
docker compose logs db
```

To follow the logs in real time:

```powershell
docker compose logs -f db
```

### 7. Accessing the PostgreSQL Database

To access the PostgreSQL database through the terminal:

```powershell
docker exec -it tradeIt_db psql -U app_user -d tradeIt
```

To list all database tables:

```sql
\dt
```

To exit the PostgreSQL terminal:

```sql
\q
```

### 8. Database Connection

The backend connects to PostgreSQL using the `DATABASE_URL` environment variable stored in the `.env` file.

Example:

```env
DATABASE_URL=postgresql+psycopg://app_user:dev_password@localhost:5432/tradeIt
```

The connection string contains:

- Database type: PostgreSQL
- Driver: Psycopg
- Username: `app_user`
- Password: `dev_password`
- Host: `localhost`
- Port: `5432`
- Database name: `tradeIt`

Do not commit the `.env` file or real database credentials to version control.

---

## Running the Backend and Frontend Locally

The following steps start the FastAPI backend and the static HTML/CSS/JavaScript frontend on separate ports.

### 1. Start the database

Make sure Docker Desktop is running and start the database using the Docker instructions above. **Run `docker compose` from the project root directory**, where `docker-compose.yml` is located.

### 2. Configure the backend

Open a new PowerShell terminal in the `backend` directory:

```powershell
cd backend
```

Create a virtual environment and install dependencies if this is your first run:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

For subsequent runs, activate the existing environment with:

```powershell
.\.venv\Scripts\Activate.ps1
```

Make sure `backend/.env` exists and contains the required settings. Use `backend/.env.example` as a starting point, and supply your own values for the database connection, session secret and Google OAuth credentials. The frontend redirect must point to its own port:

```env
FRONTEND_URL=http://localhost:5500
```

For Google login, configure the following **Authorized redirect URI** in your Google Cloud OAuth client:

```text
http://localhost:8000/api/v1/auth/google/callback
```

The URI must match exactly, including scheme, host, port and path.

In `backend/src/main.py`, include `http://localhost:5500` in the `origins` list used by `CORSMiddleware` (with `allow_credentials=True`). This is required for cross-origin API requests from the frontend.

If the database schema has not been initialized yet, run the migrations from the `backend` directory:

```powershell
python -m alembic upgrade head
```

### 3. Start the backend (port 8000)

From the `backend` directory, with the virtual environment active, run:

```powershell
python -m uvicorn src.main:app --reload --port 8000
```

The backend is available at:

- API: http://localhost:8000
- Interactive API documentation (Swagger UI): http://localhost:8000/docs

Leave this terminal running.

### 4. Start the frontend (port 5500)

Open a **second terminal** and navigate to the `frontend` directory from the project root:

```powershell
cd frontend
py -m http.server 5500
```

Open http://localhost:5500 in your browser. No Node.js installation or frontend build step is required to serve the application.

Ensure the Google sign-in link in `frontend/scripts/core/events.js` targets the backend endpoint:

```text
http://localhost:8000/api/v1/auth/google
```

### 5. Local development URLs

| Service             | URL / Port                 |
| ------------------- | -------------------------- |
| Frontend            | http://localhost:5500      |
| FastAPI backend     | http://localhost:8000      |
| Swagger UI          | http://localhost:8000/docs |
| PostgreSQL (Docker) | localhost:5432             |

**Troubleshooting:** If Google displays `Error 400: redirect_uri_mismatch`, check the `redirect_uri` shown in the error details and register that exact callback URI in Google Cloud Console. The backend and frontend must not use the same local port.
