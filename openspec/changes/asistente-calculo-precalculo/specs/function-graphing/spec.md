# Spec Delta

## Purpose

Graficar funciones ingresadas por el usuario y ayudar a interpretarlas: intersecciones con los ejes, intervalos de crecimiento y decrecimiento y puntos importantes.

## ADDED Requirements

### Requirement: Graficado de funciones
El sistema SHALL graficar una o varias funciones de `x` ingresadas por el usuario en un plano con ejes rotulados y cuadrícula, y SHALL permitir ajustar el intervalo visible y hacer zoom y desplazamiento.

#### Scenario: Gráfica de un polinomio
- **WHEN** el usuario grafica `x^3 - 6x^2 + 9x + 1`
- **THEN** el sistema muestra la curva en un intervalo por defecto que incluye sus puntos importantes

#### Scenario: Varias funciones a la vez
- **WHEN** el usuario agrega una segunda función
- **THEN** ambas se grafican con colores distintos y una leyenda

### Requirement: Tratamiento de discontinuidades y dominio
El sistema SHALL NOT dibujar la curva fuera del dominio ni unir ramas separadas por una asíntota vertical, y SHALL señalar las asíntotas verticales y los huecos detectados.

#### Scenario: Asíntota vertical
- **WHEN** el usuario grafica `1/(x - 2)`
- **THEN** la curva no cruza `x = 2` y el sistema señala la asíntota vertical en `x = 2`

#### Scenario: Fuera del dominio
- **WHEN** el usuario grafica `sqrt(x)`
- **THEN** no se dibuja nada para `x < 0`

### Requirement: Puntos importantes marcados
El sistema SHALL calcular y marcar sobre la gráfica las intersecciones con los ejes, los puntos críticos con su tipo (máximo o mínimo relativo) y los puntos de inflexión cuando existan, listándolos con sus coordenadas.

#### Scenario: Puntos de la función de prueba
- **WHEN** el usuario analiza `x^3 - 6x^2 + 9x + 1`
- **THEN** el sistema marca la intersección con el eje y en `(0, 1)`, el máximo relativo en `(1, 5)`, el mínimo relativo en `(3, 1)` y el punto de inflexión en `(2, 3)`

### Requirement: Interpretación de crecimiento
El sistema SHALL indicar los intervalos donde la función crece y decrece, justificándolos con el signo de la derivada, y SHALL resumir la interpretación en lenguaje natural.

#### Scenario: Intervalos de monotonía
- **WHEN** el usuario analiza `x^3 - 6x^2 + 9x + 1`
- **THEN** el sistema indica que crece en `(-∞, 1)` y `(3, ∞)` y decrece en `(1, 3)`

### Requirement: Función no graficable
El sistema SHALL avisar cuando la expresión no sea una función de `x` evaluable (variables no reconocidas, expresión vacía, valores no reales en todo el intervalo) y SHALL NOT mostrar una gráfica vacía sin explicación.

#### Scenario: Variable no soportada
- **WHEN** el usuario grafica `x + y`
- **THEN** el sistema indica que solo se admiten funciones de `x`
