# --- Step 1: Build the application ---
FROM node:18 AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy all source files
COPY . .

# Build the Next.js application
RUN npm run build

# --- Step 2: Run the built app ---
FROM node:18-alpine AS runner

WORKDIR /app

# Copy only the needed files from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/styles ./styles

# Set environment variables if needed
ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
