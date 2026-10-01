# El Imperio HR Hub

PROMPT DEFINITIVO: SISTEMA DE GESTIÓN DE RECURSOS HUMANOS - EL IMPERIO

Versión Lovable Optimizada

CONTEXTO GENERAL

Soy Valen, encargada de Recursos Humanos en un grupo de empresas llamado El Imperio, conformado por 5 empresas:

Fabian Páez

Sandra Páez

Transportes El Imperio SAS

Plantuladora El Imperio

Comercializadora El Imperio 1 SAS

Actualmente manejo aproximadamente 160 empleados activos y tengo registro de 150 empleados retirados. Necesito crear una app web (desktop) que centralice toda la información de RRHH y automatice procesos manuales que hoy disperso en Excel, Word y carpetas físicas.

OBJETIVO PRINCIPAL DE LA APP

Crear un Sistema Integral de Gestión de RRHH que sea:

Centralizado: Un solo lugar para toda la información de empleados

Automatizado: Cálculos automáticos, reportes sin intervención manual

Fácil de usar: Interfaz limpia y lógica para alguien que usa Excel

Escalable: Que crezca con el número de empleados (entra/sale gente constantemente)

ESTRUCTURA GENERAL DE LA APP

Layout Principal:

┌─────────────────────────────────────────────────────────┐
│ LOGO "El Imperio"  [Búsqueda]  [Filtros]  [⋮ Menú]    │  ← Barra superior
├────────────┬─────────────────────────────────────┬──────┤
│            │                                     │      │
│  SIDEBAR   │     CONTENIDO CENTRAL               │ CAL. │  ← Calendario
│  AZUL      │     (Dashboard/Empleados/etc)       │ SUP. │     (esquina
│  OSCURO    │                                     │ DER  │      superior
│            │                                     │      │      derecha)
│ • Dashboard│                                     │      │
│ • Empleados│                                     │      │
│ • Novedades│                                     │      │
│ • Documentos│                                    │      │
│ • Reportes │                                     │      │
│            │                                     │      │
└────────────┴─────────────────────────────────────┴──────┘


1. GESTIÓN DE EMPLEADOS

1.1 Base de datos de empleados

Datos obligatorios por empleado:

Nombre completo

Cédula (único identificador)

Empresa/Compañía (selector de 5 opciones)

Puesto/Cargo

Fecha de ingreso

Fecha de fin de contrato (si es determinado; si no hay fecha = indefinido)

Fecha de salida (si ya se fue)

Número celular

Lugar de trabajo/Ubicación

Horario de trabajo (HH:MM - HH:MM, ej: 6:00am - 4:00pm) - EDITABLE por admin

1.2 Estados de empleados

ACTIVO:

Empleado vigente

Genera alertas de vencimiento

Mostrar normal en lista

RETIRADO:

Ya no trabaja

Datos guardados pero sin alertas

