# INTELIS · Motor de Diagnóstico Organizacional — Metodología

**Versión 1.0.0** · Jurisdicción normativa: México (federal) · Corte normativo: 2026-05

---

## 1. Qué hace el sistema

Recibe un conjunto de datos de una empresa y ejecuta siete detectores independientes que buscan:

| # | Detector | Pregunta que responde |
|---|----------|----------------------|
| D1 | Errores y fallos de proceso | ¿Dónde el proceso produce resultados que no debería, y esa variación es señal o ruido? |
| D2 | Embudos y cuellos de botella | ¿Qué etapa gobierna el throughput del sistema, y cuánto valor se fuga en cada transición? |
| D3 | Gastos innecesarios | ¿Qué desembolsos no compran resultado, cuáles crecen sin razón y cuáles exigen revisión forense? |
| D4 | Capacidad de plantilla mal asignada | ¿Dónde la capacidad humana contratada no corresponde a la demanda real, por exceso o por defecto? |
| D5 | Estructuras fallidas | ¿La forma del organigrama ayuda o estorba al trabajo? |
| D6 | Estrategias comerciales erróneas | ¿El motor comercial crea o destruye valor por cada peso que consume? |
| D7 | Solvencia y señales forenses | ¿La empresa tiene tiempo para ejecutar las soluciones que este informe propone? |

Cada hallazgo se convierte en una solución con **sustento en siete campos** (ocho cuando involucra salud ocupacional).

---

## 2. Los siete campos de sustento

Ninguna solución se emite sin ellos. Cuando uno falta, el informe declara **cuál** falta y **por qué**, distinguiendo entre "no aplica" e "insuficiencia de insumos".

1. **Matemático** — la fórmula y el cálculo con los números de esta empresa.
2. **Estadístico** — la prueba, su p-valor, su tamaño de muestra y sus supuestos declarados.
3. **Financiero** — VPN, TIR y recuperación, netos de contingencia legal, con prueba de resistencia.
4. **Jurídico** — normas aplicables, obligaciones previas y barreras infranqueables.
5. **Operativo** — pasos verificables, indicador de éxito y señal de aborto.
6. **De riesgo** — qué puede fallar, con qué probabilidad y cómo se mitiga.
7. **De evidencia** — fuente externa, año, muestra y nivel de confianza.
8. **De salud ocupacional** *(condicional)* — evidencia epidemiológica y obligación normativa.

---

## 3. Métodos por detector

### D1 · Procesos

| Método | Fórmula | Propósito |
|--------|---------|-----------|
| Carta I-MR | `σ̂ = MR̄/d₂`, `d₂ = 1.128`; `LC ± 3σ̂` | Separar causa asignable de causa común |
| Reglas Western Electric 1–4 | 1 punto >3σ; 2 de 3 >2σ; 4 de 5 >1σ; 8 del mismo lado | Detección de patrones no aleatorios |
| Capacidad | `Cpk = mín[(LSE−x̄)/3σ, (x̄−LSI)/3σ]` | Distinguir proceso inestable de proceso incapaz |
| Nivel sigma | `σ = Φ⁻¹(1 − DPMO/10⁶) + 1.5` | Cuantificar el nivel de calidad |
| Mann-Kendall + Theil-Sen | `Z = (S∓1)/√Var(S)`; pendiente = mediana de pendientes por pares | Detectar deriva sostenida sin asumir normalidad |

**Por qué σ se estima por rango móvil y no por desviación global:** si el proceso está fuera de control, la `s` global absorbe la señal y enmascara el problema. El estimador `MR̄/d₂` es insensible a los desplazamientos entre subgrupos.

**Por qué la cola inferior no se valoriza:** en una característica de tipo "menor es mejor" (tiempo de ciclo), quedar bajo el límite inferior no cuesta — mejora. Sumar ambas colas sobrestima el impacto económico de forma sistemática.

### D2 · Restricciones y embudos

