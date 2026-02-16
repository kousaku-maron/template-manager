import { desc, eq } from 'drizzle-orm';
import { posts } from '../../../../db/schema/app';
import type { Database } from '../db';

type PostRow = typeof posts.$inferSelect;

export type PostResponse = {
  id: string;
  user_id: string;
  title: string;
  excerpt: string | null;
  content: string;
  created_at: Date;
  updated_at: Date;
};

export function toPostResponse(row: PostRow): PostResponse {
  return {
    id: row.id,
    user_id: row.userId,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export async function listPosts(db: Database): Promise<PostResponse[]> {
  const rows = await db
    .select()
    .from(posts)
    .orderBy(desc(posts.createdAt));

  return rows.map(toPostResponse);
}

export async function getPostById(db: Database, id: string): Promise<PostResponse | null> {
  const rows = await db
    .select()
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);

  const row = rows[0];
  return row ? toPostResponse(row) : null;
}
