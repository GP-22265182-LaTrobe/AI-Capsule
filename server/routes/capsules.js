import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);

function toBoolInt(value) {
  return value ? 1 : 0;
}

router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM capsules WHERE user_id = ? ORDER BY id DESC").all(req.user.id);
  res.json(rows);
});

router.post("/", (req, res) => {
  const { project_name, prompt_title, prompt_text } = req.body;
  if (!project_name || !prompt_title || !prompt_text) {
    return res.status(400).json({ error: "project_name, prompt_title and prompt_text are required" });
  }

  const result = db
    .prepare(
      `INSERT INTO capsules (
        user_id, project_name, prompt_title, prompt_version, prompt_text,
        response_summary, category, usefulness, reviewed, improved, screenshot_url, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user.id,
      project_name,
      prompt_title,
      req.body.prompt_version || null,
      prompt_text,
      req.body.response_summary || null,
      req.body.category || null,
      req.body.usefulness || null,
      toBoolInt(req.body.reviewed),
      toBoolInt(req.body.improved),
      req.body.screenshot_url || null,
      req.body.notes || null
    );

  const created = db.prepare("SELECT * FROM capsules WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(created);
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM capsules WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!existing) {
    return res.status(404).json({ error: "Capsule not found" });
  }

  const { project_name, prompt_title, prompt_text } = req.body;
  if (!project_name || !prompt_title || !prompt_text) {
    return res.status(400).json({ error: "project_name, prompt_title and prompt_text are required" });
  }

  db.prepare(
    `UPDATE capsules SET
      project_name = ?, prompt_title = ?, prompt_version = ?, prompt_text = ?,
      response_summary = ?, category = ?, usefulness = ?, reviewed = ?, improved = ?,
      screenshot_url = ?, notes = ?
    WHERE id = ? AND user_id = ?`
  ).run(
    project_name,
    prompt_title,
    req.body.prompt_version || null,
    prompt_text,
    req.body.response_summary || null,
    req.body.category || null,
    req.body.usefulness || null,
    toBoolInt(req.body.reviewed),
    toBoolInt(req.body.improved),
    req.body.screenshot_url || null,
    req.body.notes || null,
    req.params.id,
    req.user.id
  );

  const updated = db.prepare("SELECT * FROM capsules WHERE id = ?").get(req.params.id);
  res.json(updated);
});

router.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM capsules WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: "Capsule not found" });
  }
  res.json({ deleted: true, id: Number(req.params.id) });
});

export default router;