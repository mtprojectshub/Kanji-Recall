import { Router } from "express";
import { db } from "@workspace/db";
import { flashcardsTable } from "@workspace/db/schema";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const now = Date.now();
    const cards = await db.select().from(flashcardsTable);

    // Lesson queue: cards not yet graduated into the SRS
    const lessonsCount = cards.filter((c) => !c.lessonComplete).length;

    // Due reviews: graduated cards whose review time has come (not burned)
    const reviewsDueCount = cards.filter(
      (c) => c.lessonComplete && c.nextReview <= now && c.srsStage !== "burned"
    ).length;

    const totalCards = cards.length;

    // Stage progress — only count cards that have completed lessons
    const graduatedCards = cards.filter((c) => c.lessonComplete);
    const burnedCount = graduatedCards.filter((c) => c.srsStage === "burned").length;

    const totalReviews = graduatedCards.reduce((acc, c) => acc + c.totalReviews, 0);
    const correctReviews = graduatedCards.reduce((acc, c) => acc + c.correctReviews, 0);
    const allTimeAccuracy = totalReviews > 0 ? correctReviews / totalReviews : 0;

    const stageOrder = [
      "apprentice1", "apprentice2", "apprentice3", "apprentice4",
      "guru1", "guru2", "master", "enlightened", "burned",
    ];
    // Only graduated cards appear in the SRS stage breakdown
    const stageCounts = stageOrder.map((stage) => ({
      stage,
      count: graduatedCards.filter((c) => c.srsStage === stage).length,
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
