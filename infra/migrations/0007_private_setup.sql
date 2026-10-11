CREATE TABLE "setup_drafts" (
	"user_id" text PRIMARY KEY NOT NULL,
	"fields" jsonb NOT NULL,
	"step" integer NOT NULL,
	"version" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "setup_drafts" ADD CONSTRAINT "setup_drafts_user_id_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;