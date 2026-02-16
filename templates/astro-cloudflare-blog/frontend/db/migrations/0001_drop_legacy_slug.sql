ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_slug_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "posts_slug_unique";
--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN IF EXISTS "slug";
