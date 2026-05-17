CREATE TABLE "ManagementMessage" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'COMMENT',
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagementMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManagementFollower" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagementFollower_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManagementMessage_recordType_recordId_createdAt_idx" ON "ManagementMessage"("recordType", "recordId", "createdAt");
CREATE INDEX "ManagementMessage_authorId_createdAt_idx" ON "ManagementMessage"("authorId", "createdAt");
CREATE UNIQUE INDEX "ManagementFollower_userId_recordType_recordId_key" ON "ManagementFollower"("userId", "recordType", "recordId");
CREATE INDEX "ManagementFollower_recordType_recordId_idx" ON "ManagementFollower"("recordType", "recordId");

ALTER TABLE "ManagementMessage" ADD CONSTRAINT "ManagementMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "ManagementUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManagementFollower" ADD CONSTRAINT "ManagementFollower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ManagementUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
