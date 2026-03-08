/*
  Warnings:

  - You are about to drop the column `driveFileId` on the `FeedItem` table. All the data in the column will be lost.
  - You are about to drop the column `driveFileId` on the `OutfitCheck` table. All the data in the column will be lost.
  - You are about to drop the column `driveFileId` on the `SelfieUpload` table. All the data in the column will be lost.
  - Added the required column `imagePath` to the `OutfitCheck` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imagePath` to the `SelfieUpload` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "StyleTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payload" TEXT NOT NULL,
    "result" TEXT,
    "error" TEXT,
    "targetId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StyleTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FeedItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priceRange" TEXT,
    "sourceUrl" TEXT,
    "imagePath" TEXT,
    "aiRationale" TEXT,
    "batchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeedItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FeedItem" ("aiRationale", "batchId", "brand", "category", "createdAt", "description", "id", "itemName", "priceRange", "sourceUrl", "userId") SELECT "aiRationale", "batchId", "brand", "category", "createdAt", "description", "id", "itemName", "priceRange", "sourceUrl", "userId" FROM "FeedItem";
DROP TABLE "FeedItem";
ALTER TABLE "new_FeedItem" RENAME TO "FeedItem";
CREATE INDEX "FeedItem_userId_idx" ON "FeedItem"("userId");
CREATE INDEX "FeedItem_batchId_idx" ON "FeedItem"("batchId");
CREATE TABLE "new_OutfitCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "feedbackClaude" TEXT,
    "feedbackGemini" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutfitCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OutfitCheck" ("createdAt", "feedbackClaude", "feedbackGemini", "id", "userId") SELECT "createdAt", "feedbackClaude", "feedbackGemini", "id", "userId" FROM "OutfitCheck";
DROP TABLE "OutfitCheck";
ALTER TABLE "new_OutfitCheck" RENAME TO "OutfitCheck";
CREATE INDEX "OutfitCheck_userId_idx" ON "OutfitCheck"("userId");
CREATE TABLE "new_SelfieUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "originalFilename" TEXT,
    "analysisResultClaude" TEXT,
    "analysisResultGemini" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SelfieUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SelfieUpload" ("analysisResultClaude", "analysisResultGemini", "createdAt", "id", "originalFilename", "userId") SELECT "analysisResultClaude", "analysisResultGemini", "createdAt", "id", "originalFilename", "userId" FROM "SelfieUpload";
DROP TABLE "SelfieUpload";
ALTER TABLE "new_SelfieUpload" RENAME TO "SelfieUpload";
CREATE INDEX "SelfieUpload_userId_idx" ON "SelfieUpload"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "StyleTask_status_idx" ON "StyleTask"("status");

-- CreateIndex
CREATE INDEX "StyleTask_userId_idx" ON "StyleTask"("userId");
