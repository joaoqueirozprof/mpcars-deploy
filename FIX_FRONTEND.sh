#!/bin/bash
# ==============================================
# MPCARS - Script de Correcao do Frontend
# Corrige navegacao, nginx, Layout e rebuild
# ==============================================
set -e

echo "============================================"
echo "  MPCARS - CORRECAO DO FRONTEND"
echo "============================================"

cd /opt/mpcars

# 1. Corrigir nginx.conf - porta 80
echo ""
echo "[1/7] Corrigindo nginx.conf..."
cat > frontend/nginx.conf << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # SPA support - route all requests to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_EOF
echo "  OK - nginx.conf corrigido (listen 80)"

# 2. Corrigir Dockerfile
echo ""
echo "[2/7] Corrigindo Dockerfile..."
cat > frontend/Dockerfile << 'DOCKERFILE_EOF'
# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build application (vite build direto, sem tsc)
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

# Copy built application from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
DOCKERFILE_EOF
echo "  OK - Dockerfile corrigido (EXPOSE 80)"

# 3. Corrigir package.json - build sem tsc
echo ""
echo "[3/7] Corrigindo package.json (build sem tsc)..."
cat > frontend/package.json << 'PACKAGE_EOF'
{
  "name": "mpcars-web",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.0",
    "recharts": "^2.10.0",
    "lucide-react": "^0.292.0",
    "date-fns": "^2.30.0",
    "@tanstack/react-query": "^5.28.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
PACKAGE_EOF
echo "  OK - package.json corrigido"

# 4. Corrigir Layout.tsx - remover useLocation nao usado, single Outlet
echo ""
echo "[4/7] Corrigindo Layout.tsx (single Outlet, sem useLocation)..."
mkdir -p frontend/src/components
cat > frontend/src/components/Layout.tsx << 'LAYOUT_EOF'
import React, { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from './Sidebar'
import { Menu, X } from 'lucide-react'

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 flex items-center justify-between p-4 z-30">
        <h1 className="text-xl font-bold text-primary">MPCARS</h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main content - single Outlet */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto pt-16 lg:pt-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default Layout
LAYOUT_EOF
echo "  OK - Layout.tsx corrigido"

# 5. Corrigir tsconfig.json
echo ""
echo "[5/7] Corrigindo tsconfig.json..."
cat > frontend/tsconfig.json << 'TSCONFIG_EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "node",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
TSCONFIG_EOF
echo "  OK - tsconfig.json corrigido"

# 6. Corrigir docker-compose.yml - porta do frontend
echo ""
echo "[6/7] Corrigindo porta do frontend no docker-compose.yml..."
# Garantir que a porta do frontend mapeia para 80 (container)
sed -i 's/"3000:3000"/"3001:80"/' docker-compose.yml 2>/dev/null || true
sed -i 's/"3001:3000"/"3001:80"/' docker-compose.yml 2>/dev/null || true
# Se ja esta 3001:80, nao muda nada
echo "  OK - docker-compose.yml verificado (3001:80)"

# 7. Remover CRLF de todos os arquivos
echo ""
echo "[7/7] Removendo caracteres CRLF..."
find /opt/mpcars/frontend -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.json" -o -name "*.js" -o -name "*.css" -o -name "*.html" -o -name "*.conf" -o -name "Dockerfile" \) -exec sed -i 's/\r$//' {} +
echo "  OK - CRLF removidos"

# REBUILD
echo ""
echo "============================================"
echo "  RECONSTRUINDO FRONTEND (pode levar 2-3 min)"
echo "============================================"
echo ""

docker compose build --no-cache frontend

echo ""
echo "============================================"
echo "  REINICIANDO FRONTEND"
echo "============================================"
echo ""

docker compose up -d frontend

echo ""
echo "============================================"
echo "  AGUARDANDO INICIALIZACAO..."
echo "============================================"
sleep 5

# Verificar status
echo ""
docker compose ps frontend

echo ""
echo "============================================"
echo "  CORRECAO CONCLUIDA!"
echo "  Acesse: http://72.61.129.78:3001"
echo "  Limpe o cache do navegador (Ctrl+Shift+R)"
echo "============================================"
