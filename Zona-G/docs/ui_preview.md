# Zona Gol – Vista previa de la UI

Este documento describe cómo luce la aplicación móvil después del rediseño. Cada sección resume la jerarquía visual, los componentes principales y las interacciones que verás al ejecutar el proyecto.

## Identidad visual
- **Paleta**: gradientes verdes con acentos azul aqua y naranja cálido, definidos en `AppTheme.primaryGradient` y el `ColorScheme` semilla (`app_theme.dart`).
- **Tipografía**: titulares con peso alto y textos secundarios con legibilidad mejorada.
- **Superficies**: tarjetas con esquinas redondeadas (20-28 px), sombras suaves y uso de vidrio esmerilado en contenedores.

## Pantalla de inicio de sesión
- Fondo con degradado vertical, logotipo/identidad centrados y tarjetas translúcidas para el formulario.
- Campos con íconos integrados y botones de acción prominentes.
- Estados de carga y error resaltan con chips de color ámbar o rojo según corresponda.

## Dashboard principal
- Encabezado con saludo y estado del torneo actual, incrustado en un bloque con efecto de vidrio.
- Tarjeta destacada para el torneo en curso, mostrando nombre, estado y rango de fechas.
- Botones de navegación tipo mosaico hacia escáner QR, partidos, jugadores y torneos.
- Sección "Actividad reciente" con tarjetas horizontales y gráficos simples de asistencia.
- Fondo general animado con degradado diagonal para dar sensación de profundidad.

## Listado de partidos (próximos y finalizados)
- Barra superior con buscador y filtros tipo chips.
- Cada partido se muestra en una tarjeta con degradado sutil: marcador, horarios y estado.
- Etiquetas de "En juego", "Completado" o "Pendiente" con código de color.
- Acciones rápidas al deslizar: detalles, registrar resultado o marcar asistencia.

## Detalle de partido
- Hero card con escudos/avatars de equipos y marcador central animado.
- Pestañas para "Resumen", "Asistencia" y "Estadísticas".
- Listas de jugadores con foto circular, rol y estado de asistencia (chips verde, ámbar, rojo).
- Botones flotantes para registrar eventos (goles, tarjetas) y cerrar partido.

## Listado de jugadores
- Cabecera con buscador persistente y filtro por posición/categoría.
- Tarjetas tipo perfil con foto, nombre, posición y estadísticas básicas.
- Estado de inscripción o sanciones resaltado en chips.
- Acciones contextuales (ver historial, editar) accesibles mediante un menú de tres puntos.

## Listado de torneos
- Vistas en tarjetas con ilustraciones vectoriales ligeras.
- Indicadores de progreso y fechas clave.
- CTA principal para crear torneo nuevo con botón flotante.

## Componentes compartidos
- Botones primarios redondeados, iconografía de Fluent/Material con trazo grueso.
- Chips y etiquetas reutilizables para estados y filtros.
- Secciones vacías con ilustraciones y mensajes motivacionales.

> Para ver cada pantalla en código, revisa las clases dentro de `lib/screens/` (por ejemplo `home_screen.dart`, `matches_list_screen.dart`, `player_list_screen.dart`). Ejecuta `flutter run` desde `Zona-G/` para compilar la app.
