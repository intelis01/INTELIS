/**
 * INTELIS · Base de Evidencia Externa
 * ─────────────────────────────────────────────────────────────────────────────
 * Ningún umbral del motor es arbitrario. Cada constante aquí declara:
 *   valor · unidad · fuente · año · muestra · confianza · nota metodológica
 *
 * REGLA DE INTEGRIDAD: si un umbral no tiene fuente verificable se marca
 * confianza:'convencion' (heurística de práctica profesional, no dato empírico)
 * y el informe lo etiqueta como tal. El motor NUNCA presenta una convención
 * como si fuera un hallazgo estadístico.
 *
 * REGLA DE VIGENCIA: `revisarAntesDe` marca la fecha a partir de la cual la
 * cifra debe re-verificarse contra la fuente primaria. El motor emite una
 * advertencia en el informe cuando una fuente está vencida.
 */

export const CONFIANZA = {
  ALTA: 'alta',        // estudio con muestra grande, metodología publicada, revisión externa
  MEDIA: 'media',      // encuesta sectorial o reporte de industria con metodología abierta
  CONVENCION: 'convencion', // práctica profesional estandarizada sin estudio de respaldo único
};

/* ═══════════════════════════════════════════════════════════════════════════
   A. COSTO DE LA DISFUNCIÓN ORGANIZACIONAL  (magnitudes de referencia)
   ═══════════════════════════════════════════════════════════════════════════ */

