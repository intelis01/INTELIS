/**
 * INTELIS · Núcleo Matemático-Estadístico
 * ─────────────────────────────────────────────────────────────────────────────
 * Biblioteca determinista (sin dependencias) que sustenta todo el Motor de
 * Diagnóstico Organizacional (MDO). Cada función documenta su fórmula cerrada,
 * su supuesto distribucional y su referencia bibliográfica, porque ningún
 * hallazgo del sistema puede emitirse sin que su cálculo sea auditable.
 *
 * Convenciones:
 *   - Toda función es pura y determinista (el PRNG se siembra explícitamente).
 *   - Devuelve NaN/null ante muestras insuficientes en lugar de inventar valores.
 *   - Los tamaños de muestra mínimos se validan porque la confianza estadística
 *     de un hallazgo es parte de su sustento.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   1. UTILIDADES BÁSICAS
   ═══════════════════════════════════════════════════════════════════════════ */

export const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export const sum   = (a) => a.reduce((s, x) => s + x, 0);
export const round = (x, d = 2) => {
  if (!isNum(x)) return NaN;
  const f = Math.pow(10, d);
  return Math.round((x + Number.EPSILON) * f) / f;
};

/** Filtra a números finitos: evita que un null contamine una media. */
export const clean = (arr) => (Array.isArray(arr) ? arr.filter(isNum) : []);

/* ═══════════════════════════════════════════════════════════════════════════
   2. ESTADÍSTICA DESCRIPTIVA
   ═══════════════════════════════════════════════════════════════════════════ */

export function mean(arr) {
  const a = clean(arr);
  return a.length ? sum(a) / a.length : NaN;
}

/** Cuantil por interpolación lineal (método 7 de Hyndman-Fan, el de R/NumPy). */
export function quantile(arr, p) {
  const a = clean(arr).slice().sort((x, y) => x - y);
  if (!a.length) return NaN;
  if (a.length === 1) return a[0];
  const h = (a.length - 1) * clamp(p, 0, 1);
  const lo = Math.floor(h), hi = Math.ceil(h);
  return a[lo] + (h - lo) * (a[hi] - a[lo]);
}

export const median = (arr) => quantile(arr, 0.5);
export const iqr    = (arr) => quantile(arr, 0.75) - quantile(arr, 0.25);

/** Varianza muestral (n-1, corrección de Bessel). */
export function variance(arr) {
  const a = clean(arr);
  if (a.length < 2) return NaN;
  const m = mean(a);
  return sum(a.map((x) => (x - m) ** 2)) / (a.length - 1);
}

export const stdev = (arr) => Math.sqrt(variance(arr));

/** Coeficiente de variación: σ/μ. Medida adimensional de dispersión relativa. */
export function cv(arr) {
  const m = mean(arr);
  return m !== 0 && isNum(m) ? stdev(arr) / Math.abs(m) : NaN;
}

/**
 * Desviación Absoluta Mediana escalada a σ.
 * MAD = mediana(|xᵢ − mediana(x)|);  σ̂ = 1.4826·MAD  bajo normalidad.
 * Punto de ruptura del 50%: un outlier extremo no la desplaza, a diferencia de σ.
 * Ref: Rousseeuw & Croux (1993), JASA 88(424).
 */
export function mad(arr, scaled = true) {
  const a = clean(arr);
  if (a.length < 2) return NaN;
  const med = median(a);
  const m = median(a.map((x) => Math.abs(x - med)));
  return scaled ? 1.4826 * m : m;
}

/** Z robusto: (x − mediana)/(1.4826·MAD). |Z| > 3.5 ⇒ atípico (Iglewicz & Hoaglin). */
export function robustZ(x, arr) {
  const s = mad(arr, true);
  if (!isNum(s) || s === 0) return 0;
  return (x - median(arr)) / s;
}

/** Asimetría muestral ajustada (Fisher-Pearson G1). */
export function skewness(arr) {
  const a = clean(arr), n = a.length;
  if (n < 3) return NaN;
  const m = mean(a), s = stdev(a);
  if (!s) return 0;
  const g1 = sum(a.map((x) => ((x - m) / s) ** 3)) / n;
  return (Math.sqrt(n * (n - 1)) / (n - 2)) * g1;
}

/** Índice de Gini: 0 = equidad perfecta, 1 = concentración total. */
export function gini(arr) {
  const a = clean(arr).filter((x) => x >= 0).sort((x, y) => x - y);
  const n = a.length;
  if (n < 2) return 0;
  const total = sum(a);
  if (total === 0) return 0;
  let acc = 0;
  for (let i = 0; i < n; i++) acc += (2 * (i + 1) - n - 1) * a[i];
  return acc / (n * total);
}

