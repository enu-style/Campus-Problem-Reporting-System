-- CreateTable
CREATE TABLE "complaint_attachments" (
    "id" SERIAL NOT NULL,
    "complaint_id" INTEGER NOT NULL,
    "original_name" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "complaint_attachments_stored_name_key" ON "complaint_attachments"("stored_name");

-- CreateIndex
CREATE INDEX "complaint_attachments_complaint_id_idx" ON "complaint_attachments"("complaint_id");

-- AddForeignKey
ALTER TABLE "complaint_attachments" ADD CONSTRAINT "complaint_attachments_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