| Método | Fórmula |
|--------|---------|
| Utilización | `ρ = λ/(μ·c)` |
| M/M/1 | `Lq = ρ²/(1−ρ)`; `Wq = ρ/(μ−λ)` |
| Erlang C (M/M/c) | `C(c,a) = [aᶜ/(c!(1−ρ))] / [Σₖ₌₀ᶜ⁻¹ aᵏ/k! + aᶜ/(c!(1−ρ))]` |
| Ley de Little | `L = λ·W` |
| IC de proporción | Wilson (1927), no Wald |

**Por qué Wilson y no Wald:** el intervalo de Wald falla catastróficamente con proporciones cercanas a 0 o 1 y con muestras pequeñas — exactamente las condiciones de las últimas etapas de un embudo. Con 0 éxitos en 20 intentos, Wald produce `[0, 0]`, un intervalo degenerado que afirma certeza donde no la hay.

**La restricción se identifica sobre la capacidad EFECTIVA, no la nominal:**

```
rendimiento         = 1 − defectos / (unidades × oportunidades)
capacidad efectiva  = capacidad nominal × rendimiento
ρ                   = λ / capacidad efectiva
```

Una etapa que produce defectos gasta capacidad en unidades que después se retrabajan o desechan. Ignorarlo desplaza la identificación hacia la etapa equivocada, que es el error más caro posible en Teoría de Restricciones: dirige toda la inversión de mejora a un lugar donde no eleva el throughput.

En el dataset de demostración la diferencia decide el diagnóstico: la etapa de validación de crédito tiene ρ nominal de 0.933 — alta pero manejable — y ρ **efectiva** de 0.989, porque su 5.7% de defectos consume la diferencia. Sobre capacidad nominal, la restricción se habría atribuido a otra etapa.

**Por qué la restricción duplica su prioridad:** por el teorema de la cadena (Goldratt, 1984), el throughput del sistema es igual al de su eslabón más lento. Una hora ganada en la restricción es una hora ganada por todo el sistema; una hora ganada fuera de ella es cero.

**Propagación del apalancamiento:** el factor 2.0 se aplica a **todo hallazgo que ocurra en la etapa restrictiva**, no solo al hallazgo que la identifica. Un defecto de calidad en la restricción es más valioso de corregir que el mismo defecto en otra etapa, porque cada unidad que la restricción desperdicia es una unidad que el sistema entero nunca produce.

**Sensibilidad hiperbólica de la utilización:**

| ρ | 0.50 | 0.80 | 0.90 | 0.95 |
|---|------|------|------|------|
| Lq | 0.5 | 3.2 | 8.1 | 18.05 |

Planear al 100% de capacidad garantiza colas infinitas ante cualquier variabilidad.

### D3 · Gastos

| Método | Fórmula | Qué prueba |
|--------|---------|-----------|
| Regresión gasto ~ driver | `gasto = β₀ + β₁·driver`; `t = β₁/EE(β₁)` | Si el gasto responde a la actividad |
| Clasificación ABC | A ≤ 80% acumulado, B ≤ 95%, C resto | Dónde concentrar el esfuerzo |
| Z robusto | `Z = (x − mediana)/(1.4826·MAD)`; umbral 3.5 | Atípicos intra-categoría |
| Ley de Benford | `P(d) = log₁₀(1+1/d)`; χ² con 8 gl + MAD de Nigrini | Anomalías en el patrón de importes |

**Tesis operativa:** un gasto es "necesario" si su magnitud responde a un driver de actividad. Cuando la regresión no es significativa, el gasto no está siendo causado por la operación. Esto no prueba que sea inútil, pero **invierte la carga de la prueba**: si no lo causa la actividad, alguien debe poder explicar qué lo causa.

**Por qué el Z robusto y no el clásico:** la desviación estándar ordinaria es arrastrada por el propio valor extremo que se busca detectar, enmascarándolo. El MAD tiene punto de ruptura del 50%.

**Límites de Benford:** requiere n ≥ 50 (preferible ≥ 300), datos que abarquen ≥ 2 órdenes de magnitud, sin mínimos o máximos artificiales ni numeración secuencial. Una no conformidad es **indicio de anomalía en el proceso de captura o en los umbrales de autorización, no prueba de fraude**. Las causas legítimas (precios de lista, redondeo sistemático, numeración secuencial) deben descartarse primero.

