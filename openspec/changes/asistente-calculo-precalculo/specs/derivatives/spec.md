# Spec Delta

## Purpose

Derivar funciones aplicando las reglas básicas de derivación con procedimiento explicado, y verificar los resultados de manera independiente.

## ADDED Requirements

### Requirement: Reglas básicas de derivación
El sistema SHALL derivar funciones usando las reglas de constante, potencia, múltiplo constante, suma y resta, producto, cociente y cadena, y las derivadas de funciones trigonométricas, exponencial y logarítmica, nombrando la regla en cada paso.

#### Scenario: Regla del producto
- **WHEN** el usuario deriva `x^2 * sin(x)`
- **THEN** el sistema aplica la regla del producto, muestra `2x sin(x) + x^2 cos(x)` y nombra cada derivada parcial usada

#### Scenario: Regla de la cadena
- **WHEN** el usuario deriva `(3x + 1)^5`
- **THEN** el sistema identifica la función externa e interna y responde `15(3x + 1)^4`

#### Scenario: Regla del cociente
- **WHEN** el usuario deriva `(x^2 + 1)/(x - 1)`
- **THEN** el sistema muestra la fórmula del cociente, su sustitución y el resultado simplificado

### Requirement: Derivadas de orden superior y evaluación
El sistema SHALL calcular la segunda derivada y derivadas de orden superior cuando se pidan y SHALL evaluar la derivada en un punto dado, interpretando el valor como pendiente de la recta tangente.

#### Scenario: Evaluación en un punto
- **WHEN** el usuario deriva `x^3 - 6x^2 + 9x + 1` y evalúa en `x = 2`
- **THEN** el sistema responde `f'(x) = 3x^2 - 12x + 9`, `f'(2) = -3` y la recta tangente `y = -3x + 9`

### Requirement: Verificación de la derivada
El sistema SHALL verificar la derivada calculada contra una aproximación numérica por cociente incremental en varios puntos del dominio y SHALL mostrar el resultado de esa comprobación.

#### Scenario: Comprobación numérica
- **WHEN** se deriva una función válida
- **THEN** el sistema muestra al menos un punto donde el cociente incremental coincide con el valor de la derivada dentro de una tolerancia

### Requirement: Verificación de una derivada propuesta por el usuario
El sistema SHALL permitir al usuario ingresar su propia respuesta de derivada de una función y SHALL indicar si es equivalente a la correcta, aunque esté escrita en otra forma.

#### Scenario: Respuesta equivalente
- **WHEN** el usuario propone `2(x+1)` como derivada de `x^2 + 2x`
- **THEN** el sistema responde que es correcta porque equivale a `2x + 2`

#### Scenario: Respuesta incorrecta
- **WHEN** el usuario propone `2x` como derivada de `x^2 + 2x`
- **THEN** el sistema indica que es incorrecta y muestra el procedimiento correcto

### Requirement: Derivada en puntos no derivables
El sistema SHALL advertir cuando la función no sea derivable en el punto de evaluación solicitado (esquina, cúspide, discontinuidad, fuera del dominio).

#### Scenario: Valor absoluto en cero
- **WHEN** el usuario evalúa la derivada de `|x|` en `x = 0`
- **THEN** el sistema indica que no existe derivada en ese punto
