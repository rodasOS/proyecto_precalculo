# Spec Delta

## Purpose

Resolver integrales indefinidas y definidas elementales con el procedimiento explicado y verificar los resultados por derivación y por aproximación numérica.

## ADDED Requirements

### Requirement: Integrales indefinidas elementales
El sistema SHALL calcular integrales indefinidas de polinomios, potencias (incluida `1/x`), exponenciales, funciones trigonométricas básicas y sumas de ellas, aplicando las reglas de integración y SHALL incluir la constante de integración `+ C`.

#### Scenario: Polinomio
- **WHEN** el usuario integra `3x^2 + 4x - 5`
- **THEN** el sistema integra término a término con la regla de la potencia y responde `x^3 + 2x^2 - 5x + C`

#### Scenario: Potencia con exponente -1
- **WHEN** el usuario integra `1/x`
- **THEN** el sistema responde `ln|x| + C` y explica que la regla de la potencia no aplica con exponente -1

### Requirement: Integración por sustitución simple
El sistema SHALL resolver integrales que se reducen con una sustitución lineal o de la forma `u = g(x)` cuando `g'(x)` aparece como factor, mostrando la elección de `u`, `du` y el regreso a `x`.

#### Scenario: Sustitución
- **WHEN** el usuario integra `2x * cos(x^2)`
- **THEN** el sistema elige `u = x^2`, `du = 2x dx` y responde `sin(x^2) + C`

### Requirement: Integrales definidas
El sistema SHALL calcular integrales definidas con límites finitos aplicando el teorema fundamental del cálculo, mostrando la antiderivada, la evaluación en cada límite y la resta, y SHALL interpretar el resultado como área neta con signo.

#### Scenario: Integral definida de un polinomio
- **WHEN** el usuario integra `x^2` de `0` a `3`
- **THEN** el sistema muestra `F(x) = x^3/3`, `F(3) - F(0)` y responde `9`

#### Scenario: Área bajo y sobre el eje
- **WHEN** el usuario integra `x` de `-1` a `1`
- **THEN** el sistema responde `0` y aclara que las áreas a ambos lados se cancelan

### Requirement: Verificación de la integral
El sistema SHALL verificar toda integral indefinida derivando la antiderivada y SHALL verificar toda integral definida contra una aproximación numérica del área, mostrando ambas comprobaciones.

#### Scenario: Comprobación numérica de integral definida
- **WHEN** el sistema calcula una integral definida
- **THEN** muestra una aproximación numérica del valor y su coincidencia con el resultado exacto

### Requirement: Integrales impropias o discontinuas
El sistema SHALL advertir cuando la integral definida tenga una discontinuidad dentro del intervalo o un límite infinito y SHALL NOT aplicar el teorema fundamental de forma ciega en esos casos.

#### Scenario: Discontinuidad en el intervalo
- **WHEN** el usuario integra `1/x^2` de `-1` a `1`
- **THEN** el sistema advierte la discontinuidad en `x = 0` y no responde `-2`

### Requirement: Integral sin forma elemental
El sistema SHALL declarar explícitamente cuando una integral exceda las técnicas elementales soportadas o no tenga antiderivada elemental, según lo establecido para casos no resolubles.

#### Scenario: Fuera de alcance
- **WHEN** el usuario integra `sin(x)/x`
- **THEN** el sistema indica que no tiene antiderivada elemental y no entrega un resultado simbólico
