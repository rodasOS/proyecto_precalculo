# Spec Delta

## Purpose

Aplicar el cálculo a problemas concretos: clasificar puntos críticos y extremos, optimizar cantidades en problemas contextualizados y resolver razones de cambio, interpretando cada resultado en el contexto del problema.

## ADDED Requirements

### Requirement: Puntos críticos y clasificación de extremos
El sistema SHALL, dada una función, hallar los puntos críticos resolviendo `f'(x) = 0` y los puntos donde `f'` no existe, y SHALL clasificarlos como máximo relativo, mínimo relativo o ninguno mediante el criterio de la segunda derivada, recurriendo al criterio de la primera derivada cuando la segunda sea cero.

#### Scenario: Función de prueba del enunciado
- **WHEN** el usuario analiza `f(x) = x^3 - 6x^2 + 9x + 1`
- **THEN** el sistema calcula `f'(x) = 3x^2 - 12x + 9 = 3(x - 1)(x - 3)`, obtiene los puntos críticos `x = 1` y `x = 3`, y clasifica `(1, 5)` como máximo relativo (`f''(1) = -6`) y `(3, 1)` como mínimo relativo (`f''(3) = 6`)

#### Scenario: Segunda derivada nula
- **WHEN** el usuario analiza `f(x) = x^3`
- **THEN** el sistema encuentra el punto crítico `x = 0`, indica que `f''(0) = 0`, usa el criterio de la primera derivada y concluye que no es extremo

#### Scenario: Función sin puntos críticos
- **WHEN** el usuario analiza `f(x) = x^3 + x`
- **THEN** el sistema indica que no hay puntos críticos reales y que la función es siempre creciente

### Requirement: Extremos absolutos en un intervalo cerrado
El sistema SHALL calcular el máximo y mínimo absolutos de una función continua en un intervalo cerrado evaluando los puntos críticos interiores y los extremos del intervalo, mostrando la tabla de comparación.

#### Scenario: Intervalo cerrado
- **WHEN** el usuario pide los extremos absolutos de `x^3 - 6x^2 + 9x + 1` en `[0, 4]`
- **THEN** el sistema compara `f(0)=1`, `f(1)=5`, `f(3)=1`, `f(4)=5` y reporta máximo absoluto `5` (en `x = 1` y `x = 4`) y mínimo absoluto `1` (en `x = 0` y `x = 3`)

### Requirement: Optimización contextualizada
El sistema SHALL ofrecer plantillas de problemas de optimización (área o volumen máximo con restricción de perímetro o material, costo mínimo, ingreso máximo) donde el usuario ingresa los datos, y SHALL mostrar la función objetivo, la restricción, la reducción a una variable, el dominio práctico, el óptimo y la respuesta redactada con unidades.

#### Scenario: Rectángulo de área máxima
- **WHEN** el usuario elige maximizar el área de un rectángulo con perímetro `40`
- **THEN** el sistema plantea `A = x(20 - x)`, halla `x = 10`, concluye que es un cuadrado de lado `10` con área máxima `100` y verifica que es máximo

#### Scenario: Dato inválido en el contexto
- **WHEN** el usuario ingresa un perímetro negativo o cero
- **THEN** el sistema advierte que el dato debe ser positivo y no calcula

#### Scenario: Óptimo fuera del dominio práctico
- **WHEN** el punto crítico queda fuera del dominio práctico del problema
- **THEN** el sistema lo descarta, explica la razón y evalúa los extremos del dominio

### Requirement: Razones de cambio relacionadas
El sistema SHALL resolver problemas de razones de cambio relacionadas de plantillas predefinidas (esfera, círculo, escalera, cono) donde se pide la razón de cambio de una cantidad dada la de otra, mostrando la relación, su derivación respecto al tiempo, la sustitución y la respuesta con unidades.

#### Scenario: Radio de una esfera
- **WHEN** el volumen de una esfera crece a `100 cm³/s` y el usuario pide `dr/dt` cuando `r = 5 cm`
- **THEN** el sistema usa `V = (4/3)πr³`, deriva `dV/dt = 4πr² dr/dt` y responde `dr/dt = 1/π ≈ 0.318 cm/s`

### Requirement: Razón de cambio promedio e instantánea
El sistema SHALL calcular la razón de cambio promedio en un intervalo y la instantánea en un punto de una función dada, interpretándolas con las unidades del contexto cuando se hayan indicado.

#### Scenario: Promedio contra instantánea
- **WHEN** el usuario pide ambas para `s(t) = t^2` entre `t = 1` y `t = 3`, y en `t = 2`
- **THEN** el sistema responde `4` para la promedio y `4` para la instantánea, y explica por qué coinciden

### Requirement: Interpretación en contexto
El sistema SHALL redactar la conclusión de cada aplicación en lenguaje del problema (por ejemplo "el área máxima es 100 m² cuando el lado mide 10 m") y SHALL advertir cuando faltan unidades o los datos sean inconsistentes.

#### Scenario: Conclusión redactada
- **WHEN** se resuelve cualquier problema de aplicación
- **THEN** la respuesta final incluye una oración con el resultado, su magnitud y su unidad
