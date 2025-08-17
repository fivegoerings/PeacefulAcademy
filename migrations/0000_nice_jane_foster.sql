CREATE TYPE "public"."attendance_status" AS ENUM('Present', 'Absent', 'Excused');--> statement-breakpoint
CREATE TYPE "public"."subject" AS ENUM('Math', 'English', 'Science', 'SocialStudies', 'PE', 'Art', 'Music', 'ForeignLanguage', 'ComputerScience', 'Elective');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subject" "subject" DEFAULT 'Elective' NOT NULL,
	"level" varchar(32),
	"credits" numeric(4, 2) DEFAULT '0.50',
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"date" date NOT NULL,
	"status" "attendance_status" DEFAULT 'Present' NOT NULL,
	"hours" numeric(4, 2) DEFAULT '0.00',
	"course_id" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"title" varchar(120) NOT NULL,
	"description" varchar(255),
	"link" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "posts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "posts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" varchar(255) NOT NULL,
	"content" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "students"
  ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT TRUE;
  
CREATE TABLE IF NOT EXISTS "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"grade_level" integer,
	"dob" date,
	"started_at" date,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio" ADD CONSTRAINT "portfolio_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_title_idx" ON "courses" USING btree ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_subject_idx" ON "courses" USING btree ("subject");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "courses_unique_title" ON "courses" USING btree ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "logs_student_idx" ON "logs" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "logs_date_idx" ON "logs" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "logs_student_date_unique" ON "logs" USING btree ("student_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_student_idx" ON "portfolio" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "students_name_idx" ON "students" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "students_active_idx" ON "students" USING btree ("active");