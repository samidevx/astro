/// <reference types="astro/client" />

type KVNamespace = import("@cloudflare/workers-types").KVNamespace;

interface Env {
  STORE_KV: KVNamespace;
  ADMIN_PASSWORD: string;
}

declare namespace App {
  interface Locals {
    runtime: {
      env: Env;
    };
  }
}
