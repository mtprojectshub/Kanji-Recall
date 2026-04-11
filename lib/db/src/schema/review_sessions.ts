import { pgTable, integer, bigint, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reviewSessionsTable = pgTable("review_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: bigint("date", { mode: "number" }).notNull(),
  cardsReviewed: integer("cards_reviewed").notNull().default(0),
  correct: integer("correct").notNull().default(0),
  incorrect: integer("incorrect").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReviewSessionSchema = createInsertSchema(reviewSessionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertReviewSession = z.infer<typeof insertReviewSessionSchema>;
export type ReviewSession = typeof reviewSessionsTable.$inferSelect;