### D4 · Capacidad de plantilla

| Método | Fórmula |
|--------|---------|
| Utilización | `demanda de horas / horas contratadas` |
| FTE ocioso | `1 − utilización` |
| Duplicidad | Jaccard `J(A,B) = |A∩B|/|A∪B|`; umbral 0.45 |
| Eficiencia relativa (DEA 1×1) | `θᵢ = (producciónᵢ/costoᵢ) / máx(producción/costo)` |

**Principio del detector:** no identifica "personas innecesarias". Identifica **capacidad sobrante o faltante en una función**, que es una propiedad del diseño del trabajo, no del individuo. Consecuencias:

1. La primera solución ante capacidad sobrante es **siempre la reasignación** hacia el déficit detectado, no la separación. En valor presente es la opción dominante: captura el mismo valor sin costo de terminación, sin pérdida de conocimiento y sin exposición legal.
2. Todo ahorro se reporta **neto del costo legal de terminación**, porque el ahorro bruto es una ficción contable.
3. La sobrecarga se trata con la **misma severidad** que el exceso, y se evalúa **primero**.

**Costeo de terminación (LFT)** — tres escenarios, porque presentar solo uno induce a error:

```
Prima de antigüedad  = 12 días × mín(salario diario, 2 × salario mínimo) × años   [art. 162]
Indemnización        = 90 días × salario diario                                   [art. 48]
Veinte días por año  = 20 × salario diario × años                                 [art. 50-III]
Salarios vencidos    = hasta 12 meses                                             [art. 48, reforma 2012]

Convenio            = proporcionales + prima de antigüedad + gratificación
Liquidación de ley  = proporcionales + prima de antigüedad + 3 meses + 20 días/año
Litigio adverso     = liquidación de ley + salarios vencidos
Esperado            = (1−p)·convenio + p·litigio adverso
```

`p` es un **supuesto parametrizable**, no un dato observado.

**Limitación del DEA de una entrada y una salida:** no controla por complejidad del trabajo, antigüedad de cartera ni dificultad del territorio. Debe verificarse la comparabilidad antes de actuar. Una brecha de eficiencia entre pares que hacen el mismo trabajo casi nunca es un problema de capacidad individual.

### D5 · Estructura

| Método | Fórmula |
|--------|---------|
| Tramo de control | reportes directos por nodo; referencia 5–9 (conocimiento), 10–15 (estandarizado) |
| Profundidad teórica | `capas ≈ ⌈log_s(N)⌉` |
| Costo de coordinación | `enlaces = n(n−1)/2` (Brooks, 1975) |
| Desigualdad de tramos | Gini sobre la distribución de tramos |

La estructura se evalúa por la **latencia** que introduce entre la detección de un problema y la autoridad para resolverlo, no por el organigrama en sí.

### D6 · Comercial

| Método | Fórmula |
|--------|---------|
| LTV | `(ARPU × margen bruto) / churn mensual` |
| Recuperación del CAC | `CAC / (ARPU × margen)` |
| Churn anual | `1 − (1 − churn mensual)¹²` |
| Concentración | HHI `= Σ(cuotaᵢ)²`; uniformidad de Shannon `H/ln(n)` |
| ROAS de equilibrio | `1 / margen bruto` |
| Elasticidad precio | regresión log-log `ln(Q) = α + ε·ln(P)` |

**Jerarquía de palancas sobre el LTV** (no son equivalentes):

- Reducir churn 20% → LTV **+25%** (efecto **hiperbólico**, porque la vida del cliente es `1/churn`)
- Elevar margen 20% → LTV +20% (efecto lineal)
- Reducir CAC 20% → razón +25%, LTV sin cambio (efecto lineal, suele tener el menor techo)

**Supuesto crítico del modelo de LTV:** churn constante y sin descuento temporal. Si el churn se concentra en los primeros meses (patrón habitual), el LTV calculado está **sobrestimado** y la situación real es peor que la reportada.

