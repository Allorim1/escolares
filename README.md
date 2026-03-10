# Escolares - Frontend

Frontend de la aplicación Escolares desarrollado con Angular 21.

## Requisitos

- Node.js 20+
- npm 10+

## Desarrollo local

```bash
cd escolares
npm install
npm start
```

La aplicación estará disponible en `http://localhost:4200`

## Build para producción

```bash
npm run build
```

El build se genera en `dist/escolares/browser`

## Docker

### Build de imagen

```bash
docker build -t escolares-frontend .
```

### Run con Docker Compose

```bash
docker-compose up frontend
```

La aplicación estará disponible en `http://localhost`

## Configuración

El frontend usa rutas relativas (`/api/...`) para las llamadas a la API. En desarrollo, debe estar corriendo la API en el puerto 3000. En producción, el proxy de nginx redirige las peticiones a la API.

## Estructura

```
escolares/
├── src/
│   └── app/
│       ├── admin/          # Panel de administración
│       ├── backend/       # Servicios de datos
│       ├── cart/          # Carrito de compras
│       ├── home/          # Página principal
│       ├── login/         # Autenticación
│       ├── panel/         # Panel de usuario
│       ├── products/      # Catálogo de productos
│       └── shared/        # Componentes compartidos
├── public/                # Archivos estáticos
└── nginx.conf            # Configuración de nginx
```
