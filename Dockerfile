FROM node:18-alpine AS frontend-build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Backend stage
FROM python:3.11-slim

WORKDIR /app

# Copy backend files
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Copy built frontend from previous stage
COPY --from=frontend-build /app/dist ./static

# Expose port
EXPOSE 8000

# Run the app
CMD ["python", "main.py"]