/**
 * Índice Herfindahl-Hirschman normalizado (concentración de cartera/canal).
 * HHI = Σsᵢ² con sᵢ = cuota. Umbral DOJ/FTC (Merger Guidelines 2023):
 * >0.25 = alta concentración. Aplicado a clientes ⇒ riesgo de dependencia.
 */
export function hhi(values) {
  const a = clean(values).filter((x) => x >= 0);
  const t = sum(a);
  if (!t) return 0;
  return sum(a.map((x) => (x / t) ** 2));
}

/** Similitud de Jaccard |A∩B|/|A∪B|: mide solapamiento de responsabilidades. */
export function jaccard(setA, setB) {
  const A = new Set(setA.map((s) => String(s).toLowerCase().trim()));
  const B = new Set(setB.map((s) => String(s).toLowerCase().trim()));
  if (!A.size && !B.size) return 0;
  let inter = 0;
  A.forEach((v) => { if (B.has(v)) inter++; });
  return inter / (A.size + B.size - inter);
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. DISTRIBUCIONES DE PROBABILIDAD
   ═══════════════════════════════════════════════════════════════════════════ */

/** log Γ(x) — aproximación de Lanczos (g=7, n=9). Error relativo < 1e-13. */
export function logGamma(x) {
  const g = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let a = g[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += g[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Función error, aproximación de Abramowitz & Stegun 7.1.26 (|ε| < 1.5e-7). */
export function erf(x) {
  const s = Math.sign(x);
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t
    - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}

/** Φ(z): función de distribución acumulada normal estándar. */
export const normalCDF = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
export const normalPDF = (z) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);

/** Φ⁻¹(p): inversa normal, algoritmo de Acklam (|ε| relativo < 1.15e-9). */
export function normalInv(p) {
  if (p <= 0 || p >= 1) return p <= 0 ? -Infinity : Infinity;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
             1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
             6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
             -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
             3.754408661907416e+00];
  const pl = 0.02425, ph = 1 - pl;
  let q, r;
  if (p < pl) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  if (p > ph) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  q = p - 0.5; r = q * q;
  return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5]) * q /
         (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}

/** Beta incompleta regularizada I_x(a,b) — fracción continua de Lentz. */
export function incBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = logGamma(a + b) - logGamma(a) - logGamma(b) +
                a * Math.log(x) + b * Math.log(1 - x);
  if (x > (a + 1) / (a + b + 2)) return 1 - incBeta(1 - x, b, a);
  const TINY = 1e-30;
  let c = 1, d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let num = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + num * d; if (Math.abs(d) < TINY) d = TINY;
    c = 1 + num / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d; h *= d * c;
    num = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + num * d; if (Math.abs(d) < TINY) d = TINY;
    c = 1 + num / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return (Math.exp(lbeta) * h) / a;
}

/** CDF t de Student con ν grados de libertad. */
export function tCDF(t, df) {
  if (!isNum(t) || df <= 0) return NaN;
  const x = df / (df + t * t);
  const p = 0.5 * incBeta(x, df / 2, 0.5);
  return t > 0 ? 1 - p : p;
}

/** p-valor bilateral de un estadístico t. */
export const tTwoSidedP = (t, df) => 2 * (1 - tCDF(Math.abs(t), df));

/** Gamma incompleta regularizada P(a,x) — serie + fracción continua. */
export function incGamma(a, x) {
  if (x < 0 || a <= 0) return NaN;
  if (x === 0) return 0;
  if (x < a + 1) {
    let ap = a, s = 1 / a, del = s;
    for (let n = 1; n <= 300; n++) {
      ap++; del *= x / ap; s += del;
      if (Math.abs(del) < Math.abs(s) * 1e-12) break;
    }
    return s * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }
  const TINY = 1e-30;
  let b = x + 1 - a, c = 1 / TINY, d = 1 / b, h = d;
  for (let i = 1; i <= 300; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < TINY) d = TINY;
    c = b + an / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

/** CDF χ² con k grados de libertad. */
export const chi2CDF = (x, k) => incGamma(k / 2, x / 2);
/** p-valor de cola superior de χ². */
export const chi2P = (x, k) => 1 - chi2CDF(x, k);

/* ═══════════════════════════════════════════════════════════════════════════
   4. PRUEBAS DE HIPÓTESIS Y DETECCIÓN DE ATÍPICOS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * t de una muestra contra μ₀ (p.ej. el benchmark sectorial).
 * t = (x̄ − μ₀)/(s/√n), ν = n−1. Devuelve además el tamaño de efecto
 * d de Cohen, porque significancia ≠ relevancia económica.
 */
export function tTestOneSample(arr, mu0) {
  const a = clean(arr), n = a.length;
  if (n < 2) return { n, t: NaN, p: NaN, d: NaN, significant: false, reason: 'n<2' };
  const m = mean(a), s = stdev(a);
  if (s === 0) return { n, t: NaN, p: NaN, d: NaN, significant: false, reason: 'varianza nula' };
  const t = (m - mu0) / (s / Math.sqrt(n));
  const p = tTwoSidedP(t, n - 1);
  const d = (m - mu0) / s;
  return { n, mean: m, sd: s, t, df: n - 1, p, d, significant: p < 0.05 };
}

/** IC bilateral (1−α) para la media usando t de Student. */
export function meanCI(arr, alpha = 0.05) {
  const a = clean(arr), n = a.length;
  if (n < 2) return { lo: NaN, hi: NaN, n };
  const m = mean(a), se = stdev(a) / Math.sqrt(n);
  // t crítico por bisección sobre tCDF (evita tablas embebidas).
  let lo = 0, hi = 100;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (tCDF(mid, n - 1) < 1 - alpha / 2) lo = mid; else hi = mid;
  }
  const tc = (lo + hi) / 2;
  return { lo: m - tc * se, hi: m + tc * se, n, tCrit: tc, mean: m, se };
}

