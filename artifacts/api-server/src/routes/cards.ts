import { Router } from "express";
import { db } from "@workspace/db";
import { flashcardsTable } from "@workspace/db/schema";
import { eq, lte, sql } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const cards = await db
      .select()
      .from(flashcardsTable)
      .orderBy(flashcardsTable.createdAt);
    res.json(cards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error", message: "Failed to list cards" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { japanese, reading = "", english, partOfSpeech } = req.body;
    if (!japanese || !english) {
      return res.status(400).json({ error: "bad_request", message: "japanese and english are required" });
    }
    const [card] = await db
      .insert(flashcardsTable)
      .values({ japanese, reading, english, partOfSpeech: partOfSpeech ?? null })
      .returning();
    res.status(201).json(card);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error", message: "Failed to create card" });
  }
});

router.get("/lessons", async (_req, res) => {
  try {
    const cards = await db
      .select()
      .from(flashcardsTable)
      .where(eq(flashcardsTable.lessonComplete, false))
      .orderBy(flashcardsTable.createdAt);
    res.json(cards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error", message: "Failed to get lesson cards" });
  }
});

router.get("/due", async (_req, res) => {
  try {
    const now = Date.now();
    const cards = await db
      .select()
      .from(flashcardsTable)
      .where(
        sql`${flashcardsTable.lessonComplete} = true AND ${flashcardsTable.nextReview} <= ${now} AND ${flashcardsTable.srsStage} != 'burned'`
      )
      .orderBy(flashcardsTable.nextReview);
    res.json(cards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error", message: "Failed to get due cards" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      japanese,
      reading,
      english,
      partOfSpeech,
      srsStage,
      nextReview,
      totalReviews,
      correctReviews,
      incorrectReviews,
      streak,
      lastReviewed,
      lessonDirectionsCompleted,
      lessonComplete,
    } = req.body;

    const updateData: Record<string, unknown> = {};
    if (japanese !== undefined) updateData.japanese = japanese;
    if (reading !== undefined) updateData.reading = reading;
    if (english !== undefined) updateData.english = english;
    if (partOfSpeech !== undefined) updateData.partOfSpeech = partOfSpeech;
    if (srsStage !== undefined) updateData.srsStage = srsStage;
    if (nextReview !== undefined) updateData.nextReview = nextReview;
    if (totalReviews !== undefined) updateData.totalReviews = totalReviews;
    if (correctReviews !== undefined) updateData.correctReviews = correctReviews;
    if (incorrectReviews !== undefined) updateData.incorrectReviews = incorrectReviews;
    if (streak !== undefined) updateData.streak = streak;
    if (lastReviewed !== undefined) updateData.lastReviewed = lastReviewed;
    if (lessonDirectionsCompleted !== undefined) updateData.lessonDirectionsCompleted = lessonDirectionsCompleted;
    if (lessonComplete !== undefined) updateData.lessonComplete = lessonComplete;

    const [updated] = await db
      .update(flashcardsTable)
      .set(updateData)
      .where(eq(flashcardsTable.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "not_found", message: "Card not found" });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error", message: "Failed to update card" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(flashcardsTable).where(eq(flashcardsTable.id, id));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error", message: "Failed to delete card" });
  }
});

export default router;
