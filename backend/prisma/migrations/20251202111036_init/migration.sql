/*
  Warnings:

  - You are about to drop the column `education` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `experience` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `resume` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `skills` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Profile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "education",
DROP COLUMN "experience",
DROP COLUMN "resume",
DROP COLUMN "skills",
DROP COLUMN "summary",
DROP COLUMN "title",
ADD COLUMN     "degree" TEXT,
ADD COLUMN     "graduationYear" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "rolesLookingFor" TEXT,
ADD COLUMN     "softSkills" TEXT,
ADD COLUMN     "technicalSkills" TEXT,
ADD COLUMN     "toolsTech" TEXT,
ADD COLUMN     "university" TEXT,
ADD COLUMN     "workExperience" TEXT;

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'candidate';

-- CreateTable
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "salary" TEXT,
    "type" TEXT NOT NULL DEFAULT 'full-time',
    "hrId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Application_jobId_candidateId_key" ON "Application"("jobId", "candidateId");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_hrId_fkey" FOREIGN KEY ("hrId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
