# Spec Delta

## Purpose

Ofrecer ejercicios de ejemplo precargados y un generador de prácticas con calificación y retroalimentación, para que el estudiante aprenda de forma autónoma.

## ADDED Requirements

### Requirement: Banco de ejemplos precargados
El sistema SHALL ofrecer al menos 10 ejercicios de ejemplo distribuidos entre todos los módulos, incluido el ejercicio de prueba `f(x) = x³ − 6x² + 9x + 1`, y SHALL cargar cada ejemplo en el módulo correspondiente con un solo clic y resolverlo con el motor real.

#### Scenario: Cargar un ejemplo
- **WHEN** el usuario pulsa un ejemplo del banco
- **THEN** el sistema abre el módulo correspondiente con los datos cargados y muestra la solución calculada, no un texto prefabricado

#### Scenario: Cobertura de módulos
- **WHEN** se revisa el banco de ejemplos
- **THEN** existe al menos un ejemplo por cada módulo (álgebra y funciones, gráficas, límites, derivadas, integrales, aplicaciones)

### Requirement: Generación de prácticas
El sistema SHALL generar ejercicios nuevos con coeficientes aleatorios por módulo y nivel de dificultad (básico, intermedio), con soluciones garantizadamente resolubles y distintas entre generaciones.

#### Scenario: Práctica nueva
- **WHEN** el usuario elige módulo y dificultad y pulsa Generar
- **THEN** el sistema muestra un enunciado nuevo con valores aleatorios

#### Scenario: Ejercicio válido
- **WHEN** el generador produce cualquier ejercicio
- **THEN** el motor puede resolverlo sin advertencias de caso no resoluble

### Requirement: Calificación de la respuesta
El sistema SHALL permitir al usuario escribir su respuesta, SHALL compararla con la solución calculada aceptando formas equivalentes (por ejemplo `x(x+1)` y `x^2 + x`) y tolerancia numérica en respuestas decimales, e indicar si es correcta o incorrecta.

#### Scenario: Respuesta equivalente
- **WHEN** el usuario responde con una expresión equivalente a la correcta pero escrita distinto
- **THEN** el sistema la califica como correcta

#### Scenario: Respuesta numérica con tolerancia
- **WHEN** la respuesta correcta es `0.3183` y el usuario escribe `0.318`
- **THEN** el sistema la acepta dentro de la tolerancia definida

#### Scenario: Respuesta vacía o ilegible
- **WHEN** el usuario envía una respuesta vacía o con sintaxis inválida
- **THEN** el sistema avisa del problema y no la cuenta como intento calificado

### Requirement: Retroalimentación
El sistema SHALL mostrar retroalimentación tras cada intento: si es correcta, una confirmación con el procedimiento disponible; si es incorrecta, una pista y, a petición, el procedimiento completo y la respuesta correcta.

#### Scenario: Respuesta incorrecta
- **WHEN** el usuario envía una respuesta incorrecta
- **THEN** el sistema indica que es incorrecta, ofrece una pista y permite ver el procedimiento completo

### Requirement: Registro de avance de la sesión
El sistema SHALL mostrar el número de aciertos y de intentos de la sesión de práctica y SHALL permitir reiniciarlo sin necesidad de iniciar sesión ni de almacenar datos en un servidor.

#### Scenario: Marcador
- **WHEN** el usuario completa varios ejercicios
- **THEN** el sistema muestra aciertos sobre intentos y un botón para reiniciar
