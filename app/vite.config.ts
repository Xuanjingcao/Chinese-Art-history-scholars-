import fs from "fs/promises"
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

const professorDataPath = path.resolve(__dirname, "./src/data/professors.json")

function professorAdminApiPlugin() {
  return {
    name: "professor-admin-api",
    apply: "serve" as const,
    configureServer(_server: { middlewares: { use: (handler: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: () => void) => void) => void } }) {
      _server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/admin/professors")) {
          next()
          return
        }

        if (req.method === "GET") {
          try {
            const content = await fs.readFile(professorDataPath, "utf8")
            res.setHeader("Content-Type", "application/json; charset=utf-8")
            res.end(content)
          } catch {
            res.statusCode = 500
            res.end(JSON.stringify({ error: "read_failed" }))
          }
          return
        }

        if (req.method === "PUT") {
          try {
            const chunks: Uint8Array[] = []
            for await (const chunk of req) {
              chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk)
            }
            const body = Buffer.concat(chunks).toString("utf8")
            const data = JSON.parse(body)

            if (!Array.isArray(data)) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: "invalid_payload" }))
              return
            }

            await fs.writeFile(professorDataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8")
            res.setHeader("Content-Type", "application/json; charset=utf-8")
            res.end(JSON.stringify(data))
          } catch {
            res.statusCode = 500
            res.end(JSON.stringify({ error: "write_failed" }))
          }
          return
        }

        res.statusCode = 405
        res.end(JSON.stringify({ error: "method_not_allowed" }))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react(), professorAdminApiPlugin()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
