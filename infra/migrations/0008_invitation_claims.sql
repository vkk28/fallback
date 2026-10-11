ALTER TABLE "plans" ALTER COLUMN "payee" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "bound_payee_before_proposal" CHECK (payee IS NOT NULL OR (address IS NULL AND proposal_hash IS NULL));
--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "intended_address" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "intended_email_digest" text;
--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "revoked_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "declined_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "replaced_by" text;
--> statement-breakpoint
CREATE TABLE "invitation_deliveries" (
  "invitation_id" text PRIMARY KEY REFERENCES "invitations"("digest"),
  "envelope" text NOT NULL, "status" text NOT NULL DEFAULT 'ready',
  "attempts" integer NOT NULL DEFAULT 0, "provider_id" text,
  "first_attempt_at" timestamptz, "next_attempt_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "invitation_contact_inbox" ON "invitations" ("intended_email_digest", "expires_at");
