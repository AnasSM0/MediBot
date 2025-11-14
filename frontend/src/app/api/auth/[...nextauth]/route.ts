// The app-route expects the request handler function; export `auth` (the handler)
// instead of `authHandlers` which may be an object and not directly callable.
export { auth as GET, auth as POST } from "@/lib/auth";

