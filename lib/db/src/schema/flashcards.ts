import { pgTable, text, integer, boolean, bigint, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const flashcardsTable = pgTable("flashcards", {
  id: uuid("id").primaryKey().defaultRandom(),
  japanese: text("japanese").notNull(),
  reading: text("reading").notNull().default(""),
  english: text("english").notNull(),
  partOfSpeech: text("part_of_speech"),
  srsStage: text("srs_stage").notNull().default("apprentice1"),
  nextReview: bigint("next_review", { mode: "number" }).notNull().default(0),
  totalReviews: integer("total_reviews").notNull().default(0),
  correctReviews: integer("correct_reviews").notNull().default(0),
  incorrectReviews: integer("incorrect_reviews").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  lastReviewed: bigint("last_reviewed", { mode: "number" }),
  lessonDirectionsCompleted: text("lesson_directions_completed").array().notNull().default([]),
  lessonComplete: boolean("lesson_complete").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFlashcardSchema = createInsertSchema(flashcardsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type Flashcard = typeof flashcardsTable.$inferSelect;
