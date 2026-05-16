-- CreateTable
CREATE TABLE "EtaxConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "gateway" TEXT NOT NULL DEFAULT '',
    "env" TEXT NOT NULL DEFAULT 'dev',
    "username" TEXT NOT NULL DEFAULT '',
    "secret" TEXT NOT NULL DEFAULT '',
    "issueCode" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "EtaxConfig_pkey" PRIMARY KEY ("id")
);
