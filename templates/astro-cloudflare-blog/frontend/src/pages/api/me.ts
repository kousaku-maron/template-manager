import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  return Response.json({
    success: true,
    data: {
      authenticated: Boolean(locals.user),
      user: locals.user ?? null,
      session: locals.session ?? null,
    },
  });
};
