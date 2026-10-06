"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { useConfirm } from "@/components/ConfirmDialog";
import { MobileBackButton } from "@/components/MobileBackButton";
import {
  LibraryIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/Icons";
import { LibraryItem, LibraryItemType } from "@/lib/types";

const TYPES: LibraryItemType[] = ["link", "image", "pdf", "document", "other"];

type FormState = {
  title: string;
  type: LibraryItemType;
  url: string;
  notes: string;
  tags: string;
};

const emptyForm: FormState = {
  title: "",
  type: "link",
  url: "",
  notes: "",
  tags: "",
};

function typeTone(t: LibraryItemType) {
  if (t === "link") return "bg-teal-soft text-forest";
  if (t === "image") return "bg-peach-soft text-forest";
  if (t === "pdf") return "bg-red-50 text-forest";
  if (t === "document") return "bg-sage-muted text-forest";
  return "bg-cream text-forest";
}

export default function LibraryPage() {
  const confirm = useConfirm();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/library");
    const data: LibraryItem[] = await res.json();
    setItems(data);
    setSelectedId((prev) => {
      if (prev && data.some((i) => i.id === prev)) return prev;
      return data[0]?.id || null;
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) for (const t of i.tags) set.add(t);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (typeFilter) list = list.filter((i) => i.type === typeFilter);
    if (tagFilter) {
      list = list.filter((i) =>
        i.tags.some((t) => t.toLowerCase() === tagFilter.toLowerCase())
      );
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((i) =>
        `${i.title} ${i.notes} ${i.url} ${i.tags.join(" ")}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, typeFilter, tagFilter, query]);

  const selected = items.find((i) => i.id === selectedId) || null;

  function openCreate(type: LibraryItemType = "link") {
    setEditing(null);
    setForm({ ...emptyForm, type });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(item: LibraryItem) {
    setEditing(item);
    setForm({
      title: item.title,
      type: item.type,
      url: item.url,
      notes: item.notes,
      tags: item.tags.join(", "),
    });
    setError(null);
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    if (form.type === "link" && !form.url.trim()) {
      setError("URL is required for links");
      return;
    }
    const payload = {
      title: form.title.trim(),
      type: form.type,
      url: form.url.trim(),
      notes: form.notes,
      tags: form.tags,
    };
    const res = editing
      ? await fetch(`/api/library/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Save failed");
      return;
    }
    const saved: LibraryItem = await res.json();
    setModalOpen(false);
    await load();
    setSelectedId(saved.id);
    setMobileDetail(true);
  }

  async function remove(item: LibraryItem) {
    if (!(await confirm({ title: "Delete library item?", message: `Delete “${item.title}”?`, confirmLabel: "Delete" }))) return;
    await fetch(`/api/library/${item.id}`, { method: "DELETE" });
    if (selectedId === item.id) setSelectedId(null);
    setMobileDetail(false);
    await load();
  }

  async function uploadFile(item: LibraryItem, file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/library/${item.id}/file`, {
      method: "POST",
      body: fd,
    });
    setUploading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Upload failed");
      return;
    }
    await load();
  }

  async function deleteFile(item: LibraryItem) {
    if (!(await confirm({ title: "Remove file?", message: "Remove attached file?", confirmLabel: "Remove" }))) return;
    await fetch(`/api/library/${item.id}/file`, { method: "DELETE" });
    await load();
  }

  function selectItem(item: LibraryItem) {
    setSelectedId(item.id);
    setMobileDetail(true);
  }

  const showDetail = mobileDetail;
  const fileUrl = selected?.filePath
    ? `/api/library/${selected.id}/file`
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-muted text-forest">
            <LibraryIcon size={22} />
          </div>
          <div>
            <h1 className="font-serif text-2xl text-forest md:text-3xl">
              Library
            </h1>
            <p className="text-sm text-forest/60">
              Links, screenshots, PDFs &amp; docs to study later
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => openCreate("link")}>
            + Link
          </button>
          <button className="btn-primary" onClick={() => openCreate("document")}>
            <PlusIcon size={16} /> Item
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <input
          className="input min-w-[10rem] flex-1"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="input max-w-[9rem]"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="input max-w-[10rem]"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
        >
          <option value="">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <div
          className={`flex min-h-0 w-full flex-col gap-2 overflow-y-auto pb-4 lg:w-[42%] ${
            showDetail ? "hidden lg:flex" : "flex"
          }`}
        >
          {filtered.length === 0 && (
            <p className="rounded-xl border border-dashed border-forest/15 bg-white p-6 text-center text-sm text-forest/50">
              Nothing saved yet. Add a link or upload a file.
            </p>
          )}
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectItem(item)}
              className={`flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-3 text-left ${
                selectedId === item.id
                  ? "border-sage bg-sage-muted"
                  : "border-forest/5 bg-white hover:border-sage/60"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${typeTone(
                      item.type
                    )}`}
                  >
                    {item.type}
                  </span>
                  <span className="truncate font-medium text-forest">
                    {item.title}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-forest/50">
                  {item.tags.length ? item.tags.join(", ") : item.url || "No tags"}
                </p>
              </div>
              {item.filePath && (
                <span className="shrink-0 text-[10px] text-forest/40">file</span>
              )}
            </button>
          ))}
        </div>

        <div
          className={`min-h-0 flex-1 ${
            showDetail ? "flex" : "hidden lg:flex"
          } flex-col rounded-2xl border border-forest/10 bg-white p-4 shadow-sm md:p-6`}
        >
          <div className="mb-3 lg:hidden">
            <MobileBackButton
              onClick={() => setMobileDetail(false)}
              label="Library"
            />
          </div>
          {selected ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${typeTone(
                      selected.type
                    )}`}
                  >
                    {selected.type}
                  </span>
                  <h2 className="mt-1 font-serif text-2xl text-forest">
                    {selected.title}
                  </h2>
                  {selected.tags.length > 0 && (
                    <p className="mt-1 text-xs text-forest/50">
                      {selected.tags.join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-ghost"
                    onClick={() => openEdit(selected)}
                  >
                    <PencilIcon size={16} /> Edit
                  </button>
                  <button
                    className="btn-ghost text-red-700"
                    onClick={() => remove(selected)}
                  >
                    <TrashIcon size={16} />
                  </button>
                </div>
              </div>

              {selected.url && (
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block break-all text-sm text-forest underline-offset-2 hover:underline"
                >
                  {selected.url}
                </a>
              )}

              {selected.notes && (
                <p className="mt-4 rounded-xl bg-cream/80 p-3 text-sm text-forest/80">
                  {selected.notes}
                </p>
              )}

              {/* Preview */}
              {fileUrl && selected.type === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fileUrl}
                  alt={selected.title}
                  className="mt-4 max-h-72 rounded-xl border border-forest/10 object-contain"
                />
              )}
              {fileUrl && selected.type === "pdf" && (
                <iframe
                  title={selected.title}
                  src={fileUrl}
                  className="mt-4 h-72 w-full rounded-xl border border-forest/10"
                />
              )}

              <div className="mt-4 rounded-xl border border-forest/10 bg-cream/50 p-4">
                <p className="text-sm font-medium text-forest">File</p>
                <p className="mt-0.5 text-xs text-forest/50">
                  Stored under data/uploads/library/
                </p>
                {selected.filePath ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <a className="btn-ghost text-sm" href={fileUrl || "#"}>
                      Download · {selected.fileName || "file"}
                    </a>
                    <label className="btn-ghost cursor-pointer text-sm">
                      Replace
                      <input
                        type="file"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadFile(selected, f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn-ghost text-sm text-red-700"
                      onClick={() => deleteFile(selected)}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="btn-primary mt-2 inline-flex cursor-pointer text-sm">
                    {uploading ? "Uploading…" : "Upload file"}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.doc,.docx,.txt,.rtf,.odt,.md,.ppt,.pptx,.xls,.xlsx"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadFile(selected, f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          ) : (
            <p className="m-auto text-sm text-forest/50">
              Select an item to preview or download.
            </p>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit item" : "New library item"}
      >
        <form onSubmit={save} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">Title</span>
            <input
              className="input w-full"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">Type</span>
            <select
              className="input w-full"
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value as LibraryItemType,
                }))
              }
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">URL</span>
            <input
              className="input w-full"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder={form.type === "link" ? "https://…" : "Optional"}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">Tags (comma-separated)</span>
            <input
              className="input w-full"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">Notes</span>
            <textarea
              className="input min-h-[4rem] w-full"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editing ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
