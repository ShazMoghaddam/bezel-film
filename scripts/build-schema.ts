import { fileURLToPath } from "node:url";
import { z } from "zod";
import { filmSchema } from "../src/spec/schema.js";
import { writeOrCheck } from "./write-or-check.js";

/**
 * Generates schema/film.schema.json from the Zod schema in src/spec/schema.ts.
 * Editors and agents use it for autocomplete and checking, so the Zod schema
 * stays the single source of truth.
 */
const root = fileURLToPath(new URL("..", import.meta.url));

const jsonSchema = {
  ...z.toJSONSchema(filmSchema, { io: "input", unrepresentable: "any" }),
  $id: "https://github.com/ShazMoghaddam/bezel-film/blob/main/schema/film.schema.json",
  title: "Bezel Film",
  description: "One file that describes a whole film: settings plus a list of scenes.",
};

await writeOrCheck(new Map([[`${root}schema/film.schema.json`, `${JSON.stringify(jsonSchema, null, 2)}\n`]]), root);
