# Zona Gol - Sistema de Gestión de Ligas

Una plataforma completa para administrar ligas de fútbol con Next.js 15, Supabase y Zustand.

## 🚀 Características

### Sistema de Roles
- **Super Admin**: Control total del sistema
- **Admin de Liga**: Gestiona su liga específica
- **Dueño de Equipo**: Administra su equipo y jugadores
- **Público**: Acceso de solo lectura

### Funcionalidades Principales
- ⚽ Gestión completa de ligas y torneos
- 👥 Administración de equipos y jugadores
- 📊 Sistema de estadísticas avanzadas
- 🏆 Seguimiento de partidos y resultados
- 📱 Interfaz responsive y moderna
- 🔐 Autenticación segura con Supabase
- 📈 Dashboard personalizado por rol

## 🛠️ Tecnologías

- **Frontend**: Next.js 15, React 19, TypeScript
- **Base de Datos**: Supabase (PostgreSQL)
- **Estado**: Zustand con Immer
- **UI**: Tailwind CSS + Radix UI
- **Autenticación**: Supabase Auth
- **Iconos**: Lucide React

## 📁 Estructura del Proyecto

```
zona-gol/
├── app/                        # App Router de Next.js
│   ├── dashboard/             # Panel de control
│   ├── liga/[slug]/          # Vista pública de ligas
│   ├── ligas/                # Directorio de ligas
│   ├── login/                # Autenticación
│   ├── layout.tsx            # Layout principal
│   └── page.tsx              # Landing page
├── components/               # Componentes React
│   ├── auth/                 # Componentes de autenticación
│   ├── layout/               # Componentes de layout
│   ├── league-admin/         # Admin de liga
│   ├── public/               # Componentes públicos
│   ├── super-admin/          # Super admin
│   ├── team-owner/           # Dueño de equipo
│   └── ui/                   # Componentes UI base
├── lib/                      # Lógica de negocio
│   ├── actions/              # Funciones de acción
│   │   ├── auth-actions.ts
│   │   ├── league-actions.ts
│   │   └── team-actions.ts
│   ├── hooks/                # Hooks personalizados
│   │   ├── use-auth.ts
│   │   ├── use-leagues.ts
│   │   └── use-teams.ts
│   ├── providers/            # Context providers
│   │   └── supabase-provider.tsx
│   ├── stores/               # Estado global (Zustand)
│   │   ├── auth-store.ts
│   │   ├── league-store.ts
│   │   └── team-store.ts
│   ├── supabase/             # Configuración Supabase
│   │   ├── client.ts
│   │   ├── server.ts
│   │   ├── database.types.ts
│   │   └── schema.sql
│   ├── types.ts              # Tipos TypeScript
│   └── utils.ts              # Utilidades
└── public/                   # Archivos estáticos
```

## 🗄️ Base de Datos

### Tablas Principales
- `users` - Perfiles de usuario
- `leagues` - Ligas deportivas
- `tournaments` - Torneos
- `teams` - Equipos
- `players` - Jugadores
- `matches` - Partidos
- `player_stats` - Estadísticas de jugadores

### Seguridad (RLS)
- Políticas de seguridad a nivel de fila
- Control de acceso basado en roles
- Autenticación JWT con Supabase

## 🚦 Instalación

1. **Clonar el repositorio**
```bash
git clone <repo-url>
cd zona-gol
```

2. **Instalar dependencias**
```bash
pnpm install
```

3. **Configurar variables de entorno**
```bash
cp .env.local.example .env.local
```

Actualiza `.env.local` con tus credenciales de Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=tu-url-de-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima
SUPABASE_SERVICE_ROLE_KEY=tu-clave-de-servicio
```

4. **Configurar la base de datos**
- Crea un proyecto en [Supabase](https://supabase.com)
- Ejecuta el script SQL en `lib/supabase/schema.sql`
- Configura las políticas RLS según el esquema

5. **Ejecutar en desarrollo**
```bash
pnpm dev
```

## 📋 Scripts Disponibles

```bash
pnpm dev          # Servidor de desarrollo
pnpm build        # Build para producción
pnpm start        # Servidor de producción
pnpm lint         # Linter
pnpm type-check   # Verificación de tipos
```

## 🏗️ Arquitectura

### Estado Global (Zustand)
- **auth-store**: Autenticación y perfil de usuario
- **league-store**: Gestión de ligas y torneos
- **team-store**: Equipos, jugadores y partidos

### Acciones (Actions)
- **auth-actions**: Login, registro, perfil
- **league-actions**: CRUD de ligas y torneos
- **team-actions**: Gestión de equipos y jugadores

### Hooks Personalizados
- **useAuth**: Estado de autenticación
- **useLeagues**: Operaciones de ligas
- **useTeams**: Operaciones de equipos

## 🔒 Roles y Permisos

### Super Admin
- Gestión completa del sistema
- Control total de todas las ligas
- Administración de usuarios

### Admin de Liga
- Crear y gestionar su liga
- Administrar torneos y equipos
- Gestionar partidos y resultados

### Dueño de Equipo
- Gestionar su equipo específico
- Administrar jugadores
- Ver estadísticas y partidos

### Público
- Ver ligas públicas
- Acceder a estadísticas
- Consultar calendarios

## 📈 Características Avanzadas

- **Real-time**: Actualizaciones en tiempo real con Supabase
- **Responsive**: Diseño adaptable a todos los dispositivos
- **Type-safe**: TypeScript en todo el proyecto
- **Modular**: Arquitectura escalable y mantenible
- **SEO**: Optimizado para motores de búsqueda
- **Performance**: Lazy loading y optimizaciones

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

¿Necesitas ayuda? Abre un issue en GitHub o contacta al equipo de desarrollo.