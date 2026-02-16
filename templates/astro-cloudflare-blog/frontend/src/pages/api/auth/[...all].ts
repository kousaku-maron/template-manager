import type { APIRoute } from 'astro';

export const prerender = false;

export const ALL: APIRoute = async (ctx) => {
  return ctx.locals.auth.handler(ctx.request);
};
