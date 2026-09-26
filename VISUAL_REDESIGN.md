# Fase 2: renovación visual

La migración SQL conserva deliberadamente la estructura visual actual. La fase
siguiente renovará la interfaz sin volver a tocar las reglas de negocio.

## Dirección aprobada

- React + TypeScript y Tailwind.
- Primitivos accesibles inspirados en shadcn/ui y Radix.
- Lucide para iconografía.
- React Hook Form + Zod para formularios y validación.
- TanStack Query como cliente de la API SQL, sustituyendo el polling provisional.
- Motion sólo para transiciones discretas.
- Manrope en títulos e Inter en contenido y formularios.
- Fondo claro cálido, superficies blancas y un color principal propio.

## Cambios principales

- Sustituir la landing promocional por una entrada de producto sobria.
- Crear un shell con navegación lateral y progreso del expediente.
- Convertir Dopyme y PSMI en formularios por pasos con autoguardado visible.
- Diseñar un resumen de avance claro y responsive.
- Crear componentes compartidos para campos, estados, tablas y confirmaciones.
- Diferenciar el panel administrativo mediante tablas, filtros y métricas.
- Dividir los componentes grandes y cargar rutas pesadas bajo demanda.

La API REST y los tipos actuales forman el límite que deberá consumir TanStack
Query; los cálculos de `src/types.ts` pueden conservarse como dominio puro.