**Barrera dura:** ninguna recomendación de precios puede implicar coordinación con competidores. Es práctica monopólica absoluta (art. 53 LFCE), nula de pleno derecho y sancionable con hasta el 10% de los ingresos.

### D7 · Financiero

| Método | Fórmula | Umbrales |
|--------|---------|----------|
| Altman Z'' | `6.56·X₁ + 3.26·X₂ + 6.72·X₃ + 1.05·X₄` | >2.6 segura; 1.1–2.6 gris; <1.1 insolvencia |
| Ciclo de efectivo | `CCC = DSO + DIO − DPO` | — |
| Runway | `efectivo / |quema mensual|` | <6 meses crítico |
| Cobertura de intereses | `EBIT / gastos financieros` | <1.5× crítico |
| M-score de Beneish | 8 variables | > −1.78 indicios |

Este detector **condiciona a todos los demás**: una organización con seis meses de liquidez no puede ejecutar un rediseño estructural de dieciocho meses. Determina la secuencia.

---

## 4. Cuantificación del impacto

Un informe que afirma "se pierden $847,320" miente por **precisión espuria**. Este motor afirma: "P50 = $840k; intervalo P5–P95 = $520k–$1.21M".

- Cada componente se modela como **PERT-Beta**: `μ = (a + 4m + b)/6`, `σ = (b − a)/6`.
- Se simulan **10,000 iteraciones** de Monte Carlo con PRNG mulberry32 sembrado.
- Se reportan P5, P25, P50, P75, P95 y la forma de la distribución.

**Supuesto declarado:** los componentes se simulan como independientes. Si existe correlación positiva, la dispersión real es **mayor** y el P95 es conservador.

**Convergencia verificada:** dos semillas distintas producen agregados que difieren en 0.05%, lo que confirma que 10,000 iteraciones bastan.

Cada hallazgo deriva su propia semilla de la semilla de la corrida más su número de secuencia (`semilla + n·7919`), de modo que dos hallazgos distintos no comparten el mismo flujo de números aleatorios y la corrida completa sigue siendo reproducible desde un único valor.

---

## 5. Confianza del hallazgo

```
Confianza = peso(nivel de evidencia) × factor de suficiencia de datos
          × penalización por muestra × ajuste por significancia
```

| Nivel de evidencia | Peso | Significado |
|--------------------|------|-------------|
| Prueba estadística | 1.00 | Prueba de hipótesis con p-valor sobre datos del cliente |
| Cálculo determinista | 0.95 | Identidad contable o fórmula cerrada |
| Modelo validado | 0.80 | Altman, Erlang, Beneish aplicados a datos del cliente |
| Comparación externa | 0.65 | Desviación respecto de un benchmark documentado |
| Convención profesional | 0.45 | Umbral de práctica sin estudio empírico único |
| Indicio | 0.30 | Señal que motiva investigación, insuficiente para decidir |

Bandas: **ALTA** ≥ 0.75 (decidir y ejecutar) · **MEDIA** ≥ 0.50 (investigar y planear) · **BAJA** < 0.50 (solo levantar más datos).

---

## 6. Priorización

```
IPI = (Impacto_norm × Confianza × Severidad_norm × Apalancamiento_TOC) / √Esfuerzo
```

- **Impacto_norm** = `ln(1+impacto) / ln(1+impacto_máx)`. **Logarítmico, no lineal**: la distribución de impactos es de cola pesada; con normalización lineal un solo hallazgo grande aplasta a todos los demás hacia cero y el ranking deja de discriminar.
- **Apalancamiento_TOC** = 2.0 si el hallazgo ocurre **en** la restricción, 1.0 si no. Es la corrección más importante frente a un ranking ingenuo por monto.
- **√Esfuerzo**: raíz y no lineal — penaliza lo costoso sin hacer que lo trivial domine siempre.
- Un incumplimiento legal vigente **no compite por ROI**: se le asigna IPI ≥ 0.95.
- **Piso para hallazgos no cuantificados** (`Impacto_norm = 0.35`). Un hallazgo cuyo impacto no se pudo cifrar no vale cero: simplemente no se pudo medir. Dejarlo caer al fondo del ranking haría que la ausencia de datos se disfrazara de ausencia de importancia — exactamente el error que el resto del motor está diseñado para evitar. Su posición pasa a depender de su severidad y su confianza, y el informe señala que cifrar ese impacto debería ser una prioridad de levantamiento de información.

