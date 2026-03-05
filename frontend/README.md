# MPCARS Frontend

Frontend web application for MPCARS - Sistema de Gestão de Locadora de Veículos.

Built with React 18, TypeScript, Tailwind CSS, and Vite.

## Quick Start

### Prerequisites
- Node.js 16+ and npm/yarn

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.tsx
│   └── Sidebar.tsx
├── contexts/           # React contexts
│   └── AuthContext.tsx
├── pages/             # Page components
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Clientes.tsx
│   ├── Veiculos.tsx
│   ├── Contratos.tsx
│   ├── Empresas.tsx
│   ├── Financeiro.tsx
│   └── Configuracoes.tsx
├── services/          # API services
│   └── api.ts
├── App.tsx           # Main app component with routes
├── main.tsx          # App entry point
└── index.css         # Global styles

```

## Features

- User authentication with JWT token storage
- Protected routes that redirect to login if not authenticated
- Dashboard with statistics and charts
- Clients management
- Vehicle management with status filtering
- Contract management
- Financial tracking with receipts and expenses
- Company management
- Settings page with profile management
- Responsive sidebar navigation
- Real-time data fetching with React Query

## API Integration

The frontend communicates with the backend API at `http://localhost:8000/api/v1` (configurable via `.env`).

Key API endpoints:
- `/auth/login` - User authentication
- `/clientes` - Clients CRUD
- `/veiculos` - Vehicles CRUD
- `/contratos` - Contracts CRUD
- `/empresas` - Companies CRUD
- `/financeiro` - Financial transactions
- `/dashboard` - Dashboard data

## Authentication

Authentication is handled through JWT tokens stored in localStorage. The `AuthContext` manages the authentication state and provides:
- `login(email, password)` - Authenticate user
- `logout()` - Clear authentication state
- `user` - Current user object
- `token` - JWT token
- `isAuthenticated` - Boolean flag

## Styling

The project uses Tailwind CSS for styling. Custom colors are defined in `tailwind.config.js`:
- `primary: #0066ff` - Main brand color
- `primary-dark: #0052cc` - Darker shade
- `success: #00c853` - Success state
- `warning: #ff9100` - Warning state
- `danger: #ff1744` - Error/danger state

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

All rights reserved - MPCARS 2024