Mostrar con fondo gris claro (#e5e7eb) y texto atenuado

Registrar fecha de salida

Aparece en filtro "Estado: Retirado"

1.3 Totales dinámicos en Dashboard

Mostrar:

160 Empleados activos | 150 Empleados retirados | 310 Total


Actualizar automáticamente cuando se agrega o marca como retirado.

1.4 Historial de vacaciones por empleado

Ubicación: Sección "Vacaciones" en perfil individual

Mostrar por año:

2024: Derecho 15 días | Usadas 8 días | Acumuladas 7 días

2025: Derecho 15 días | Usadas 3 días | Disponibles 12 días

Total acumulado: Suma de años anteriores no usadas

Automatización:

Cuando registras permiso "con descuento de vacaciones", Lovable automáticamente:

Suma días en "Usadas"

Recalcula "Disponibles" en tiempo real

2. REGISTRO DE NOVEDADES

Las novedades se actualizan en tiempo real cada vez que ocurren.

2.1 Incapacidades

Dos tipos:

Incapacidad General (enfermedad)

Incapacidad por Accidente Laboral (para cumplimiento legal)

Por cada incapacidad registrar:

Tipo (selector: General / Accidente Laboral)

Fecha de inicio

Fecha de fin

Certificado adjunto (PDF/imagen) - OBLIGATORIO

Estado (Activa / Finalizada) - se determina automáticamente comparando fecha fin con hoy

Observaciones (campo opcional)

Historial:

Mostrar todas las incapacidades (pasadas y actuales) en perfil del empleado

Si hay cambios/extensiones, admin EDITA MANUALMENTE la incapacidad

Campo "Notas" para registrar cambios (ej: "Extendida 15/ago")

NO necesita auditoría automática de cambios

En el reporte a nómina:

Especificar tipo de incapacidad (General vs Laboral)

Mostrar fechas y días

2.2 Permisos

Dos tipos:

Permiso sin pago (se descuenta de esa quincena, no se paga ese día)

Permiso con descuento de vacaciones (se descuenta de vacaciones disponibles)

Por cada permiso registrar:

Tipo (selector)

Fecha(s) del permiso (inicio y fin)

Duración (días o medios días)

Justificación/Razón (campo de texto - obligatorio)

Estado: Automáticamente "Aprobado" (no hay flujo de aprobación)

Cálculo automático:

Si es "sin pago":

Se suma en columna "Permisos" de esa quincena

Se descuenta de días trabajados

Si es "con descuento de vacaciones":

Se suma en columna "Vacaciones" de esa quincena

Se descuenta de vacaciones disponibles

Se descuenta de días trabajados

Restricción legal:

Máximo 7 días de permiso con descuento de vacaciones

Lovable ALERTA si intenta registrar >7 días

Lovable ALERTA si quedaría <7 días disponibles (debe solicitar pago)

Lovable BLOQUEA si intenta usar más de lo disponible

2.3 Vacaciones

No se registran como "novedad" (se manejan a nivel de acumulado en perfil).

Se descuentan del saldo cuando:

Admin registra permiso con tipo "descuento de vacaciones"

Lovable automáticamente suma en "Usadas" y resta de "Disponibles"

Tracking:

Ver en perfil individual, sección "Vacaciones"

Mostrar por año (derecho, usadas, disponibles)

Mostrar total acumulado

2.4 Retiros

Tres casos posibles:

Vencimiento de término: Contrato se termina por fecha (1 mes de preaviso obligatorio)

Renuncia: Empleado renuncia (15 días preaviso según cargo, o inmediata)

Justa causa: Terminación inmediata

Por cada retiro registrar:

Tipo de retiro (selector)

Fecha de salida

Razón (texto libre)

Liquidación pagada (sí/no)

Observaciones

Al registrar retiro:

Empleado se marca automáticamente como "RETIRADO"

Se guarda fecha de salida

Desaparece de lista de empleados activos (pero se puede ver en "Retirados")

Documentos asociados:

Preaviso (si aplica)

Carta de terminación

Liquidación

Paz y salvo

2.5 Ingresos

Registrar cuando entra un empleado nuevo

Guardar automáticamente la fecha de ingreso

El empleado aparece automáticamente en lista de "Activos"

3. CÁLCULO DE DÍAS TRABAJADOS (QUINCENAL) - AUTOMÁTICO

Fórmula automática por Lovable:

Días trabajados = Días base - Permisos - Incapacidad - Vacaciones


Dónde se calcula:

En perfil individual, sección "Historial de quincenas"

En reporte quincenal para nómina

Tabla de quincenas en perfil individual:

┌──────────────┬────────────┬──────────┬─────────────┬──────────┬─────────────────┐
│  Quincena    │ Días base* | Permisos | Incapacidad | Vacaciones| Días trabajados │
├──────────────┼────────────┼──────────┼─────────────┼──────────┼─────────────────┤
│ Q1 Ago 2026  │    15      │    2     │      0      │    1     │       12        │
│ Q2 Ago 2026  │    15      │    0     │      3      │    0     │       12        │
│ Q1 Sep 2026  │    15      │    1     │      1      │    2     │       11        │
└──────────────┴────────────┴──────────┴─────────────┴──────────┴─────────────────┘

*Editable solo si ingreso/salida a mitad de quincena
Otros campos: AUTOMÁTICOS (calculados desde novedades registradas)


¿Cómo funciona la automatización?

Tú registras una novedad (ej: permiso sin pago 2 días, 6-7 agosto)

Lovable lo guarda en la novedad

Lovable automáticamente:

Identifica que es quincena Q1 Agosto (1-15)

Suma 2 en columna "Permisos"

Recalcula: Días trabajados = 15 - 2 - 0 - 0 = 13

En el perfil, ves actualizado:

Q1 Agosto → Permisos: 2 | Días trabajados: 13

En el reporte a nómina, aparece automáticamente:

Juan García | Q1 Agosto | 13 días trabajados

Campo adicional "Notas"

Si hay un caso especial (ej: empleado ingresó 5/ago, solo 11 días disponibles):

Campo "Notas" editable: "Ingresó 5/ago (11 días)"

Lovable lo muestra en el perfil

4. ALERTAS Y NOTIFICACIONES VISUALES

En Dashboard (no automáticas, solo visuales):

Sección "PRÓXIMOS VENCIMIENTOS (40 DÍAS)" - Recuadro ROJO

⚠️ PRÓXIMOS VENCIMIENTOS - REVISAR HOY
───────────────────────────────────────
Juan García | Conductor | Vence 15/ago | [Renovar]
María López | Auxiliar | Vence 18/ago | [Renovar]
Pedro González | Vendedor | Vence 20/ago | [Renovar]


Sección "INCAPACIDADES ACTIVAS" - Recuadro AMARILLO

⚠️ INCAPACIDADES ACTIVAS
──────────────────────
María López | General | Desde 10/ago | Hasta 20/ago | [Ver doc]


Sección "RETIROS PRÓXIMOS (30 DÍAS)" - Recuadro VERDE

✓ RETIROS PRÓXIMOS (30 DÍAS)
───────────────────────────
Pedro González | Se va 25/ago | [Generar documentos]


Lógica:

Cada vez que abres la app, ves estas alertas

NO hay correos automáticos

Es visual, pero EFECTIVO (ves todo de un vistazo)

5. GESTIÓN DE DOCUMENTOS

5.1 Documentos base (plantillas)

Ubicación: Sección "Documentos" en menú lateral

Qué puedes hacer:

Subir documentos base (Word, PDF)

Editar documentos base

Eliminar documentos base

Ver lista de ~15 documentos

Documentos típicos:

Contrato (varía por empresa/cargo)

Memorando de llamado de atención

Citación a descargos

Audiencia de descargos

Carta de renuncia

Preaviso de terminación

Liquidación

Paz y salvo

Permiso (genérico)

Formato de retiro ... y otros (~15 en total)

5.2 Workflow de generación de documentos (SEMI AUTOMÁTICO)

Paso 1: Clickeas "Generar documento"

Paso 2: Seleccionas tipo de documento (ej: Contrato)

Paso 3: Buscas y seleccionas empleado (ej: Juan García)

Paso 4: Lovable te muestra PREVIEW:

Nombre: Juan García ✓

Cédula: 1053334514 ✓

Empresa: Transportes El Imperio ✓

Cargo: Conductor ✓

Fecha: 21/ago/2026 ✓

Paso 5: Verificas datos

Paso 6: Descargas como:

OPCIÓN A: Excel (para copiar datos rellenados)

OPCIÓN B: Texto (para copiar/pegar en Word)

Paso 7: Tú copias datos a tu Word base (3 minutos)

Paso 8: Tú exportas PDF desde Word (1 minuto)

TOTAL: 4 minutos por documento (vs 10-15 minutos hoy)

5.3 Paz y salvo con checklist

Cuando generas "Paz y salvo":

Preview muestra checklist editable

Items predeterminados:

☑️ Teléfono corporativo

☑️ Laptop

☑️ Credencial de acceso

☑️ Uniformes

☑️ Contraseñas

☑️ Proyectos entregados

☑️ (Otros personalizables)

Tú marcas/desmarcar según cada retiro

Items pueden variar por cargo/empresa

5.4 Integración con Autentic (MANUAL)

Flujo:

Generas documento en Lovable

Descargas PDF

Tú subes manualmente a Autentic (1 click en Autentic)

Autentic firma digitalmente

Tú descargas PDF firmado

Tú subes PDF firmado a Lovable (si quieres guardar en app)

Total: 2-3 clicks extra (muy rápido)

6. REPORTE QUINCENAL PARA NÓMINA - AUTOMÁTICO

6.1 Generación

Frecuencia: Días 16 y 1 de cada mes (o manual cuando sea necesario)

Cómo:

Clickeas sección "Reportes"

Seleccionas quincena (ej: "Q1 - Agosto")

Ves PREVIEW del reporte

6.2 Estructura del reporte:

El reporte tiene secciones por tipo de novedad:

SECCIÓN 1 - INGRESOS | Cédula | Nombre | Empresa | Cargo | Fecha de Ingreso |

SECCIÓN 2 - RETIROS | Cédula | Nombre | Empresa | Cargo | Fecha de Retiro |

SECCIÓN 3 - PERMISO POR DESCUENTO DE VACACIONES | Cédula | Nombre | Empresa | Cargo | Fecha | Días |

SECCIÓN 4 - PERMISO POR DESCUENTO DE DÍAS NO LABORADOS | Cédula | Nombre | Empresa | Cargo | Fecha | Tipo | Días |

SECCIÓN 5 - OTRAS NOVEDADES (Incapacidades, Licencias por luto, etc.) | Cédula | Nombre | Empresa | Cargo | Novedad | Fecha | Días | Tipo (si incapacidad) |

SECCIÓN 6 - DESCUENTOS ESPECIALES | Nombre | Concepto | Monto |

6.3 Información importante en reporte:

Columna obligatoria: "Días trabajados"

Se calcula automáticamente: 15 - descuentos = días trabajados

Aparece en cada empleado de cada quincena

6.4 Verificación y exportación

Antes de exportar:

Revisas los datos

Si falta algo, lo corriges

Clickeas "Validar"

Exportación:

Formato: Excel (.xlsx)

Nombre: "Reporte_Novedades_Quincena_1_Agosto_2026.xlsx"

Botón: [Exportar a Excel]

7. BÚSQUEDA Y FILTROS

7.1 Búsqueda rápida

Ubicación: Barra superior

Buscar por:

Nombre

Cédula

En tiempo real: Mientras escribes, la lista se filtra

7.2 Filtros avanzados

Ubicación: Barra superior (dropdown)

Filtros disponibles:

Por Empresa: Fabian Páez, Sandra Páez, Transportes, Plantuladora, Comercializadora

Por Cargo: Texto libre (busca en cargos registrados)

Por Estado: Activo | Retirado | Todos

Por Rango de fechas: Fecha ingreso entre X y Y

Por Vencimiento: "Vencen en próximos 40 días", "Vencen en próximos 30 días"

Por novedades: "En incapacidad", "Con permiso activo"

7.3 Aplicar múltiples filtros

Los filtros se combinan (AND logic)

Ejemplo: "Mostrar empleados ACTIVOS de Transportes que VENCEN en 40 días"

8. DISEÑO Y USABILIDAD

8.1 Layout general

Sidebar izquierdo (menú):

Fondo: Azul oscuro (#1e3a8a)

Texto: Blanco

Opciones:

🏠 Dashboard

👥 Empleados

📋 Novedades

📄 Documentos

📊 Reportes

⚙️ Configuración

Contenido central:

Barra superior: Logo "El Imperio" + Búsqueda + Filtros + Menú 3 puntos

Área principal: Dashboard o vista seleccionada

Optimizado para escritorio (1920x1080 mínimo)

8.2 Colores

Principal: Azul oscuro (#1e3a8a)

Secundario: Azul claro (#60a5fa)

Acento: Verde (#22c55e) - botones, acciones positivas

Alertas urgentes: Rojo suave (#f87171) - vencimientos

Avisos: Amarillo suave (#fbbf24) - información

Fondo: Blanco (#ffffff) o gris muy claro (#f9fafb)

Textos: Azul oscuro (#1e3a8a) y gris (#4b5563)

Empleados retirados: Fondo gris claro (#e5e7eb), texto atenuado (#9ca3af)

8.3 Componentes principales

Tarjetas (Cards): Información en bloques

Tablas: Listados de empleados, novedades, quincenas

Modales: Confirmaciones, formularios

Botones: Verde para acciones, gris para secundario, rojo para peligro

Iconos: Claros y con tooltips

Formularios: Campos requeridos marcados con * rojo

8.4 Menú con 3 puntos (⋮)

Ubicación: Esquina superior derecha (barra)

Al clickear, despliega menú vertical:

Editar perfil

Ver alertas

Generar contrato

Generar memorando

Generar paz y salvo

Exportar datos

Marcar como retirado

Configuración

Ventaja: Interfaz limpia, no ocupa espacio con botones dispersos

8.5 Calendario (SUPERIOR DERECHA)

Ubicación: Esquina superior derecha del dashboard (panel pequeño)

Tamaño: ~300px × 300px

Funciones:

Mostrar mes actual

Fechas en ROJO = vencimientos próximos (40 días)

Fechas en AMARILLO = incapacidades activas

Flechas para navegar entre meses

Al clickear fecha = filtra empleados/novedades de ese día

Posicionamiento:

[Logo] [Búsqueda] [Filtros] [⋮ Menú]     [Calendario]
                                         [pequeño  ]
                                         [esquina   ]
                                         [superior  ]


9. PERFIL INDIVIDUAL DE EMPLEADO

9.1 Secciones en el perfil

ARRIBA - Datos personales:

┌─────────────────────────────────┐
│ [AVATAR] Juan García  🟢 ACTIVO │
│                                 │
│ Cédula: 1053334514              │
│ Empresa: Transportes El Imperio │
│ Cargo: Conductor Turbo          │
│ Fecha ingreso: 25/03/2025       │
│ Fin contrato: 15/08/2026 (40d)  │
│ Celular: 3001234567             │
│ Horario: 6:00am - 4:00pm ✏️      │
│ Lugar trabajo: Sede Tunja       │
└─────────────────────────────────┘


CENTRO - Historial de quincenas:

Mostrar todas las quincenas de años anteriores
Tabla: Quincena | Días trabajados | Vacaciones | Incapacidad | Permisos
Selector: "Mostrar quincenas de: [2025] [2026]"


DERECHA - Vacaciones:

VACACIONES POR AÑO
──────────────────
2024:
• Derecho: 15 días
• Usadas: 8 días
• Acumuladas: 7 días

2025:
• Derecho: 15 días
• Usadas: 3 días
• Disponibles: 12 días

TOTAL ACUMULADO: 19 días


ABAJO - Incapacidades:

INCAPACIDADES
──────────────
• General | 10-15 ago | 5 días | Finalizada | [Ver cert]
• Laboral | 01-08 ago | 7 días | Finalizada | [Ver cert]


ABAJO - Permisos:

PERMISOS
────────
• Con descuento vacaciones | 5-6 ago | 2 días | Aprobado
• Sin pago | 20/ago | 1 día | Aprobado


9.2 Botones de acción (pie del perfil)

[📄 Generar contrato]

[📋 Generar memorando]

[📑 Generar paz y salvo]

[✏️ Editar datos]

[🗑️ Marcar como retirado]

10. DASHBOARD PRINCIPAL

10.1 Vista al abrir la app

Sección 1 - ALERTAS URGENTES (recuadros con colores)

Recuadro ROJO - Próximos vencimientos (40 días)

⚠️ PRÓXIMOS VENCIMIENTOS (40 DÍAS) - 3 empleados
───────────────────────────────────────────────
Juan García | Conductor | Vence 15/ago | [Renovar]
María López | Auxiliar | Vence 18/ago | [Renovar]
Pedro González | Vendedor | Vence 20/ago | [Renovar]


Recuadro AMARILLO - Incapacidades activas

⚠️ INCAPACIDADES ACTIVAS - 2 empleados
──────────────────────────────────────
María López | General | Desde 10/ago | Hasta 20/ago | [Ver]
Juan Pérez | Laboral | Desde 08/ago | Hasta 15/ago | [Ver]


Recuadro VERDE - Retiros próximos (30 días)

✓ RETIROS PRÓXIMOS (30 DÍAS) - 1 empleado
────────────────────────────────────────
Pedro González | Se va 25/ago | [Generar docs]


Sección 2 - ESTADÍSTICAS RÁPIDAS (números grandes)

160 Empleados activos
150 Empleados retirados
5 Incapacidades activas
3 Vencimientos en 40 días


Sección 3 - LISTA DE EMPLEADOS (tabla con búsqueda)

[Buscar...]  [Filtros]

| Nombre | Cédula | Empresa | Cargo | Horario | Estado | Acciones |
|--------|--------|---------|-------|---------|--------|----------|
| Juan García | 1053... | Transporte | Conductor | 6am-4pm | ACTIVO | [⋮] |
| María López | 1002... | Fabian Páez | Auxiliar | 7am-5pm | ACTIVO | [⋮] |


11. VALIDACIONES Y COMPLIANCE

11.1 Validaciones automáticas

Vacaciones:

❌ No permitir permiso con descuento >7 días

⚠️ Alertar si quedaría <7 días disponibles

❌ Bloquear si intenta usar más de lo disponible

Cálculo de días:

Validar que no haya negativos

Alertar si hay inconsistencias

Documentos:

Certificados de incapacidad: Obligatorio

11.2 Gestión de datos

Empleados retirados: Datos guardados, sin alertas

Historial: Mostrar todo lo que pasó con cada empleado

Cambios en incapacidades: Admin registra manualmente en "Notas"

12. FLUJOS TÍPICOS DE USO

Escenario 1 - Alerta de vencimiento

Abres la app

Ves dashboard: "Juan García vence en 40 días"

Clickeas [Renovar]

App genera contrato rellenado

Descargas, copias datos a tu Word

Exportas PDF

Subes a Autentic

Escenario 2 - Certificado de incapacidad

Empleado envía certificado

Vas a perfil del empleado

Sección "Novedades" → clickeas "+ Agregar incapacidad"

Subes certificado, seleccionas tipo, ingresas fechas

Lovable automáticamente:

Suma en columna "Incapacidad" de esa quincena

Recalcula días trabajados

Muestra en perfil

Escenario 3 - Generar reporte de nómina

Día 15/16, abres "Reportes"

Seleccionas "Q1 - Agosto"

Ves preview con todas las novedades

Verificas que no falte nada

Clickeas [Exportar a Excel]

Descargas archivo listo para nómina

13. CONSIDERACIONES TÉCNICAS

Base de datos necesaria:

Tabla Empleados

Tabla Novedades (Incapacidades, Permisos, Retiros, Ingresos)

Tabla Vacaciones (por año)

Tabla Documentos base

Tabla Quincenas (historial de cálculos)

Seguridad:

Solo Valen tiene acceso (login simple)

Datos confidenciales (incapacidades)

Backup automático

Exportación:

Excel (.xlsx) para reportes

Descarga de archivos (certificados, documentos)

RESUMEN: LO MÁS IMPORTANTE

✅ Centralizar: Empleados + Novedades + Documentos

✅ Automatizar: Cálculos de días, suma de vacaciones, reportes

✅ Alertas visuales: Dashboard con próximos vencimientos (40 días)

✅ Documentos: Semi automático (rellenar datos + tú los pasas a Word)

✅ Historial: Incapacidades con certificados, vacaciones por año, quincenas

✅ Reporte quincenal: Exportar a Excel con 1 click

✅ Diseño: Azul + verde, limpio, que genere paz visual

✅ Escalable: Crece con empleados que entran/salen

✅ Interfaz: Sidebar + Dashboard + Calendario esquina superior derecha + Menú 3 puntos

NOTAS FINALES

Esta app debe ser intuitiva para alguien que usa Excel

Velocidad: Debe ser rápida, sin demoras

Confiabilidad: Los datos son críticos

Mantenimiento: Fácil de actualizar (agregar empresas, documentos, etc.)

Colorimetría: Armónica, reflejando identidad de El Imperio (azul + verde)

Solo desktop: Optimizado para 1920x1080 mínimo

Almacenamiento: Certificados y documentos se guardan en la app

VERSIÓN LOVABLE OPTIMIZADA

Esta versión está diseñada específicamente para las capacidades de Lovable:

✅ Lovable PUEDE hacer todo esto

❌ Se evitan cosas que Lovable lucha (cálculos ultra complejos, cron jobs, PDF dinámicos)

✅ Resultado: App funcional, profesional, lista en 2 semanas

FIN DEL PROMPT DEFINITIVO

Sistema de RRHH El Imperio Versión Lovable Optimizada

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://thimrihr.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0e7b8427-6ea5-4dfa-bc74-6e858141e02c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