---

## 7. Control de solapamiento

Sumar los impactos de hallazgos que comparten causa raíz cuenta el mismo peso dos o tres veces.

Seis familias de solapamiento: *negocio nuevo no capturado* · *economía del ciclo de vida del cliente* · *costo laboral y diseño organizacional* · *gasto operativo* · *calidad y estabilidad de proceso* · *liquidez y capital de trabajo*.

**Regla aplicada:** dentro de cada familia se reconoce el **máximo**, no la suma. Es deliberadamente conservador: subestima la oportunidad real antes que sobrestimarla.

**Prueba de plausibilidad:** si el agregado supera el 35% de los ingresos anuales, el motor emite una advertencia. Un agregado de esa magnitud casi siempre indica doble conteo residual o un factor de anualización mal declarado, antes que una oportunidad real.

---

## 8. Índice de Suficiencia de Datos (ISD)

Cada dominio declara sus insumos con un peso. `ISD ∈ [0,1]` es la cobertura ponderada.

Un dominio con `ISD < umbral` se declara **NO EVALUABLE**, nunca "sin hallazgos".

> **Ausencia de datos no es ausencia de problemas.** "No encontramos nada" y "no pudimos ver" son conclusiones radicalmente distintas, y el informe nunca las confunde.

El ISD además **atenúa la confianza** de todo hallazgo del dominio: `factor = 0.55 + 0.45 × ISD`.

---

## 9. Periodicidad

El error más silencioso y más caro de un motor de diagnóstico: si los volúmenes de un bloque son mensuales y se tratan como anuales, el impacto se equivoca por un factor de 12.

Por eso la periodicidad se declara **explícitamente por bloque** en `empresa.periodicidad`, y el motor emite una advertencia cuando no se declaró.

```js
empresa: { periodicidad: { procesos: 'mensual', embudo: 'anual', comercial: 'anual' } }
```

Factores admitidos: `semanal` (52), `mensual` (12), `bimestral` (6), `trimestral` (4), `semestral` (2), `anual` (1).

---

## 10. Validación de integridad de datos

Antes de ejecutar, el motor verifica:

- **Ecuación contable** `A = P + C` con tolerancia del 1%. Un descuadre **suspende** el análisis de solvencia.
- **Monotonía del embudo**: una etapa no puede tener más volumen que la anterior.
- **Aciclicidad del organigrama**: detecta ciclos de reporte y referencias rotas en `reportaA`.
- **Cobertura del detalle de gastos** contra el agregado: > 105% indica doble conteo; < 60% advierte cobertura parcial.
- **Rangos de dominio**: churn en [0,1), márgenes como decimales, capacidades positivas.

---

## 11. Marco jurídico

Catálogo de **29 normas** del ordenamiento mexicano, mapeadas a **7 tipos de acción correctiva**:

`reducir_plantilla` · `tercerizar_funcion` · `cancelar_gasto_proveedor` · `rediseñar_estructura` · `modificar_precios` · `cambiar_promesa_comercial` · `automatizar_proceso`

Cada acción declara: normas aplicables, obligaciones previas, contingencia a cuantificar y **barreras infranqueables**.

Cinco normas están marcadas como **`requiereVerificacion`** y el informe las lista en sus advertencias, entre ellas la reducción de jornada a 40 horas (proceso legislativo, **no vigente al corte**) y el marco de protección de datos personales (reestructura institucional reciente).

> **Advertencia vinculante:** este módulo es una guía de orientación normativa generada por software. No constituye asesoría jurídica. Toda cita debe cotejarse contra el texto vigente publicado en el DOF antes de ejecutar cualquier acción.

---

## 12. Base de evidencia externa

**30 fuentes** catalogadas, cada una con: valor · unidad · fuente · año · muestra · nivel de confianza · nota metodológica · fecha de re-verificación.

