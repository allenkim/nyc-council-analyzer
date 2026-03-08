-- CreateTable
CREATE TABLE "FashionImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "searchQuery" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "localPath" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "FashionImage_category_idx" ON "FashionImage"("category");

-- CreateIndex
CREATE INDEX "FashionImage_searchQuery_idx" ON "FashionImage"("searchQuery");
