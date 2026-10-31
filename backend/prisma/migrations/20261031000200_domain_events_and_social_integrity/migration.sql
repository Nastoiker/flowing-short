BEGIN IMMEDIATE;
ALTER TABLE "UserModel" ADD COLUMN "identityVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OutboxEvent" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OutboxEvent" ADD COLUMN "nextAttemptAt" DATETIME;
ALTER TABLE "OutboxEvent" ADD COLUMN "lastError" TEXT;

CREATE TABLE "EventInbox" ("eventId" TEXT NOT NULL PRIMARY KEY, "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "CreatorDirectory" ("userId" TEXT NOT NULL PRIMARY KEY, "displayName" TEXT NOT NULL, "authorUrl" TEXT NOT NULL, "registeredAt" DATETIME NOT NULL, "updatedAt" DATETIME NOT NULL, "aggregateVersion" INTEGER NOT NULL DEFAULT -1);
CREATE INDEX "CreatorDirectory_registeredAt_userId_idx" ON "CreatorDirectory"("registeredAt", "userId");
CREATE TABLE "RejectedEvent" ("id" TEXT NOT NULL PRIMARY KEY, "topic" TEXT NOT NULL, "partition" INTEGER NOT NULL, "offset" TEXT NOT NULL, "reason" TEXT NOT NULL, "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "RejectedEvent_topic_partition_offset_key" ON "RejectedEvent"("topic", "partition", "offset");
CREATE TABLE "LegacyLikeArchive" ("id" TEXT NOT NULL PRIMARY KEY, "createdAt" DATETIME NOT NULL, "like" BOOLEAN NOT NULL, "likeById" TEXT NOT NULL, "videoId" TEXT NOT NULL, "archivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);

-- Retain every removed historical duplicate, including its original ID and timestamp.
INSERT INTO "LegacyLikeArchive" ("id", "createdAt", "like", "likeById", "videoId")
SELECT "id", "createdAt", "like", "likeById", "videoId" FROM "Like"
WHERE "id" NOT IN (SELECT "id" FROM (SELECT "id", ROW_NUMBER() OVER (PARTITION BY "likeById", "videoId" ORDER BY "createdAt" DESC, "id" DESC) AS canonical_rank FROM "Like") WHERE canonical_rank=1);
DELETE FROM "Like" WHERE "id" IN (SELECT "id" FROM "LegacyLikeArchive");
CREATE UNIQUE INDEX "Like_likeById_videoId_key" ON "Like"("likeById", "videoId");
CREATE INDEX "Like_videoId_idx" ON "Like"("videoId");
DROP INDEX "Folower_userId_key";
DROP INDEX "Folower_authorId_key";
CREATE UNIQUE INDEX "Folower_userId_authorId_key" ON "Folower"("userId", "authorId");
CREATE INDEX "Folower_authorId_idx" ON "Folower"("authorId");

-- Reconcile counters from canonical relationships in the same migration.
UPDATE "Video" SET "likesCount" = (SELECT COUNT(*) FROM "Like" WHERE "Like"."videoId" = "Video"."id" AND "Like"."like" = true);
UPDATE "Video" SET "view_count" = (SELECT COUNT(*) FROM "HistoryWatching" WHERE "HistoryWatching"."videoId"="Video"."id"),
"comment_count" = (SELECT COUNT(*) FROM "Comment" WHERE "Comment"."videoId"="Video"."id");
UPDATE "UserModel" SET "LikeCount" = (SELECT COUNT(*) FROM "Like" JOIN "Video" ON "Video"."id"="Like"."videoId" WHERE "Video"."userId"="UserModel"."id" AND "Like"."like"=true),
"hisLikes" = (SELECT COUNT(*) FROM "Like" WHERE "Like"."likeById"="UserModel"."id" AND "Like"."like"=true),
"following_count" = (SELECT COUNT(*) FROM "Folower" WHERE "Folower"."userId"="UserModel"."id" AND "Folower"."folow"=true),
"subscribers_count" = (SELECT COUNT(*) FROM "Folower" WHERE "Folower"."authorId"="UserModel"."id" AND "Folower"."folow"=true);
CREATE INDEX "Video_isActive_createdAt_id_idx" ON "Video"("isActive", "createdAt", "id");
CREATE INDEX "Video_isActive_likesCount_id_idx" ON "Video"("isActive", "likesCount", "id");
CREATE INDEX "Video_userId_idx" ON "Video"("userId");
CREATE INDEX "Video_secondCategoryId_idx" ON "Video"("secondCategoryId");
CREATE INDEX "HistoryWatching_videoId_idx" ON "HistoryWatching"("videoId");
CREATE INDEX "HistoryWatching_userId_createdAt_idx" ON "HistoryWatching"("userId", "createdAt");
CREATE INDEX "Comment_videoId_createdAt_idx" ON "Comment"("videoId", "createdAt");
COMMIT;
