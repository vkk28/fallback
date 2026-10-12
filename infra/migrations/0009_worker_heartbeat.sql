CREATE TABLE "worker_heartbeat" (
	"mode" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"status" text NOT NULL
);
