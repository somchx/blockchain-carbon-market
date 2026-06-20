-- CreateTable
CREATE TABLE "carbon_projects" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sellerName" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "landAreaRai" INTEGER NOT NULL,
    "projectType" TEXT NOT NULL,
    "requestedCredits" INTEGER NOT NULL,
    "selfReportedReduction" INTEGER NOT NULL,
    "vintageYear" INTEGER NOT NULL,
    "approvedCredits" INTEGER NOT NULL,
    "approvedReduction" INTEGER NOT NULL,
    "requiredStake" INTEGER NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "trustScore" INTEGER NOT NULL,
    "recommendation" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "signals" JSONB NOT NULL,

    CONSTRAINT "carbon_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_files" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "ipfsCid" TEXT NOT NULL,
    "ipfsUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_files_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "carbon_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
