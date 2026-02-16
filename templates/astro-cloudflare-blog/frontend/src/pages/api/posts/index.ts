import type { APIRoute } from 'astro';
import { z } from 'zod';
import { posts } from '../../../../db/schema/app';
import { listPosts, toPostResponse } from '../../../lib/server/api';

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(1),
});

function jsonError(status: number, error: string): Response {
  return Response.json({ success: false, error }, { status });
}

export const GET: APIRoute = async ({ locals }) => {
  const data = await listPosts(locals.db);
  return Response.json({ success: true, data });
};

export const POST: APIRoute = async ({ request, locals }) => {
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

  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request';
    return jsonError(400, message);
  }

  const excerpt = parsed.data.excerpt?.trim() ? parsed.data.excerpt : null;

  const rows = await locals.db
    .insert(posts)
    .values({
      userId: user.id,
      title: parsed.data.title,
      excerpt,
      content: parsed.data.content,
    })
    .returning();

  return Response.json({ success: true, data: toPostResponse(rows[0]) }, { status: 201 });
};
