import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { fetchMe } from "./lib/api";
import { BoardRoute } from "./routes/BoardRoute";
import { LoginRoute } from "./routes/LoginRoute";
import { SignUpRoute } from "./routes/SignUpRoute";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
  component: () => null,
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth",
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
  component: () => null,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: async () => {
    const user = await fetchMe();
    if (user) {
      throw redirect({ to: "/board" });
    }
  },
  component: LoginRoute,
});

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  beforeLoad: async () => {
    const user = await fetchMe();
    if (user) {
      throw redirect({ to: "/board" });
    }
  },
  component: SignUpRoute,
});

export const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/board",
  beforeLoad: async () => {
    const user = await fetchMe();
    if (!user) {
      throw redirect({ to: "/login" });
    }
    return { user };
  },
  component: BoardRoute,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  authRoute,
  loginRoute,
  signUpRoute,
  boardRoute,
]);

export const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
