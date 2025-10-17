# Paleta de Colores de Fútbol - Zona Gol

## Colores Principales Implementados

### 1. Verde Césped (Color Primario)
- **Hex**: `#27AE60`
- **Uso**: Botones primarios, elementos destacados, iconos principales
- **Variaciones**:
  - Light: `#2ECC71`
  - Dark: `#229954`

### 2. Azul Profundo (Color Secundario)
- **Hex**: `#2C3E50`
- **Uso**: Headers, texto principal, elementos de navegación
- **Variaciones**:
  - Light: `#34495E`
  - Dark: `#1B2631`

### 3. Amarillo Dorado (Color de Acento)
- **Hex**: `#F1C40F`
- **Uso**: Call-to-actions, notificaciones, elementos destacados
- **Variaciones**:
  - Light: `#F4D03F`
  - Dark: `#D68910`

### 4. Blanco Humo (Neutro)
- **Hex**: `#ECF0F1`
- **Uso**: Fondos suaves, cards, áreas de contenido

### 5. Gris Medio (Neutro)
- **Hex**: `#7F8C8D`
- **Uso**: Textos secundarios, bordes, elementos sutiles

### 6. Rojo Pasión (Opcional)
- **Hex**: `#E74C3C`
- **Uso**: Alertas, errores, tarjetas rojas, métricas críticas
- **Variaciones**:
  - Light: `#EC7063`
  - Dark: `#C0392B`

## Implementación Técnica

### CSS Variables
Todos los colores están disponibles como variables CSS:
- `--soccer-green`
- `--soccer-blue`
- `--soccer-gold`
- `--soccer-white`
- `--soccer-gray`
- `--soccer-red`

### Clases de Tailwind
Los colores están integrados en Tailwind CSS y pueden usarse como:
- `bg-soccer-green`
- `text-soccer-blue`
- `border-soccer-gold`
- `hover:bg-soccer-green-dark`

### Componentes Actualizados
- ✅ Landing page
- ✅ Home page loading spinner
- ✅ Dashboard page
- ✅ CSS Variables globales (modo claro y oscuro)
- ✅ Sistema de tema de shadcn/ui adaptado

## Mapeo de Colores en el Sistema

### Tema Claro (Light Mode)
- **Background**: Blanco humo (`#ECF0F1`)
- **Primary**: Verde césped (`#27AE60`)
- **Secondary**: Azul profundo (`#2C3E50`)
- **Accent**: Amarillo dorado (`#F1C40F`)
- **Destructive**: Rojo pasión (`#E74C3C`)

### Tema Oscuro (Dark Mode)
- **Background**: Azul profundo oscuro adaptado
- **Primary**: Verde césped suavizado para mejor contraste
- **Secondary**: Azul profundo claro
- **Accent**: Amarillo dorado suavizado
- **Destructive**: Rojo pasión suavizado

## Próximos Pasos
Los colores principales han sido implementados. Para una aplicación completa, se recomienda:
1. Actualizar componentes individuales que aún usen colores antiguos
2. Revisar contraste de accesibilidad en modo oscuro
3. Aplicar la paleta a dashboards específicos (admin, team owner, etc.)