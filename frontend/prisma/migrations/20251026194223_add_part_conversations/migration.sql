/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `part_conversations` table. All the data in the column will be lost.
  - You are about to drop the `conversation_messages` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `partResponse` to the `part_conversations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userMessage` to the `part_conversations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."conversation_messages" DROP CONSTRAINT "conversation_messages_conversationId_fkey";

-- AlterTable
ALTER TABLE "part_conversations" DROP COLUMN "updatedAt",
ADD COLUMN     "partResponse" TEXT NOT NULL,
ADD COLUMN     "userMessage" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."conversation_messages";

-- CreateIndex
CREATE INDEX "part_conversations_partId_createdAt_idx" ON "part_conversations"("partId", "createdAt");
