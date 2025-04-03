-- Remove QuoteStatus field from LessonQuote table
ALTER TABLE "LessonQuote" DROP COLUMN IF EXISTS "quoteStatus"; 