import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { ExtractVocabularyBody } from "@workspace/api-zod";
import mammoth from "mammoth";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const router = Router();

const VOCAB_JSON_SCHEMA = `{
  "pairs": [
    {
      "japanese": "単語",
      "reading": "たんご",
      "english": "word, vocabulary",
      "partOfSpeech": "noun"
    }
  ],
  "rawText": "all the text found"
}`;

const EXTRACTION_RULES = `
Important rules:
- Extract ALL vocabulary pairs present
- If the Japanese text is already hiragana/katakana, the reading should be the same
- For compound expressions or phrases, keep them as one pair
- The english field should be concise but complete (multiple meanings separated by comma if needed)
- If you cannot find any vocabulary pairs, return an empty pairs array
- Return ONLY valid JSON, no other text`;

router.post("/extract", async (req, res) => {
  const parsed = ExtractVocabularyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { imageBase64, mimeType } = parsed.data;

  // ── DOCX path ────────────────────────────────────────────────────────────
  if (mimeType === DOCX_MIME) {
    let docText: string;
    try {
      const buffer = Buffer.from(imageBase64, "base64");
      const result = await mammoth.extractRawText({ buffer });
      docText = result.value.trim();
    } catch (err) {
      req.log.error({ err }, "mammoth docx extraction error");
      res.status(500).json({ error: "docx_parse_error", message: "Failed to read Word document" });
      return;
    }

    if (!docText) {
      res.json({ pairs: [], rawText: "" });
      return;
    }

    const prompt = `You are a Japanese language vocabulary extraction assistant. Extract all Japanese-English vocabulary pairs from the following document text.

For each vocabulary item found, provide:
1. The Japanese text (kanji/kana as written)
2. The reading in hiragana/katakana (if different from the Japanese text)
3. The English meaning/translation
4. Part of speech if identifiable (noun, verb, adjective, adverb, expression, etc.)

Return a JSON object with this exact structure:
${VOCAB_JSON_SCHEMA}
${EXTRACTION_RULES}

Document text:
${docText}`;

    let response;
    try {
      response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_completion_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });
    } catch (err) {
      req.log.error({ err }, "OpenAI API error");
      res.status(500).json({ error: "openai_error", message: "Failed to process document with AI" });
      return;
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      res.status(500).json({ error: "empty_response", message: "AI returned no content" });
      return;
    }

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      const parsed2 = JSON.parse(jsonMatch[0]) as { pairs: unknown[]; rawText: string };
      res.json({ pairs: parsed2.pairs || [], rawText: parsed2.rawText || docText });
    } catch (err) {
      req.log.error({ err, content }, "Failed to parse AI response");
      res.status(500).json({ error: "parse_error", message: "Failed to parse AI response" });
    }
    return;
  }

  // ── Image path ────────────────────────────────────────────────────────────
  const validMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  if (!validMimeTypes.includes(mimeType)) {
    res.status(400).json({ error: "invalid_mime_type", message: `Unsupported MIME type: ${mimeType}` });
    return;
  }

  const imageUrl = `data:${mimeType};base64,${imageBase64}`;

  const prompt = `You are a Japanese language vocabulary extraction assistant. Analyze this image and extract all Japanese-English vocabulary pairs you can find.

For each vocabulary item found, provide:
1. The Japanese text (kanji/kana as written)
2. The reading in hiragana/katakana (if different from the Japanese text)
3. The English meaning/translation
4. Part of speech if identifiable (noun, verb, adjective, adverb, expression, etc.)

Return a JSON object with this exact structure:
${VOCAB_JSON_SCHEMA}
${EXTRACTION_RULES}`;

  let response;
  try {
    response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
          ],
        },
      ],
    });
  } catch (err: unknown) {
    req.log.error({ err }, "OpenAI API error");
    res.status(500).json({ error: "openai_error", message: "Failed to process image with AI" });
    return;
  }

  const content = response.choices[0]?.message?.content;
  if (!content) {
    res.status(500).json({ error: "empty_response", message: "AI returned no content" });
    return;
  }

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    const parsed2 = JSON.parse(jsonMatch[0]) as { pairs: unknown[]; rawText: string };
    res.json({ pairs: parsed2.pairs || [], rawText: parsed2.rawText || "" });
  } catch (err: unknown) {
    req.log.error({ err, content }, "Failed to parse AI response as JSON");
    res.status(500).json({ error: "parse_error", message: "Failed to parse AI response" });
  }
});

export default router;
