
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido. Utiliza POST."
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: "La IA no está configurada en el servidor."
    });
  }

  try {
    const perfil = req.body?.perfil;

    if (typeof perfil !== "string" || !perfil.trim()) {
      return res.status(400).json({
        error: "Escribe información de tu perfil para analizarlo."
      });
    }

    if (perfil.length > 6000) {
      return res.status(400).json({
        error: "El perfil es demasiado largo. Reduce el texto."
      });
    }

    const respuesta = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text: "Eres un orientador profesional especializado en empleabilidad. Responde en español claro y profesional. Analiza solo los datos proporcionados. Identifica fortalezas, habilidades por desarrollar, temas de formación recomendados y próximos pasos. No inventes experiencia, títulos, certificaciones ni cursos verificados. Aclara que las recomendaciones son orientativas."
              }
            ]
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    "Analiza este perfil y organiza tu respuesta en cuatro apartados: 1. Fortalezas, 2. Habilidades por desarrollar, 3. Cursos o temas de formación recomendados, 4. Próximos pasos.\n\nPerfil profesional:\n" +
                    perfil.trim()
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1200
          }
        })
      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      console.error(
        "Error de Gemini:",
        datos.error?.status || respuesta.status
      );

      return res.status(502).json({
        error: "No se pudo completar el análisis con la IA. Inténtalo más tarde."
      });
    }

    const analisis = datos.candidates?.[0]?.content?.parts
      ?.map((parte) => parte.text || "")
      .join("\n")
      .trim();

    if (!analisis) {
      return res.status(502).json({
        error: "La IA no devolvió un análisis. Inténtalo de nuevo."
      });
    }

    return res.status(200).json({ analisis });
  } catch (error) {
    console.error("Error en el diagnóstico:", error);

    return res.status(500).json({
      error: "Ocurrió un error al analizar el perfil."
    });
  }
}