/**
 * Prueba de Grubbs para un atípico único (máxima desviación estudentizada).
 * G = máx|xᵢ−x̄|/s; se compara contra el valor crítico derivado de la t.
 * Ref: Grubbs (1969), Technometrics 11(1), 1-21.
 */
export function grubbs(arr, alpha = 0.05) {
  const a = clean(arr), n = a.length;
  if (n < 7) return { detected: false, reason: 'n<7: potencia insuficiente', n };
  const m = mean(a), s = stdev(a);
  if (!s) return { detected: false, reason: 'varianza nula', n };
  let idx = 0, G = 0;
  a.forEach((x, i) => { const g = Math.abs(x - m) / s; if (g > G) { G = g; idx = i; } });
  // t crítico a α/(2n) con n−2 gl.
  let lo = 0, hi = 100;
  const target = 1 - alpha / (2 * n);
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (tCDF(mid, n - 2) < target) lo = mid; else hi = mid;
  }
  const tc = (lo + hi) / 2;
  const Gcrit = ((n - 1) / Math.sqrt(n)) * Math.sqrt(tc * tc / (n - 2 + tc * tc));
  return { detected: G > Gcrit, G, Gcrit, index: idx, value: a[idx], n, alpha };
}

/** Vallas de Tukey: [Q1 − k·IQR, Q3 + k·IQR]. k=1.5 leve, k=3 extremo. */
export function tukeyFences(arr, k = 1.5) {
  const q1 = quantile(arr, 0.25), q3 = quantile(arr, 0.75), r = q3 - q1;
  return { q1, q3, iqr: r, lower: q1 - k * r, upper: q3 + k * r, k };
}

/**
 * Ley de Benford (primer dígito) + χ² de bondad de ajuste con 8 gl.
 * P(d) = log₁₀(1 + 1/d). Estándar forense aceptado para detectar
 * facturación fabricada o manipulación de umbrales de autorización.
 * Ref: Nigrini (2012), "Benford's Law", Wiley. Requiere n ≥ 50 y datos
 * que abarquen ≥2 órdenes de magnitud sin topes artificiales.
 */
export function benford(values) {
  const a = clean(values).map(Math.abs).filter((x) => x >= 1);
  const n = a.length;
  const expectedPct = Array.from({ length: 9 }, (_, i) => Math.log10(1 + 1 / (i + 1)));
  if (n < 50) {
    return { applicable: false, n, reason: 'n<50: la prueba χ² carece de potencia', expectedPct };
  }
  const obs = new Array(9).fill(0);
  a.forEach((x) => {
    const d = parseInt(String(x).replace(/[^1-9]/, '').charAt(0) ||
      String(Math.floor(x)).charAt(0), 10);
    if (d >= 1 && d <= 9) obs[d - 1]++;
  });
  const exp = expectedPct.map((p) => p * n);
  const chi2 = sum(obs.map((o, i) => ((o - exp[i]) ** 2) / exp[i]));
  const p = chi2P(chi2, 8);
  // MAD de Nigrini: <0.006 conformidad cercana; >0.015 no conformidad.
  const madN = mean(obs.map((o, i) => Math.abs(o / n - expectedPct[i])));
  return {
    applicable: true, n, observed: obs, expected: exp, expectedPct,
    observedPct: obs.map((o) => o / n),
    chi2, df: 8, p, mad: madN,
    conformity: madN < 0.006 ? 'cercana' : madN < 0.012 ? 'aceptable'
              : madN < 0.015 ? 'marginal' : 'no conforme',
    anomalous: p < 0.05 && madN >= 0.012,
  };
}

