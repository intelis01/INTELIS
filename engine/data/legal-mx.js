/**
 * INTELIS · Capa de Sustento Jurídico — Jurisdicción: Estados Unidos Mexicanos
 * ─────────────────────────────────────────────────────────────────────────────
 * Propósito: ninguna solución que el motor proponga puede ejecutarse sin conocer
 * su marco normativo, sus obligaciones procedimentales y su exposición
 * contingente. Una recomendación de "recortar personal" sin el artículo aplicable
 * no es una solución: es un pasivo laboral en gestación.
 *
 * ADVERTENCIA VINCULANTE DEL SISTEMA
 * ───────────────────────────────────
 * Este módulo es una GUÍA DE ORIENTACIÓN NORMATIVA generada por software.
 * NO constituye asesoría jurídica ni sustituye la opinión de un profesional
 * del derecho con cédula. La legislación mexicana se reforma con frecuencia;
 * toda cita debe cotejarse contra el texto vigente publicado en el Diario
 * Oficial de la Federación (dof.gob.mx) antes de ejecutar cualquier acción.
 * Cada norma declara `vigenciaAlCorte` y `requiereVerificacion`.
 */

export const CORTE_NORMATIVO = '2026-05';

export const DISCLAIMER = {
  titulo: 'Naturaleza orientativa del sustento jurídico',
  texto:
    'El análisis normativo de este informe es orientativo y automatizado. No constituye ' +
    'asesoría legal. Antes de ejecutar cualquier medida con efectos laborales, fiscales, ' +
    'contractuales o de competencia económica, debe obtenerse opinión escrita de abogado ' +
    'con cédula profesional en la materia, cotejando el texto vigente en el DOF. INTELIS ' +
    'no asume responsabilidad por decisiones tomadas sin dicha validación.',
  obligatorioEnInforme: true,
};

/* ═══════════════════════════════════════════════════════════════════════════
   1. CATÁLOGO NORMATIVO
   ═══════════════════════════════════════════════════════════════════════════ */

