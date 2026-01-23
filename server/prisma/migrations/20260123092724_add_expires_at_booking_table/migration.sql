-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "status" "BookingStatus" NOT NULL DEFAULT 'PENDING';
