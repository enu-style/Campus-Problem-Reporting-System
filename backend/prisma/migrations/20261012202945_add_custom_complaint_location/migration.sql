-- DropForeignKey
ALTER TABLE "complaints" DROP CONSTRAINT "complaints_location_id_fkey";

-- AlterTable
ALTER TABLE "complaints" ADD COLUMN     "location_description" TEXT,
ALTER COLUMN "location_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
