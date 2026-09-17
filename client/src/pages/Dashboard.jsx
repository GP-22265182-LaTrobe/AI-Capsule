import { useState, useEffect } from "react";
import { getMe, getCapsules, createCapsule, updateCapsule, deleteCapsule } from "../services/api.js";

const EMPTY_FORM = {
  project_name: "",
  prompt_title: "",
  prompt_version: "",
  prompt_text: "",
  response_summary: "",
  category: "",
  usefulness: "",
  reviewed: false,
  improved: false,
  screenshot_url: "",
  notes: "",
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");

  const loadAll = async () => {
    setLoading(true);
    try {
      const [me, list] = await Promise.all([getMe(), getCapsules()]);
      setUser(me);
      setCapsules(list);
      setAuthError(false);
    } catch (err) {
      if (err.status === 401) setAuthError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      if (editingId) {
        await updateCapsule(editingId, form);
      } else {
        await createCapsule(form);
      }
      resetForm();
      await loadAll();
    } catch (err) {
      setFormError(err.message || "Failed to save capsule.");
    }
  };

  const handleEdit = (capsule) => {
    setEditingId(capsule.id);
    setForm({
      project_name: capsule.project_name,
      prompt_title: capsule.prompt_title,
      prompt_version: capsule.prompt_version || "",
      prompt_text: capsule.prompt_text,
      response_summary: capsule.response_summary || "",
      category: capsule.category || "",
      usefulness: capsule.usefulness || "",
      reviewed: Boolean(capsule.reviewed),
      improved: Boolean(capsule.improved),
      screenshot_url: capsule.screenshot_url || "",
      notes: capsule.notes || "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this capsule?")) return;
    await deleteCapsule(id);
    await loadAll();
  };

  if (loading) return <p className="loading-state">Loading…</p>;

  if (authError) {
    return (
      <div className="landing">
        <h1>Session expired or not signed in</h1>
        <a className="btn btn-primary" href="/login">Login with GitHub</a>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>AI Capsule</h1>
          <p className="subtitle">Signed in as {user?.login}</p>
        </div>
        <a className="btn btn-ghost" href="/logout">Logout</a>
      </header>

      <section className="card">
        <h2>{editingId ? "Edit capsule" : "New capsule"}</h2>
        {formError && <div className="alert">{formError}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field-grid">
            <label className="field">
              <span>Project name</span>
              <input name="project_name" value={form.project_name} onChange={handleChange} />
            </label>
            <label className="field">
              <span>Prompt title</span>
              <input name="prompt_title" value={form.prompt_title} onChange={handleChange} />
            </label>
            <label className="field">
              <span>Version</span>
              <input name="prompt_version" value={form.prompt_version} onChange={handleChange} placeholder="v1" />
            </label>
            <label className="field">
              <span>Category</span>
              <input name="category" value={form.category} onChange={handleChange} placeholder="Coding" />
            </label>
            <label className="field">
              <span>Usefulness</span>
              <input name="usefulness" value={form.usefulness} onChange={handleChange} placeholder="Good" />
            </label>
            <label className="field">
              <span>Screenshot URL</span>
              <input name="screenshot_url" value={form.screenshot_url} onChange={handleChange} />
            </label>
          </div>

          <label className="field field-full">
            <span>Prompt text</span>
            <textarea name="prompt_text" value={form.prompt_text} onChange={handleChange} rows={3} />
          </label>

          <label className="field field-full">
            <span>Response summary</span>
            <textarea name="response_summary" value={form.response_summary} onChange={handleChange} rows={2} />
          </label>

          <div className="checkbox-row">
            <label>
              <input type="checkbox" name="reviewed" checked={form.reviewed} onChange={handleChange} />
              Reviewed
            </label>
            <label>
              <input type="checkbox" name="improved" checked={form.improved} onChange={handleChange} />
              Improved
            </label>
          </div>

          <label className="field field-full">
            <span>Notes</span>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} />
          </label>

          <div className="actions">
            <button type="submit" className="btn btn-primary">
              {editingId ? "Save changes" : "Create capsule"}
            </button>
            {editingId && (
              <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Saved capsules</h2>
        {capsules.length === 0 ? (
          <p className="empty-state">No capsules yet — create one above.</p>
        ) : (
          <div className="capsule-grid">
            {capsules.map((c) => (
              <div className="capsule-card" key={c.id}>
                <h3>{c.prompt_title}</h3>
                <p className="capsule-meta">{c.project_name} · {c.prompt_version || "—"}</p>
                <p className="capsule-text">{c.prompt_text}</p>
                {c.response_summary && <p className="capsule-summary">Response: {c.response_summary}</p>}
                <p className="capsule-tags">
                  {c.category && <span>{c.category}</span>}
                  {c.usefulness && <span>{c.usefulness}</span>}
                  {Boolean(c.reviewed) && <span>Reviewed</span>}
                  {Boolean(c.improved) && <span>Improved</span>}
                </p>
                <div className="capsule-actions">
                  <button className="btn btn-ghost" onClick={() => handleEdit(c)}>Edit</button>
                  <button className="btn btn-danger" onClick={() => handleDelete(c.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}