export const NORMAS = {

  /* ---------------------------------------------------------------- LABORAL */

  LFT_2: {
    norma: 'Ley Federal del Trabajo', articulo: 'Art. 2',
    materia: 'laboral',
    sintesis: 'Define el trabajo digno o decente: aquel en que se respeta plenamente la dignidad humana, no hay discriminación, se recibe salario remunerador, se accede a seguridad social y se cuenta con condiciones óptimas de seguridad e higiene.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },
  LFT_35: {
    norma: 'Ley Federal del Trabajo', articulo: 'Art. 35',
    materia: 'laboral',
    sintesis: 'Las relaciones de trabajo pueden ser por obra o tiempo determinado, por temporada, por capacitación inicial, o por tiempo indeterminado (con o sin periodo de prueba). A falta de estipulación expresa, la relación es por tiempo indeterminado.',
    implicacion: 'Un puesto detectado como innecesario bajo contrato indeterminado NO puede simplemente no renovarse: exige causa legal de terminación o acuerdo indemnizado.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },
  LFT_47: {
    norma: 'Ley Federal del Trabajo', articulo: 'Art. 47',
    materia: 'laboral',
    sintesis: 'Enumera taxativamente las causas de rescisión de la relación de trabajo SIN responsabilidad para el patrón (engaño en documentos, faltas de probidad, violencia, daños intencionales, más de tres faltas en treinta días sin permiso ni causa justificada, entre otras). El patrón debe dar aviso ESCRITO de la fecha y causa de la rescisión, entregándolo personalmente al trabajador o comunicándolo al Tribunal dentro de los cinco días hábiles siguientes.',
    riesgoIncumplimiento: 'La falta del aviso escrito, por sí sola, presume el despido injustificado.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },
  LFT_48: {
    norma: 'Ley Federal del Trabajo', articulo: 'Art. 48',
    materia: 'laboral',
    sintesis: 'Ante despido injustificado, el trabajador puede optar entre la reinstalación o la indemnización constitucional de tres meses de salario. Los salarios vencidos se computan desde la fecha del despido hasta por un máximo de doce meses; a partir de ese plazo se generan intereses del 2% mensual, capitalizable, sobre el importe de quince meses de salario.',
    implicacion: 'Exposición cuantificable: 3 meses + hasta 12 meses de salarios vencidos + intereses. Este monto debe integrarse a la contingencia de cualquier escenario de reducción de plantilla.',
    vigenciaAlCorte: true, requiereVerificacion: false,
    reformaRelevante: 'DOF 30-XI-2012 (topes a salarios vencidos)',
  },
  LFT_50: {
    norma: 'Ley Federal del Trabajo', articulo: 'Art. 50',
    materia: 'laboral',
    sintesis: 'Fija el monto de las indemnizaciones. Para relaciones por tiempo indeterminado: veinte días de salario por cada uno de los años de servicios prestados, además de la indemnización de tres meses del artículo 48 cuando proceda.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },
  LFT_53: {
    norma: 'Ley Federal del Trabajo', articulo: 'Art. 53',
    materia: 'laboral',
    sintesis: 'Causas de terminación de la relación de trabajo: mutuo consentimiento; muerte del trabajador; terminación de la obra o vencimiento del término; incapacidad física o mental o inhabilidad manifiesta del trabajador que haga imposible la prestación del trabajo; y los casos del artículo 434.',
    implicacion: 'La vía del mutuo consentimiento (convenio) es la única que cierra la contingencia con certeza, y exige ratificación ante el Centro de Conciliación o Tribunal competente.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },
  LFT_76: {
    norma: 'Ley Federal del Trabajo', articulo: 'Art. 76',
    materia: 'laboral',
    sintesis: 'Reforma de "Vacaciones Dignas": los trabajadores con más de un año de servicios gozan de un periodo anual de vacaciones pagadas de doce días laborables el primer año, que aumenta dos días por cada año subsecuente hasta llegar a veinte; a partir del sexto año, aumenta dos días por cada cinco años de servicios.',
    reformaRelevante: 'DOF 27-XII-2022, en vigor 1-I-2023',
    implicacion: 'Recalcula el costo real de un FTE y el pasivo de vacaciones devengadas no gozadas.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },
  LFT_127_VIII: {
    norma: 'Ley Federal del Trabajo', articulo: 'Art. 127, fracc. VIII',
    materia: 'laboral',
    sintesis: 'El monto de la participación de los trabajadores en las utilidades (PTU) tiene como límite tres meses del salario del trabajador o el promedio de la participación recibida en los últimos tres años, aplicándose el monto que resulte más favorable al trabajador.',
    reformaRelevante: 'DOF 23-IV-2021 (reforma en materia de subcontratación)',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },
  LFT_12_15: {
    norma: 'Ley Federal del Trabajo', articulo: 'Arts. 12 a 15',
    materia: 'laboral',
    sintesis: 'Queda prohibida la subcontratación de personal (poner trabajadores propios a disposición de un beneficiario). Se permite la subcontratación de servicios especializados u obras especializadas ajenos al objeto social y a la actividad económica preponderante del contratante, siempre que el contratista esté inscrito en el Registro de Prestadoras de Servicios Especializados u Obras Especializadas (REPSE) de la STPS, mediante contrato escrito.',
    reformaRelevante: 'DOF 23-IV-2021',
    riesgoIncumplimiento: 'La contratación con un prestador sin REPSE impide la deducción del gasto para ISR y el acreditamiento del IVA, y genera responsabilidad solidaria en obligaciones laborales y de seguridad social. Existen además sanciones específicas.',
    implicacion: 'CRÍTICO: cualquier solución de este motor que proponga tercerizar una función debe validar el REPSE del proveedor y que el servicio no sea la actividad preponderante del contratante.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },
  LFT_162: {
    norma: 'Ley Federal del Trabajo', articulo: 'Art. 162',
    materia: 'laboral',
    sintesis: 'Prima de antigüedad: importe de doce días de salario por cada año de servicios. Para su cálculo, el salario se topa al doble del salario mínimo del área. Se paga a quienes se separen voluntariamente con quince años o más de servicios, y en todo caso de separación (justificada o no) y de muerte.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },
  LFT_330: {
    norma: 'Ley Federal del Trabajo', articulo: 'Arts. 330-A a 330-K (Capítulo XII Bis)',
    materia: 'laboral',
    sintesis: 'Regula el teletrabajo (más del 40% del tiempo en domicilio o lugar distinto al centro de trabajo). Obliga al patrón a proporcionar y dar mantenimiento a equipos, asumir el pago proporcional de servicios de telecomunicación y la parte proporcional de electricidad, e implementar mecanismos de seguridad y salud. Reconoce el derecho a la desconexión.',
    normaComplementaria: 'NOM-037-STPS-2023, Teletrabajo-Condiciones de seguridad y salud en el trabajo (DOF 8-VI-2023)',
    reformaRelevante: 'DOF 11-I-2021',
    implicacion: 'Una solución de "cerrar oficina y migrar a remoto" transfiere costos al patrón, no los elimina: deben cuantificarse antes de reportar el ahorro.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },
  LFT_434: {
    norma: 'Ley Federal del Trabajo', articulo: 'Art. 434',
    materia: 'laboral',
    sintesis: 'Causas de terminación COLECTIVA de las relaciones de trabajo: I) fuerza mayor o caso fortuito no imputable al patrón, o incapacidad física o mental o muerte del patrón, que produzca como consecuencia necesaria la terminación de los trabajos; II) la incosteabilidad notoria y manifiesta de la explotación; III) el agotamiento de la materia objeto de una industria extractiva; IV) los casos del artículo 38; V) el concurso o la quiebra legalmente declarado.',
    vigenciaAlCorte: true, requiereVerificacion: true,
    notaVerificacion: 'La numeración de fracciones y su correlación con los arts. 435, 436 y 439 debe cotejarse contra el texto vigente antes de invocarse en un procedimiento.',
  },
  LFT_435_439: {
    norma: 'Ley Federal del Trabajo', articulo: 'Arts. 435, 436 y 439',
    materia: 'laboral',
    sintesis: 'La terminación colectiva NO es un acto unilateral del patrón: según la causa, requiere aviso al Tribunal o AUTORIZACIÓN PREVIA obtenida mediante el procedimiento de conflicto colectivo de naturaleza económica. La incosteabilidad debe probarse con dictamen. Los trabajadores tienen derecho a indemnización (usualmente tres o cuatro meses de salario según la causa, más prima de antigüedad); en el caso de implantación de maquinaria o procedimientos de trabajo nuevos, además veinte días por año de servicios.',
    riesgoIncumplimiento: 'Ejecutar una reducción colectiva sin la autorización previa la convierte en despido injustificado masivo, con la exposición del artículo 48 por cada trabajador.',
    vigenciaAlCorte: true, requiereVerificacion: true,
    notaVerificacion: 'Montos y procedimiento exactos deben confirmarse con abogado laboralista: la vía procesal cambió con la reforma judicial laboral de 2019.',
  },
  LFT_684A: {
    norma: 'Ley Federal del Trabajo', articulo: 'Arts. 684-A a 684-E',
    materia: 'laboral · procesal',
    sintesis: 'Antes de acudir a los Tribunales Laborales, es obligatorio agotar la instancia conciliatoria prejudicial ante el Centro Federal de Conciliación y Registro Laboral o los centros locales, salvo las excepciones que la propia ley señala.',
    reformaRelevante: 'DOF 1-V-2019 (reforma en materia de justicia laboral)',
    implicacion: 'Existe una ventana de negociación estructurada antes del litigio: los escenarios de salida deben modelarse considerándola.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },
  LFT_784_804: {
    norma: 'Ley Federal del Trabajo', articulo: 'Arts. 784, 804 y 805',
    materia: 'laboral · probatorio',
    sintesis: 'La carga de la prueba recae sobre el patrón respecto de hechos como la fecha de ingreso, antigüedad, jornada, pagos de vacaciones, aguinaldo, PTU y causa de rescisión. El patrón tiene obligación de conservar y exhibir contratos, listas de raya o nómina, controles de asistencia y comprobantes de pago. La falta de presentación establece la presunción de ser ciertos los hechos alegados por el trabajador.',
    implicacion: 'Un hallazgo de "expedientes laborales incompletos" no es un problema administrativo: es una derrota probatoria anticipada, cuantificable como contingencia.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },
  JORNADA_40H: {
    norma: 'Iniciativa de reforma constitucional (art. 123, apartado A, fracc. IV) y a la LFT',
    articulo: 'En proceso legislativo',
    materia: 'laboral · prospectivo',
    sintesis: 'Existe un proceso legislativo y de consulta pública para reducir la jornada laboral semanal máxima de 48 a 40 horas, con esquemas de implementación gradual.',
    vigenciaAlCorte: false, requiereVerificacion: true,
    notaVerificacion: 'ESTATUS NO CONFIRMADO AL CORTE. Verificar en el DOF y en el sitio del Congreso si fue aprobada, su texto final y su calendario de entrada en vigor ANTES de usarla en cualquier modelo de costo laboral.',
    implicacion: 'Si se aprueba, el costo por hora efectiva de cada FTE sube: los escenarios de dimensionamiento de plantilla deben incluir una prueba de sensibilidad a 40 h/semana.',
  },

  /* ------------------------------------------------- SEGURIDAD SOCIAL / NOM */

  LSS_15_27: {
    norma: 'Ley del Seguro Social', articulo: 'Arts. 15 y 27',
    materia: 'seguridad social',
    sintesis: 'Obligaciones patronales de registro ante el IMSS, inscripción de trabajadores y comunicación de altas, bajas y modificaciones de salario. El artículo 27 define qué conceptos integran el Salario Base de Cotización (SBC) y cuáles se excluyen bajo condiciones específicas.',
    riesgoIncumplimiento: 'La integración incorrecta del SBC genera diferencias históricas con actualización, recargos y multas (arts. 304-A y 304-B LSS), típicamente por cinco ejercicios.',
    implicacion: 'Esquemas de compensación diseñados para "optimizar" el SBC son una fuente frecuente de gasto contingente oculto. El motor los marca como riesgo, no como ahorro.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },
  NOM_035: {
    norma: 'NOM-035-STPS-2018', articulo: 'Norma Oficial Mexicana',
    materia: 'seguridad y salud en el trabajo',
    sintesis: 'Factores de riesgo psicosocial en el trabajo: identificación, análisis y prevención. Obliga al patrón a identificar y analizar los factores de riesgo psicosocial, evaluar el entorno organizacional, adoptar medidas de prevención y control, practicar exámenes médicos cuando existan signos de alerta, y conservar los registros. Las obligaciones escalan según el número de trabajadores (hasta 15; 16 a 50; más de 50).',
    vigencia: 'Primera etapa en vigor desde el 23-X-2019; segunda etapa desde el 23-X-2020',
    implicacion: 'Conecta directamente con los hallazgos de sobrecarga: una carga de trabajo detectada como estructuralmente excesiva es un factor de riesgo psicosocial que el patrón está legalmente obligado a atender, no una preferencia de gestión.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },

  /* ---------------------------------------------------------------- FISCAL */

  CFF_5A: {
    norma: 'Código Fiscal de la Federación', articulo: 'Art. 5-A',
    materia: 'fiscal',
    sintesis: 'Cláusula general antiabuso: los actos jurídicos que carezcan de razón de negocios y generen un beneficio fiscal directo o indirecto tendrán los efectos fiscales que correspondan a los que se habrían realizado para obtener el beneficio económico razonablemente esperado.',
    reformaRelevante: 'DOF 9-XII-2019, en vigor 2020',
    implicacion: 'Toda reestructura societaria u operativa que el motor proponga debe documentar su razón de negocios NO fiscal desde el día uno.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },
  CFF_69B: {
    norma: 'Código Fiscal de la Federación', articulo: 'Art. 69-B',
    materia: 'fiscal',
    sintesis: 'Procedimiento contra operaciones presuntamente inexistentes. Cuando la autoridad detecte que un contribuyente emitió comprobantes sin contar con activos, personal, infraestructura o capacidad material para prestar los servicios o producir los bienes (EFOS), presumirá la inexistencia de esas operaciones. Quienes dieron efectos fiscales a dichos comprobantes (EDOS) cuentan con un plazo para acreditar la materialidad o corregir su situación fiscal.',
    riesgoIncumplimiento: 'Rechazo de la deducción y del acreditamiento, con actualización, recargos y multas; en supuestos graves, responsabilidad penal por defraudación fiscal.',
    implicacion: 'CONEXIÓN DIRECTA CON EL DETECTOR DE GASTOS: un proveedor con anomalía de Benford, sin sustancia operativa verificable y con facturación concentrada, debe cotejarse contra los listados del art. 69-B del SAT antes de cualquier otra acción.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },
  CFF_30: {
    norma: 'Código Fiscal de la Federación', articulo: 'Art. 30',
    materia: 'fiscal',
    sintesis: 'La contabilidad y la documentación relacionada deben conservarse durante un plazo de cinco años contado a partir de la fecha en que se presentaron o debieron presentarse las declaraciones. Determinada documentación (actas constitutivas, aumentos de capital, estados de posición financiera vinculados a pérdidas amortizadas, entre otros) debe conservarse por todo el tiempo en que subsista la sociedad.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },
  LISR_27: {
    norma: 'Ley del Impuesto sobre la Renta', articulo: 'Art. 27',
    materia: 'fiscal',
    sintesis: 'Requisitos de las deducciones autorizadas: ser estrictamente indispensables para los fines de la actividad; estar amparadas con CFDI; que los pagos cuyo monto exceda de $2,000.00 se efectúen mediante transferencia electrónica, cheque nominativo, tarjeta o monedero electrónico autorizado; cumplir obligaciones de retención y entero; y estar debidamente registradas en contabilidad.',
    implicacion: 'El criterio de "estrictamente indispensable" es el puente entre el análisis de gasto innecesario y su tratamiento fiscal: un gasto que el motor detecta como no vinculado a la operación puede además no ser deducible.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },
  LISR_28_XXX: {
    norma: 'Ley del Impuesto sobre la Renta', articulo: 'Art. 28, fracc. XXX',
    materia: 'fiscal',
    sintesis: 'No son deducibles los pagos que a su vez sean ingresos exentos para el trabajador, en la proporción del 47%. La proporción es del 53% cuando las prestaciones exentas otorgadas no disminuyen respecto del ejercicio fiscal inmediato anterior.',
    implicacion: 'El rediseño de paquetes de compensación tiene un costo fiscal explícito que debe modelarse junto con el ahorro nominal.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },

  /* --------------------------------------- CONSUMIDOR / COMPETENCIA / DATOS */

  LFPC_32: {
    norma: 'Ley Federal de Protección al Consumidor', articulo: 'Art. 32',
    materia: 'consumidor · publicidad',
    sintesis: 'La información o publicidad relativa a bienes, productos o servicios debe ser veraz, comprobable, clara y exenta de textos, diálogos, sonidos, imágenes, marcas o descripciones que induzcan o puedan inducir a error o confusión por engañosas o abusivas. Se considera engañosa la que refiere características que no corresponden a la realidad o que no pueden comprobarse.',
    riesgoIncumplimiento: 'Sanciones administrativas de PROFECO, orden de suspensión de la publicidad y publicación de la resolución.',
    implicacion: 'CRÍTICO PARA EL DETECTOR COMERCIAL: toda promesa cuantitativa de la propuesta de valor (porcentajes de ahorro, plazos de resultado, garantías) debe tener soporte documental comprobable antes de publicarse.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },
  LFPC_76BIS: {
    norma: 'Ley Federal de Protección al Consumidor', articulo: 'Art. 76 bis',
    materia: 'consumidor · comercio electrónico',
    sintesis: 'Disposiciones aplicables a transacciones celebradas a través de medios electrónicos: el proveedor debe utilizar la información del consumidor de forma confidencial, contar con elementos técnicos de seguridad, proporcionar domicilio físico y medios de contacto, evitar prácticas comerciales engañosas, e informar antes de la transacción el precio total, términos, condiciones, costos adicionales y formas de pago.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },
  LFCE_53: {
    norma: 'Ley Federal de Competencia Económica', articulo: 'Art. 53',
    materia: 'competencia económica',
    sintesis: 'Son prácticas monopólicas absolutas los contratos, convenios o combinaciones entre agentes económicos competidores entre sí cuyo objeto o efecto sea fijar, elevar, concertar o manipular precios; restringir la oferta; dividir mercados; concertar posturas en licitaciones; o intercambiar información con alguno de esos objetos o efectos. Son nulas de pleno derecho.',
    riesgoIncumplimiento: 'Multas de hasta el diez por ciento de los ingresos del agente económico, además de responsabilidad penal para las personas físicas involucradas.',
    implicacion: 'BARRERA DURA: ninguna recomendación de estrategia de precios puede implicar coordinación con competidores. El motor rechaza por diseño cualquier solución de ese tipo.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },
  LFPDPPP: {
    norma: 'Ley Federal de Protección de Datos Personales en Posesión de los Particulares',
    articulo: 'Marco general',
    materia: 'datos personales',
    sintesis: 'Rige el tratamiento de datos personales por particulares bajo los principios de licitud, consentimiento, información, calidad, finalidad, lealtad, proporcionalidad y responsabilidad. Obliga a poner a disposición del titular un aviso de privacidad, a garantizar los derechos ARCO (acceso, rectificación, cancelación y oposición), a designar responsable de datos personales y a adoptar medidas de seguridad administrativas, técnicas y físicas.',
    vigenciaAlCorte: true, requiereVerificacion: true,
    notaVerificacion: 'ALTA PRIORIDAD DE VERIFICACIÓN: el marco institucional de protección de datos en México fue objeto de una reestructura reciente (extinción del INAI y traslado de atribuciones). Debe confirmarse en el DOF cuál es la ley vigente, la autoridad competente y el régimen de sanciones actual antes de emitir cualquier recomendación de cumplimiento.',
    implicacion: 'Todo hallazgo del motor que implique tratar datos de clientes o de empleados (analítica de cohortes, evaluación de desempeño, videovigilancia) requiere base de legitimación y aviso de privacidad congruente.',
  },
  LFPIORPI_17: {
    norma: 'Ley Federal para la Prevención e Identificación de Operaciones con Recursos de Procedencia Ilícita',
    articulo: 'Arts. 17 y 18',
    materia: 'prevención de lavado de dinero',
    sintesis: 'Enumera las actividades vulnerables y las obligaciones correlativas: identificar a clientes y usuarios, solicitar información sobre el dueño beneficiario, custodiar y resguardar la información por el plazo legal, y presentar avisos ante la autoridad cuando se superen los umbrales establecidos.',
    implicacion: 'Si el diagnóstico detecta operaciones en efectivo por encima de umbrales o contrapartes no identificadas, existe una obligación de reporte independiente de cualquier consideración comercial.',
    vigenciaAlCorte: true, requiereVerificacion: true,
    notaVerificacion: 'Los umbrales se expresan en UMA y se actualizan: verificar el valor vigente de la UMA publicado por el INEGI.',
  },
  LGRA_66: {
    norma: 'Ley General de Responsabilidades Administrativas', articulo: 'Arts. 66 a 72',
    materia: 'anticorrupción',
    sintesis: 'Tipifica los actos de particulares vinculados con faltas administrativas graves: soborno, participación ilícita en procedimientos administrativos, tráfico de influencias, utilización de información falsa, colusión, uso indebido de recursos públicos y contratación indebida de ex servidores públicos.',
    implicacion: 'Aplica a cualquier empresa que participe en contratación pública. Un hallazgo de pagos a intermediarios sin sustancia en ese contexto escala de problema financiero a riesgo penal-administrativo.',
    vigenciaAlCorte: true, requiereVerificacion: false,
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   2. MAPA ACCIÓN → MARCO NORMATIVO APLICABLE
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Cada tipo de acción correctiva que el motor puede recomendar se vincula aquí
 * con las normas que la condicionan, las obligaciones previas y la contingencia
 * que debe cuantificarse. El resolutor de soluciones consulta este mapa para
 * llenar el campo `sustentoJuridico` de cada propuesta.
 */
export const MAPA_ACCION = {
  reducir_plantilla: {
    normas: ['LFT_35', 'LFT_47', 'LFT_48', 'LFT_50', 'LFT_53', 'LFT_162', 'LFT_434', 'LFT_435_439', 'LFT_684A', 'LSS_15_27'],
    obligacionesPrevias: [
      'Determinar la vía jurídica: convenio por mutuo consentimiento (art. 53-I), rescisión con causa acreditada (art. 47) o terminación colectiva con autorización previa (arts. 434-435).',
      'Calcular el finiquito o la liquidación completa: partes proporcionales de aguinaldo, vacaciones y prima vacacional, prima de antigüedad (art. 162) y, en su caso, indemnización de tres meses y veinte días por año (arts. 48 y 50).',
      'Verificar que no exista fuero sindical, periodo de incapacidad, embarazo o cualquier supuesto de protección reforzada.',
      'Ratificar el convenio ante el Centro de Conciliación o el Tribunal Laboral competente para que surta efectos de cosa juzgada.',
      'Presentar el aviso de baja ante el IMSS y ajustar el INFONAVIT.',
    ],
    contingenciaACuantificar:
      'Escenario adverso = 3 meses de salario + hasta 12 meses de salarios vencidos + 20 días por año + prima de antigüedad + intereses del art. 48, por cada trabajador que litigue y obtenga sentencia favorable.',
    barrerasDuras: [
      'Prohibido simular renuncias: constituye un vicio del consentimiento y no extingue la acción.',
      'Prohibido sustituir puestos suprimidos por subcontratación de personal (art. 12 LFT).',
    ],
  },
  tercerizar_funcion: {
    normas: ['LFT_12_15', 'LISR_27', 'CFF_5A'],
    obligacionesPrevias: [
      'Confirmar que la función NO forma parte del objeto social ni de la actividad económica preponderante del contratante.',
      'Verificar el registro REPSE vigente del prestador ante la STPS y conservar la constancia.',
      'Celebrar contrato escrito que precise el objeto y el número aproximado de trabajadores que participarán.',
      'Recabar de forma cuatrimestral la información de cumplimiento en materia de seguridad social que exige la normatividad.',
    ],
    contingenciaACuantificar:
      'Sin REPSE: pérdida de la deducción para ISR y del acreditamiento del IVA sobre el total pagado, más responsabilidad solidaria en obligaciones laborales y de seguridad social del personal involucrado.',
    barrerasDuras: ['Prohibida la subcontratación de personal en cualquier modalidad (art. 12 LFT).'],
  },
  cancelar_gasto_proveedor: {
    normas: ['CFF_69B', 'LISR_27', 'CFF_30', 'LFPIORPI_17'],
    obligacionesPrevias: [
      'Revisar el contrato vigente: vigencia, cláusula de terminación anticipada, penas convencionales y plazo de preaviso.',
      'Cotejar al proveedor contra los listados definitivos del artículo 69-B publicados por el SAT.',
      'Documentar la materialidad del servicio recibido (entregables, bitácoras, correos, evidencia de uso) antes de cualquier cancelación, porque la carga probatoria subsiste por cinco ejercicios.',
      'Conservar la contabilidad y los CFDI conforme al artículo 30 del CFF.',
    ],
    contingenciaACuantificar:
      'Penas convencionales por terminación anticipada + costo de migración + riesgo de rechazo de deducciones históricas si la materialidad no está documentada.',
    barrerasDuras: ['Prohibido cancelar o destruir documentación soporte de ejercicios abiertos a revisión.'],
  },
  rediseñar_estructura: {
    normas: ['LFT_2', 'LFT_35', 'NOM_035', 'LFT_330'],
    obligacionesPrevias: [
      'Documentar que la redistribución de cargas no genera jornadas superiores a los máximos legales ni trabajo en días de descanso sin la prima correspondiente.',
      'Actualizar descripciones de puesto y, cuando cambien condiciones sustanciales, formalizar el consentimiento del trabajador.',
      'Evaluar el impacto en factores de riesgo psicosocial conforme a la NOM-035-STPS-2018 y registrar las medidas de control.',
    ],
    contingenciaACuantificar:
      'Riesgo de acción rescisoria del trabajador por modificación unilateral de condiciones (art. 51 LFT) y de sanciones por incumplimiento de la NOM-035.',
    barrerasDuras: [
      'La reasignación de cargas no puede usarse para forzar la renuncia: configura despido indirecto.',
      'Una carga de trabajo estructuralmente excesiva es un riesgo psicosocial de atención obligatoria, no una decisión discrecional.',
    ],
  },
  modificar_precios: {
    normas: ['LFCE_53', 'LFPC_32', 'LFPC_76BIS'],
    obligacionesPrevias: [
      'Fijar el precio de forma unilateral e independiente, con base exclusivamente en costos, valor y demanda propios.',
      'Respetar los precios pactados en contratos vigentes hasta su vencimiento o renegociación consentida.',
      'Informar el precio total, incluidos cargos adicionales, antes de que el consumidor cierre la transacción.',
    ],
    contingenciaACuantificar: 'Multa de hasta el 10% de los ingresos ante una práctica monopólica absoluta; sanciones de PROFECO por publicidad o información de precio engañosa.',
    barrerasDuras: [
      'PROHIBIDO ABSOLUTAMENTE coordinar, concertar o intercambiar precios con competidores (art. 53 LFCE, nulidad de pleno derecho y responsabilidad penal).',
    ],
  },
  cambiar_promesa_comercial: {
    normas: ['LFPC_32', 'LFPC_76BIS', 'LFPDPPP'],
    obligacionesPrevias: [
      'Sustentar documentalmente toda afirmación cuantitativa antes de publicarla (metodología, muestra, periodo y fuente).',
      'Conservar el expediente probatorio de cada aseveración publicitaria mientras esté vigente y por el periodo de prescripción aplicable.',
      'Si la promesa se acompaña de captación de datos, alinear el aviso de privacidad con la finalidad declarada.',
    ],
    contingenciaACuantificar: 'Procedimiento de PROFECO por publicidad engañosa, orden de suspensión, multa y publicación de la resolución.',
    barrerasDuras: ['Prohibido publicar cifras de resultado que no sean comprobables con evidencia propia verificable.'],
  },
  automatizar_proceso: {
    normas: ['LFT_435_439', 'LFPDPPP', 'CFF_30'],
    obligacionesPrevias: [
      'Si la automatización implica implantación de maquinaria o procedimientos de trabajo nuevos con reducción de personal, seguir el procedimiento del artículo 439 de la LFT, que contempla indemnización adicional.',
      'Evaluar el impacto en el tratamiento de datos personales y actualizar el aviso de privacidad y las medidas de seguridad.',
      'Conservar la trazabilidad y los registros contables que la automatización genere, conforme al CFF.',
    ],
    contingenciaACuantificar: 'Indemnización de cuatro meses más veinte días por año de servicios en el supuesto del artículo 439, de resultar aplicable.',
    barrerasDuras: ['Prohibido tomar decisiones automatizadas sobre personas sin supervisión humana ni base de legitimación.'],
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   3. RESOLUTOR
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Construye el bloque `sustentoJuridico` de una solución.
 * @param {string} tipoAccion clave de MAPA_ACCION
 * @returns {object|null}
 */
export function sustentoJuridico(tipoAccion) {
  const m = MAPA_ACCION[tipoAccion];
  if (!m) return null;
  const normas = m.normas
    .map((k) => NORMAS[k])
    .filter(Boolean)
    .map((n) => ({
      cita: `${n.norma}, ${n.articulo}`,
      materia: n.materia,
      sintesis: n.sintesis,
      implicacion: n.implicacion ?? null,
      riesgo: n.riesgoIncumplimiento ?? null,
      reforma: n.reformaRelevante ?? null,
      requiereVerificacion: !!n.requiereVerificacion,
      notaVerificacion: n.notaVerificacion ?? null,
    }));
  return {
    jurisdiccion: 'México (federal)',
    corteNormativo: CORTE_NORMATIVO,
    accion: tipoAccion,
    normasAplicables: normas,
    obligacionesPrevias: m.obligacionesPrevias,
    contingenciaACuantificar: m.contingenciaACuantificar,
    barrerasDuras: m.barrerasDuras,
    requiereValidacionProfesional: true,
    alertasDeVigencia: normas.filter((n) => n.requiereVerificacion).map((n) => ({
      cita: n.cita, nota: n.notaVerificacion,
    })),
    disclaimer: DISCLAIMER.texto,
  };
}

/** Normas que el motor exige re-verificar antes de emitir un informe formal. */
export function normasPorVerificar() {
  return Object.entries(NORMAS)
    .filter(([, n]) => n.requiereVerificacion)
    .map(([clave, n]) => ({
      clave, cita: `${n.norma}, ${n.articulo}`,
      vigenteAlCorte: n.vigenciaAlCorte, nota: n.notaVerificacion,
    }));
}

export default { NORMAS, MAPA_ACCION, sustentoJuridico, DISCLAIMER, CORTE_NORMATIVO };
