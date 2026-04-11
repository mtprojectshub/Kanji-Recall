import { Router } from "express";
import { db } from "@workspace/db";
import { flashcardsTable, reviewSessionsTable } from "@workspace/db/schema";
import { sql, ne } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const now = Date.now();

    const cards = await db.select().from(flashcardsTable);

    const lessonsCount = cards.filter(c => !c.lessonComplete).length;
    const reviewsDueCount = cards.filter(
      c => c.lessonComplete && c.nextReview <= now && c.srsStage !== "burned"
    ).length;
    const totalCards = cards.length;
    const burnedCount = cards.filter(c => c.srsStage === "burned").length;

    const totalReviews = cards.reduce((acc, c) => acc + c.totalReviews, 0);
    const correctReviews = cards.reduce((acc, c) => acc + c.correctReviews, 0);
    const allTimeAccuracy = totalReviews > 0 ? correctReviews / totalReviews : 0;

    const stageOrder = [
      "apprentice1", "apprentice2", "apprentice3", "apprentice4",
      "guru1", "guru2", "master", "enlightened", "burned",
    ];
    const stageCounts = stageOrder.map(stage => ({
      stage,
      count: cards.filter(c => c.srsStage === stage).length,
    }));

    res.json({
      lessonsCount,
      reviewsDueCount,
      totalCards,
      burnedCount,
      allTimeAccuracy,
      totalReviews,
      stageCounts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error", message: "Failed to get dashboard" });
  }
});

export default router;
