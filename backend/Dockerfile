# Build context is repo root (.)
FROM python:3.10-slim

WORKDIR /app

# Copy OpenOA package and install from source
COPY pyproject.toml MANIFEST.in ./
COPY openoa ./openoa
COPY examples ./examples
COPY README.md LICENSE.txt ./

RUN pip install --no-cache-dir -e .

# Copy backend and install dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend ./backend

WORKDIR /app/backend
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
