# UI Guidelines (Semana 1)

## Tokens y base
- Usar tokens de `src/styles.css` (`--ui-*`) para colores, radios, sombras, tipografía y spacing.
- Clases base: `ui-page-header`, `ui-page-title`, `ui-page-subtitle`, `ui-card`, `ui-btn` (`ui-btn-primary|secondary|danger|ghost`), `ui-badge` (`ui-badge-success|warning|danger|info|neutral`), `ui-table-wrap`, `ui-table`, `ui-field`, `ui-label`, `ui-input`.

## Patrones de estado
- **Loading**: skeleton dentro de `ui-card` o `app-skeleton`; evitar solo texto "Cargando...".
- **Empty**: `app-empty-state` con título y descripción accionable.
- **Error**: mostrar contexto claro; usar `fromHttpError` para incluir `details[]` de validación/backend.
- **Success**: confirmar acción completada; en acciones sensibles mostrar detalle suficiente.

## Notificaciones
- **`NotificationService` (toast)**: feedback menor/no bloqueante. Ej: actualización rápida, info, eventos en tiempo real, errores recuperables no críticos.
  - Usar `success/info/warning/error`.
  - Para errores HTTP menores/no bloqueantes: `notificationService.fromHttpError(err, 'Mensaje')`.
- **`NotificationModalService` (modal)**: feedback importante/bloqueante o que el usuario no debe perder. Ej: error de guardado/formulario, acción sensible, resultado con datos a copiar (contraseña temporal), confirmaciones críticas.
  - Usar `success/error/warning/info`.
  - Para errores HTTP importantes: `notificationModal.fromHttpError(err, 'Mensaje')`.

## Accesibilidad
- Inputs con label visible o `aria-label`.
- Botones icono con `aria-label`.
- Modales: rol/aria-modal cuando aplique, foco inicial y cierre por Escape.
- Estados no solo por color: incluir texto/icono.
