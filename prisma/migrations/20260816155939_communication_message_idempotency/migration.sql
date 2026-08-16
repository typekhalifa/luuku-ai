/*
  Warnings:

  - A unique constraint covering the columns `[conversationId,externalMessageId]` on the table `CommunicationMessage` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CommunicationMessage_conversationId_externalMessageId_key" ON "CommunicationMessage"("conversationId", "externalMessageId");
