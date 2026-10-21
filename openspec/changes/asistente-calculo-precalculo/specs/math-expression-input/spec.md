# Spec Delta

## Purpose

Define cómo el asistente recibe expresiones, ecuaciones y parámetros nuevos escritos por el usuario, los valida y avisa con claridad cuando la entrada es inválida, está incompleta o no puede resolverse.

## ADDED Requirements

### Requirement: Ingreso de expresiones nuevas
El sistema SHALL permitir al usuario escribir expresiones y ecuaciones propias en notación de teclado habitual (por ejemplo `x^3 - 6x^2 + 9x + 1`, `sqrt(x)`, `sin(x)`, `ln(x)`, `e^x`, `pi`) en cada módulo, y SHALL mostrar una vista previa con formato matemático de lo interpretado.

#### Scenario: Vista previa de la expresión
- **WHEN** el usuario escribe `x^3 - 6x^2 + 9x + 1`
- **THEN** el sistema muestra la expresión interpretada con formato matemático antes de calcular

#### Scenario: Multiplicación implícita
- **WHEN** el usuario escribe `6x^2` o `2(x+1)`
- **THEN** el sistema interpreta una multiplicación y no reporta error

### Requirement: Aceptación de variantes de escritura
El sistema SHALL aceptar coma o punto como separador decimal, el símbolo `−` (menos tipográfico), `×`, `·`, `÷` y `²`/`³` como equivalentes de sus formas de teclado, y SHALL ignorar espacios sobrantes.

#### Scenario: Coma decimal
- **WHEN** el usuario escribe `2,5x + 1`
- **THEN** el sistema interpreta `2.5x + 1`

#### Scenario: Caracteres tipográficos
- **WHEN** el usuario pega `x³ − 6x² + 9x + 1`
- **THEN** el sistema lo interpreta correctamente sin error

### Requirement: Validación y mensajes de error en español
El sistema SHALL detectar entradas vacías, paréntesis desbalanceados, operadores consecutivos, funciones desconocidas y símbolos no soportados, SHALL indicar el problema en español y, cuando sea posible, la posición aproximada, y SHALL NOT mostrar un resultado calculado para una entrada inválida.

#### Scenario: Paréntesis sin cerrar
- **WHEN** el usuario escribe `(x+1`
- **THEN** el sistema muestra una advertencia indicando que falta cerrar un paréntesis y no muestra resultado

#### Scenario: Entrada vacía
- **WHEN** el usuario pulsa Calcular sin escribir nada
- **THEN** el sistema indica que falta ingresar la expresión

### Requirement: Aviso de datos faltantes
El sistema SHALL advertir cuando falte un dato requerido por la operación (variable, punto de evaluación, límites de integración, intervalo, ecuación sin igualdad) e indicar qué dato falta.

#### Scenario: Integral definida sin límites
- **WHEN** el usuario elige integral definida y deja vacío el límite superior
- **THEN** el sistema indica que falta el límite superior y no calcula

#### Scenario: Ecuación sin igualdad
- **WHEN** el usuario pide resolver `x^2 - 4` en el módulo de ecuaciones
- **THEN** el sistema avisa y ofrece interpretarla como `x^2 - 4 = 0`

### Requirement: Declaración de casos no resolubles
El sistema SHALL informar de forma explícita cuando no pueda resolver un caso (límite que no existe o no se pudo determinar, integral sin forma elemental, ecuación sin solución cerrada), SHALL indicar la causa conocida y SHALL NOT presentar una respuesta no verificada como definitiva.

#### Scenario: Integral no elemental
- **WHEN** el usuario pide la integral indefinida de `e^(x^2)`
- **THEN** el sistema informa que no tiene antiderivada elemental y no entrega un resultado inventado

#### Scenario: Límite sin concluir
- **WHEN** el motor no logra determinar un límite
- **THEN** el sistema lo declara como no determinado y muestra la evidencia numérica disponible, sin afirmar un valor
