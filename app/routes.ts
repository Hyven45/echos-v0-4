import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home/home.tsx"),
  route("artist/:id", "routes/artist/artist.$id.tsx")
] satisfies RouteConfig;
