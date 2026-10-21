# Spec Delta

## Purpose

Garantizar que toda solución del asistente se presente de forma uniforme y pedagógica (fórmula, sustitución, procedimiento, respuesta final, interpretación y advertencias) y que cada resultado se contraste con una verificación independiente antes de mostrarse como correcto.

## ADDED Requirements

### Requirement: Estructura uniforme de la solución
El sistema SHALL presentar cada solución con las secciones: fórmula o regla aplicada, sustitución de valores, procedimiento paso a paso, respuesta final destacada e interpretación en lenguaje natural, con las expresiones en formato matemático.

#### Scenario: Solución completa
- **WHEN** el usuario resuelve cualquier operación válida en cualquier módulo
- **THEN** el resultado muestra fórmula, sustitución, pasos numerados y respuesta final destacada

#### Scenario: Sección sin contenido aplicable
- **WHEN** una operación no tiene fórmula general (por ejemplo, factorizar por agrupación)
- **THEN** el sistema muestra la técnica aplicada en lugar de la fórmula y no deja la sección vacía

### Requirement: Cada paso justificado
El sistema SHALL acompañar cada paso del procedimiento con la regla o razón que lo justifica (por ejemplo "regla de la potencia", "factor común", "sustitución directa").

#### Scenario: Derivada de un polinomio
- **WHEN** se deriva `x^3 - 6x^2`
- **THEN** cada término derivado aparece como un paso que nombra la regla usada

### Requirement: Verificación cruzada de resultados
El sistema SHALL contrastar cada respuesta simbólica con una comprobación numérica independiente (derivada contra cociente incremental, antiderivada derivándola, límite por aproximación numérica, raíces sustituyéndolas) y SHALL mostrar el resultado de la verificación al usuario.

#### Scenario: Verificación exitosa
- **WHEN** el sistema integra `2x` y obtiene `x^2 + C`
- **THEN** muestra que la derivada de `x^2 + C` es `2x` como comprobación

#### Scenario: Discrepancia en la verificación
- **WHEN** la verificación numérica no coincide con el resultado simbólico
- **THEN** el sistema muestra una advertencia visible de resultado no verificado en lugar de presentarlo como correcto

### Requirement: Advertencias visibles
El sistema SHALL mostrar las advertencias asociadas a un resultado (suposiciones, dominio restringido, raíces extrañas, verificación no concluyente) de forma diferenciada de la respuesta final.

#### Scenario: Raíz extraña descartada
- **WHEN** al resolver `sqrt(x+2) = x` una solución candidata no cumple la ecuación original
- **THEN** el sistema la descarta, indica por qué y lo muestra como advertencia

### Requirement: Cálculo determinista y sin conexión externa
El sistema SHALL calcular todas las respuestas en el navegador de manera determinista, de modo que la misma entrada produzca siempre el mismo resultado, sin depender de servicios externos con cuota ni de claves de acceso.

#### Scenario: Repetibilidad
- **WHEN** el docente ejecuta dos veces la misma entrada
- **THEN** obtiene exactamente la misma respuesta y los mismos pasos
