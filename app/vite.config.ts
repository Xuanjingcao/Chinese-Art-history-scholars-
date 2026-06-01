import fs from "fs/promises"
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

const professorDataPath = path.resolve(__dirname, "./src/data/professors.json")
const homepageDataPath = path.resolve(__dirname, "./src/data/homepage.json")
const academyDataPath = path.resolve(__dirname, "./src/data/academies.json")

function professorAdminApiPlugin() {
  return {
    name: "professor-admin-api",
    apply: "serve" as const,
    configureServer(_server: { middlewares: { use: (handler: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: () => void) => void) => void } }) {
      _server.middlewares.use(async (req, res, next) => {
        const isProfessorRequest = req.url?.startsWith("/api/admin/professors")
        const isHomepageRequest = req.url?.startsWith("/api/admin/homepage")
        const isAcademyRequest = req.url?.startsWith("/api/admin/academies")
        const dataPath = isProfessorRequest ? professorDataPath : isHomepageRequest ? homepageDataPath : isAcademyRequest ? academyDataPath : null

        if (!dataPath) {
          next()
          return
        }

        if (req.method === "GET") {
          try {
            const content = await fs.readFile(dataPath, "utf8")
            res.setHeader("Content-Type", "application/json; charset=utf-8")
            res.setHeader("Cache-Control", "no-store")
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

            const isValidPayload = isProfessorRequest
              ? Array.isArray(data)
              : Boolean(data && typeof data === "object" && !Array.isArray(data))

            if (!isValidPayload) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: "invalid_payload" }))
              return
            }

            await fs.writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8")
            res.setHeader("Content-Type", "application/json; charset=utf-8")
            res.setHeader("Cache-Control", "no-store")
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
