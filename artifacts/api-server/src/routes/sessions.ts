import { Router } from "express";
import { db } from "@workspace/db";
import { reviewSessionsTable } from "@workspace/db/schema";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const sessions = await db
      .select()
      .from(reviewSessionsTable)
      .orderBy(reviewSessionsTable.date);
    res.json(sessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error", message: "Failed to list sessions" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { date, cardsReviewed, correct, incorrect } = req.body;
    if (date === undefined || cardsReviewed === undefined || correct === undefined || incorrect === undefined) {
      return res.status(400).json({ error: "bad_request", message: "date, cardsReviewed, correct, and incorrect are required" });
    }
    const [session] = await db
      .insert(reviewSessionsTable)
      .values({ date, cardsReviewed, correct, incorrect })
      .returning();
    res.status(201).json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error", message: "Failed to create session" });
  }
});

export default router;
