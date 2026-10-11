CREATE TABLE "scheduler_discovery" (
	"id" text PRIMARY KEY NOT NULL,
	"cursor" text,
	"batch" jsonb,
	"completed" jsonb
);
