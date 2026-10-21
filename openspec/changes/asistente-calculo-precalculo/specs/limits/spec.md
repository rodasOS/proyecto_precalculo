# Spec Delta

## Purpose

Resolver límites básicos de funciones de una variable explicando el método empleado, y distinguir los casos en que el límite existe, es infinito o no existe.

## ADDED Requirements

### Requirement: Límites por sustitución directa
El sistema SHALL calcular límites de funciones continuas en el punto por sustitución directa, mostrando la sustitución y el valor.

#### Scenario: Polinomio
- **WHEN** el usuario calcula el límite de `x^2 + 3x` cuando `x → 2`
- **THEN** el sistema sustituye y responde `10` indicando que la función es continua en el punto

### Requirement: Formas indeterminadas
El sistema SHALL detectar la forma indeterminada `0/0` y `∞/∞` y resolverla con el método aplicable (factorización y simplificación, conjugado, o regla de L'Hôpital), nombrando el método.

#### Scenario: Factorización
- **WHEN** el usuario calcula el límite de `(x^2 - 4)/(x - 2)` cuando `x → 2`
- **THEN** el sistema muestra que la sustitución da `0/0`, factoriza, simplifica a `x + 2` y responde `4`

#### Scenario: Conjugado
- **WHEN** el usuario calcula el límite de `(sqrt(x + 1) - 1)/x` cuando `x → 0`
- **THEN** el sistema multiplica por el conjugado y responde `1/2`

### Requirement: Límites laterales
El sistema SHALL calcular límites por la izquierda y por la derecha cuando el usuario los pida y SHALL concluir que el límite no existe cuando difieren.

#### Scenario: Límites laterales distintos
- **WHEN** el usuario calcula el límite de `|x|/x` cuando `x → 0`
- **THEN** el sistema muestra `-1` por la izquierda y `1` por la derecha y concluye que el límite no existe

### Requirement: Límites infinitos y en el infinito
El sistema SHALL calcular límites cuando `x → ±∞` y límites que resultan en `±∞`, explicando el método (dividir entre la mayor potencia, comparación de grados) y señalando las asíntotas asociadas.

#### Scenario: Cociente de polinomios
- **WHEN** el usuario calcula el límite de `(3x^2 + 1)/(x^2 - 5)` cuando `x → ∞`
- **THEN** el sistema responde `3` indicando la asíntota horizontal `y = 3`

#### Scenario: Divergencia
- **WHEN** el usuario calcula el límite de `1/(x - 1)` cuando `x → 1`
- **THEN** el sistema indica que no existe límite finito y muestra los comportamientos lateral `-∞` y `+∞`

### Requirement: Límites trigonométricos notables
El sistema SHALL resolver los límites notables `sin(x)/x`, `(1 - cos(x))/x` y variantes con argumento lineal cuando `x → 0`, nombrando el límite notable usado.

#### Scenario: Seno con argumento lineal
- **WHEN** el usuario calcula el límite de `sin(3x)/x` cuando `x → 0`
- **THEN** el sistema responde `3` y nombra el límite notable `sin(u)/u → 1`

### Requirement: Verificación numérica del límite
El sistema SHALL acompañar cada límite con una tabla de valores de aproximación por ambos lados y SHALL advertir si la tabla contradice el resultado simbólico.

#### Scenario: Tabla de aproximación
- **WHEN** el sistema resuelve un límite en un punto finito
- **THEN** muestra valores de `f(x)` para `x` cercano al punto por la izquierda y la derecha
