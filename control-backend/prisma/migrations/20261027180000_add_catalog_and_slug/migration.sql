-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "businessSlug" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "catalogConfig" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_businessSlug_key" ON "User"("businessSlug");
