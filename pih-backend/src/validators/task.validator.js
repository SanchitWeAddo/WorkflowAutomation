const { z } = require('zod');

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional(),
  priority: z.enum(['URGENT', 'HIGH', 'NORMAL', 'LOW']).default('NORMAL'),
  category: z.string().optional(),
  projectId: z.string().uuid('Invalid project ID').optional(),
  tags: z.array(z.string()).default([]),
  estimatedHours: z.number().positive().optional(),
  startDate: z.string().datetime().optional().or(z.string().optional()),
  dueDate: z.string().datetime().optional().or(z.string().optional()),
  taskBrief: z.string().optional(),
  isPrivate: z.boolean().default(false),
  isClientDependent: z.boolean().default(false),
  qaRequired: z.boolean().default(false),
  requiredSkills: z.array(z.string()).default([]),
  assigneeIds: z.array(z.string().uuid()).optional(),
  dependsOnTaskIds: z.array(z.string().uuid()).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum([
    'SUBMITTED',
    'ACKNOWLEDGED',
    'ASSIGNED',
    'IN_PROGRESS',
    'REVIEW',
    'COMPLETED',
    'QA_REVIEW',
    'QA_FAILED',
    'CLIENT_REVIEW',
    'DELIVERED',
    'REOPENED',
    'CANCELLED',
  ]),
  note: z.string().optional(),
});

const assignTaskSchema = z.object({
  assigneeId: z.string().uuid('Invalid assignee ID'),
  note: z.string().optional(),
  taskBrief: z.string().optional(),
  estimatedHours: z.number().positive().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
});

const commentSchema = z.object({
  content: z.string().min(1, 'Comment content is required'),
  isInternal: z.boolean().default(false),
});

const parseTaskSchema = z.object({
  rawText: z.string().min(1, 'Raw text is required'),
  source: z.string().default('portal'),
  sourceRef: z.string().optional(),
  clientEmail: z.string().email().optional(),
});

const updateTaskSchema = z.object({
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  taskBrief: z.string().optional(),
  estimatedHours: z.number().positive().optional().nullable(),
  isClientDependent: z.boolean().optional(),
  qaRequired: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  clientFeedback: z.string().optional(),
  requiredSkills: z.array(z.string()).optional(),
  assigneeIds: z.array(z.string().uuid()).optional(),
  dependsOnTaskIds: z.array(z.string().uuid()).optional(),
});

module.exports = {
  createTaskSchema,
  updateStatusSchema,
  assignTaskSchema,
  commentSchema,
  parseTaskSchema,
  updateTaskSchema,
};
