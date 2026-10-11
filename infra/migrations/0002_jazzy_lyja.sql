ALTER TABLE "transaction_requests" ADD COLUMN "plan_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_requests" ADD COLUMN "action" text NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_requests" ADD CONSTRAINT "transaction_requests_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;