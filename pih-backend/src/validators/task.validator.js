const { z } = require('zod');

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional(),
  priority: z.enum(['URGENT', 'HIGH', 'NORMAL', 'LOW']).default('NORMAL'),
  category: z.string().optional(),
  projectId: z.string().uuid('Invalid project ID').optional(),
  tags: z.array(z.string()).default([]),
  estimatedHours: z.number().positive().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum([
    'SUBMITTED',
    'ACKNOWLEDGED',
    'ASSIGNED',
    'IN_PROGRESS',
    'REVIEW',
    'COMPLETED',
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

module.exports = {
  createTaskSchema,
  updateStatusSchema,
  assignTaskSchema,
  commentSchema,
  parseTaskSchema,
};
