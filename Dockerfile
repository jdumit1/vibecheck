FROM node:18-alpine AS frontend-build

WORKDIR /app

COPY package*.json ./
RUN npm ci --verbose

COPY . .
RUN npm run build && ls -la dist/

# Backend stage
FROM python:3.11-slim

WORKDIR /app

# Copy backend files
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Copy built frontend from previous stage
COPY --from=frontend-build /app/dist ./static/

# Debug: show what was copied
RUN ls -la /app/static/ || echo "Static directory not found"

# Expose port
EXPOSE 8000

# Run the app
CMD ["python", "main.py"]
