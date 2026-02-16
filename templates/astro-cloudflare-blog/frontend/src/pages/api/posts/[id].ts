import type { APIRoute } from 'astro';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { posts } from '../../../../db/schema/app';
import { getPostById, toPostResponse } from '../../../lib/server/api';

const updatePostSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    excerpt: z.string().max(500).optional(),
    content: z.string().min(1).optional(),
  })
  .refine((value) => value.title !== undefined || value.excerpt !== undefined || value.content !== undefined, {
    message: 'At least one field is required',
  });

function jsonError(status: number, error: string): Response {
  return Response.json({ success: false, error }, { status });
}

export const GET: APIRoute = async ({ params, locals }) => {
  const id = params.id;
  if (!id) return jsonError(400, 'Post ID is required');

  const post = await getPostById(locals.db, id);
  if (!post) {
    return jsonError(404, 'Post not found');
  }

  return Response.json({
    success: true,
    data: {
      ...post,
      is_owner: locals.user ? post.user_id === locals.user.id : false,
    },
  });
};

export const PATCH: APIRoute = async ({ request, params, locals }) => {
  const id = params.id;
  if (!id) return jsonError(400, 'Post ID is required');

  const user = locals.user;
  if (!user) {
    return jsonError(401, 'Unauthorized');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const parsed = updatePostSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request';
    return jsonError(400, message);
  }

  const rows = await locals.db
    .update(posts)
    .set({
      title: parsed.data.title,
      excerpt: parsed.data.excerpt,
      content: parsed.data.content,
      updatedAt: sql`now()`,
    })
    .where(and(eq(posts.id, id), eq(posts.userId, user.id)))
    .returning();

  if (!rows[0]) {
    return jsonError(404, 'Post not found or forbidden');
  }

  return Response.json({ success: true, data: toPostResponse(rows[0]) });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const id = params.id;
  if (!id) return jsonError(400, 'Post ID is required');

  const user = locals.user;
  if (!user) {
    return jsonError(401, 'Unauthorized');
  }

  const rows = await locals.db
    .delete(posts)
    .where(and(eq(posts.id, id), eq(posts.userId, user.id)))
    .returning({ id: posts.id });

  if (!rows[0]) {
    return jsonError(404, 'Post not found or forbidden');
  }

  return Response.json({ success: true, data: { id } });
};
