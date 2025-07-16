import type { MetaFunction } from "react-router";

export interface Route {
  MetaArgs: Parameters<MetaFunction>[0];
}
