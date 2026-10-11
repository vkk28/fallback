ALTER TABLE "settlement_jobs" ADD COLUMN "signed_transaction" text;--> statement-breakpoint
ALTER TABLE "settlement_jobs" ADD COLUMN "signer" text;--> statement-breakpoint
ALTER TABLE "settlement_jobs" ADD COLUMN "nonce" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "settlement_jobs_signer_nonce" ON "settlement_jobs" USING btree ("chain_id","signer","nonce");