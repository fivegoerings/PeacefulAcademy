

export const posts = pgTable('posts', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    title: varchar({ length: 255 }).notNull(),
    content: text().notNull().default('')
});

// db/schema.ts
import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  timestamp,
  date,
  numeric,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Enums
 */
export const subjectEnum = pgEnum("subject",
  [
    "Math",
    "English",
    "Science",
    "SocialStudies",
    "PE",
    "Art",
    "Music",
    "ForeignLanguage",
    "ComputerScience",
    "Elective",
  ]
);

export const attendanceEnum = pgEnum("attendance_status", [
  "Present",
  "Absent",
  "Excused",
]);

/**
 * Students
 * - Keep name flexible (full name). Optional extra fields for reporting.
 */
export const students = pgTable(
  "students",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),                 // Full name
    gradeLevel: integer("grade_level"),           // 9..12 (or null if not set)
    dob: date("dob"),                             // optional
    startedAt: date("started_at"),                // optional (enrollment start)
    active: boolean("active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    studentsNameIdx: index("students_name_idx").on(table.name),
    studentsActiveIdx: index("students_active_idx").on(table.active),
  })
);

/**
 * Courses
 * - Title + subject + credits for transcript
 * - Optional level (e.g., "Honors", "AP", "Standard")
 */
export const courses = pgTable(
  "courses",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    subject: subjectEnum("subject").notNull().default("Elective"),
    level: varchar("level", { length: 32 }),      // e.g., "Honors", "AP"
    credits: numeric("credits", { precision: 4, scale: 2 }).default("0.50"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    coursesTitleIdx: index("courses_title_idx").on(table.title),
    coursesSubjectIdx: index("courses_subject_idx").on(table.subject),
    coursesUniqueTitle: uniqueIndex("courses_unique_title").on(table.title),
  })
);

/**
 * Logs (attendance / time / notes)
 * - One row per day (per student). Optionally associate to a course for hours.
 * - Unique on (student_id, date) so daily attendance can’t be double-entered.
 */
export const logs = pgTable(
  "logs",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    status: attendanceEnum("status").notNull().default("Present"),
    hours: numeric("hours", { precision: 4, scale: 2 }).default("0.00"), // e.g., 1.50 hours
    courseId: integer("course_id").references(() => courses.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    logsStudentIdx: index("logs_student_idx").on(table.studentId),
    logsDateIdx: index("logs_date_idx").on(table.date),
    logsStudentDateUnique: uniqueIndex("logs_student_date_unique").on(
      table.studentId,
      table.date,
    ),
  })
);

/**
 * Portfolio (evidence / artifacts)
 * - Store short title/description + link (URL to file or page).
 */
export const portfolio = pgTable(
  "portfolio",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    description: varchar("description", { length: 255 }),
    link: text("link"), // URL to artifact (Drive/Netlify asset/etc.)
    addedAt: timestamp("added_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    portfolioStudentIdx: index("portfolio_student_idx").on(table.studentId),
  })
);