export const COSTO_DISFUNCION = {
  fraudeOcupacional: {
    valor: 0.05, unidad: 'fracción de ingresos anuales',
    descripcion: 'Pérdida anual típica por fraude ocupacional como % de ingresos.',
    fuente: 'ACFE, "Occupational Fraud 2024: A Report to the Nations"',
    año: 2024, muestra: '1,921 casos en 138 países', confianza: CONFIANZA.ALTA,
    nota: 'Estimación de expertos CFE, no medición censal. Pérdida mediana por caso: USD 145,000; duración mediana 12 meses; 43% se detecta por denuncia (tip).',
    revisarAntesDe: '2027-01-01',
  },
  desercionLaboralCosto: {
    valor: [0.5, 2.0], unidad: 'múltiplo del salario anual del puesto',
    descripcion: 'Costo total de reemplazar a un colaborador (reclutamiento, curva de aprendizaje, productividad perdida).',
    fuente: 'SHRM / Work Institute — rango consolidado de literatura de capital humano',
    año: 2023, muestra: 'meta-revisión', confianza: CONFIANZA.MEDIA,
    nota: 'El extremo alto aplica a puestos especializados o de alta dirección.',
    revisarAntesDe: '2027-01-01',
  },
  desconexionLaboral: {
    valor: 0.09, unidad: 'fracción del PIB global',
    descripcion: 'Costo de la baja conexión laboral (low engagement) para la economía mundial: USD 8.9 billones.',
    fuente: 'Gallup, "State of the Global Workplace 2024"',
    año: 2024, muestra: '>128,000 trabajadores, 160 países', confianza: CONFIANZA.ALTA,
    revisarAntesDe: '2026-12-31',
  },
  lastreOrganizacional: {
    valor: 0.20, unidad: 'fracción de la capacidad productiva',
    descripcion: 'Capacidad productiva perdida por "organizational drag": juntas, aprobaciones y burocracia interna.',
    fuente: 'Mankins & Garton (Bain & Company), Harvard Business Review',
    año: 2017, muestra: 'base de datos de productividad organizacional de Bain', confianza: CONFIANZA.MEDIA,
    revisarAntesDe: '2027-01-01',
  },
  calidadDeDatos: {
    valor: 12900000, unidad: 'USD/año por organización',
    descripcion: 'Costo promedio anual atribuido a mala calidad de datos.',
    fuente: 'Gartner, "Data Quality Market Survey"',
    año: 2021, muestra: 'encuesta a organizaciones grandes', confianza: CONFIANZA.MEDIA,
    nota: 'Promedio sesgado hacia corporativos; escalar proporcionalmente para PyME.',
    revisarAntesDe: '2026-12-31',
  },
  desperdicioEnProyectos: {
    valor: 0.099, unidad: 'fracción de cada peso invertido en proyectos',
    descripcion: 'Proporción de la inversión en proyectos que se desperdicia por bajo desempeño en la gestión.',
    fuente: 'PMI, "Pulse of the Profession"',
    año: 2018, muestra: '>4,400 profesionales de proyectos', confianza: CONFIANZA.MEDIA,
    revisarAntesDe: '2026-12-31',
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   B. SALUD OCUPACIONAL  (sustento médico de los hallazgos de carga laboral)
   ═══════════════════════════════════════════════════════════════════════════ */

export const SALUD_OCUPACIONAL = {
  jornadaLargaRiesgo: {
    umbralHoras: 55, unidad: 'horas/semana',
    riesgoACV: 1.35, riesgoCardiopatia: 1.17,
    descripcion: 'Trabajar ≥55 h/semana se asocia a 35% más riesgo de accidente cerebrovascular y 17% más riesgo de muerte por cardiopatía isquémica, frente a jornadas de 35–40 h.',
    fuente: 'Pega et al., "Global, regional and national burdens of ischemic heart disease and stroke attributable to exposure to long working hours", Environment International 154:106595 — estimaciones conjuntas OMS/OIT',
    año: 2021, muestra: '2,324 registros; 745,000 muertes atribuibles en 2016', confianza: CONFIANZA.ALTA,
    implicacion: 'Un hallazgo de sobrecarga por FTE insuficiente no es solo un problema de productividad: es un riesgo de salud con exposición legal para el patrón.',
    revisarAntesDe: '2027-01-01',
  },
  saludMentalProductividad: {
    valor: 1e12, unidad: 'USD/año globales en productividad perdida',
    descripcion: 'La depresión y la ansiedad cuestan a la economía mundial alrededor de 1 billón (10¹²) de USD anuales en productividad perdida.',
    fuente: 'Organización Mundial de la Salud, hoja informativa "Mental health at work"',
    año: 2024, confianza: CONFIANZA.ALTA,
    revisarAntesDe: '2026-12-31',
  },
  burnout: {
    codigo: 'QD85', clasificacion: 'CIE-11 (ICD-11)',
    descripcion: 'El "burnout" o desgaste ocupacional está tipificado por la OMS como fenómeno ocupacional —no como condición médica— resultante de estrés laboral crónico no gestionado. Tres dimensiones: agotamiento, distancia mental/cinismo, y reducción de la eficacia profesional.',
    fuente: 'OMS, CIE-11, capítulo 24 (factores que influyen en el estado de salud)',
    año: 2019, confianza: CONFIANZA.ALTA,
    implicacion: 'En México su prevención es obligación patronal vía NOM-035-STPS-2018.',
    revisarAntesDe: '2027-01-01',
  },
  presentismo: {
    valor: [1.8, 3.0], unidad: 'múltiplo del costo del ausentismo',
    descripcion: 'El presentismo (asistir enfermo o desconectado) suele costar entre 1.8 y 3 veces más que el ausentismo medido.',
    fuente: 'Literatura de salud ocupacional (Hemp, HBR "Presenteeism: At Work—But Out of It"; estudios posteriores de carga de enfermedad)',
    año: 2004, confianza: CONFIANZA.MEDIA,
    nota: 'Rango amplio: usar solo como orden de magnitud, no para cálculo puntual.',
    revisarAntesDe: '2026-12-31',
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   C. ECONOMÍA UNITARIA COMERCIAL
   ═══════════════════════════════════════════════════════════════════════════ */

export const COMERCIAL = {
  ltvCac: {
    minimoViable: 3.0, saludable: [3, 5], sobreinvertido: 5.0,
    unidad: 'razón LTV/CAC',
    descripcion: 'Razón entre valor de vida del cliente y costo de adquisición. <3 destruye valor; >5 sugiere sub-inversión en crecimiento (se está dejando mercado en la mesa).',
    fuente: 'Skok (For Entrepreneurs), "SaaS Metrics 2.0"; Bessemer Venture Partners, "State of the Cloud"',
    año: 2024, confianza: CONFIANZA.CONVENCION,
    nota: 'Convención de inversión validada por práctica, no por estudio controlado. Debe recalibrarse por sector: negocios de capital intensivo toleran razones menores.',
    revisarAntesDe: '2027-01-01',
  },
  cacPayback: {
    pymeMeses: 12, empresarialMeses: 18, criticoMeses: 24,
    unidad: 'meses',
    descripcion: 'Meses de margen bruto necesarios para recuperar el CAC. Por encima de 24 meses, el crecimiento consume caja más rápido de lo que la genera.',
    fuente: 'Bessemer Venture Partners; benchmarks OpenView SaaS',
    año: 2024, confianza: CONFIANZA.CONVENCION,
    revisarAntesDe: '2027-01-01',
  },
  reglaDel40: {
    umbral: 0.40, unidad: 'crecimiento % + margen EBITDA %',
    descripcion: 'La suma de la tasa de crecimiento y el margen operativo debe superar 40 puntos.',
    fuente: 'Feld (2015), popularizada por Bessemer y Brad Feld',
    año: 2015, confianza: CONFIANZA.CONVENCION,
    revisarAntesDe: '2027-01-01',
  },
  magicNumber: {
    umbral: 0.75,
    descripcion: 'ΔIngreso recurrente anualizado del trimestre ÷ gasto comercial del trimestre previo. <0.75 indica que el motor comercial no paga su propio costo.',
    fuente: 'Scale Venture Partners, "SaaS Magic Number"',
    año: 2011, confianza: CONFIANZA.CONVENCION,
    revisarAntesDe: '2027-01-01',
  },
  retencionValor: {
    incrementoRetencion: 0.05, rangoIncrementoUtilidad: [0.25, 0.95],
    descripcion: 'Un aumento de 5 puntos en la retención de clientes se asocia a incrementos de utilidad de entre 25% y 95%.',
    fuente: 'Reichheld & Sasser, "Zero Defections: Quality Comes to Services", Harvard Business Review 68(5)',
    año: 1990, muestra: 'análisis de cohortes en servicios', confianza: CONFIANZA.MEDIA,
    nota: 'Hallazgo seminal, replicado con amplitud; el rango es amplio porque depende del margen de contribución del sector.',
    revisarAntesDe: '2027-01-01',
  },
  concentracionClientes: {
    umbralRiesgo: 0.25, unidad: 'HHI sobre ingresos por cliente',
    umbralClienteUnico: 0.20, unidad2: 'fracción de ingreso en un solo cliente',
    descripcion: 'Concentración de cartera. Un solo cliente >20% del ingreso constituye riesgo material de continuidad; el HHI >0.25 replica el umbral de alta concentración de las Merger Guidelines DOJ/FTC.',
    fuente: 'U.S. DOJ/FTC, "Merger Guidelines" (umbral HHI); práctica de revelación de riesgos en reportes financieros',
    año: 2023, confianza: CONFIANZA.CONVENCION,
    revisarAntesDe: '2027-01-01',
  },
  elasticidadPrecio: {
    descripcion: 'Elasticidad precio de la demanda ε = (%Δ cantidad)/(%Δ precio). |ε|<1 demanda inelástica: subir precio aumenta ingreso. |ε|>1 elástica: subir precio destruye ingreso.',
    fuente: 'Teoría microeconómica estándar (Marshall); estimación empírica requiere variación de precio observada',
    confianza: CONFIANZA.ALTA,
    nota: 'El motor solo estima ε si existen ≥3 puntos de precio distintos con volúmenes observados. Sin esa variación, NO reporta elasticidad.',
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   D. DISEÑO ORGANIZACIONAL
   ═══════════════════════════════════════════════════════════════════════════ */

export const ESTRUCTURA = {
  tramoControl: {
    conocimiento: [5, 9], estandarizado: [10, 15], supervisionDirecta: [15, 25],
    unidad: 'reportes directos',
    descripcion: 'Tramo de control recomendado según interdependencia de la tarea. Tramos <3 generan capas parasitarias; tramos >15 en trabajo de conocimiento degradan la supervisión.',
    fuente: 'Urwick (1956), "The Manager\'s Span of Control", HBR; práctica contemporánea de diseño organizacional',
    año: 1956, confianza: CONFIANZA.CONVENCION,
    nota: 'La evidencia moderna favorece tramos amplios con trabajo estandarizado y tramos estrechos con trabajo novedoso e interdependiente.',
    revisarAntesDe: '2027-01-01',
  },
  costoCoordinacion: {
    formula: 'enlaces = n(n−1)/2',
    descripcion: 'Los canales de comunicación crecen cuadráticamente con el tamaño del equipo: 5 personas → 10 enlaces; 10 personas → 45; 20 → 190. Añadir gente a un equipo atrasado lo atrasa más.',
    fuente: 'Brooks (1975), "The Mythical Man-Month", Addison-Wesley',
    año: 1975, confianza: CONFIANZA.ALTA,
  },
  profundidadJerarquica: {
    formula: 'capas ≈ log_s(N), s = tramo promedio',
    descripcion: 'Número teórico de capas para N personas con tramo s. Capas observadas muy por encima de la teórica indican jerarquía inflada.',
    fuente: 'Derivación directa del modelo de árbol de reporte',
    confianza: CONFIANZA.ALTA,
  },
  ratioAdministrativo: {
    umbralAlerta: 0.25, unidad: 'fracción de plantilla en roles de soporte/administración',
    descripcion: 'Proporción de personal no dedicado a la creación directa de valor. Varía fuertemente por sector: el motor exige comparación contra pares del mismo sector antes de emitir un hallazgo.',
    fuente: 'Benchmarks de funciones de soporte (The Hackett Group, APQC Open Standards)',
    año: 2024, confianza: CONFIANZA.CONVENCION,
    nota: 'Umbral genérico: SUSTITUIR por el benchmark sectorial del cliente antes de tomar decisiones de plantilla.',
    revisarAntesDe: '2026-12-31',
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   E. CALIDAD Y PROCESOS
   ═══════════════════════════════════════════════════════════════════════════ */

export const CALIDAD = {
  nivelesSigma: {
    tabla: [
      { sigma: 2, dpmo: 308537, rendimiento: 0.691462 },
      { sigma: 3, dpmo: 66807,  rendimiento: 0.933193 },
      { sigma: 4, dpmo: 6210,   rendimiento: 0.993790 },
      { sigma: 5, dpmo: 233,    rendimiento: 0.999767 },
      { sigma: 6, dpmo: 3.4,    rendimiento: 0.9999966 },
    ],
    descripcion: 'Defectos por millón de oportunidades por nivel sigma, con el corrimiento convencional de 1.5σ a largo plazo.',
    fuente: 'Harry & Schroeder (2000), "Six Sigma"; convención Motorola del corrimiento 1.5σ',
    confianza: CONFIANZA.ALTA,
  },
  capacidadMinima: {
    cpkMinimo: 1.33, cpkExcelente: 1.67,
    descripcion: 'Cpk ≥ 1.33 (4σ) es el mínimo aceptable en la práctica industrial; ≥1.67 para características críticas de seguridad.',
    fuente: 'AIAG, "Statistical Process Control (SPC) Reference Manual", 2ª ed.',
    año: 2005, confianza: CONFIANZA.CONVENCION,
  },
  costoCalidad: {
    regla: [1, 10, 100],
    descripcion: 'Regla 1-10-100: corregir un defecto en origen cuesta 1; detectado internamente, 10; detectado por el cliente, 100.',
    fuente: 'Literatura de costos de la calidad (derivada de Juran y de la práctica TQM)',
    confianza: CONFIANZA.CONVENCION,
    nota: 'Regla mnemotécnica de orden de magnitud, no constante medida. El motor la usa solo para jerarquizar, nunca para cifrar un impacto.',
  },
  utilizacionCritica: {
    umbral: 0.80,
    descripcion: 'Por encima de 80% de utilización, el tiempo de espera en un sistema M/M/1 crece de forma hiperbólica: ρ=0.8 → Lq=3.2; ρ=0.9 → Lq=8.1; ρ=0.95 → Lq=18.05. Planear al 100% de capacidad garantiza colas infinitas ante cualquier variabilidad.',
    fuente: 'Kingman (1961); teoría de colas estándar',
    confianza: CONFIANZA.ALTA,
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   F. SOLVENCIA Y FORENSE FINANCIERO
   ═══════════════════════════════════════════════════════════════════════════ */

export const FINANCIERO = {
  altman: {
    modelo: "Z''-score (empresas privadas no manufactureras / mercados emergentes)",
    zonaSegura: 2.6, zonaInsolvencia: 1.1,
    descripcion: 'Z\'\' = 6.56·X₁ + 3.26·X₂ + 6.72·X₃ + 1.05·X₄. Precisión reportada de 80–90% para predecir quiebra a un año en la muestra original.',
    fuente: 'Altman (1968), Journal of Finance 23(4); Altman, Hartzell & Peck (1995), modelo de mercados emergentes',
    año: 1995, confianza: CONFIANZA.ALTA,
    nota: 'Modelo calibrado sobre muestras históricas específicas. Es un tamiz de riesgo, no un pronóstico determinista.',
  },
  beneish: {
    umbral: -1.78,
    descripcion: 'M-score > −1.78 clasifica a la empresa como probable manipuladora de resultados. Sensibilidad ~76% en la muestra original.',
    fuente: 'Beneish (1999), Financial Analysts Journal 55(5)',
    año: 1999, confianza: CONFIANZA.ALTA,
    nota: 'Genera falsos positivos en empresas de crecimiento acelerado. Detona una revisión, jamás una acusación.',
  },
  benford: {
    madConformidad: 0.006, madMarginal: 0.012, madNoConforme: 0.015,
    descripcion: 'Desviación absoluta media de Nigrini sobre la distribución del primer dígito. Requisitos de aplicabilidad: n≥50 (preferible ≥300), datos que abarquen ≥2 órdenes de magnitud, sin mínimos/máximos artificiales ni numeración secuencial.',
    fuente: 'Nigrini (2012), "Benford\'s Law: Applications for Forensic Accounting, Auditing and Fraud Detection", Wiley',
    año: 2012, confianza: CONFIANZA.ALTA,
    nota: 'Una no conformidad es indicio de anomalía en el proceso de captura o de umbrales de autorización, NO prueba de fraude.',
  },
  liquidez: {
    razonCorrienteMinima: 1.0, razonCorrienteSana: 1.5,
    pruebaAcidaMinima: 1.0,
    coberturaInteresesMinima: 2.0, coberturaInteresesCritica: 1.5,
    descripcion: 'Umbrales convencionales de análisis de crédito. La cobertura de intereses (EBIT/gastos financieros) por debajo de 1.5 es una alerta usual en convenios de deuda.',
    fuente: 'Práctica estándar de análisis crediticio; metodologías públicas de agencias calificadoras',
    confianza: CONFIANZA.CONVENCION,
  },
  runwayMinimo: {
    mesesCritico: 6, mesesSano: 18,
    descripcion: 'Meses de operación financiables con la caja actual al ritmo de quema neto vigente.',
    fuente: 'Convención de gestión de tesorería y capital de riesgo',
    confianza: CONFIANZA.CONVENCION,
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   G. VALIDACIÓN DE VIGENCIA
   ═══════════════════════════════════════════════════════════════════════════ */

const TODOS = { COSTO_DISFUNCION, SALUD_OCUPACIONAL, COMERCIAL, ESTRUCTURA, CALIDAD, FINANCIERO };

/**
 * Recorre la base y devuelve las fuentes cuya fecha de revisión ya venció.
 * El informe las lista para que ningún usuario tome decisiones sobre una
 * referencia caducada sin saberlo.
 */
export function fuentesVencidas(hoy = new Date()) {
  const out = [];
  Object.entries(TODOS).forEach(([grupo, obj]) => {
    Object.entries(obj).forEach(([clave, v]) => {
      if (v && v.revisarAntesDe && new Date(v.revisarAntesDe) < hoy) {
        out.push({ grupo, clave, fuente: v.fuente, año: v.año, revisarAntesDe: v.revisarAntesDe });
      }
    });
  });
  return out;
}

/** Inventario completo de fuentes, para la sección de bibliografía del informe. */
export function inventarioFuentes() {
  const out = [];
  Object.entries(TODOS).forEach(([grupo, obj]) => {
    Object.entries(obj).forEach(([clave, v]) => {
      if (v && v.fuente) out.push({
        grupo, clave, fuente: v.fuente, año: v.año ?? null,
        muestra: v.muestra ?? null, confianza: v.confianza ?? null, nota: v.nota ?? null,
      });
    });
  });
  return out.sort((a, b) => (b.año ?? 0) - (a.año ?? 0));
}

export default TODOS;
