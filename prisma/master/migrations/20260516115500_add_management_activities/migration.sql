CREATE TABLE "ManagementActivity" (
    "id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "note" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "assignedToId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagementActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManagementActivity_recordType_recordId_done_dueDate_idx" ON "ManagementActivity"("recordType", "recordId", "done", "dueDate");
CREATE INDEX "ManagementActivity_assignedToId_done_dueDate_idx" ON "ManagementActivity"("assignedToId", "done", "dueDate");
CREATE INDEX "ManagementActivity_createdById_createdAt_idx" ON "ManagementActivity"("createdById", "createdAt");

ALTER TABLE "ManagementActivity" ADD CONSTRAINT "ManagementActivity_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "ManagementUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManagementActivity" ADD CONSTRAINT "ManagementActivity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "ManagementUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
