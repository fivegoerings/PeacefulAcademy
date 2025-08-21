CREATE TABLE IF NOT EXISTS "backups" (
	"id" bigint PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"note" text,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"subject" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(100) NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"student_name" varchar(255),
	"course_title" varchar(255),
	"subject" varchar(100),
	"date" date NOT NULL,
	"hours" numeric(5, 2) NOT NULL,
	"location" varchar(50) DEFAULT 'home' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"tags" text[],
	"date" date NOT NULL,
	"file_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"dob" date,
	"grade" varchar(50),
	"start_year" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "backups_created_at_idx" ON "backups" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_title_idx" ON "courses" ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_subject_idx" ON "courses" ("subject");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "logs_student_id_idx" ON "logs" ("student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "logs_course_id_idx" ON "logs" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "logs_date_idx" ON "logs" ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "logs_subject_idx" ON "logs" ("subject");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "logs_student_name_idx" ON "logs" ("student_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "logs_course_title_idx" ON "logs" ("course_title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_student_id_idx" ON "portfolio" ("student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_course_id_idx" ON "portfolio" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_date_idx" ON "portfolio" ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "students_name_idx" ON "students" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "students_start_year_idx" ON "students" ("start_year");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "logs" ADD CONSTRAINT "logs_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "logs" ADD CONSTRAINT "logs_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio" ADD CONSTRAINT "portfolio_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio" ADD CONSTRAINT "portfolio_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
