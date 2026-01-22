/*
  Warnings:

  - You are about to drop the column `occupied_seats` on the `shows` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SeatStatus" AS ENUM ('RESERVED', 'BOOKED');

-- AlterTable
ALTER TABLE "shows" DROP COLUMN "occupied_seats";

-- CreateTable
CREATE TABLE "seats" (
    "id" SERIAL NOT NULL,
    "show_id" INTEGER NOT NULL,
    "seat_number" TEXT NOT NULL,
    "booking_id" INTEGER,
    "status" "SeatStatus" NOT NULL DEFAULT 'RESERVED',

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seats_show_id_idx" ON "seats"("show_id");

-- CreateIndex
CREATE UNIQUE INDEX "seats_show_id_seat_number_key" ON "seats"("show_id", "seat_number");

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
