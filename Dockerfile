# --- Stage 1: Build Frontend (Node.js) ---
FROM node:22-alpine AS frontend-builder

WORKDIR /app-frontend
COPY frontend/package*.json ./
RUN npm install

# Copy source code React
COPY frontend/ .
# Build production (Output ke folder dist atau sesuai vite.config)
# Kita paksa output ke folder dist di dalam container ini
RUN npm run build -- --outDir dist

# --- Stage 2: Setup Backend (Python Flask) ---
FROM python:3.10-slim

WORKDIR /app

# Install dependencies backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code backend
COPY backend/ .

# Buat folder static/react jika belum ada
RUN mkdir -p static/react

# --- GABUNGKAN: Copy hasil build Frontend ke folder Static Backend ---
COPY --from=frontend-builder /app-frontend/dist ./static/react

# Environment variables
ENV FLASK_ENV=production

# Expose port (biasanya 5000 atau 8000)
EXPOSE 5000

# Jalankan menggunakan Gunicorn (Production server untuk Flask)
CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]