# Spec Delta

## Purpose

Resolver y explicar los problemas de álgebra y funciones de precálculo: ecuaciones, factorización, dominio, rango y composición de funciones.

## ADDED Requirements

### Requirement: Resolución de ecuaciones
El sistema SHALL resolver ecuaciones lineales, cuadráticas (con fórmula general y discriminante), polinomiales factorizables, racionales, con radicales y con valor absoluto, mostrando el método y comprobando cada solución en la ecuación original.

#### Scenario: Ecuación cuadrática
- **WHEN** el usuario resuelve `x^2 - 5x + 6 = 0`
- **THEN** el sistema muestra la fórmula general, la sustitución de a, b y c, el discriminante y las soluciones `x = 2` y `x = 3`

#### Scenario: Cuadrática sin soluciones reales
- **WHEN** el usuario resuelve `x^2 + 1 = 0`
- **THEN** el sistema indica que el discriminante es negativo y que no hay soluciones reales

#### Scenario: Ecuación racional con valor excluido
- **WHEN** el usuario resuelve `(x^2 - 4)/(x - 2) = 0`
- **THEN** el sistema descarta `x = 2` por anular el denominador y reporta solo `x = -2`

### Requirement: Resolución de desigualdades
El sistema SHALL resolver desigualdades polinomiales y racionales de una variable y SHALL expresar la solución en notación de intervalos.

#### Scenario: Desigualdad cuadrática
- **WHEN** el usuario resuelve `x^2 - 4 < 0`
- **THEN** el sistema responde `(-2, 2)` con el análisis de signos como procedimiento

### Requirement: Factorización
El sistema SHALL factorizar polinomios indicando la técnica usada (factor común, diferencia de cuadrados, trinomio, agrupación, raíces racionales) y SHALL verificar el resultado multiplicando los factores.

#### Scenario: Diferencia de cuadrados
- **WHEN** el usuario factoriza `x^2 - 9`
- **THEN** el sistema responde `(x - 3)(x + 3)` e identifica la diferencia de cuadrados

#### Scenario: Polinomio irreducible
- **WHEN** el usuario factoriza `x^2 + 1` sobre los reales
- **THEN** el sistema indica que es irreducible en los reales y no inventa factores

### Requirement: Dominio y rango de funciones
El sistema SHALL determinar el dominio de una función explicando las restricciones (denominadores, raíces de índice par, logaritmos) y SHALL determinar el rango cuando sea obtenible, expresando ambos en notación de intervalos.

#### Scenario: Dominio con raíz y denominador
- **WHEN** el usuario pide el dominio de `sqrt(x - 1)/(x - 3)`
- **THEN** el sistema responde `[1, 3) ∪ (3, ∞)` explicando las dos restricciones

#### Scenario: Rango no determinado
- **WHEN** el sistema no puede determinar el rango de forma confiable
- **THEN** lo declara como no determinado y no muestra un rango no verificado

### Requirement: Composición de funciones
El sistema SHALL calcular `f∘g` y `g∘f` a partir de dos funciones dadas, mostrar la sustitución, simplificar el resultado, indicar el dominio de la compuesta y evaluarla en un punto cuando el usuario lo pida.

#### Scenario: Composición con evaluación
- **WHEN** el usuario compone `f(x) = x^2 + 1` y `g(x) = 2x - 3` y evalúa en `x = 2`
- **THEN** el sistema muestra `(f∘g)(x) = (2x-3)^2 + 1`, su forma simplificada y el valor `2`
