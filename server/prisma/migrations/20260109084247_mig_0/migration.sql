-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "image" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "overview" TEXT NOT NULL,
    "poster_path" TEXT NOT NULL,
    "backdrop_path" TEXT NOT NULL,
    "release_date" TEXT NOT NULL,
    "original_language" TEXT,
    "tagline" TEXT,
    "genres" JSONB NOT NULL,
    "casts" JSONB NOT NULL,
    "vote_average" DOUBLE PRECISION NOT NULL,
    "runtime" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shows" (
    "id" SERIAL NOT NULL,
    "movie_id" TEXT NOT NULL,
    "show_date_time" TIMESTAMP(3) NOT NULL,
    "show_price" DOUBLE PRECISION NOT NULL,
    "occupied_seats" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "shows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "show_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "booked_seats" JSONB NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "payment_link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "shows_movie_id_idx" ON "shows"("movie_id");

-- CreateIndex
CREATE INDEX "shows_show_date_time_idx" ON "shows"("show_date_time");

-- CreateIndex
CREATE INDEX "bookings_user_id_idx" ON "bookings"("user_id");

-- CreateIndex
CREATE INDEX "bookings_show_id_idx" ON "bookings"("show_id");

-- AddForeignKey
ALTER TABLE "shows" ADD CONSTRAINT "shows_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
