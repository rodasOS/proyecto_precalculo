# Spec Delta

## Purpose

Definir la identidad, la organización de la interfaz y las condiciones de publicación del asistente para que el docente lo use por un enlace gratuito, sin iniciar sesión y desde cualquier dispositivo.

## ADDED Requirements

### Requirement: Identidad y datos académicos
El sistema SHALL mostrar un nombre original propio, y SHALL mostrar de forma permanente y visible en todas las pantallas los nombres de ambos integrantes, la asignatura y la sección.

#### Scenario: Encabezado persistente
- **WHEN** el usuario navega entre módulos
- **THEN** el encabezado conserva el nombre del asistente, ambos integrantes, la asignatura y la sección

### Requirement: Navegación por módulos
El sistema SHALL organizar la interfaz en una pantalla de inicio y seis módulos (Álgebra y funciones, Gráficas, Límites, Derivadas, Integrales, Aplicaciones) más las secciones de Práctica y Ejemplos, accesibles desde un menú siempre visible.

#### Scenario: Cambio de módulo
- **WHEN** el usuario elige otro módulo del menú
- **THEN** se muestra ese módulo sin recargar la página completa

#### Scenario: Recarga en un módulo
- **WHEN** el usuario recarga el navegador estando dentro de un módulo
- **THEN** la página vuelve a abrir ese mismo módulo sin error 404

### Requirement: Uso en pantallas diversas
El sistema SHALL ser utilizable en pantallas de escritorio y de celular, con campos, resultados y gráficas legibles sin desplazamiento horizontal de la página.

#### Scenario: Celular
- **WHEN** el docente abre el enlace en un celular
- **THEN** puede ingresar una expresión, ver los pasos y ver la gráfica sin que el contenido se corte

### Requirement: Acceso público sin inicio de sesión
El sistema SHALL ser accesible mediante una URL pública única, sin solicitar inicio de sesión, cuenta, instalación ni pago, y SHALL funcionar sin credenciales personales de los estudiantes ni consumo de cuotas de servicios de IA.

#### Scenario: Acceso desde ventana privada
- **WHEN** una persona abre la URL en una ventana de incógnito sin cuentas iniciadas
- **THEN** el asistente carga completo y permite resolver ejercicios

### Requirement: Disponibilidad durante la revisión
El sistema SHALL permanecer disponible en la misma URL durante todo el periodo de revisión de la entrega.

#### Scenario: Enlace estable
- **WHEN** el docente abre el enlace entregado en Canvas en cualquier momento de la revisión
- **THEN** el asistente carga y funciona

### Requirement: Ayuda de uso y alcance
El sistema SHALL incluir en la pantalla de inicio una guía breve de la sintaxis aceptada y un resumen de lo que el asistente puede y no puede resolver.

#### Scenario: Guía de sintaxis
- **WHEN** el usuario abre la pantalla de inicio o la ayuda
- **THEN** ve ejemplos de escritura (`x^2`, `sqrt(x)`, `sin(x)`, `e^x`, `ln(x)`, `pi`) y las limitaciones conocidas

### Requirement: Evidencias de la entrega
El proyecto SHALL incluir un informe de máximo tres páginas con integrantes, herramientas utilizadas, funcionalidades, pruebas realizadas y capturas de pantalla, entregado junto con el enlace.

#### Scenario: Informe completo
- **WHEN** se revisa el informe
- **THEN** contiene las cinco secciones requeridas y no excede tres páginas