Niveles: **alta** (13) — estudio con muestra grande y metodología publicada · **media** (6) — reporte sectorial con metodología abierta · **convención** (11) — práctica profesional estandarizada sin estudio de respaldo único.

El motor **advierte** cuando una fuente supera su fecha de re-verificación, y el informe etiqueta explícitamente las convenciones para que **nunca se presenten como hallazgo empírico**.

---

## 13. Garantías y limitaciones

**Garantías**

- **Determinismo** — misma entrada y misma semilla producen el mismo informe, bit a bit. Verificado.
- **Abstención informada** — un dominio sin datos se declara no evaluado.
- **Trazabilidad** — cada número tiene su fórmula, sus insumos y su fuente.
- **Rango sobre punto** — los impactos son intervalos, no cifras falsamente precisas.
- **Privacidad** — todo el cómputo ocurre en el navegador; los datos no se transmiten.

**Limitaciones estructurales**

- El motor opera sobre los datos que recibe. **No verifica su veracidad ni su representatividad.**
- No sustituye el juicio de la dirección ni la asesoría profesional jurídica, contable o médica.
- Los benchmarks externos provienen de poblaciones distintas y **orientan, no determinan**.
- **La correlación no establece causalidad.** Los hallazgos señalan dónde mirar, no qué concluir.
- El agregado asume independencia entre familias; los solapamientos residuales deben validarse manualmente.

---

## 14. Uso

```
diagnostico.html          Interfaz del sistema
engine/engine.js          diagnosticar(datos, opciones) → informe
engine/core/schema.js     ESQUEMA: contrato de datos de entrada
data/empresa-demo.js      Dataset de demostración
```

```js
import { diagnosticar } from './engine/engine.js';

const informe = diagnosticar(misDatos, {
  semilla: 20260921,      // reproducibilidad
  capturaSupuesta: 0.70,  // fracción del impacto que se asume capturable
  horizonteAños: 3,       // horizonte de la evaluación financiera
  capacidadParalela: 3,   // capacidad de absorción de cambio
});
```

## 15. Pruebas

```
node test/motor.test.mjs
```

**119 pruebas en 17 grupos.** Cubren:

- **Correctitud numérica contra valores de referencia publicados** — Φ(1.96)=0.9750, Φ⁻¹(0.975)=1.9600, t(2.228, 10 gl)=0.9750, χ²(16.919, 9 gl)=0.0500, M/M/1 con ρ=0.8/0.9/0.95 → Lq=3.2/8.1/18.05, DPMO 6210→4.00σ, VPN(10%)=4.132, TIR=13.07%, Wilson 30/100=[0.218, 0.396].
- **Propiedades que deben cumplirse por construcción** — Φ⁻¹(Φ(x))=x, VPN(TIR)=0, L=λ·W, Erlang C con c=1 coincide con M/M/1, CCC=DSO+DIO−DPO, MCO recupera coeficientes verdaderos, la regresión log-log recupera la elasticidad.
- **Robustez** — el MAD es insensible a un atípico extremo mientras σ es arrastrada por él (lo que justifica su uso); Wilson no degenera con 0 éxitos mientras Wald sí.
- **Ausencia de falsos positivos** — la carta de control no inventa señales en un proceso estable; Mann-Kendall no detecta tendencia en ruido; MCO declara no significativa una relación inexistente; Benford acepta datos conformes y rechaza una distribución uniforme.
- **Costeo laboral (LFT)** — prima de antigüedad topada a 2 salarios mínimos, indemnización de 90 días, 20 días por año, ordenamiento de los tres escenarios, y el tope que aplica solo a la prima de antigüedad.
- **Validación de datos** — descuadre contable, embudo que crece, ciclos y referencias rotas en el organigrama, doble conteo de gastos, rangos de dominio, periodicidad no declarada.
- **Garantías del motor** — determinismo bit a bit, efecto de la semilla, convergencia, abstención informada, anatomía completa de hallazgos y de los siete campos de sustento, ordenamiento del ranking, acotamiento de las olas y coherencia de la desduplicación.
