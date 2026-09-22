/**
 * INTELIS · Catálogo de Intervenciones
 * ─────────────────────────────────────────────────────────────────────────────
 * Cada entrada describe UNA intervención con: el mecanismo por el que funciona
 * (no solo qué hacer, sino por qué produce el efecto), los pasos verificables,
 * el indicador que prueba si funcionó, el riesgo de ejecución y la señal de
 * aborto — el criterio objetivo para detenerla si no está funcionando.
 *
 * La señal de aborto es obligatoria: una solución sin criterio de fracaso
 * definido de antemano se convierte en un compromiso indefinido de recursos.
 */

export const PLAYBOOKS = {

  /* ───────────────────────────── PROCESOS ───────────────────────────── */
  estabilizar_proceso: {
    nombre: 'Eliminar causas asignables de variación',
    objetivo: 'Devolver el proceso a control estadístico atacando los eventos específicos señalados por la carta de control.',
    mecanismo:
      'Una causa asignable es, por definición, un evento identificable y removible. Al eliminarla, la variación del proceso ' +
      'se reduce a su componente común y el proceso vuelve a ser predecible. La predictibilidad es el prerrequisito de ' +
      'cualquier mejora posterior: no se puede mejorar un proceso cuyo comportamiento no se puede anticipar.',
    pasos: [
      'Levantar la bitácora de cada punto fuera de control señalado: qué ocurrió ese día, quién, con qué insumo y con qué equipo.',
      'Aplicar los cinco porqués sobre cada evento hasta llegar a una causa que la organización pueda controlar.',
      'Clasificar las causas encontradas en recurrentes y únicas. Solo las recurrentes justifican un cambio de proceso.',
      'Implementar el control preventivo en la causa recurrente de mayor frecuencia.',
      'Recalcular los límites de control con datos posteriores al cambio y verificar que las señales desaparecieron.',
    ],
    kpi: { nombre: 'Puntos fuera de control por cada 100 observaciones', objetivo: 0, plazoDias: 90 },
    inversionTipica: { tipo: 'horas de análisis', rangoPctCostoProceso: [0.01, 0.04] },
    rampaMeses: 1, esfuerzo: 2,
    riesgos: [
      { riesgo: 'Ajustar el proceso ante variación de causa común (tampering)', probabilidad: 'alta', mitigacion: 'Intervenir ÚNICAMENTE sobre los puntos que la carta marca como señal. Deming demostró que ajustar ante ruido duplica la varianza.' },
      { riesgo: 'Atribuir la causa a una persona en lugar de al sistema', probabilidad: 'alta', mitigacion: 'Preguntar siempre qué condición del sistema permitió el evento. Si se repite con personas distintas, no es la persona.' },
    ],
    señalDeAborto: 'Si tras 90 días y tres causas corregidas la tasa de señales no baja, el modelo de medición es incorrecto: revisar primero el sistema de medición (R&R) antes de seguir invirtiendo.',
  },
  rediseñar_proceso: {
    nombre: 'Rediseñar el proceso para alcanzar capacidad',
    objetivo: 'Elevar Cpk por encima de 1.33 modificando el diseño del proceso, no el esfuerzo de quienes lo ejecutan.',
    mecanismo:
      'Cuando un proceso es estable pero incapaz, el resultado está determinado por su diseño. Cpk depende de la distancia ' +
      'entre la media y los límites, y de σ. Solo hay tres palancas reales: centrar la media, reducir σ, o renegociar la ' +
      'especificación. El esfuerzo individual no es una de ellas.',
    pasos: [
      'Verificar que la especificación sea real y no heredada: ¿el cliente percibe la diferencia en el límite actual?',
      'Descomponer σ por fuente (método, máquina, material, medición, entorno) con un estudio de componentes de varianza.',
      'Atacar la fuente dominante de varianza, que suele concentrar más del 50% del total.',
      'Si la media está descentrada, corregir el punto de ajuste antes de invertir en reducir σ: es más barato y más rápido.',
      'Validar Cpk con una muestra nueva de al menos 30 observaciones posteriores al cambio.',
    ],
    kpi: { nombre: 'Cpk', objetivo: 1.33, plazoDias: 180 },
    inversionTipica: { tipo: 'rediseño e instrumentación', rangoPctCostoProceso: [0.05, 0.20] },
    rampaMeses: 3, esfuerzo: 5,
    riesgos: [
      { riesgo: 'Invertir en reducir σ cuando el problema es de centrado', probabilidad: 'media', mitigacion: 'Comparar Cp contra Cpk: si Cp es aceptable y Cpk no, el problema es centrado, y su corrección es de orden de magnitud más barata.' },
    ],
    señalDeAborto: 'Si el estudio de componentes de varianza muestra que más del 30% proviene del sistema de medición, detener el rediseño y corregir primero la medición.',
  },
  reducir_defectos: {
    nombre: 'Elevar el nivel sigma del proceso',
    objetivo: 'Reducir DPMO hasta alcanzar al menos nivel 4σ (6,210 DPMO).',
    mecanismo:
      'El costo de un defecto escala con la distancia a la que se detecta: corregir en origen es un orden de magnitud más barato ' +
      'que corregir tras la entrega. Mover la detección aguas arriba reduce el costo total aunque el número de defectos no cambie de inmediato.',
    pasos: [
      'Estratificar los defectos por modo de falla y construir el Pareto: típicamente dos o tres modos explican el 80%.',
      'Para el modo dominante, mapear el punto donde se genera y el punto donde se detecta. La distancia entre ambos es el costo evitable.',
      'Implantar detección en el punto de generación; cuando sea viable, implantar prevención (poka-yoke) que impida el error.',
      'Medir DPMO por modo, semanalmente, para distinguir mejora real de variación.',
    ],
    kpi: { nombre: 'DPMO del modo dominante', objetivo: 6210, plazoDias: 120 },
    inversionTipica: { tipo: 'controles y capacitación', rangoPctCostoProceso: [0.03, 0.10] },
    rampaMeses: 2, esfuerzo: 3,
    riesgos: [
      { riesgo: 'Agregar inspección en lugar de prevención', probabilidad: 'alta', mitigacion: 'La inspección detecta pero no elimina, y añade costo permanente. Priorizar siempre el control que impide que el error ocurra.' },
    ],
    señalDeAborto: 'Si el Pareto de modos de falla es plano (ningún modo supera el 20%), el problema es sistémico y corresponde rediseñar el proceso, no atacar modos individuales.',
  },
  contener_deriva: {
    nombre: 'Detener el deterioro progresivo',
    objetivo: 'Revertir la tendencia creciente y restablecer el nivel de desempeño previo.',
    mecanismo:
      'Una deriva significativa implica un mecanismo que se degrada de forma acumulativa: desgaste, acumulación de deuda técnica, ' +
      'crecimiento de una cola no atendida o relajamiento progresivo de un estándar. Identificar cuál de estos es determina el tratamiento.',
    pasos: [
      'Datar el inicio de la deriva con el estimador de punto de cambio y cruzarlo con los eventos organizacionales de esa fecha.',
      'Determinar si la deriva es de desgaste (física), de acumulación (cola/deuda) o de estándar (comportamiento).',
      'Aplicar el tratamiento correspondiente: mantenimiento preventivo, purga de la acumulación, o refuerzo del estándar con verificación.',
      'Instalar una alerta automática sobre la pendiente para que la próxima deriva se detecte en semanas, no en trimestres.',
    ],
    kpi: { nombre: 'Pendiente de Theil-Sen del indicador', objetivo: 0, plazoDias: 120 },
    inversionTipica: { tipo: 'mantenimiento y monitoreo', rangoPctCostoProceso: [0.02, 0.08] },
    rampaMeses: 2, esfuerzo: 3,
    riesgos: [{ riesgo: 'Tratar la deriva como una serie de incidentes aislados', probabilidad: 'alta', mitigacion: 'La prueba de tendencia ya descartó la aleatoriedad. Exigir una causa acumulativa, no una lista de excusas puntuales.' }],
    señalDeAborto: 'Si tras 120 días la pendiente sigue siendo positiva y significativa, la causa está fuera del alcance del equipo: escalar a decisión de inversión.',
  },
  reducir_variabilidad: {
    nombre: 'Reducir la variabilidad del tiempo de ciclo',
    objetivo: 'Bajar el coeficiente de variación por debajo de 0.25 para hacer posibles los compromisos de entrega.',
    mecanismo:
      'La variabilidad se paga con inventario, con tiempo de colchón o con incumplimiento — siempre se paga. Reducirla en origen ' +
      'libera simultáneamente las tres cosas. Además, por la fórmula de Kingman, la espera en cola es proporcional a la varianza: ' +
      'reducir variabilidad reduce colas sin agregar capacidad.',
    pasos: [
      'Separar la variabilidad de llegada (demanda) de la de servicio (ejecución): sus tratamientos son opuestos.',
      'Para variabilidad de servicio: estandarizar el método de trabajo del 20% de casos que genera el 80% de la dispersión.',
      'Para variabilidad de llegada: nivelar el ingreso de trabajo mediante programación, no mediante presión sobre la ejecución.',
      'Recalcular el compromiso de servicio con el percentil 95, no con el promedio.',
    ],
    kpi: { nombre: 'Coeficiente de variación del tiempo de ciclo', objetivo: 0.25, plazoDias: 150 },
    inversionTipica: { tipo: 'estandarización y programación', rangoPctCostoProceso: [0.02, 0.07] },
    rampaMeses: 2, esfuerzo: 3,
    riesgos: [{ riesgo: 'Estandarizar el caso promedio e ignorar los casos excepcionales', probabilidad: 'media', mitigacion: 'Diseñar una ruta explícita para excepciones en lugar de forzarlas por el flujo estándar, que es donde se genera la dispersión.' }],
    señalDeAborto: 'Si tras estandarizar el CV no baja, la variabilidad proviene de la demanda y no de la ejecución: el esfuerzo debe moverse a nivelación de entrada.',
  },

  /* ──────────────────────── RESTRICCIONES Y EMBUDOS ─────────────────── */
  elevar_restriccion: {
    nombre: 'Explotar y elevar la restricción del sistema',
    objetivo: 'Incrementar el throughput del sistema completo actuando exclusivamente sobre el eslabón que lo limita.',
    mecanismo:
      'El throughput del sistema es igual a la capacidad de su restricción. Cada unidad de capacidad ganada en la restricción ' +
      'es una unidad ganada por todo el sistema; cada unidad ganada fuera de ella es cero. Los pasos de explotación (retirar de la ' +
      'restricción todo trabajo que no requiera su capacidad única) suelen liberar entre 15% y 30% de capacidad SIN inversión, ' +
      'por lo que preceden obligatoriamente a cualquier compra.',
    pasos: [
      'EXPLOTAR: inventariar todo lo que hace la restricción y retirar de ella cada actividad que otro recurso pueda ejecutar.',
      'EXPLOTAR: eliminar tiempo muerto de la restricción — que nunca espere por insumo, instrucción o autorización.',
      'EXPLOTAR: mover el control de calidad AGUAS ARRIBA de la restricción, para que no procese unidades que serán rechazadas después.',
      'SUBORDINAR: fijar el ritmo de liberación de trabajo al de la restricción (tambor-amortiguador-cuerda). Producir más solo genera inventario.',
      'ELEVAR: solo tras agotar lo anterior, evaluar la inversión en capacidad adicional.',
      'REPETIR: al elevarla, la restricción se desplaza. Identificar la nueva antes de seguir invirtiendo en la anterior.',
    ],
    kpi: { nombre: 'Throughput del sistema (unidades/periodo)', objetivo: '+15% sobre línea base', plazoDias: 90 },
    inversionTipica: { tipo: 'reorganización del trabajo; inversión solo en el paso 5', rangoPctCostoProceso: [0, 0.15] },
    rampaMeses: 1, esfuerzo: 3,
    riesgos: [
      { riesgo: 'Invertir en capacidad antes de agotar la explotación', probabilidad: 'alta', mitigacion: 'Prohibir la compra de capacidad hasta demostrar documentalmente que los pasos de explotación se agotaron. Es el error más caro y más común.' },
      { riesgo: 'Que las áreas no restrictivas resistan la subordinación por ser medidas por eficiencia local', probabilidad: 'alta', mitigacion: 'Cambiar la métrica de las no-restricciones de eficiencia local a cumplimiento del ritmo. Mientras se mida eficiencia local, sobreproducirán.' },
    ],
    señalDeAborto: 'Si el throughput no sube tras completar explotación y subordinación, la restricción fue mal identificada: es probable que sea de política (una regla interna) y no de capacidad física.',
  },
  reasignar_capacidad: {
    nombre: 'Reasignar capacidad ociosa hacia la restricción',
    objetivo: 'Convertir holgura estructural en capacidad útil sin desembolso.',
    mecanismo: 'Mover capacidad de donde no limita hacia donde sí limita incrementa el throughput sin costo incremental.',
    pasos: [
      'Verificar que la holgura no sea el amortiguador que protege a la restricción de quedarse sin alimentación.',
      'Evaluar la transferibilidad real: qué parte de esa capacidad puede ejecutar trabajo de la restricción con capacitación acotada.',
      'Transferir por incrementos y medir el throughput del sistema tras cada uno.',
    ],
    kpi: { nombre: 'Utilización de la restricción', objetivo: '≤0.85 manteniendo throughput', plazoDias: 60 },
    inversionTipica: { tipo: 'capacitación cruzada', rangoPctCostoProceso: [0.01, 0.05] },
    rampaMeses: 1, esfuerzo: 3,
    riesgos: [{ riesgo: 'Eliminar el amortiguador que protege a la restricción', probabilidad: 'alta', mitigacion: 'Dimensionar el amortiguador con la variabilidad medida ANTES de tocar la holgura. Sin amortiguador, la restricción para y el sistema entero pierde throughput irrecuperable.' }],
    señalDeAborto: 'Si al reducir la holgura la restricción empieza a sufrir paros por falta de alimentación, revertir de inmediato: el amortiguador era necesario.',
  },
  ampliar_capacidad_servicio: {
    nombre: 'Dimensionar el equipo conforme al objetivo de servicio',
    objetivo: 'Alcanzar el nivel de servicio comprometido con el número de posiciones que Erlang C determina.',
    mecanismo:
      'En un sistema M/M/c, el nivel de servicio no es lineal en el número de servidores: existe un punto donde una posición ' +
      'adicional produce una mejora desproporcionada. Dimensionar por intuición sistemáticamente subestima ese punto.',
    pasos: [
      'Validar λ y μ con medición real por franja horaria, no con promedios diarios que enmascaran los picos.',
      'Calcular c requerido por franja: la plantilla debe seguir la curva de demanda, no ser plana.',
      'Cubrir el pico con flexibilidad (tiempo parcial, multiskilling) antes de contratar capacidad permanente.',
      'Verificar el cumplimiento del objetivo con datos posteriores y recalibrar.',
    ],
    kpi: { nombre: 'Nivel de servicio alcanzado', objetivo: 'el comprometido', plazoDias: 60 },
    inversionTipica: { tipo: 'plantilla adicional o flexible', rangoPctCostoProceso: [0.05, 0.25] },
    rampaMeses: 2, esfuerzo: 2,
    riesgos: [{ riesgo: 'Dimensionar con promedios diarios', probabilidad: 'alta', mitigacion: 'Erlang es no lineal: el promedio del día subdimensiona el pico de forma sistemática. Calcular por franja.' }],
    señalDeAborto: 'Si el nivel de servicio no mejora con c calculado, λ o μ están mal medidos: reinstrumentar antes de contratar más.',
  },
  cerrar_fuga_embudo: {
    nombre: 'Cerrar la fuga de la transición más débil',
    objetivo: 'Elevar la conversión de la transición identificada hasta al menos la mediana del propio embudo.',
    mecanismo:
      'Las etapas del embudo se multiplican: la conversión global es el producto de las transiciones. Por eso una mejora ' +
      'porcentual en la etapa más débil tiene mayor efecto absoluto que la misma mejora en una etapa ya eficiente, ' +
      'y por eso el esfuerzo debe concentrarse y no repartirse.',
    pasos: [
      'Instrumentar la transición: registrar motivo de abandono en el momento en que ocurre, no por encuesta posterior.',
      'Segmentar la conversión por origen, segmento y responsable: una conversión baja agregada suele ser una mezcla de una muy buena y una muy mala.',
      'Formular UNA hipótesis causal y probarla con un experimento controlado con tamaño de muestra calculado por potencia.',
      'Escalar solo lo que el experimento confirme; descartar sin apego lo que no.',
    ],
    kpi: { nombre: 'Conversión de la transición', objetivo: 'mediana del embudo', plazoDias: 90 },
    inversionTipica: { tipo: 'instrumentación y experimentación', rangoPctCostoProceso: [0.02, 0.10] },
    rampaMeses: 1, esfuerzo: 2,
    riesgos: [
      { riesgo: 'Declarar victoria con una mejora dentro del ruido estadístico', probabilidad: 'alta', mitigacion: 'Calcular el tamaño de muestra necesario ANTES del experimento y respetarlo. Detener un experimento al ver un resultado favorable infla la tasa de falsos positivos.' },
      { riesgo: 'Optimizar la conversión degradando la calidad del cliente que pasa', probabilidad: 'media', mitigacion: 'Medir siempre la conversión aguas abajo y la retención de la cohorte, no solo la transición intervenida.' },
    ],
    señalDeAborto: 'Si tres experimentos consecutivos con potencia adecuada no mueven la conversión, el problema no está en esa transición sino en la calidad de lo que entra a ella.',
  },

  /* ──────────────────────────── GASTOS ──────────────────────────────── */
  racionalizar_gasto: {
    nombre: 'Someter la partida a justificación de base cero',
    objetivo: 'Determinar qué parte del gasto compra un resultado y eliminar la que no.',
    mecanismo:
      'El presupuesto incremental hereda el gasto del año anterior y solo discute el delta, lo que preserva indefinidamente ' +
      'partidas que perdieron su causa. La base cero invierte la carga de la prueba: cada peso debe justificarse contra el resultado que produce.',
    pasos: [
      'Solicitar al responsable de la partida la declaración del resultado específico que compra y cómo se mide.',
      'Contrastar esa declaración contra la evidencia estadística: si el gasto no correlaciona con su driver, la declaración debe explicarlo.',
      'Construir tres escenarios: mantener, reducir 30%, eliminar. Documentar la consecuencia concreta de cada uno.',
      'Revisar el contrato: vigencia, preaviso, penas por terminación anticipada.',
      'Decidir y establecer la fecha de revisión del efecto real.',
    ],
    kpi: { nombre: 'Gasto de la partida / driver de actividad', objetivo: '−25%', plazoDias: 120 },
    inversionTipica: { tipo: 'tiempo de análisis y negociación', rangoPctCostoProceso: [0, 0.02] },
    rampaMeses: 2, esfuerzo: 2,
    riesgos: [
      { riesgo: 'Eliminar un gasto cuyo beneficio es real pero no está medido', probabilidad: 'media', mitigacion: 'Reducir por etapas con punto de revisión, en lugar de eliminar de golpe. Un gasto sin métrica no es necesariamente un gasto sin valor.' },
      { riesgo: 'Incurrir en penas contractuales que anulan el ahorro', probabilidad: 'media', mitigacion: 'Leer el contrato ANTES de decidir. El ahorro debe calcularse neto de la pena y del costo de migración.' },
    ],
    señalDeAborto: 'Si al reducir la partida aparece un deterioro medible en un indicador operativo dentro de los 60 días, restituir y reclasificar el gasto como necesario.',
  },
  auditar_partida: {
    nombre: 'Auditar el desembolso atípico',
    objetivo: 'Explicar la desviación o corregirla.',
    mecanismo: 'Un valor atípico tiene siempre una causa: un alcance distinto, un error de captura, una condición especial o una irregularidad. Determinar cuál es resuelve el hallazgo en una sola revisión documental.',
    pasos: [
      'Recuperar el soporte documental completo: contrato, orden de compra, entregables, evidencia de recepción.',
      'Verificar que el alcance contratado justifique la diferencia contra las partidas comparables de su categoría.',
      'Verificar la autorización: ¿quién aprobó y tenía facultades para el monto?',
      'Documentar la conclusión en el expediente, con independencia del resultado.',
    ],
    kpi: { nombre: 'Partidas atípicas con explicación documentada', objetivo: '100%', plazoDias: 30 },
    inversionTipica: { tipo: 'revisión documental', rangoPctCostoProceso: [0, 0.01] },
    rampaMeses: 0, esfuerzo: 1,
    riesgos: [{ riesgo: 'Tratar la anomalía estadística como acusación', probabilidad: 'alta', mitigacion: 'Un atípico es una pregunta, no una conclusión. Conducir la revisión como verificación de alcance, no como investigación de personas, salvo que la evidencia documental lo justifique.' }],
    señalDeAborto: 'No aplica: la revisión documental concluye siempre, con explicación o con hallazgo.',
  },
  revision_forense: {
    nombre: 'Revisión forense de la relación con el proveedor',
    objetivo: 'Descartar o confirmar irregularidad, y cerrar la exposición fiscal.',
    mecanismo:
      'La anomalía de Benford señala un patrón de importes improbable en datos generados naturalmente. El protocolo descarta ' +
      'primero las causas legítimas (precios de lista, redondeo, numeración secuencial) y solo después escala.',
    pasos: [
      'Descartar causas benignas: precios de lista fijos, redondeo sistemático, numeración secuencial, topes de autorización.',
      'Cotejar al proveedor contra los listados definitivos del artículo 69-B del CFF publicados por el SAT.',
      'Verificar la sustancia del proveedor: activos, personal, infraestructura y capacidad material para prestar el servicio.',
      'Documentar la materialidad de lo recibido: entregables, bitácoras, correos, evidencia de uso efectivo.',
      'Si persiste la duda, escalar a auditoría forense independiente bajo secreto profesional, sin notificar al área auditada.',
    ],
    kpi: { nombre: 'Exposición fiscal cuantificada y resuelta', objetivo: '100%', plazoDias: 60 },
    inversionTipica: { tipo: 'auditoría especializada', rangoPctCostoProceso: [0.02, 0.10] },
    rampaMeses: 1, esfuerzo: 3,
    riesgos: [
      { riesgo: 'Actuar sobre una anomalía con explicación legítima y dañar una relación comercial sana', probabilidad: 'alta', mitigacion: 'Agotar el paso 1 antes que cualquier otro. Las causas benignas explican la mayoría de las no conformidades de Benford.' },
      { riesgo: 'Notificar al área auditada y perder la evidencia', probabilidad: 'media', mitigacion: 'Asegurar los registros antes de cualquier comunicación, conforme a la obligación de conservación del artículo 30 del CFF.' },
    ],
    señalDeAborto: 'Si las causas benignas explican la distribución, cerrar el hallazgo documentando la explicación. No escalar.',
  },
  renegociar_clase_a: {
    nombre: 'Renegociación focalizada en partidas de clase A',
    objetivo: 'Capturar entre 3% y 12% de las partidas que concentran el 80% del gasto.',
    mecanismo:
      'El ahorro es proporcional al monto negociado, mientras que el esfuerzo es aproximadamente constante por negociación. ' +
      'Por eso el retorno por hora invertida es máximo en la clase A y despreciable en la clase C.',
    pasos: [
      'Construir el panorama de gasto por proveedor, consolidando todas las partidas y áreas: el poder de negociación se diluye cuando cada área negocia por separado.',
      'Obtener referencias de mercado verificables para cada partida A.',
      'Definir el rango objetivo y el punto de retiro ANTES de sentarse a negociar.',
      'Negociar el paquete completo, no partida por partida: el volumen consolidado es la palanca principal.',
      'Formalizar en contrato con indicadores de nivel de servicio y cláusula de revisión periódica.',
    ],
    kpi: { nombre: 'Costo unitario de las partidas A', objetivo: '−6%', plazoDias: 120 },
    inversionTipica: { tipo: 'tiempo de compras', rangoPctCostoProceso: [0, 0.02] },
    rampaMeses: 2, esfuerzo: 2,
    riesgos: [
      { riesgo: 'Obtener precio a costa de nivel de servicio, trasladando el costo a operaciones', probabilidad: 'alta', mitigacion: 'Incluir indicadores de servicio vinculantes en el contrato y medirlos. Un ahorro que genera reprocesos no es un ahorro.' },
      { riesgo: 'Incurrir en coordinación con competidores al compartir referencias de precio', probabilidad: 'baja', mitigacion: 'Obtener referencias de fuentes públicas o de los propios proveedores, nunca mediante intercambio con competidores (art. 53 LFCE).' },
    ],
    señalDeAborto: 'Si el proveedor no cede y el costo de cambio supera el ahorro potencial, documentar y cerrar sin desgastar la relación.',
  },

  /* ───────────────────────────── PERSONAS ───────────────────────────── */
  corregir_sobrecarga: {
    nombre: 'Corregir el déficit estructural de capacidad',
    objetivo: 'Llevar la carga de trabajo a un rango sostenible y cumplir la obligación normativa de prevención de riesgo psicosocial.',
    mecanismo:
      'La sobrecarga sostenida produce, en este orden: caída de calidad, aumento de errores, deterioro de salud y rotación. ' +
      'La rotación devuelve el problema amplificado, porque el reemplazo cuesta entre medio y dos salarios anuales y el ' +
      'conocimiento perdido no se recupera con la contratación. Es un ciclo que se agrava solo.',
    pasos: [
      'Validar la medición de carga con registro real de tiempo durante al menos cuatro semanas, incluyendo picos.',
      'Depurar la demanda antes de agregar capacidad: eliminar reportes que nadie usa, juntas sin decisión y retrabajos evitables. Suele liberar entre 10% y 20%.',
      'Redistribuir hacia la capacidad ociosa identificada en el mismo diagnóstico.',
      'Solo si persiste el déficit, ampliar plantilla o contratar apoyo temporal.',
      'Documentar la evaluación de factores de riesgo psicosocial y las medidas de control conforme a la NOM-035-STPS-2018.',
    ],
    kpi: { nombre: 'Utilización (demanda/capacidad contratada)', objetivo: '≤1.0', plazoDias: 90 },
    inversionTipica: { tipo: 'capacidad adicional o redistribución', rangoPctCostoProceso: [0, 0.20] },
    rampaMeses: 2, esfuerzo: 3,
    riesgos: [
      { riesgo: 'Contratar sin depurar primero la demanda, institucionalizando el trabajo innecesario', probabilidad: 'alta', mitigacion: 'Ejecutar el paso 2 antes del paso 4, sin excepción.' },
      { riesgo: 'Resolver la sobrecarga con tiempo extra permanente', probabilidad: 'alta', mitigacion: 'El tiempo extra es una solución de pico, no de estructura. Como respuesta permanente incumple los límites del artículo 66 de la LFT y sostiene el riesgo de salud.' },
    ],
    señalDeAborto: 'No aplica. Existe una obligación normativa de atender el riesgo psicosocial; la medida puede cambiar de forma, no de existencia.',
  },
  reasignar_capacidad_humana: {
    nombre: 'Reasignar capacidad hacia el déficit detectado',
    objetivo: 'Cerrar el déficit de una función con la holgura de otra, sin costo de terminación.',
    mecanismo:
      'La reasignación captura el mismo valor económico que una reducción, pero conserva el conocimiento institucional, ' +
      'evita el costo de terminación y elimina la exposición legal. En valor presente es la opción dominante siempre que exista déficit que absorber.',
    pasos: [
      'Mapear la brecha de competencias entre la función origen y la función destino.',
      'Acordar el cambio con la persona por escrito: una modificación sustancial de condiciones sin consentimiento habilita la acción rescisoria del artículo 51 de la LFT.',
      'Ejecutar la capacitación de transición con un responsable y un plazo definidos.',
      'Actualizar la descripción de puesto y la matriz de responsabilidades.',
      'Medir a los 90 días que el déficit efectivamente se cerró.',
    ],
    kpi: { nombre: 'Utilización de ambas funciones', objetivo: 'entre 0.75 y 1.0', plazoDias: 120 },
    inversionTipica: { tipo: 'capacitación de transición', rangoPctCostoProceso: [0.02, 0.08] },
    rampaMeses: 2, esfuerzo: 2,
    riesgos: [
      { riesgo: 'Que la reasignación se perciba como degradación y provoque la salida voluntaria de la persona', probabilidad: 'media', mitigacion: 'Comunicar el cambio en términos de alcance y desarrollo, con acuerdo previo y por escrito. Una reasignación impuesta que fuerza la renuncia configura despido indirecto.' },
      { riesgo: 'Brecha de competencias mayor a la estimada', probabilidad: 'media', mitigacion: 'Periodo de acompañamiento con revisión a los 30 días y ruta alternativa definida.' },
    ],
    señalDeAborto: 'Si a los 90 días la función destino no mejora y la origen se deteriora, revertir: las funciones no eran compatibles.',
  },
  redimensionar_funcion: {
    nombre: 'Redimensionar la función',
    objetivo: 'Ajustar la capacidad contratada a la demanda real, agotando primero toda alternativa a la separación.',
    mecanismo:
      'El ahorro de una reducción es real solo cuando se calcula neto del costo de terminación, de la pérdida de conocimiento ' +
      'y de la exposición legal. Con frecuencia el periodo de recuperación supera el año, lo que vuelve preferible la ampliación de alcance.',
    pasos: [
      'AGOTAR ALTERNATIVAS: ampliación de alcance, reasignación, reducción de jornada por acuerdo, redistribución de la demanda.',
      'Si ninguna es viable, obtener opinión escrita de abogado laboralista sobre la vía aplicable y el costo por persona.',
      'Calcular el costo completo en los tres escenarios: convenio, liquidación conforme a ley y litigio adverso.',
      'Preferir la vía del convenio ratificado ante la autoridad conciliadora: es la única que cierra la contingencia con certeza.',
      'Ejecutar con acompañamiento (recolocación, carta de recomendación, pago íntegro y oportuno) y presentar los avisos de baja ante el IMSS.',
    ],
    kpi: { nombre: 'Costo laboral / ingreso, con calidad de servicio sostenida', objetivo: 'reducción sin deterioro de servicio', plazoDias: 180 },
    inversionTipica: { tipo: 'costo de terminación', rangoPctCostoProceso: [0.5, 2.0] },
    rampaMeses: 3, esfuerzo: 5,
    riesgos: [
      { riesgo: 'Que la demanda medida haya sido no representativa y la capacidad resulte necesaria', probabilidad: 'media', mitigacion: 'Medir la carga durante un ciclo completo que incluya la estacionalidad, antes de decidir. Revertir una reducción cuesta más que haberla pospuesto.' },
      { riesgo: 'Litigio por defectos de forma', probabilidad: 'media', mitigacion: 'Validación jurídica previa obligatoria y ratificación del convenio ante la autoridad competente.' },
      { riesgo: 'Daño a la confianza del equipo que permanece', probabilidad: 'alta', mitigacion: 'Comunicación directa sobre el criterio usado y el alcance definitivo. La incertidumbre prolongada daña más la productividad que la decisión misma.' },
    ],
    señalDeAborto: 'Si el costo esperado de terminación supera dos años del ahorro anual, la medida destruye valor: mantener la función y reconvertir su alcance.',
  },
  clarificar_responsabilidades: {
    nombre: 'Asignar responsabilidad única por resultado',
    objetivo: 'Eliminar la duplicidad asignando un único responsable por cada resultado.',
    mecanismo:
      'La difusión de responsabilidad es un fenómeno documentado: cuando dos personas son responsables de lo mismo, ' +
      'la probabilidad de que cada una actúe disminuye. El costo visible es el trabajo duplicado; el costo mayor es la tarea ' +
      'que ninguna de las dos ejecuta porque supone que la otra lo hará.',
    pasos: [
      'Listar los resultados (no las tareas) que ambos puestos producen.',
      'Asignar por cada resultado un único responsable (A), consultados y informados según corresponda.',
      'Documentar la matriz y comunicarla a todos los interesados, no solo a los dos puestos.',
      'Revisar a los 60 días qué resultados siguen sin dueño efectivo.',
    ],
    kpi: { nombre: 'Índice de Jaccard entre descripciones de puesto', objetivo: '<0.25', plazoDias: 60 },
    inversionTipica: { tipo: 'taller de diseño organizacional', rangoPctCostoProceso: [0, 0.02] },
    rampaMeses: 1, esfuerzo: 2,
    riesgos: [{ riesgo: 'Que la matriz se documente pero no cambie el comportamiento', probabilidad: 'alta', mitigacion: 'Vincular la asignación a la revisión de desempeño y a los foros de decisión donde efectivamente se rinde cuenta.' }],
    señalDeAborto: 'Si tras 60 días persisten resultados sin dueño, el problema es de autoridad, no de documentación: escalar al nivel que puede asignarla.',
  },
  transferir_practicas: {
    nombre: 'Transferir las prácticas de la unidad frontera',
    objetivo: 'Cerrar la brecha de eficiencia elevando a los rezagados hacia la práctica del mejor.',
    mecanismo:
      'Cuando existe dispersión de desempeño dentro de un grupo comparable, la solución ya existe dentro de la organización. ' +
      'Transferirla es más barato, más rápido y más confiable que diseñar una nueva, porque ya está probada en el contexto real.',
    pasos: [
      'Verificar primero la comparabilidad: mezcla de trabajo, territorio, antigüedad de cartera y herramientas disponibles.',
      'Observar directamente el trabajo de la unidad frontera y documentar QUÉ hace distinto, no qué dice que hace.',
      'Probar la transferencia con una sola unidad rezagada antes de generalizar.',
      'Medir el efecto y escalar solo si se confirma.',
    ],
    kpi: { nombre: 'Dispersión de eficiencia del grupo (θ mínimo)', objetivo: '≥0.75', plazoDias: 120 },
    inversionTipica: { tipo: 'acompañamiento y capacitación', rangoPctCostoProceso: [0.02, 0.06] },
    rampaMeses: 2, esfuerzo: 3,
    riesgos: [
      { riesgo: 'Que la diferencia provenga de condiciones y no de prácticas', probabilidad: 'alta', mitigacion: 'Verificar comparabilidad antes de cualquier intervención. Exigir a alguien que iguale un resultado obtenido en condiciones distintas es injusto e ineficaz.' },
      { riesgo: 'Penalizar a los rezagados en lugar de habilitarlos', probabilidad: 'media', mitigacion: 'Enmarcar la intervención como transferencia de método y no como evaluación. El enfoque punitivo suprime la información que se necesita para diagnosticar.' },
    ],
    señalDeAborto: 'Si tras verificar la comparabilidad las diferencias persisten y no son de método, el modelo DEA de una sola dimensión es inadecuado: reevaluar con múltiples entradas y salidas.',
  },

  /* ──────────────────────────── ESTRUCTURA ──────────────────────────── */
  aplanar_capa: {
    nombre: 'Absorber la capa de baja densidad',
    objetivo: 'Reducir la latencia de decisión eliminando un salto de retransmisión.',
    mecanismo:
      'Cada capa entre la detección de un problema y la autoridad para resolverlo añade un ciclo de espera y una oportunidad ' +
      'de distorsión. Absorber una capa reduce la latencia de decisión de forma proporcional.',
    pasos: [
      'Verificar que el rol no tenga contenido técnico propio ni función de formación de sucesor.',
      'Reubicar a la persona en un rol de contribución individual de alto valor antes de considerar cualquier otra vía.',
      'Transferir los reportes al nivel superior verificando que su tramo resultante quede dentro del rango gestionable.',
      'Redistribuir explícitamente las decisiones que esa capa tomaba: si no se reasignan, quedan sin dueño.',
    ],
    kpi: { nombre: 'Tiempo de ciclo de decisión', objetivo: '−30%', plazoDias: 180 },
    inversionTipica: { tipo: 'reubicación o terminación', rangoPctCostoProceso: [0, 1.5] },
    rampaMeses: 3, esfuerzo: 5,
    riesgos: [
      { riesgo: 'Que el tramo del superior quede excesivo y se traslade el cuello de botella', probabilidad: 'alta', mitigacion: 'Calcular el tramo resultante antes de ejecutar. Aplanar hacia un tramo de 20 reportes no mejora nada.' },
      { riesgo: 'Pérdida de conocimiento operativo no documentado', probabilidad: 'media', mitigacion: 'Documentar decisiones y criterios antes del cambio, no después.' },
    ],
    señalDeAborto: 'Si el tiempo de ciclo de decisión no mejora a los 180 días, la latencia provenía del proceso de autorización y no del número de capas.',
  },
  dividir_tramo: {
    nombre: 'Dividir el tramo de control excesivo',
    objetivo: 'Restituir capacidad real de supervisión y desarrollo.',
    mecanismo: 'Con un tramo excesivo, el tiempo por colaborador tiende a cero y la supervisión se vuelve nominal. Dividir restituye la posibilidad material de gestionar.',
    pasos: [
      'Agrupar los reportes por afinidad de trabajo, no por conveniencia administrativa.',
      'Designar líderes de subgrupo desde el propio equipo antes de contratar externamente.',
      'Definir explícitamente qué decisiones delega el nivel superior; sin delegación real, la división solo agrega una capa.',
    ],
    kpi: { nombre: 'Tramo de control máximo', objetivo: '≤9 en trabajo de conocimiento', plazoDias: 120 },
    inversionTipica: { tipo: 'promoción interna o contratación', rangoPctCostoProceso: [0.05, 0.20] },
    rampaMeses: 2, esfuerzo: 3,
    riesgos: [{ riesgo: 'Crear una capa sin delegar decisiones, sumando latencia sin ganar supervisión', probabilidad: 'alta', mitigacion: 'Definir por escrito las decisiones delegadas ANTES de nombrar. Sin esto, la división produce exactamente el problema del hallazgo de capa parasitaria.' }],
    señalDeAborto: 'Si tras la división el superior sigue tomando las mismas decisiones, revertir: no hubo delegación, solo costo adicional.',
  },
  aplanar_organizacion: {
    nombre: 'Reducir capas de coordinación',
    objetivo: 'Acercar la profundidad observada a la profundidad teórica del árbol de reporte.',
    mecanismo: 'La capacidad productiva perdida en coordinación crece con el número de capas. Reducirlas libera capacidad sin reducir personal, porque el tiempo recuperado se devuelve al trabajo.',
    pasos: [
      'Mapear el ciclo de decisión completo de los tres procesos más críticos y contar las autorizaciones reales.',
      'Elevar los umbrales de autorización: la mayoría de las aprobaciones de bajo monto cuestan más en tiempo que el riesgo que previenen.',
      'Consolidar capas con tramo menor a 3 conforme al playbook de absorción de capa.',
      'Medir el tiempo de ciclo de decisión antes y después, no la satisfacción percibida.',
    ],
    kpi: { nombre: 'Capas entre el frente y la decisión', objetivo: 'profundidad teórica + 1', plazoDias: 270 },
    inversionTipica: { tipo: 'rediseño organizacional', rangoPctCostoProceso: [0.05, 0.30] },
    rampaMeses: 6, esfuerzo: 8,
    riesgos: [
      { riesgo: 'Ejecutar el aplanamiento como reducción de personal encubierta, destruyendo la confianza', probabilidad: 'alta', mitigacion: 'Declarar explícitamente el alcance desde el inicio y respetarlo. Un aplanamiento que se descubre como recorte contamina toda iniciativa futura de cambio.' },
      { riesgo: 'Eliminar controles necesarios junto con los innecesarios', probabilidad: 'media', mitigacion: 'Distinguir los controles de cumplimiento obligatorio (fiscales, laborales, antilavado) de los controles de costumbre. Los primeros no son negociables.' },
    ],
    señalDeAborto: 'Si aparecen incidentes de control en los 90 días posteriores, restituir el control específico afectado, no el esquema completo.',
  },
  eliminar_spof: {
    nombre: 'Eliminar puntos únicos de falla',
    objetivo: 'Garantizar continuidad operativa ante la ausencia de cualquier persona.',
    mecanismo: 'La continuidad no depende de que nadie se ausente —eso es imposible de sostener— sino de que la ausencia no interrumpa. Documentación y respaldo convierten un evento crítico en un evento administrable.',
    pasos: [
      'Documentar los procesos críticos con el nivel de detalle que permita a un tercero ejecutarlos.',
      'Designar y formar un suplente por cada posición crítica.',
      'PROBAR el respaldo con una ausencia planificada real: un suplente no verificado no es un respaldo.',
      'Revisar los accesos y facultades para que el suplente pueda efectivamente actuar.',
    ],
    kpi: { nombre: 'Posiciones críticas con respaldo probado', objetivo: '100%', plazoDias: 120 },
    inversionTipica: { tipo: 'documentación y formación cruzada', rangoPctCostoProceso: [0.02, 0.06] },
    rampaMeses: 2, esfuerzo: 3,
    riesgos: [{ riesgo: 'Documentar sin probar', probabilidad: 'alta', mitigacion: 'La prueba con ausencia real es obligatoria. Un manual no leído bajo presión no es un respaldo.' }],
    señalDeAborto: 'No aplica: el riesgo de continuidad no admite aplazamiento indefinido.',
  },

  /* ──────────────────────────── COMERCIAL ───────────────────────────── */
  corregir_economia_unitaria: {
    nombre: 'Corregir la unidad económica antes de escalar',
    objetivo: 'Llevar LTV/CAC por encima de 3× y el periodo de recuperación por debajo de 12 meses.',
    mecanismo:
      'Las tres palancas no son equivalentes. Como LTV = (ARPU × margen)/churn, reducir el churn tiene efecto hiperbólico: ' +
      'bajarlo 20% eleva el LTV 25%. Elevar margen o reducir CAC tienen efecto lineal. Por eso la secuencia correcta es ' +
      'retención, luego margen, luego CAC.',
    pasos: [
      'CONGELAR el aumento de inversión en adquisición hasta corregir la unidad: escalar ahora multiplica la pérdida.',
      'Segmentar LTV/CAC por canal y por segmento: el agregado casi siempre esconde segmentos rentables mezclados con destructivos.',
      'Concentrar la adquisición en los segmentos con razón superior a 3× y suspenderla en los negativos.',
      'Atacar el churn del segmento rentable: es la palanca de mayor apalancamiento matemático.',
      'Recalcular mensualmente con cohortes reales, no con promedios de la base completa.',
    ],
    kpi: { nombre: 'LTV/CAC por segmento', objetivo: '≥3.0', plazoDias: 180 },
    inversionTipica: { tipo: 'analítica de cohortes y rediseño de oferta', rangoPctCostoProceso: [0.03, 0.10] },
    rampaMeses: 3, esfuerzo: 3,
    riesgos: [
      { riesgo: 'Seguir escalando mientras se "arregla"', probabilidad: 'alta', mitigacion: 'El congelamiento del paso 1 es la medida de mayor retorno inmediato de todo el playbook, y la que más resistencia genera.' },
      { riesgo: 'LTV sobrestimado por churn temprano no modelado', probabilidad: 'alta', mitigacion: 'Calcular el LTV con curva de retención por cohorte real, no con churn constante. El modelo de churn constante sobrestima cuando el abandono se concentra en los primeros meses.' },
    ],
    señalDeAborto: 'Si ningún segmento alcanza 3× tras la segmentación completa, el problema es de propuesta de valor o de precio, no de eficiencia comercial.',
  },
  escalar_adquisicion: {
    nombre: 'Escalar adquisición con disciplina de umbral',
    objetivo: 'Capturar mercado sin bajar de 3× en la razón LTV/CAC.',
    mecanismo: 'Con razón alta existe margen para invertir más por cliente y seguir creando valor. El límite es el punto donde el CAC marginal lleva la razón al umbral.',
    pasos: [
      'Verificar que exista demanda no atendida y capacidad de entrega: escalar sin capacidad de servicio convierte adquisición en churn.',
      'Incrementar la inversión por tramos del 20%, midiendo el CAC MARGINAL, no el promedio.',
      'Detener el incremento cuando el CAC marginal lleve la razón por debajo de 3×.',
    ],
    kpi: { nombre: 'CAC marginal y LTV/CAC', objetivo: 'razón ≥3.0 con inversión creciente', plazoDias: 180 },
    inversionTipica: { tipo: 'inversión comercial incremental', rangoPctCostoProceso: [0.10, 0.40] },
    rampaMeses: 2, esfuerzo: 3,
    riesgos: [{ riesgo: 'Medir el CAC promedio en lugar del marginal y sobre-escalar', probabilidad: 'alta', mitigacion: 'El CAC promedio oculta los rendimientos decrecientes. Solo el marginal indica cuándo detenerse.' }],
    señalDeAborto: 'Si el CAC marginal sube más rápido que proporcionalmente en dos tramos consecutivos, el canal está saturado: detener y diversificar.',
  },
  reducir_churn: {
    nombre: 'Reducir la fuga de clientes por causa diagnosticada',
    objetivo: 'Disminuir el churn mensual atacando su causa específica, previamente segmentada.',
    mecanismo:
      'El churn temprano y el tardío son padecimientos distintos con tratamientos opuestos. El temprano (primeros 90 días) indica ' +
      'desajuste entre la promesa y la entrega, o falla de activación. El tardío indica erosión del valor percibido. ' +
      'Aplicar el tratamiento del uno al otro no solo no funciona: consume el presupuesto que el correcto necesitaba.',
    pasos: [
      'Segmentar el churn por antigüedad, canal de adquisición y motivo declarado. Sin esta segmentación, cualquier intervención es una apuesta.',
      'Si domina el temprano: revisar la promesa comercial contra lo entregado, y rediseñar el proceso de activación.',
      'Si domina el tardío: instrumentar señales anticipadas de abandono e intervenir antes de la baja, no después.',
      'Implementar la salida instrumentada: motivo estructurado capturado en el momento de la baja.',
      'Medir la retención por cohorte, nunca por promedio de la base, que enmascara el deterioro de las cohortes nuevas.',
    ],
    kpi: { nombre: 'Retención a 12 meses por cohorte', objetivo: '+5 puntos porcentuales', plazoDias: 180 },
    inversionTipica: { tipo: 'éxito del cliente e instrumentación', rangoPctCostoProceso: [0.03, 0.12] },
    rampaMeses: 3, esfuerzo: 3,
    riesgos: [
      { riesgo: 'Retener con descuento, degradando el LTV que se pretendía proteger', probabilidad: 'alta', mitigacion: 'El descuento de retención reduce el ARPU y por tanto el LTV. Medir siempre el efecto neto sobre el LTV, no sobre la tasa de retención.' },
      { riesgo: 'Intervenir sobre el churn agregado sin segmentar', probabilidad: 'alta', mitigacion: 'La segmentación del paso 1 es condición previa. Sin ella, el tratamiento es aleatorio.' },
    ],
    señalDeAborto: 'Si la retención mejora pero el LTV por cohorte no, se está reteniendo con descuento: revertir el mecanismo.',
  },
  diversificar_cartera: {
    nombre: 'Reducir la dependencia del cliente principal',
    objetivo: 'Bajar el HHI por debajo de 0.25 y la cuota del cliente mayor por debajo del 20%.',
    mecanismo:
      'La concentración cobra dos veces: como riesgo de continuidad y como pérdida silenciosa de margen en cada renegociación, ' +
      'porque la contraparte conoce la asimetría. Diversificar restituye poder de negociación antes incluso de reducir el riesgo.',
    pasos: [
      'Blindar la relación principal por contrato: vigencia, preaviso de terminación y alcance, sin ceder condiciones por miedo.',
      'Establecer una meta explícita de ingreso proveniente de clientes nuevos, con responsable y seguimiento.',
      'Identificar segmentos adyacentes donde la propuesta actual sea aplicable con mínima adaptación: es la vía más rápida.',
      'Medir el HHI trimestralmente como indicador de dirección.',
    ],
    kpi: { nombre: 'HHI de la cartera', objetivo: '<0.25', plazoDias: 365 },
    inversionTipica: { tipo: 'desarrollo comercial', rangoPctCostoProceso: [0.05, 0.20] },
    rampaMeses: 6, esfuerzo: 5,
    riesgos: [
      { riesgo: 'Desatender al cliente principal mientras se diversifica y perderlo antes de tener sustituto', probabilidad: 'media', mitigacion: 'Asignar equipos distintos a retención y a desarrollo. La diversificación no puede financiarse con la atención del cliente que sostiene el ingreso.' },
      { riesgo: 'Aceptar clientes de peor economía unitaria con tal de diversificar', probabilidad: 'media', mitigacion: 'Exigir LTV/CAC ≥3× también a los clientes nuevos. Diversificar hacia pérdidas empeora ambos problemas.' },
    ],
    señalDeAborto: 'Si el desarrollo de nuevos clientes muestra una economía unitaria peor que la del cliente concentrado, detener y corregir primero la propuesta.',
  },
  reasignar_inversion_canal: {
    nombre: 'Reasignar inversión por contribución marginal',
    objetivo: 'Eliminar la inversión por debajo del ROAS de equilibrio y redistribuirla por incrementos medidos.',
    mecanismo:
      'Por debajo del ROAS de equilibrio (1/margen bruto), cada peso invertido devuelve menos de un peso de margen. ' +
      'Suspender ahí libera caja de forma inmediata. Redistribuir debe ser gradual porque los canales tienen rendimientos decrecientes.',
    pasos: [
      'Verificar la atribución antes de decidir: un canal de descubrimiento puede mostrar ROAS bajo y ser la causa de conversiones atribuidas a otro.',
      'Suspender la inversión bajo equilibrio en el canal con peor contribución y observar el efecto agregado durante un ciclo completo.',
      'Si el ingreso total no cae proporcionalmente, la atribución estaba sobrestimando ese canal: confirmar la suspensión.',
      'Reasignar en tramos del 25% al canal de mejor contribución, midiendo la contribución MARGINAL en cada tramo.',
      'Detener en cuanto el ROAS marginal del canal receptor toque el equilibrio.',
    ],
    kpi: { nombre: 'Contribución marginal agregada de la mezcla', objetivo: 'positiva en todos los canales', plazoDias: 90 },
    inversionTipica: { tipo: 'sin desembolso adicional; es reasignación', rangoPctCostoProceso: [0, 0.02] },
    rampaMeses: 1, esfuerzo: 2,
    riesgos: [
      { riesgo: 'Reasignar el 100% de golpe y saturar el canal receptor', probabilidad: 'alta', mitigacion: 'Los tramos del 25% con medición intermedia son obligatorios: el rendimiento marginal decrece al agotarse la audiencia de mayor intención.' },
      { riesgo: 'Cortar un canal de descubrimiento por un modelo de atribución de último contacto', probabilidad: 'alta', mitigacion: 'Ejecutar el paso 2 como prueba de apagado y observar el efecto sobre el ingreso TOTAL, no sobre el atribuido.' },
    ],
    señalDeAborto: 'Si al suspender el canal el ingreso total cae más que el ingreso que se le atribuía, restituir de inmediato: el modelo de atribución era incorrecto.',
  },
  ajustar_precio: {
    nombre: 'Ajustar el precio en régimen inelástico',
    objetivo: 'Capturar el margen disponible mediante incrementos graduales y medidos.',
    mecanismo:
      'Con |ε| < 1, el aumento porcentual de precio supera la caída porcentual de volumen, por lo que el ingreso crece. ' +
      'El efecto sobre el margen es aún mayor que sobre el ingreso, porque el precio adicional no tiene costo variable asociado. ' +
      'Es la única palanca de este informe que mejora el resultado sin requerir inversión ni cambio operativo.',
    pasos: [
      'Validar la elasticidad con las salvedades del hallazgo: descartar que las variaciones de precio observadas hayan coincidido con estacionalidad, promoción o movimientos de la competencia.',
      'Incrementar entre 3% y 5% en un segmento acotado y medir volumen durante un ciclo completo de compra.',
      'Confirmar la elasticidad con el dato nuevo y repetir el incremento solo si se mantiene el régimen inelástico.',
      'Comunicar el ajuste con anticipación y respetar los precios pactados en contratos vigentes.',
      'Fijar el precio de forma unilateral, sin comunicación ni coordinación alguna con competidores.',
    ],
    kpi: { nombre: 'Margen de contribución total', objetivo: '+5%', plazoDias: 120 },
    inversionTipica: { tipo: 'sin desembolso', rangoPctCostoProceso: [0, 0.01] },
    rampaMeses: 1, esfuerzo: 2,
    riesgos: [
      { riesgo: 'Elasticidad mal estimada por variable omitida', probabilidad: 'media', mitigacion: 'Incremento gradual en segmento acotado con medición, en lugar de ajuste general. El costo de un error acotado es recuperable.' },
      { riesgo: 'Reacción de la competencia', probabilidad: 'media', mitigacion: 'Monitorear precios públicos de mercado. Ajustar unilateralmente si es necesario, NUNCA mediante comunicación o acuerdo con competidores (art. 53 LFCE, nulidad de pleno derecho).' },
      { riesgo: 'Incumplir contratos con precio pactado', probabilidad: 'media', mitigacion: 'Aplicar el ajuste solo a nuevas contrataciones y renovaciones, respetando la vigencia de lo pactado.' },
    ],
    señalDeAborto: 'Si el volumen cae más que proporcionalmente en la prueba acotada, la demanda es elástica en ese rango: revertir y no generalizar.',
  },
  diferenciar_oferta: {
    nombre: 'Reducir la elasticidad mediante diferenciación',
    objetivo: 'Salir de la competencia por precio construyendo atributos que el cliente valore y no pueda sustituir con facilidad.',
    mecanismo: 'La elasticidad mide la sustituibilidad percibida. Reducirla requiere que la oferta deje de ser percibida como intercambiable, lo que traslada la conversación del precio al valor.',
    pasos: [
      'Identificar, con clientes reales, los atributos por los que pagarían más: no suponerlos internamente.',
      'Construir el atributo diferenciador con mayor disposición a pagar y menor facilidad de imitación.',
      'Reestructurar la oferta en niveles para capturar distintas disposiciones a pagar.',
      'Medir la elasticidad de nuevo tras la diferenciación para verificar que efectivamente bajó.',
    ],
    kpi: { nombre: 'Elasticidad precio |ε|', objetivo: '<1.0', plazoDias: 270 },
    inversionTipica: { tipo: 'desarrollo de producto o servicio', rangoPctCostoProceso: [0.10, 0.35] },
    rampaMeses: 6, esfuerzo: 5,
    riesgos: [{ riesgo: 'Diferenciar en atributos que el cliente no valora', probabilidad: 'alta', mitigacion: 'Validar la disposición a pagar con clientes reales antes de construir, no después. Es el error más caro del desarrollo de producto.' }],
    señalDeAborto: 'Si la elasticidad no baja tras la diferenciación, el atributo no era valorado: revertir la inversión y revalidar con clientes.',
  },
  reequilibrar_crecimiento: {
    nombre: 'Reequilibrar crecimiento y rentabilidad',
    objetivo: 'Alcanzar el umbral de la Regla del 40 eligiendo deliberadamente la palanca dominante.',
    mecanismo: 'El intercambio entre crecimiento y margen es legítimo, pero debe ser una elección explícita. Estar por debajo del umbral indica que se paga el costo del crecimiento sin obtener su velocidad.',
    pasos: [
      'Decidir explícitamente cuál es la estrategia: crecer o rentabilizar. Intentar ambas simultáneamente con recursos limitados es la causa habitual de no lograr ninguna.',
      'Si la elección es crecer: concentrar recursos en los segmentos con mejor economía unitaria y aceptar margen temporalmente menor.',
      'Si la elección es rentabilizar: ejecutar los hallazgos de gasto y estructura de este informe antes de tocar la inversión comercial.',
      'Comunicar la elección internamente: la ambigüedad estratégica se traduce en asignación incoherente de recursos.',
    ],
    kpi: { nombre: 'Crecimiento + margen EBITDA', objetivo: '≥40 puntos', plazoDias: 365 },
    inversionTipica: { tipo: 'reasignación estratégica', rangoPctCostoProceso: [0, 0.10] },
    rampaMeses: 6, esfuerzo: 5,
    riesgos: [{ riesgo: 'No elegir y perseguir ambas metas', probabilidad: 'alta', mitigacion: 'Forzar la decisión con una meta numérica única por periodo. La ambigüedad es la falla más común.' }],
    señalDeAborto: 'Si tras un año ninguna de las dos métricas mejora, el modelo de negocio tiene un problema estructural que la asignación de recursos no puede resolver.',
  },

  /* ──────────────────────────── FINANCIERO ──────────────────────────── */
  estabilizar_solvencia: {
    nombre: 'Estabilizar la posición de solvencia',
    objetivo: 'Elevar el Z-score fuera de la zona de riesgo actuando sobre sus componentes de mayor sensibilidad.',
    mecanismo:
      'El Z\'\' pondera capital de trabajo/activo con 6.56 y EBIT/activo con 6.72. Estos dos componentes concentran la mayor ' +
      'sensibilidad del índice, por lo que mejorar capital de trabajo y rentabilidad operativa mueve el resultado más rápido ' +
      'que cualquier otra acción.',
    pasos: [
      'Priorizar la liberación de capital de trabajo: es el componente de mayor peso y el de respuesta más rápida.',
      'Ejecutar primero los hallazgos de gasto de retorno inmediato, que elevan el EBIT sin inversión.',
      'Renegociar el perfil de vencimientos de la deuda para trasladar pasivo de corto a largo plazo.',
      'Recalcular el Z-score mensualmente: la frecuencia trimestral es insuficiente en zona de riesgo.',
    ],
    kpi: { nombre: "Altman Z''", objetivo: '>2.6', plazoDias: 270 },
    inversionTipica: { tipo: 'gestión financiera', rangoPctCostoProceso: [0, 0.05] },
    rampaMeses: 3, esfuerzo: 5,
    riesgos: [{ riesgo: 'Mejorar el índice con operaciones cosméticas de cierre en lugar de mejora real', probabilidad: 'media', mitigacion: 'Verificar la sostenibilidad del indicador en meses posteriores al cierre. La mejora que se revierte en enero no era mejora.' }],
    señalDeAborto: 'Si el Z-score no mejora en 270 días pese a la ejecución, corresponde una decisión de reestructura de capital, no de gestión operativa.',
  },
  extender_runway: {
    nombre: 'Extender el horizonte de liquidez',
    objetivo: 'Alcanzar al menos 12 meses de operación financiable.',
    mecanismo: 'El horizonte de liquidez determina cuánto tiempo hay para ejecutar todo lo demás. Es la restricción temporal que ordena la secuencia completa del informe.',
    pasos: [
      'Reconstruir la proyección semanal de flujo de efectivo a 13 semanas: el detalle mensual oculta los puntos de quiebre.',
      'Ejecutar de inmediato los hallazgos de liberación de caja de retorno inmediato (ciclo de efectivo, gasto sin driver).',
      'Escalonar compromisos no críticos y renegociar plazos con los proveedores de clase A.',
      'Definir los disparadores de decisión por adelantado: a qué nivel de caja se activa cada medida de contingencia.',
    ],
    kpi: { nombre: 'Meses de horizonte de liquidez', objetivo: '≥12', plazoDias: 90 },
    inversionTipica: { tipo: 'gestión de tesorería', rangoPctCostoProceso: [0, 0.02] },
    rampaMeses: 1, esfuerzo: 2,
    riesgos: [{ riesgo: 'Extender el horizonte difiriendo pagos y trasladando el problema al trimestre siguiente', probabilidad: 'alta', mitigacion: 'Distinguir entre reducción real de la quema y diferimiento. El diferimiento es válido como puente, nunca como solución.' }],
    señalDeAborto: 'Si el horizonte no llega a 6 meses tras agotar las medidas operativas, corresponde una decisión de financiamiento o de reestructura, y debe tomarse con anticipación, no en el último mes.',
  },
  acelerar_ciclo_efectivo: {
    nombre: 'Acelerar el ciclo de conversión de efectivo',
    objetivo: 'Reducir el ciclo en al menos 10 días para liberar capital de trabajo.',
    mecanismo:
      'Cada día de reducción del ciclo libera ingresos/365 de caja. Es financiamiento interno sin costo, sin dilución y sin ' +
      'negociación bancaria: la fuente de capital más barata disponible para cualquier empresa.',
    pasos: [
      'Atacar el componente dominante identificado en el hallazgo: cobranza o inventario, no ambos a la vez.',
      'Si domina la cobranza: facturar el mismo día de la entrega, automatizar el recordatorio antes del vencimiento (no después) y escalar la gestión por antigüedad.',
      'Si domina el inventario: aplicar clasificación ABC y calcular el lote económico para los artículos de clase A.',
      'Extender el plazo de pago a proveedores solo mediante negociación explícita, nunca por retraso unilateral, que destruye la relación y el poder de negociación futuro.',
    ],
    kpi: { nombre: 'Ciclo de conversión de efectivo (días)', objetivo: '−10 días', plazoDias: 120 },
    inversionTipica: { tipo: 'proceso y automatización de cobranza', rangoPctCostoProceso: [0.01, 0.04] },
    rampaMeses: 2, esfuerzo: 2,
    riesgos: [
      { riesgo: 'Presionar la cobranza al punto de dañar relaciones comerciales valiosas', probabilidad: 'media', mitigacion: 'Segmentar por valor del cliente y por antigüedad de la deuda. La gestión temprana y cordial recupera más que la presión tardía.' },
      { riesgo: 'Retrasar pagos a proveedores de forma unilateral', probabilidad: 'alta', mitigacion: 'Negociar plazos, no incumplirlos. El retraso unilateral se paga con precio en la siguiente negociación y con prioridad en el siguiente desabasto.' },
    ],
    señalDeAborto: 'Si la reducción del ciclo genera pérdida de clientes o de proveedores estratégicos, el costo supera al beneficio: recalibrar la intensidad.',
  },
  reestructurar_deuda: {
    nombre: 'Reestructurar el perfil de deuda',
    objetivo: 'Elevar la cobertura de intereses por encima de 2× y alinear vencimientos con la generación de flujo.',
    mecanismo: 'La cobertura mejora por dos vías: elevando el EBIT o reduciendo el servicio financiero. La segunda es más rápida y está bajo control directo mediante negociación.',
    pasos: [
      'Inventariar la deuda: tasa, plazo, garantías y cláusulas restrictivas (covenants) de cada instrumento.',
      'Identificar los covenants próximos a incumplirse y anticipar la conversación con el acreedor ANTES del incumplimiento.',
      'Negociar la extensión de plazos y la reducción de tasa presentando el plan de este informe como sustento del flujo futuro.',
      'Evitar nueva deuda de corto plazo para cubrir servicio corriente: es el mecanismo típico de aceleración de una crisis de liquidez.',
    ],
    kpi: { nombre: 'Cobertura de intereses (EBIT/gastos financieros)', objetivo: '≥2.0×', plazoDias: 180 },
    inversionTipica: { tipo: 'costos de reestructura', rangoPctCostoProceso: [0.01, 0.05] },
    rampaMeses: 3, esfuerzo: 3,
    riesgos: [
      { riesgo: 'Incumplir un covenant sin haber anticipado la conversación con el acreedor', probabilidad: 'media', mitigacion: 'Anticipar siempre. Un acreedor informado antes negocia; uno informado después ejecuta.' },
      { riesgo: 'Refinanciar a corto plazo, agravando el perfil', probabilidad: 'media', mitigacion: 'Verificar que la reestructura extienda el plazo promedio ponderado, no solo que difiera el vencimiento más cercano.' },
    ],
    señalDeAborto: 'Si los acreedores no aceptan reestructurar y la cobertura sigue por debajo de 1.5×, corresponde asesoría especializada en insolvencia, con anticipación.',
  },
};

export default PLAYBOOKS;
