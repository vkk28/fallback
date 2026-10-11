CREATE TABLE "transaction_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"destination" text NOT NULL,
	"calldata" text NOT NULL,
	"provider_id" text,
	"hash" text,
	"status" text DEFAULT 'prepared' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
