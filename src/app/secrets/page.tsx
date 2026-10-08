"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Modal } from "@/components/Modal";
import { useConfirm } from "@/components/ConfirmDialog";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/Icons";
import { MobileBackButton } from "@/components/MobileBackButton";
import { SecretCategory, SecretPublic } from "@/lib/types";

type VaultStatus = {
  configured: boolean;
  source: string;
  hint: string;
};

type FormState = {
  name: string;
  category: string;
  tags: string;
  notes: string;
  value: string;
};

const emptyForm: FormState = {
  name: "",
  category: "Other",
  tags: "",
  notes: "",
  value: "",
};

function SecretsInner() {
  const confirm = useConfirm();
  const search = useSearchParams();
  const [secrets, setSecrets] = useState<SecretPublic[]>([]);
  const [categories, setCategories] = useState<SecretCategory[]>([]);
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SecretPublic | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showValue, setShowValue] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealBusy, setRevealBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [query, setQuery] = useState("");

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [catError, setCatError] = useState<string | null>(null);
  const [catBusy, setCatBusy] = useState(false);
  const [editingCat, setEditingCat] = useState<SecretCategory | null>(null);
  const [editCatName, setEditCatName] = useState("");

  const load = useCallback(async () => {
    const [listRes, statusRes, catRes] = await Promise.all([
      fetch("/api/secrets"),
      fetch("/api/secrets/status"),
      fetch("/api/secrets/categories"),
    ]);
    const list: SecretPublic[] = await listRes.json();
    setSecrets(list);
    setStatus(await statusRes.json());
    if (catRes.ok) {
      const cats: SecretCategory[] = await catRes.json();
      setCategories(cats);
    }
    const qid = search.get("id");
    setSelectedId((prev) => {
      if (qid && list.some((s) => s.id === qid)) return qid;
      if (prev && list.some((s) => s.id === prev)) return prev;
      return list[0]?.id || null;
    });
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const qid = search.get("id");
    if (qid) {
      setSelectedId(qid);
      setMobileDetail(true);
    }
  }, [search]);

  useEffect(() => {
    setRevealed(null);
    setShowValue(false);
    setCopied(false);
    setError(null);
  }, [selectedId]);

  const categoryOptions = useMemo(() => {
    const fromStore = categories.map((c) => ({ value: c.name, label: c.name }));
    // Include orphan category names from existing secrets so edit still works
    const known = new Set(fromStore.map((o) => o.value.toLowerCase()));
    for (const s of secrets) {
      const name = (s.category || "").trim();
      if (name && !known.has(name.toLowerCase())) {
        fromStore.push({ value: name, label: name });
        known.add(name.toLowerCase());
      }
    }
    return fromStore.sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    );
  }, [categories, secrets]);

  const filterChoices = useMemo(() => {
    const names = new Set<string>();
    for (const c of categories) names.add(c.name);
    for (const s of secrets) {
      if (s.category?.trim()) names.add(s.category.trim());
    }
    return Array.from(names).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [categories, secrets]);

  const visibleSecrets = useMemo(() => {
    let list = secrets;
    if (filterCategory !== "all") {
      list = list.filter((s) => s.category === filterCategory);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((s) =>
        `${s.name} ${s.category} ${s.tags.join(" ")} ${s.notes}`
          .toLowerCase()
          .includes(q)
      );
    }
    return list;
  }, [secrets, filterCategory, query]);

  const selected = secrets.find((s) => s.id === selectedId) || null;

  function defaultCategoryName() {
    const other = categories.find((c) => c.name === "Other");
    if (other) return other.name;
    return categories[0]?.name || "Other";
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, category: defaultCategoryName() });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(secret: SecretPublic) {
    setEditing(secret);
    setForm({
      name: secret.name,
      category: secret.category || defaultCategoryName(),
      tags: secret.tags.join(", "),
      notes: secret.notes,
      value: "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.category.trim()) {
      setError("Category is required");
      return;
    }
    if (editing) {
      const body: Record<string, string> = {
        name: form.name,
        category: form.category,
        tags: form.tags,
        notes: form.notes,
      };
      if (form.value.trim()) body.value = form.value;
      const res = await fetch(`/api/secrets/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Save failed");
        return;
      }
      const updated = await res.json();
      setSecrets((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSelectedId(updated.id);
    } else {
      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Create failed");
        return;
      }
      const created = await res.json();
      setSecrets((prev) => [created, ...prev]);
      setSelectedId(created.id);
    }
    setModalOpen(false);
  }

  async function remove(secret: SecretPublic) {
    if (!(await confirm({ title: "Delete secret?", message: `Delete secret “${secret.name}”? This cannot be undone.`, confirmLabel: "Delete" }))) return;
    await fetch(`/api/secrets/${secret.id}`, { method: "DELETE" });
    setSecrets((prev) => prev.filter((s) => s.id !== secret.id));
    if (selectedId === secret.id) setSelectedId(null);
  }

  async function reveal() {
    if (!selected) return;
    setRevealBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/secrets/${selected.id}/reveal`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Reveal failed");
        return;
      }
      setRevealed(data.value);
      setShowValue(true);
    } finally {
      setRevealBusy(false);
    }
  }

  async function copyValue() {
    let value = revealed;
    if (!value && selected) {
      const res = await fetch(`/api/secrets/${selected.id}/reveal`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Copy failed");
        return;
      }
      value = data.value;
      setRevealed(value);
    }
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    setCatError(null);
    const name = newCategory.trim();
    if (!name) return;
    setCatBusy(true);
    try {
      const res = await fetch("/api/secrets/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCatError(data.error || "Could not add category");
        return;
      }
      setCategories((prev) =>
        [...prev, data].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        )
      );
      setNewCategory("");
    } finally {
      setCatBusy(false);
    }
  }

  async function saveCategoryEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCat) return;
    setCatError(null);
    const name = editCatName.trim();
    if (!name) return;
    setCatBusy(true);
    try {
      const res = await fetch(`/api/secrets/categories/${editingCat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCatError(data.error || "Could not rename category");
        return;
      }
      const oldName = editingCat.name;
      setCategories((prev) =>
        prev
          .map((c) => (c.id === data.id ? data : c))
          .sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          )
      );
      // Soft-rename secrets that still use the old label
      if (oldName !== data.name) {
        setSecrets((prev) =>
          prev.map((s) =>
            s.category === oldName ? { ...s, category: data.name } : s
          )
        );
        // Persist rename on secrets that used the old name
        const toUpdate = secrets.filter((s) => s.category === oldName);
        await Promise.all(
          toUpdate.map((s) =>
            fetch(`/api/secrets/${s.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ category: data.name }),
            })
          )
        );
      }
      setEditingCat(null);
      setEditCatName("");
    } finally {
      setCatBusy(false);
    }
  }

  async function deleteCategory(cat: SecretCategory) {
    if (
      !(await confirm({
        title: "Delete category?",
        message: `Delete category “${cat.name}”? Secrets keep their category label.`,
        confirmLabel: "Delete",
      }))
    ) {
      return;
    }
    setCatError(null);
    const res = await fetch(`/api/secrets/categories/${cat.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setCatError(data.error || "Could not delete category");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    if (filterCategory === cat.name) setFilterCategory("all");
  }

  return (
    <div className="page-shell min-h-[calc(100dvh-8rem)] md:min-h-screen">
      <header className="page-header">
        <div>
          <h1 className="section-title">Secrets.</h1>
          <p className="text-forest/55 mt-1 text-sm">
            API keys, passwords, and tokens — encrypted at rest.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setCatError(null);
              setEditingCat(null);
              setNewCategory("");
              setCatModalOpen(true);
            }}
          >
            Categories
          </button>
          <button type="button" className="btn-primary" onClick={openCreate}>
            <PlusIcon size={16} /> Add secret
          </button>
        </div>
      </header>

      {status && (
        <div className="card px-4 py-3 mb-4 flex items-start gap-3 bg-sage-muted/40">
          <LockIcon size={18} className="text-forest/60 mt-0.5 shrink-0" />
          <div className="text-sm text-forest/75">
            <span className="font-medium text-forest">Vault ready</span>
            <span className="text-forest/40"> · </span>
            <span className="capitalize">{status.source.replace("-", " ")}</span>
            <p className="text-xs text-forest/50 mt-0.5">{status.hint}</p>
          </div>
        </div>
      )}

      <div className="card p-3 mb-4">
        <input
          className="input-field"
          placeholder="Search name, category, tags, notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filterChoices.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setFilterCategory("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium min-h-[32px] transition-colors ${
              filterCategory === "all"
                ? "bg-forest text-white"
                : "bg-white border border-forest/10 text-forest/70 hover:bg-sage-muted"
            }`}
          >
            All
          </button>
          {filterChoices.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setFilterCategory(name)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium min-h-[32px] transition-colors ${
                filterCategory === name
                  ? "bg-forest text-white"
                  : "bg-white border border-forest/10 text-forest/70 hover:bg-sage-muted"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        <div
          className={`card p-3 overflow-y-auto scroll-thin space-y-2 max-h-[70vh] ${
            mobileDetail ? "hidden md:block" : ""
          }`}
        >
          {visibleSecrets.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSelectedId(s.id);
                setMobileDetail(true);
              }}
              className={`w-full text-left rounded-xl px-3 py-3.5 min-h-[52px] transition-colors active:bg-sage-muted/70 ${
                selectedId === s.id ? "bg-sage-muted" : "hover:bg-cream"
              }`}
            >
              <div className="flex items-center gap-2">
                <LockIcon size={14} className="text-forest/40 shrink-0" />
                <span className="text-sm font-medium text-forest truncate">
                  {s.name}
                </span>
              </div>
              <div className="text-xs text-forest/45 mt-1 pl-5">
                {s.category || "Other"}
                {s.tags.length > 0 ? ` · ${s.tags.slice(0, 2).join(", ")}` : ""}
              </div>
            </button>
          ))}
          {visibleSecrets.length === 0 && (
            <p className="text-sm text-forest/40 p-3">
              {secrets.length === 0
                ? "No secrets yet."
                : query.trim()
                  ? "No secrets match your search."
                  : "No secrets in this category."}
            </p>
          )}
        </div>

        <div className={`card p-5 ${!mobileDetail ? "hidden md:block" : ""}`}>
          {selected ? (
            <>
              <MobileBackButton
                onClick={() => setMobileDetail(false)}
                label="All secrets"
              />
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-serif text-2xl text-forest">
                    {selected.name}
                  </h2>
                  <p className="text-xs text-forest/45 mt-1">
                    {selected.category || "Other"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => openEdit(selected)}
                  >
                    <PencilIcon size={14} /> Edit
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-red-700"
                    onClick={() => remove(selected)}
                  >
                    <TrashIcon size={14} /> Delete
                  </button>
                </div>
              </div>

              {selected.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {selected.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] uppercase tracking-wide bg-forest/5 text-forest/60 px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {selected.notes && (
                <p className="text-sm text-forest/70 mb-5 whitespace-pre-wrap">
                  {selected.notes}
                </p>
              )}

              <div className="rounded-xl border border-forest/10 bg-cream-soft/80 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-forest/50 mb-2">
                  Secret value
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-sm text-forest bg-white rounded-lg px-3 py-2.5 border border-forest/5 break-all min-h-[42px]">
                    {showValue && revealed
                      ? revealed
                      : "••••••••••••••••••••"}
                  </code>
                  <button
                    type="button"
                    className="btn-ghost shrink-0"
                    disabled={revealBusy}
                    onClick={async () => {
                      if (showValue) {
                        setShowValue(false);
                        return;
                      }
                      if (revealed) {
                        setShowValue(true);
                        return;
                      }
                      await reveal();
                    }}
                    aria-label={showValue ? "Hide value" : "Reveal value"}
                  >
                    {showValue ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost shrink-0"
                    onClick={copyValue}
                    aria-label="Copy value"
                  >
                    <CopyIcon size={16} /> {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="text-[11px] text-forest/40 mt-2">
                  Value stays encrypted until you reveal or copy. It is never
                  included in list responses.
                </p>
              </div>

              {error && !modalOpen && (
                <p className="text-sm text-red-700 mt-3" role="alert">
                  {error}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-forest/40">Select or add a secret.</p>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? "Edit secret" : "New secret"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
              Name
            </label>
            <input
              className="input-field"
              placeholder="Name / label"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
              Category
            </label>
            <SearchableSelect
              options={categoryOptions}
              value={form.category}
              onChange={(category) => setForm({ ...form, category })}
              placeholder="Search categories…"
              emptyMessage="No categories match"
              required
              aria-label="Category"
            />
            <p className="text-[11px] text-forest/40 mt-1">
              Manage the list via Categories.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
              Tags
            </label>
            <input
              className="input-field"
              placeholder="Tags (comma separated)"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
              Notes
            </label>
            <textarea
              className="input-field min-h-[80px]"
              placeholder="Notes (optional, not encrypted)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
              {editing ? "New value (leave blank to keep)" : "Value"}
            </label>
            <input
              type="password"
              className="input-field font-mono"
              placeholder={editing ? "••••••••" : "Paste secret value"}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              required={!editing}
              autoComplete="new-password"
            />
          </div>
          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={catModalOpen}
        title="Secret categories"
        onClose={() => {
          setCatModalOpen(false);
          setEditingCat(null);
          setCatError(null);
        }}
      >
        <div className="space-y-4">
          <form onSubmit={addCategory} className="flex gap-2">
            <input
              className="input-field"
              placeholder="New category name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              maxLength={64}
            />
            <button
              type="submit"
              className="btn-primary shrink-0"
              disabled={catBusy || !newCategory.trim()}
            >
              <PlusIcon size={16} /> Add
            </button>
          </form>

          {catError && (
            <p className="text-sm text-red-700" role="alert">
              {catError}
            </p>
          )}

          <ul className="card divide-y divide-forest/5">
            {categories.map((cat) => (
              <li
                key={cat.id}
                className="flex items-center gap-2 px-3 py-2.5 min-h-[48px]"
              >
                {editingCat?.id === cat.id ? (
                  <form
                    onSubmit={saveCategoryEdit}
                    className="flex-1 flex gap-2 min-w-0"
                  >
                    <input
                      className="input-field"
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      maxLength={64}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="btn-primary shrink-0"
                      disabled={catBusy || !editCatName.trim()}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn-ghost shrink-0"
                      onClick={() => {
                        setEditingCat(null);
                        setEditCatName("");
                      }}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-forest truncate">
                      {cat.name}
                    </span>
                    <button
                      type="button"
                      className="btn-ghost shrink-0"
                      aria-label={`Rename ${cat.name}`}
                      onClick={() => {
                        setEditingCat(cat);
                        setEditCatName(cat.name);
                        setCatError(null);
                      }}
                    >
                      <PencilIcon size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost shrink-0 text-red-700"
                      aria-label={`Delete ${cat.name}`}
                      onClick={() => deleteCategory(cat)}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </>
                )}
              </li>
            ))}
            {categories.length === 0 && (
              <li className="px-3 py-4 text-sm text-forest/40">
                No categories yet.
              </li>
            )}
          </ul>
          <p className="text-xs text-forest/45">
            Deleting a category does not remove secrets — they keep their label.
          </p>
        </div>
      </Modal>
    </div>
  );
}

export default function SecretsPage() {
  return (
    <Suspense
      fallback={
        <div className="px-8 py-6 text-sm text-forest/50">Loading secrets…</div>
      }
    >
      <SecretsInner />
    </Suspense>
  );
}
