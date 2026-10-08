"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useConfirm } from "@/components/ConfirmDialog";
import { MobileBackButton } from "@/components/MobileBackButton";
import {
  BelongingIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/Icons";
import { Asset, Belonging, BelongingStatus } from "@/lib/types";

const STATUSES: BelongingStatus[] = [
  "with_me",
  "stored",
  "lent_out",
  "missing",
];

const CATEGORIES = [
  "Electronics",
  "Documents",
  "Clothing",
  "Keys",
  "Tools",
  "Kitchen",
  "Other",
];

type FormState = {
  name: string;
  category: string;
  location: string;
  photoUrl: string;
  photoNote: string;
  tags: string;
  quantity: string;
  status: BelongingStatus;
  notes: string;
  linkedAssetId: string;
};

const emptyForm: FormState = {
  name: "",
  category: "Other",
  location: "",
  photoUrl: "",
  photoNote: "",
  tags: "",
  quantity: "1",
  status: "stored",
  notes: "",
  linkedAssetId: "",
};

function statusLabel(s: BelongingStatus) {
  if (s === "with_me") return "With me";
  if (s === "stored") return "Stored";
  if (s === "lent_out") return "Lent out";
  return "Missing";
}

function statusTone(s: BelongingStatus) {
  if (s === "with_me") return "bg-sage-muted text-forest";
  if (s === "stored") return "bg-teal-soft text-forest";
  if (s === "lent_out") return "bg-peach-soft text-forest";
  return "bg-red-50 text-forest";
}

export default function BelongingsPage() {
  const confirm = useConfirm();
  const [items, setItems] = useState<Belonging[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [query, setQuery] = useState("");
  const [groupByLoc, setGroupByLoc] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Belonging | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [bRes, aRes] = await Promise.all([
      fetch("/api/belongings"),
      fetch("/api/assets"),
    ]);
    const data: Belonging[] = await bRes.json();
    setItems(data);
    setAssets(await aRes.json());
    setSelectedId((prev) => {
      if (prev && data.some((b) => b.id === prev)) return prev;
      return data[0]?.id || null;
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const locations = useMemo(() => {
    const set = new Set(items.map((b) => b.location).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const categories = useMemo(() => {
    const set = new Set([
      ...CATEGORIES,
      ...items.map((b) => b.category).filter(Boolean),
    ]);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (categoryFilter) {
      list = list.filter((b) => b.category === categoryFilter);
    }
    if (statusFilter) {
      list = list.filter((b) => b.status === statusFilter);
    }
    if (locationFilter) {
      const loc = locationFilter.toLowerCase();
      list = list.filter((b) => b.location.toLowerCase().includes(loc));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((b) =>
        `${b.name} ${b.category} ${b.location} ${b.photoNote} ${b.notes} ${b.tags.join(" ")}`
          .toLowerCase()
          .includes(q)
      );
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [items, categoryFilter, statusFilter, locationFilter, query]);

  const grouped = useMemo(() => {
    const map: Record<string, Belonging[]> = {};
    for (const b of filtered) {
      const key = b.location.trim() || "Unknown location";
      if (!map[key]) map[key] = [];
      map[key].push(b);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const selected = items.find((b) => b.id === selectedId) || null;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(b: Belonging) {
    setEditing(b);
    setForm({
      name: b.name,
      category: b.category,
      location: b.location,
      photoUrl: b.photoUrl,
      photoNote: b.photoNote,
      tags: b.tags.join(", "),
      quantity: String(b.quantity),
      status: b.status,
      notes: b.notes,
      linkedAssetId: b.linkedAssetId || "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    const qty = Number(form.quantity);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      location: form.location,
      photoUrl: form.photoUrl,
      photoNote: form.photoNote,
      tags: form.tags,
      quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
      status: form.status,
      notes: form.notes,
      linkedAssetId: form.linkedAssetId || null,
    };
    const res = editing
      ? await fetch(`/api/belongings/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/belongings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Save failed");
      return;
    }
    const saved: Belonging = await res.json();
    setModalOpen(false);
    await load();
    setSelectedId(saved.id);
    setMobileDetail(true);
  }

  async function remove(b: Belonging) {
    if (!(await confirm({ title: "Delete item?", message: `Delete “${b.name}”?`, confirmLabel: "Delete" }))) return;
    await fetch(`/api/belongings/${b.id}`, { method: "DELETE" });
    if (selectedId === b.id) setSelectedId(null);
    setMobileDetail(false);
    await load();
  }

  function selectItem(b: Belonging) {
    setSelectedId(b.id);
    setMobileDetail(true);
  }

  const showDetail = mobileDetail;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-muted text-forest">
            <BelongingIcon size={22} />
          </div>
          <div>
            <h1 className="font-serif text-2xl text-forest md:text-3xl">
              Keep
            </h1>
            <p className="text-sm text-forest/60">
              Personal items &amp; where they are kept
            </p>
          </div>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <PlusIcon size={16} /> Add item
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        <input
          className="input-field min-w-[10rem] flex-1"
          placeholder="Search or “where is …”"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <SearchableSelect
          className="w-40"
          options={[
            { value: "", label: "All categories" },
            ...categories.map((c) => ({ value: c, label: c })),
          ]}
          value={categoryFilter}
          onChange={setCategoryFilter}
          placeholder="All categories"
          aria-label="Filter by category"
        />
        <SearchableSelect
          className="w-40"
          options={[
            { value: "", label: "All statuses" },
            ...STATUSES.map((s) => ({ value: s, label: statusLabel(s) })),
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="All statuses"
          aria-label="Filter by status"
        />
        <SearchableSelect
          className="w-48"
          options={[
            { value: "", label: "All locations" },
            ...locations.map((loc) => ({ value: loc, label: loc })),
          ]}
          value={locationFilter}
          onChange={setLocationFilter}
          placeholder="All locations"
          aria-label="Filter by location"
        />
        <button
          type="button"
          className={`btn-ghost text-sm ${groupByLoc ? "bg-sage-muted" : ""}`}
          onClick={() => setGroupByLoc((v) => !v)}
        >
          {groupByLoc ? "Grouped by place" : "Flat list"}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <div
          className={`flex min-h-0 w-full flex-col gap-3 lg:w-[44%] ${
            showDetail ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
            {filtered.length === 0 && (
              <p className="rounded-xl border border-dashed border-forest/15 bg-white p-6 text-center text-sm text-forest/50">
                No items match. Add an item or clear filters.
              </p>
            )}
            {groupByLoc
              ? grouped.map(([loc, list]) => (
                  <div key={loc}>
                    <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-forest/45">
                      {loc} · {list.length}
                    </p>
                    <div className="space-y-2">
                      {list.map((b) => (
                        <ItemRow
                          key={b.id}
                          b={b}
                          active={selectedId === b.id}
                          onSelect={() => selectItem(b)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              : filtered.map((b) => (
                  <ItemRow
                    key={b.id}
                    b={b}
                    active={selectedId === b.id}
                    onSelect={() => selectItem(b)}
                  />
                ))}
          </div>
        </div>

        <div
          className={`min-h-0 flex-1 ${
            showDetail ? "flex" : "hidden lg:flex"
          } flex-col rounded-2xl border border-forest/10 bg-white p-4 shadow-sm md:p-6`}
        >
          <div className="mb-3 lg:hidden">
            <MobileBackButton
              onClick={() => setMobileDetail(false)}
              label="All items"
            />
          </div>
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(
                      selected.status
                    )}`}
                  >
                    {statusLabel(selected.status)}
                  </span>
                  <h2 className="mt-1 font-serif text-2xl text-forest">
                    {selected.name}
                  </h2>
                  <p className="text-sm text-forest/60">
                    {selected.category}
                    {selected.quantity > 1 ? ` · ×${selected.quantity}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={() => openEdit(selected)}>
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

              <div className="mt-4 rounded-xl bg-sage-muted/50 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-forest/45">
                  Where it is
                </p>
                <p className="mt-0.5 font-medium text-forest">
                  {selected.location || "—"}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <Field
                  label="Photo note"
                  value={selected.photoNote || "—"}
                />
                <Field
                  label="Tags"
                  value={
                    selected.tags.length ? selected.tags.join(", ") : "—"
                  }
                />
              </div>

              {selected.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.photoUrl}
                  alt={selected.name}
                  className="mt-4 max-h-48 rounded-xl border border-forest/10 object-cover"
                />
              )}

              {selected.notes && (
                <p className="mt-4 rounded-xl bg-cream/80 p-3 text-sm text-forest/80">
                  {selected.notes}
                </p>
              )}

              {selected.linkedAssetId && (
                <Link
                  href="/assets"
                  className="mt-3 inline-block text-sm text-forest underline-offset-2 hover:underline"
                >
                  Linked asset ·{" "}
                  {assets.find((a) => a.id === selected.linkedAssetId)?.name ||
                    selected.linkedAssetId}
                </Link>
              )}
            </>
          ) : (
            <p className="m-auto text-sm text-forest/50">
              Select an item to see where it is kept.
            </p>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit item" : "New item"}
      >
        <form onSubmit={save} className="space-y-3">
          <label className="block text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Name</span>
            <input
              className="input-field w-full"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Category</span>
              <input
                className="input-field w-full"
                list="bel-cats"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
              />
              <datalist id="bel-cats">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label className="block text-sm">
              <span className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Quantity</span>
              <input
                className="input-field w-full"
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quantity: e.target.value }))
                }
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
              Location (room / place / container)
            </span>
            <input
              className="input-field w-full"
              list="bel-locs"
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
              placeholder="e.g. Bedroom · Top drawer"
            />
            <datalist id="bel-locs">
              {locations.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
          </label>
          <label className="block text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Status</span>
            <SearchableSelect
              options={STATUSES.map((s) => ({
                value: s,
                label: statusLabel(s),
              }))}
              value={form.status}
              onChange={(status) =>
                setForm((f) => ({
                  ...f,
                  status: status as BelongingStatus,
                }))
              }
              aria-label="Status"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Photo URL</span>
            <input
              className="input-field w-full"
              value={form.photoUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, photoUrl: e.target.value }))
              }
              placeholder="Optional https://…"
            />
          </label>
          <label className="block text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Photo note</span>
            <input
              className="input-field w-full"
              value={form.photoNote}
              onChange={(e) =>
                setForm((f) => ({ ...f, photoNote: e.target.value }))
              }
              placeholder="Short visual description"
            />
          </label>
          <label className="block text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Tags (comma-separated)</span>
            <input
              className="input-field w-full"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Linked asset</span>
            <SearchableSelect
              options={[
                { value: "", label: "None" },
                ...assets.map((a) => ({ value: a.id, label: a.name })),
              ]}
              value={form.linkedAssetId}
              onChange={(linkedAssetId) =>
                setForm((f) => ({ ...f, linkedAssetId }))
              }
              placeholder="None"
              aria-label="Linked asset"
            />
          </label>
          <label className="block text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Notes</span>
            <textarea
              className="input-field min-h-[4rem] w-full"
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

function ItemRow({
  b,
  active,
  onSelect,
}: {
  b: Belonging;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-3 text-left transition ${
        active
          ? "border-sage bg-sage-muted"
          : "border-forest/5 bg-white hover:border-sage/60"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusTone(
              b.status
            )}`}
          >
            {statusLabel(b.status)}
          </span>
          <span className="truncate font-medium text-forest">{b.name}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-forest/50">
          {b.category} · {b.location || "No location"}
        </p>
      </div>
      {b.quantity > 1 && (
        <span className="shrink-0 text-xs text-forest/45">×{b.quantity}</span>
      )}
    </button>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-cream/70 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-forest/45">{label}</p>
      <p className="mt-0.5 text-forest">{value}</p>
    </div>
  );
}
