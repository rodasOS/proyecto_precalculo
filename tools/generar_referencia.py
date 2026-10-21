"""Genera src/app/data/casos-referencia.json con valores calculados por SymPy (oráculo independiente).

Uso:  pip install sympy && python3 tools/generar_referencia.py
Las pruebas de Vitest (src/app/core/cas/referencia.spec.ts) comparan el motor contra este archivo.
"""
import json
import sympy as sp

x = sp.symbols('x', real=True)
NS = {'x': x, 'sin': sp.sin, 'cos': sp.cos, 'tan': sp.tan, 'exp': sp.exp, 'ln': sp.log, 'sqrt': sp.sqrt, 'pi': sp.pi, 'Abs': sp.Abs, 'atan': sp.atan}
P = lambda s: sp.sympify(s.replace('^', '**'), locals=NS)
PUNTOS = [-3.7, -1.3, -0.6, 0.45, 1.7, 2.9, 4.2]

def num(v):
    try:
        f = float(sp.N(v))
        return f if abs(f) < 1e12 else None
    except (TypeError, ValueError):
        return None

casos = {'derivadas': [], 'integrales': [], 'limites': [], 'ecuaciones': [], 'extremos': []}

for s in ['x^3 - 6*x^2 + 9*x + 1', 'x^2*sin(x)', '(3*x+1)^5', '(x^2+1)/(x-1)', 'exp(2*x)*x', 'ln(x^2+1)', 'sqrt(x^2+1)', 'sin(x)/x',
          'tan(x)', 'x^x', '2^x', 'atan(x)', 'x*exp(-x^2)', '1/(x^2+4)', 'cos(3*x+1)^2', 'x^4 - 2*x^2']:
    d = sp.diff(P(s), x)
    vals = [(p, num(d.subs(x, p))) for p in PUNTOS]
    casos['derivadas'].append({'f': s, 'valores': [[p, v] for p, v in vals if v is not None]})

for s, a, b in [('x^2', 0, 3), ('3*x^2+4*x-5', 0, 2), ('sin(x)', 0, 'pi'), ('exp(x)', 0, 1), ('1/x', 1, 'e'), ('x*exp(x^2)', 0, 1), ('2*x*cos(x^2)', 0, 1),
                ('x', -1, 1), ('1/(x^2+1)', 0, 1), ('x*exp(x)', 0, 1), ('x*sin(x)', 0, 'pi'), ('(2*x+1)^3', 0, 1), ('1/(x^2-1)', 2, 3), ('cos(x)^2', 0, 'pi')]:
    A = sp.E if b == 'e' else (sp.pi if b == 'pi' else b)
    v = sp.integrate(P(s), (x, a, A))
    casos['integrales'].append({'f': s, 'a': str(a), 'b': str(b), 'valor': num(v)})

for s, a in [('(x^2-4)/(x-2)', '2'), ('(sqrt(x+1)-1)/x', '0'), ('sin(3*x)/x', '0'), ('(1-cos(x))/x^2', '0'), ('(exp(x)-1)/x', '0'), ('(3*x^2+1)/(x^2-5)', 'oo'),
             ('(2*x^3-x)/(x^3+4)', 'oo'), ('x^3-2*x', '-oo'), ('exp(x)/x^2', 'oo'), ('ln(x)/x', 'oo'), ('x^2+3*x', '2'), ('(x^3-8)/(x-2)', '2'),
             ('1/x^2', '0'), ('1/(x-1)', '1'), ('Abs(x)/x', '0'), ('(x^2-9)/(x^2-x-6)', '3'), ('(sqrt(x^2+x)-x)', 'oo'), ('tan(x)/x', '0')]:
    f = P(s)
    pt = sp.oo if a == 'oo' else (-sp.oo if a == '-oo' else sp.sympify(a))
    if pt in (sp.oo, -sp.oo):
        l = sp.limit(f, x, pt)
        casos['limites'].append({'f': s, 'a': a, 'tipo': 'inf+' if l == sp.oo else 'inf-' if l == -sp.oo else 'valor', 'valor': num(l)})
    else:
        izq, der = sp.limit(f, x, pt, '-'), sp.limit(f, x, pt, '+')
        if izq == der:
            casos['limites'].append({'f': s, 'a': a, 'tipo': 'inf+' if izq == sp.oo else 'inf-' if izq == -sp.oo else 'valor', 'valor': num(izq)})
        else:
            casos['limites'].append({'f': s, 'a': a, 'tipo': 'no-existe', 'valor': None})

for s in ['x^2-5*x+6', 'x^2+1', '2*x+3-7', 'x^3-6*x^2+11*x-6', '(x^2-4)/(x-2)', 'x^4-5*x^2+4', 'x^2-2', 'x^3-x', 'exp(x)-3', 'x^3+x+1']:
    sol = sp.solveset(sp.Eq(P(s), 0), x, domain=sp.S.Reals)
    sol = sorted(float(sp.N(v)) for v in sol) if sol.is_FiniteSet else None
    if sol is not None and s == '(x^2-4)/(x-2)':
        sol = [v for v in sol if abs(v - 2) > 1e-9]
    casos['ecuaciones'].append({'f': s, 'soluciones': sol})

for s in ['x^3-6*x^2+9*x+1', 'x^3-3*x', 'x^4-4*x^2', 'x^2-4*x+7', '-2*x^2+8*x', 'x^3', 'x^3+x', 'x^5-5*x^3']:
    f = P(s)
    crit = sorted(float(sp.N(r)) for r in sp.solveset(sp.diff(f, x), x, domain=sp.S.Reals))
    out = []
    for c in crit:
        f2 = float(sp.N(sp.diff(f, x, 2).subs(x, c)))
        tipo = 'min' if f2 > 1e-9 else 'max' if f2 < -1e-9 else 'ninguno'
        if tipo == 'ninguno':
            h = 1e-3
            sl, sr = float(sp.N(sp.diff(f, x).subs(x, c - h))), float(sp.N(sp.diff(f, x).subs(x, c + h)))
            tipo = 'max' if sl > 0 > sr else 'min' if sl < 0 < sr else 'ninguno'
        out.append({'x': c, 'y': float(sp.N(f.subs(x, c))), 'tipo': tipo})
    casos['extremos'].append({'f': s, 'criticos': out})

with open('src/app/data/casos-referencia.json', 'w') as fh:
    json.dump(casos, fh, indent=1, ensure_ascii=False)
print({k: len(v) for k, v in casos.items()}, sum(len(v) for v in casos.values()), 'casos')
