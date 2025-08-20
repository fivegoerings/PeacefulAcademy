import { 
  integer, 
  pgTable, 
  varchar, 
  text, 
  date, 
  numeric, 
  timestamp,
  primaryKey,
  index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Students table
export const students = pgTable('students', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 255 }).notNull(),
  dob: date('dob'),
  grade: varchar('grade', { length: 50 }),
  startYear: integer('start_year'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  nameIdx: index('students_name_idx').on(table.name),
  startYearIdx: index('students_start_year_idx').on(table.startYear)
}));

// Courses table
export const courses = pgTable('courses', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  title: varchar('title', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 100 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  titleIdx: index('courses_title_idx').on(table.title),
  subjectIdx: index('courses_subject_idx').on(table.subject)
}));

// Logs table for tracking hours
export const logs = pgTable('logs', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  subject: varchar('subject', { length: 100 }),
  date: date('date').notNull(),
  hours: numeric('hours', { precision: 5, scale: 2 }).notNull(),
  location: varchar('location', { length: 50 }).notNull().default('home'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  studentIdIdx: index('logs_student_id_idx').on(table.studentId),
  courseIdIdx: index('logs_course_id_idx').on(table.courseId),
  dateIdx: index('logs_date_idx').on(table.date),
  subjectIdx: index('logs_subject_idx').on(table.subject)
}));

// Portfolio table for work samples
export const portfolio = pgTable('portfolio', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  tags: text('tags').array(),
  date: date('date').notNull(),
  fileId: integer('file_id'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  studentIdIdx: index('portfolio_student_id_idx').on(table.studentId),
  courseIdIdx: index('portfolio_course_id_idx').on(table.courseId),
  dateIdx: index('portfolio_date_idx').on(table.date)
}));

// Files table for storing file metadata
export const files = pgTable('files', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  size: integer('size').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Settings table for application configuration
export const settings = pgTable('settings', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const studentsRelations = relations(students, ({ many }) => ({
  logs: many(logs),
  portfolio: many(portfolio)
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  logs: many(logs),
  portfolio: many(portfolio)
}));

export const logsRelations = relations(logs, ({ one }) => ({
  student: one(students, {
    fields: [logs.studentId],
    references: [students.id]
  }),
  course: one(courses, {
    fields: [logs.courseId],
    references: [courses.id]
  })
}));

export const portfolioRelations = relations(portfolio, ({ one }) => ({
  student: one(students, {
    fields: [portfolio.studentId],
    references: [students.id]
  }),
  course: one(courses, {
    fields: [portfolio.courseId],
    references: [courses.id]
  })
}));

// Types for TypeScript
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Log = typeof logs.$inferSelect;
export type NewLog = typeof logs.$inferInsert;
export type Portfolio = typeof portfolio.$inferSelect;
export type NewPortfolio = typeof portfolio.$inferInsert;
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;