/**
 * Tendencia monótona de Mann-Kendall (no paramétrica, robusta a no-normalidad
 * y a estacionalidad suave). Devuelve S, Z y la pendiente de Theil-Sen.
 * Ref: Kendall (1975); Sen (1968), JASA 63(324).
 */
export function mannKendall(series) {
  const x = clean(series), n = x.length;
  if (n < 8) return { applicable: false, n, reason: 'n<8' };
  let S = 0;
  for (let i = 0; i < n - 1; i++)
    for (let j = i + 1; j < n; j++) S += Math.sign(x[j] - x[i]);
  const varS = (n * (n - 1) * (2 * n + 5)) / 18;
  const Z = S > 0 ? (S - 1) / Math.sqrt(varS) : S < 0 ? (S + 1) / Math.sqrt(varS) : 0;
  const p = 2 * (1 - normalCDF(Math.abs(Z)));
  const slopes = [];
  for (let i = 0; i < n - 1; i++)
    for (let j = i + 1; j < n; j++) slopes.push((x[j] - x[i]) / (j - i));
  return {
    applicable: true, n, S, Z, p,
    senSlope: median(slopes),
    trend: p < 0.05 ? (S > 0 ? 'creciente' : 'decreciente') : 'sin tendencia',
    significant: p < 0.05,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. REGRESIÓN
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * MCO simple y = β₀ + β₁x con inferencia completa.
 * β₁ = Σ(xᵢ−x̄)(yᵢ−ȳ)/Σ(xᵢ−x̄)²;  t = β₁/EE(β₁);  R² = 1 − SCR/SCT.
 * Se usa para probar si un gasto escala con su driver de actividad: un gasto
 * cuyo β₁ no es significativo es, por definición, gasto no impulsado por
 * actividad ⇒ candidato a estructural/ocioso.
 */
export function linreg(xs, ys) {
  const pairs = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => isNum(x) && isNum(y));
  const n = pairs.length;
  if (n < 3) return { applicable: false, n, reason: 'n<3' };
  const X = pairs.map((p) => p[0]), Y = pairs.map((p) => p[1]);
  const mx = mean(X), my = mean(Y);
  const sxx = sum(X.map((x) => (x - mx) ** 2));
  if (sxx === 0) return { applicable: false, n, reason: 'x sin varianza' };
  const sxy = sum(pairs.map(([x, y]) => (x - mx) * (y - my)));
  const b1 = sxy / sxx, b0 = my - b1 * mx;
  const fit = X.map((x) => b0 + b1 * x);
  const resid = Y.map((y, i) => y - fit[i]);
  const sse = sum(resid.map((r) => r * r));
  const sst = sum(Y.map((y) => (y - my) ** 2));
  const r2 = sst === 0 ? 0 : 1 - sse / sst;
  const df = n - 2;
  const se = Math.sqrt(sse / df);
  const seB1 = se / Math.sqrt(sxx);
  const t = seB1 === 0 ? NaN : b1 / seB1;
  const p = isNum(t) ? tTwoSidedP(t, df) : NaN;
  return {
    applicable: true, n, intercept: b0, slope: b1, r2,
    adjR2: 1 - (1 - r2) * ((n - 1) / df),
    seResid: se, seSlope: seB1, t, df, p,
    significant: isNum(p) && p < 0.05,
    residuals: resid, fitted: fit,
    predict: (x) => b0 + b1 * x,
  };
}

/** Correlación de Pearson con su p-valor. */
export function pearson(xs, ys) {
  const r = linreg(xs, ys);
  if (!r.applicable) return { applicable: false, reason: r.reason };
  const sign = Math.sign(r.slope);
  return { applicable: true, r: sign * Math.sqrt(Math.max(0, r.r2)), p: r.p, n: r.n };
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. CONTROL ESTADÍSTICO DE PROCESOS (SPC)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Carta de individuos I-MR. σ̂ = MR̄/d₂ con d₂ = 1.128 para n=2.
 * Estimar σ por rango móvil (y no por s global) es obligatorio: si el proceso
 * está fuera de control, s global absorbe la señal y oculta el problema.
 * Ref: Montgomery (2020), "Introduction to Statistical Quality Control", 8ª ed.
 */
export function individualsChart(series) {
  const x = clean(series), n = x.length;
  if (n < 10) return { applicable: false, n, reason: 'n<10: límites inestables' };
  const mr = [];
  for (let i = 1; i < n; i++) mr.push(Math.abs(x[i] - x[i - 1]));
  const mrBar = mean(mr);
  const sigma = mrBar / 1.128;
  const cl = mean(x);
  const ucl = cl + 3 * sigma, lcl = cl - 3 * sigma;
  const zs = x.map((v) => (sigma ? (v - cl) / sigma : 0));

  // Reglas Western Electric (Nelson 1-4), las de mayor potencia práctica.
  const violations = [];
  zs.forEach((z, i) => {
    if (Math.abs(z) > 3) violations.push({ i, rule: 1, desc: 'punto fuera de ±3σ', z, value: x[i] });
  });
  for (let i = 2; i < n; i++) {
    const w = zs.slice(i - 2, i + 1);
    ['+', '-'].forEach((s) => {
      const c = w.filter((z) => (s === '+' ? z > 2 : z < -2)).length;
      if (c >= 2) violations.push({ i, rule: 2, desc: '2 de 3 puntos más allá de 2σ del mismo lado', z: zs[i], value: x[i] });
    });
  }
  for (let i = 4; i < n; i++) {
    const w = zs.slice(i - 4, i + 1);
    ['+', '-'].forEach((s) => {
      const c = w.filter((z) => (s === '+' ? z > 1 : z < -1)).length;
      if (c >= 4) violations.push({ i, rule: 3, desc: '4 de 5 puntos más allá de 1σ del mismo lado', z: zs[i], value: x[i] });
    });
  }
  for (let i = 7; i < n; i++) {
    const w = zs.slice(i - 7, i + 1);
    if (w.every((z) => z > 0) || w.every((z) => z < 0))
      violations.push({ i, rule: 4, desc: '8 puntos consecutivos del mismo lado de la línea central', z: zs[i], value: x[i] });
  }
  // Dedup por índice conservando la regla más fuerte (menor número).
  const byIdx = new Map();
  violations.forEach((v) => {
    const prev = byIdx.get(v.i);
    if (!prev || v.rule < prev.rule) byIdx.set(v.i, v);
  });
  const uniq = [...byIdx.values()].sort((a, b) => a.i - b.i);
  return {
    applicable: true, n, cl, ucl, lcl, sigma, mrBar,
    zs, violations: uniq,
    inControl: uniq.length === 0,
    outOfControlRate: uniq.length / n,
  };
}

/** Capacidad de proceso. Cp mide potencial; Cpk, desempeño real centrado. */
export function capability(series, lsl, usl) {
  const x = clean(series);
  const s = stdev(x), m = mean(x);
  if (!isNum(s) || s === 0) return { applicable: false, reason: 'σ nula o muestra insuficiente' };
  const hasL = isNum(lsl), hasU = isNum(usl);
  if (!hasL && !hasU) return { applicable: false, reason: 'sin límites de especificación' };
  const cpu = hasU ? (usl - m) / (3 * s) : Infinity;
  const cpl = hasL ? (m - lsl) / (3 * s) : Infinity;
  const cpk = Math.min(cpu, cpl);
  const cp = hasL && hasU ? (usl - lsl) / (6 * s) : NaN;
  // Fracción fuera de especificación bajo normalidad, SEPARADA POR COLA.
  // La distinción importa económicamente: en una característica de tipo
  // "menor es mejor" (tiempo de ciclo, costo, defectos), quedar por debajo del
  // límite inferior no genera costo alguno — es mejor desempeño. Sumar ambas
  // colas en un solo ppm sobrestima el impacto económico de forma sistemática.
  const pOutUpper = hasU ? 1 - normalCDF((usl - m) / s) : 0;
  const pOutLower = hasL ? normalCDF((lsl - m) / s) : 0;
  const pOut = pOutUpper + pOutLower;
  return {
    applicable: true, mean: m, sigma: s, cp, cpk, cpu, cpl,
    ppmDefective: pOut * 1e6,
    ppmSobreLimiteSuperior: pOutUpper * 1e6,
    ppmBajoLimiteInferior: pOutLower * 1e6,
    // Convención industrial: Cpk ≥ 1.33 (4σ) es el mínimo aceptable.
    veredicto: cpk >= 1.67 ? 'excelente' : cpk >= 1.33 ? 'capaz'
             : cpk >= 1.0 ? 'marginal' : 'incapaz',
  };
}

/**
 * Nivel sigma a partir de DPMO, con el corrimiento convencional de 1.5σ.
 * DPMO = (defectos / (unidades × oportunidades)) × 10⁶
 * Nivel σ = Φ⁻¹(1 − DPMO/10⁶) + 1.5
 */
export function sigmaLevel(defects, units, opportunities = 1) {
  if (!units || !opportunities) return { applicable: false, reason: 'denominador nulo' };
  const dpmo = (defects / (units * opportunities)) * 1e6;
  const yieldRate = 1 - dpmo / 1e6;
  const z = yieldRate >= 1 ? 6 : yieldRate <= 0 ? 0 : normalInv(yieldRate);
  return {
    applicable: true, dpmo, yield: yieldRate,
    sigma: clamp(z + 1.5, 0, 6),
    // Referencia: 3σ ≈ 66,807 DPMO; 4σ ≈ 6,210; 5σ ≈ 233; 6σ ≈ 3.4.
    clase: dpmo <= 3.4 ? 'clase mundial (6σ)' : dpmo <= 233 ? 'superior (5σ)'
         : dpmo <= 6210 ? 'aceptable (4σ)' : dpmo <= 66807 ? 'promedio industrial (3σ)'
         : 'deficiente (<3σ)',
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. TEORÍA DE COLAS Y DE RESTRICCIONES
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * M/M/1: ρ = λ/μ; L = ρ/(1−ρ); W = 1/(μ−λ); Lq = ρ²/(1−ρ).
 * El comportamiento hiperbólico explica por qué una etapa al 90% de utilización
 * tiene 9× la fila de una al 50%: el cuello de botella no es lineal.
 */
export function mm1(lambda, mu) {
  if (!(mu > 0) || !(lambda >= 0)) return { applicable: false, reason: 'parámetros inválidos' };
  const rho = lambda / mu;
  if (rho >= 1) {
    return { applicable: true, rho, estable: false, L: Infinity, W: Infinity, Lq: Infinity, Wq: Infinity,
      nota: 'ρ≥1: la demanda supera la capacidad; la cola crece sin límite' };
  }
  const L = rho / (1 - rho);
  return {
    applicable: true, rho, estable: true,
    L, Lq: (rho * rho) / (1 - rho),
    W: 1 / (mu - lambda), Wq: rho / (mu - lambda),
  };
}

/**
 * M/M/c con fórmula de Erlang C — dimensionamiento de equipos de atención,
 * cobranza o soporte. a = λ/μ (erlangs), ρ = a/c.
 * C(c,a) = [aᶜ/(c!(1−ρ))] / [Σₖ₌₀ᶜ⁻¹ aᵏ/k! + aᶜ/(c!(1−ρ))]
 */
export function erlangC(lambda, mu, c) {
  if (!(mu > 0) || !(c >= 1)) return { applicable: false, reason: 'parámetros inválidos' };
  const a = lambda / mu, rho = a / c;
  if (rho >= 1) return { applicable: true, a, rho, estable: false, pWait: 1, Wq: Infinity };
  let s = 0;
  for (let k = 0; k < c; k++) s += Math.pow(a, k) / Math.exp(logGamma(k + 1));
  const last = (Math.pow(a, c) / Math.exp(logGamma(c + 1))) / (1 - rho);
  const pWait = last / (s + last);
  const Wq = pWait / (c * mu - lambda);
  return {
    applicable: true, a, rho, c, estable: true, pWait,
    Wq, W: Wq + 1 / mu, Lq: lambda * Wq, L: lambda * (Wq + 1 / mu),
    // Nivel de servicio: P(espera ≤ t)
    serviceLevel: (t) => 1 - pWait * Math.exp(-(c * mu - lambda) * t),
  };
}

/** Servidores mínimos para cumplir un objetivo de nivel de servicio. */
export function erlangStaffing(lambda, mu, targetSL, targetSec) {
  const cMin = Math.max(1, Math.ceil(lambda / mu));
  for (let c = cMin; c <= cMin + 200; c++) {
    const r = erlangC(lambda, mu, c);
    if (r.estable && r.serviceLevel(targetSec) >= targetSL) {
      return { c, ...r, slAlcanzado: r.serviceLevel(targetSec) };
    }
  }
  return { applicable: false, reason: 'objetivo inalcanzable en rango razonable' };
}

/** Ley de Little: L = λ·W. Cualquier desviación indica medición inconsistente. */
export const little = (lambda, W) => lambda * W;

/* ═══════════════════════════════════════════════════════════════════════════
   8. FINANZAS CUANTITATIVAS
   ═══════════════════════════════════════════════════════════════════════════ */

/** VPN = Σ FCₜ/(1+r)ᵗ, con FC[0] en t=0. */
export const npv = (rate, flows) =>
  flows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);

/**
 * TIR por Newton-Raphson con respaldo de bisección.
 * Se devuelve null si no hay cambio de signo (TIR indefinida) para no
 * reportar un número sin significado económico.
 */
export function irr(flows, guess = 0.1) {
  const hasPos = flows.some((f) => f > 0), hasNeg = flows.some((f) => f < 0);
  if (!hasPos || !hasNeg) return null;
  let r = guess;
  for (let i = 0; i < 100; i++) {
    let f = 0, df = 0;
    flows.forEach((cf, t) => {
      f += cf / Math.pow(1 + r, t);
      if (t > 0) df -= (t * cf) / Math.pow(1 + r, t + 1);
    });
    if (Math.abs(f) < 1e-9) return r;
    if (df === 0) break;
    const next = r - f / df;
    if (!isNum(next) || next <= -0.999) break;
    r = next;
  }
  let lo = -0.9, hi = 10;
  if (npv(lo, flows) * npv(hi, flows) > 0) return null;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    if (npv(lo, flows) * npv(mid, flows) <= 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

/** Periodo de recuperación descontado, en periodos (interpolado). */
export function paybackPeriod(flows, rate = 0) {
  let acc = 0;
  for (let t = 0; t < flows.length; t++) {
    const d = flows[t] / Math.pow(1 + rate, t);
    const prev = acc;
    acc += d;
    if (prev < 0 && acc >= 0 && d !== 0) return t - 1 + (-prev / d);
  }
  return null;
}

/** Tasa compuesta anual de crecimiento. */
export function cagr(vIni, vFin, años) {
  if (!(vIni > 0) || !(años > 0) || !isNum(vFin)) return NaN;
  return Math.pow(vFin / vIni, 1 / años) - 1;
}

/**
 * Altman Z''-score para empresas privadas no manufactureras / mercados
 * emergentes (el modelo aplicable a la mayoría de PyMEs de servicios):
 *   Z'' = 6.56·X₁ + 3.26·X₂ + 6.72·X₃ + 1.05·X₄
 *   X₁ = capital de trabajo/activo total
 *   X₂ = utilidades retenidas/activo total
 *   X₃ = UAFIR (EBIT)/activo total
 *   X₄ = valor en libros del capital/pasivo total
 * Zonas: Z''>2.60 segura; 1.10–2.60 gris; <1.10 de insolvencia.
 * Ref: Altman (1968) JoF 23(4); Altman, Hartzell & Peck (1995), modelo de
 * mercados emergentes. Precisión reportada ~80-90% a 1 año.
 */
export function altmanZ2(x) {
  const { capitalTrabajo, activoTotal, utilidadesRetenidas, ebit, capitalContable, pasivoTotal } = x;
  if (!(activoTotal > 0) || !(pasivoTotal > 0))
    return { applicable: false, reason: 'activo o pasivo total no válido' };
  const X1 = capitalTrabajo / activoTotal;
  const X2 = utilidadesRetenidas / activoTotal;
  const X3 = ebit / activoTotal;
  const X4 = capitalContable / pasivoTotal;
  const Z = 6.56 * X1 + 3.26 * X2 + 6.72 * X3 + 1.05 * X4;
  return {
    applicable: true, Z, X1, X2, X3, X4,
    zona: Z > 2.6 ? 'segura' : Z >= 1.1 ? 'gris' : 'insolvencia',
    modelo: "Altman Z''-score (privadas / mercados emergentes)",
  };
}

/**
 * M-score de Beneish (8 variables) — probabilidad de manipulación contable.
 * Umbral −1.78: por encima, la empresa se clasifica como probable manipuladora.
 * Ref: Beneish (1999), Financial Analysts Journal 55(5). Sensibilidad ~76%
 * en la muestra original; es un tamiz, no una acusación.
 */
export function beneishM(v) {
  const req = ['dsri', 'gmi', 'aqi', 'sgi', 'depi', 'sgai', 'tata', 'lvgi'];
  if (req.some((k) => !isNum(v[k]))) return { applicable: false, reason: 'faltan índices' };
  const M = -4.84 + 0.92 * v.dsri + 0.528 * v.gmi + 0.404 * v.aqi + 0.892 * v.sgi
          + 0.115 * v.depi - 0.172 * v.sgai + 4.679 * v.tata - 0.327 * v.lvgi;
  return {
    applicable: true, M,
    señal: M > -1.78 ? 'indicios de manipulación: requiere auditoría forense' : 'sin indicios',
    umbral: -1.78,
  };
}

/** Ciclo de conversión de efectivo: CCC = DSO + DIO − DPO (días). */
export function cashCycle({ cxc, ingresos, inventario, costoVentas, cxp, dias = 365 }) {
  const dso = ingresos > 0 ? (cxc / ingresos) * dias : NaN;
  const dio = costoVentas > 0 ? (inventario / costoVentas) * dias : 0;
  const dpo = costoVentas > 0 ? (cxp / costoVentas) * dias : NaN;
  const ccc = dso + dio - dpo;
  return { dso, dio, dpo, ccc, capitalAtrapado: ingresos > 0 ? (ccc / dias) * ingresos : NaN };
}

/** Cantidad económica de pedido: EOQ = √(2DS/H). Wilson (1934). */
export const eoq = (D, S, H) => (H > 0 ? Math.sqrt((2 * D * S) / H) : NaN);

/* ═══════════════════════════════════════════════════════════════════════════
   9. SIMULACIÓN Y REMUESTREO
   ═══════════════════════════════════════════════════════════════════════════ */

/** PRNG mulberry32: reproducible ⇒ todo informe es re-auditable bit a bit. */
export function rng(seed = 20260921) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Normal por Box-Muller a partir de un uniforme dado. */
export function randNormal(r, mu = 0, sigma = 1) {
  const u1 = Math.max(r(), 1e-12), u2 = r();
  return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Triangular(min, moda, max) — la distribución honesta cuando solo hay juicio experto. */
export function randTriangular(r, min, mode, max) {
  const u = r(), c = (mode - min) / (max - min);
  return u < c
    ? min + Math.sqrt(u * (max - min) * (mode - min))
    : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}

/**
 * PERT-Beta: μ = (a + 4m + b)/6, σ = (b − a)/6.
 * Preferida sobre la triangular para estimaciones de impacto porque pondera
 * el modo 4:1 y produce colas menos pesadas. Ref: Malcolm et al. (1959).
 */
export function pert(a, m, b) {
  return { mu: (a + 4 * m + b) / 6, sigma: (b - a) / 6, min: a, mode: m, max: b };
}

/**
 * Monte Carlo sobre variables PERT independientes.
 * Devuelve media, percentiles P5/P50/P95 y probabilidad de superar un umbral.
 * Se usa para cuantificar el impacto económico de cada hallazgo con un
 * intervalo, nunca con un número puntual falsamente preciso.
 */
export function monteCarlo(vars, iterations = 10000, seed = 20260921, agg = sum) {
  const r = rng(seed);
  const out = new Array(iterations);
  for (let i = 0; i < iterations; i++) {
    const draw = vars.map((v) => {
      const p = pert(v.min, v.mode, v.max);
      const x = randNormal(r, p.mu, p.sigma);
      return clamp(x, v.min, v.max);
    });
    out[i] = agg(draw);
  }
  out.sort((a, b) => a - b);
  return {
    iterations, seed,
    mean: mean(out), sd: stdev(out),
    p5: quantile(out, 0.05), p25: quantile(out, 0.25), p50: quantile(out, 0.5),
    p75: quantile(out, 0.75), p95: quantile(out, 0.95),
    min: out[0], max: out[out.length - 1],
    pAbove: (t) => out.filter((x) => x > t).length / iterations,
  };
}

/** IC por bootstrap percentil (B remuestreos). No asume normalidad. */
export function bootstrapCI(arr, stat = mean, B = 2000, alpha = 0.05, seed = 20260921) {
  const a = clean(arr), n = a.length;
  if (n < 5) return { applicable: false, n, reason: 'n<5' };
  const r = rng(seed);
  const stats = new Array(B);
  for (let b = 0; b < B; b++) {
    const s = new Array(n);
    for (let i = 0; i < n; i++) s[i] = a[Math.floor(r() * n)];
    stats[b] = stat(s);
  }
  return {
    applicable: true, n, B,
    estimate: stat(a),
    lo: quantile(stats, alpha / 2),
    hi: quantile(stats, 1 - alpha / 2),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. CLASIFICACIÓN Y CONCENTRACIÓN
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Clasificación ABC de Pareto sobre el acumulado:
 * A ≤ 80% del valor, B ≤ 95%, C el resto. Base del principio de foco:
 * la clase A suele ser <20% de las partidas y concentra el 80% del impacto.
 */
export function paretoABC(items, valueKey = 'valor') {
  const arr = items
    .map((it) => ({ ...it, __v: Math.abs(Number(it[valueKey]) || 0) }))
    .sort((a, b) => b.__v - a.__v);
  const total = sum(arr.map((x) => x.__v));
  let acc = 0;
  return arr.map((it, i) => {
    acc += it.__v;
    const cum = total ? acc / total : 0;
    const { __v, ...rest } = it;
    return {
      ...rest,
      valor: __v,
      participacion: total ? __v / total : 0,
      acumulado: cum,
      clase: cum <= 0.8 ? 'A' : cum <= 0.95 ? 'B' : 'C',
      rango: i + 1,
    };
  });
}

/** Entropía de Shannon normalizada [0,1]: diversificación de una cartera. */
export function shannonEvenness(values) {
  const a = clean(values).filter((x) => x > 0);
  const t = sum(a);
  if (a.length < 2 || !t) return 0;
  const H = -sum(a.map((x) => (x / t) * Math.log(x / t)));
  return H / Math.log(a.length);
}
