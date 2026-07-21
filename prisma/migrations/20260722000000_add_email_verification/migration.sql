ALTER TABLE "users"
  ADD COLUMN "email_verified_at" TIMESTAMP(3),
  ADD COLUMN "email_verification_token_hash" TEXT,
  ADD COLUMN "email_verification_expires_at" TIMESTAMP(3),
  ADD COLUMN "email_verification_sent_at" TIMESTAMP(3);

UPDATE "users" SET "email_verified_at" = "created_at" WHERE "email_verified_at" IS NULL;
CREATE UNIQUE INDEX "users_email_verification_token_hash_key" ON "users"("email_verification_token_hash");
