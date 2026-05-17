CREATE TYPE "TodoStage" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

CREATE TABLE "TodoTask" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "stage" "TodoStage" NOT NULL DEFAULT 'TODO',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "dueDate" TIMESTAMP(3),
  "doneAt" TIMESTAMP(3),
  "assignedToId" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TodoTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TodoTask_stage_dueDate_idx" ON "TodoTask"("stage", "dueDate");
CREATE INDEX "TodoTask_assignedToId_stage_idx" ON "TodoTask"("assignedToId", "stage");
CREATE INDEX "TodoTask_createdById_idx" ON "TodoTask"("createdById");

ALTER TABLE "TodoTask" ADD CONSTRAINT "TodoTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TodoTask" ADD CONSTRAINT "TodoTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
