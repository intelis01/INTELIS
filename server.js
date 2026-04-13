import 'dotenv/config';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
const port = process.env.PORT || 3000;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(express.static('.'));
app.use(express.json());

// ── System prompt (cached) ───────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres INTELIS Advisor, un experto en análisis de inversión inmobiliaria y comercial especializado exclusivamente en Mérida, Yucatán, México. Tu conocimiento abarca las siguientes zonas: Altabrisa, Montebello, Temozón Norte, Dzityá, Centro Histórico, Cholul, Santa Gertrudis Copó, Montecristo, Miramar, Campestre, La Ceiba, Temozón Sur, Privada Cholul, Gran San Pedro Cholul, Xcumpich, y corredores como Prolongación Montejo y Periférico.

COMPORTAMIENTO:
- Siempre usa la herramienta web_search para obtener datos actualizados antes de responder
- Busca en portales: Lamudi México, Inmuebles24, Vivanuncios, Propiedades.com, Metros Cúbicos, Punto Propiedades Mérida
- Cita tus fuentes con URL y fecha de consulta
- Si no encuentras datos exactos de una zona, indícalo y usa la zona más cercana como referencia
- Todos los precios en pesos mexicanos (MXN) salvo que el usuario pida otra moneda
- El ROI anual se calcula como: (renta mensual × 12 / precio de compra) × 100
- La puntuación de inversión (1-10) considera: liquidez del mercado, tendencia de precios, infraestructura, seguridad, plusvalía histórica y proyectada

RESTRICCIONES:
- Solo analiza Mérida y área metropolitana. Si preguntan de otra ciudad, redirige amablemente.
- No inventes datos. Si no tienes información, búscala o admite que no está disponible.
- No hagas promesas de rentabilidad garantizada. Usa lenguaje de estimación ("se estima", "históricamente", "aproximadamente").

FORMATO DE RESPUESTA: Markdown estructurado. Usa ## para secciones principales, ### para zonas, **negrita** para valores numéricos clave. Incluye siempre una tabla comparativa al final.`;

// ── Build user prompt ────────────────────────────────────────────────────────
function buildUserPrompt(investmentType, zones, budget, currency) {
  const zoneList = zones && zones.length > 0 ? zones.join(', ') : 'todas las zonas principales de Mérida';
  const typeLabels = {
    residential: 'compra de propiedad residencial (casa o departamento)',
    commercial: 'apertura de negocio / inversión comercial (local o oficina)',
    mixed: 'análisis mixto (residencial + comercial)',
  };
  const typeLabel = typeLabels[investmentType] || typeLabels.residential;
  const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  return `Analiza las oportunidades de inversión en Mérida, Yucatán para: ${typeLabel}.

Zonas de interés: ${zoneList}
Presupuesto aproximado: ${currency} $${Number(budget).toLocaleString('es-MX')}
Fecha del análisis: ${today}

Busca en internet información actualizada sobre:
1. Precio promedio por m² en cada zona (compra y renta)
2. Tendencia de precios en los últimos 12 meses (% de variación)
3. Zonas de mayor crecimiento y desarrollo actual
4. Proyectos de infraestructura o desarrollo que afecten el valor de las zonas
5. ROI anual estimado por zona${investmentType !== 'residential' ? '\n6. Zonas comerciales más activas, tipos de negocios exitosos, costo de local por m²' : ''}

Responde con este formato exacto:

## Resumen del Mercado
[Estado actual del mercado inmobiliario en Mérida, tendencias generales, contexto económico]

## Análisis por Zona
[Para cada zona solicitada:]
### [Nombre de Zona]
- **Precio/m² (compra):** $X,XXX MXN
- **Precio/m² (renta):** $XX MXN/mes
- **ROI anual estimado:** X.X%
- **Tendencia 12 meses:** +X% / -X%
- **Puntuación de inversión:** X/10
- **Pros:** ...
- **Contras:** ...
- **Mejor para:** [perfil del inversionista]

## Recomendación Principal
[Recomendación específica según presupuesto de ${currency} $${Number(budget).toLocaleString('es-MX')} y tipo de inversión]

## Tabla Comparativa
[Tabla markdown comparando todas las zonas analizadas]

## Fuentes Consultadas
[Lista de fuentes con URL y fecha]`;
}

// ── /api/advisor endpoint ────────────────────────────────────────────────────
app.post('/api/advisor', async (req, res) => {
  const { investmentType, zones, budget, currency } = req.body;

  if (!budget || isNaN(budget) || Number(budget) <= 0) {
    return res.status(400).json({ error: 'Presupuesto inválido.' });
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' }, // prompt caching
        },
      ],
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
        },
      ],
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(investmentType, zones, budget, currency || 'MXN'),
        },
      ],
    });

    stream.on('text', (text) => {
      sendEvent({ type: 'text', text });
    });

    stream.on('message', (msg) => {
      sendEvent({ type: 'done', usage: msg.usage });
      res.end();
    });

    stream.on('error', (err) => {
      sendEvent({ type: 'error', message: err.message });
      res.end();
    });

  } catch (err) {
    sendEvent({ type: 'error', message: err.message || 'Error interno del servidor.' });
    res.end();
  }
});

app.listen(port, () => {
  console.log(`INTELIS Advisor corriendo en http://localhost:${port}`);
  console.log(`  → Landing:  http://localhost:${port}/`);
  console.log(`  → Advisor:  http://localhost:${port}/advisor.html`);
});
