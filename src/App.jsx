import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

// Load fonts once (dev HMR-safe).
let __fontsLoaded = false;
function ensureFonts() {
  if (__fontsLoaded) return;
  __fontsLoaded = true;
  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href =
    "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Sora:wght@300;400;500;600;700;800&display=swap";
  document.head.appendChild(fontLink);
}

const FREQUENCIES = [
  "Annual",
  "18 Months",
  "Semi-Annual",
  "Quarterly",
  "Monthly",
  "One-time / Ad hoc",
];

const CATEGORIES = [
  "Access Management",
  "Training & Awareness",
  "Business Continuity",
  "Third-Party Risk",
  "Incident Response",
  "Change Management",
  "Physical Security",
  "Data Classification",
];

const STATUS = {
  "not-in-place": {
    label: "Not In Place",
    color: "#B91C1C",
    bg: "rgba(185,28,28,0.14)",
    dot: "#EF4444",
  },
  pending: {
    label: "Pending Upload",
    color: "#A16207",
    bg: "rgba(245,158,11,0.14)",
    dot: "#F59E0B",
  },
  "in-progress": {
    label: "In Progress",
    color: "#A16207",
    bg: "rgba(245,158,11,0.14)",
    dot: "#F59E0B",
  },
  submitted: {
    label: "Under Review",
    color: "#1D4ED8",
    bg: "rgba(59,130,246,0.14)",
    dot: "#3B82F6",
  },
  approved: {
    label: "Approved",
    color: "#047857",
    bg: "rgba(16,185,129,0.14)",
    dot: "#10B981",
  },
  rejected: {
    label: "Rejected",
    color: "#9A3412",
    bg: "rgba(249,115,22,0.14)",
    dot: "#F97316",
  },
};

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function formatDate(d) {
  if (!d) return "";
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function daysUntil(isoDate) {
  if (!isoDate) return null;
  const ms = new Date(isoDate).getTime() - new Date().getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function Button({ variant = "primary", style, ...props }) {
  const base = {
    height: 36,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    color: "#E5E7EB",
    background: "rgba(255,255,255,0.06)",
    outline: "none",
  };
  const variants = {
    primary: {
      background: "linear-gradient(180deg, rgba(99,102,241,0.95), rgba(79,70,229,0.95))",
      border: "1px solid rgba(99,102,241,0.55)",
    },
    ghost: { background: "rgba(255,255,255,0.04)" },
    danger: {
      background: "rgba(185,28,28,0.16)",
      border: "1px solid rgba(185,28,28,0.4)",
    },
  };
  return <button {...props} style={{ ...base, ...(variants[variant] ?? {}), ...style }} />;
}

function Card({ children, style }) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 700 }}>{label}</span>
      {children}
      {hint ? <span style={{ fontSize: 12, color: "#6B7280" }}>{hint}</span> : null}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      style={{
        height: 38,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,0,0,0.28)",
        color: "#F9FAFB",
        padding: "0 12px",
        outline: "none",
        ...(props.style ?? {}),
      }}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      style={{
        height: 38,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,0,0,0.28)",
        color: "#F9FAFB",
        padding: "0 12px",
        outline: "none",
        ...(props.style ?? {}),
      }}
    />
  );
}

function StatusPill({ statusKey }) {
  const s = STATUS[statusKey] ?? STATUS["not-in-place"];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        background: s.bg,
        color: s.color,
        fontFamily:
          '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: s.dot }} />
      {s.label}
    </span>
  );
}

function ProgressBar({ value, total }) {
  const pct = total <= 0 ? 0 : Math.max(0, Math.min(1, value / total));
  return (
    <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${Math.round(pct * 100)}%`,
          background: "linear-gradient(90deg, rgba(99,102,241,0.9), rgba(34,211,238,0.9))",
        }}
      />
    </div>
  );
}

function Modal({ title, open, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "grid",
        placeItems: "center",
        padding: 18,
        zIndex: 50,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <Card style={{ width: "min(860px, 100%)", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{title}</div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div style={{ marginTop: 12 }}>{children}</div>
        {footer ? <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10 }}>{footer}</div> : null}
      </Card>
    </div>
  );
}

function SidebarNavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 12,
        color: isActive ? "#F9FAFB" : "#C7CBD5",
        textDecoration: "none",
        fontWeight: 700,
        background: isActive ? "rgba(99,102,241,0.20)" : "transparent",
        border: isActive ? "1px solid rgba(99,102,241,0.40)" : "1px solid transparent",
      })}
      end
    >
      {children}
    </NavLink>
  );
}

function Layout({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1000px 700px at 10% 5%, rgba(99,102,241,0.25), transparent 60%), radial-gradient(800px 600px at 80% 10%, rgba(34,211,238,0.18), transparent 55%), #0A0B10",
        color: "#E5E7EB",
        fontFamily:
          '"Sora", system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "268px 1fr" }}>
        <aside
          style={{
            position: "sticky",
            top: 0,
            height: "100vh",
            padding: 14,
            borderRight: "1px solid rgba(255,255,255,0.10)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ padding: "10px 10px 14px" }}>
            <div
              style={{
                fontFamily:
                  '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                color: "#9CA3AF",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              CUEC Platform
            </div>
            <div style={{ marginTop: 6, fontWeight: 900, letterSpacing: -0.4, fontSize: 18 }}>CUECTrack</div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#A3A3A3" }}>All data is local `useState` for now.</div>
          </div>

          <nav style={{ display: "grid", gap: 6, padding: 8 }}>
            <SidebarNavItem to="/dashboard">Dashboard</SidebarNavItem>
            <SidebarNavItem to="/cuecs">CUECs</SidebarNavItem>
            <SidebarNavItem to="/bulk-import">Bulk Import</SidebarNavItem>
            <SidebarNavItem to="/reminders">Reminders</SidebarNavItem>
            <SidebarNavItem to="/review-queue">Review Queue</SidebarNavItem>
            <SidebarNavItem to="/owners">Owners</SidebarNavItem>
          </nav>

          <div style={{ marginTop: 12, padding: 8 }}>
            <Card style={{ padding: 12 }}>
              <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 800 }}>Quick links</div>
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <NavLink to="/email-preview" style={{ color: "#E5E7EB", textDecoration: "none", fontWeight: 700 }}>
                  Email Preview
                </NavLink>
                <NavLink
                  to="/owner?token=demo-owner-token"
                  style={{ color: "#E5E7EB", textDecoration: "none", fontWeight: 700 }}
                >
                  Owner Portal (demo token)
                </NavLink>
              </div>
            </Card>
          </div>
        </aside>

        <main style={{ padding: "18px 18px 48px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>{children}</div>
        </main>
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.7 }}>{title}</div>
        {subtitle ? <div style={{ marginTop: 6, color: "#A3A3A3" }}>{subtitle}</div> : null}
      </div>
      {right ? <div style={{ display: "flex", gap: 10, alignItems: "center" }}>{right}</div> : null}
    </div>
  );
}

function DashboardPage({ cuecs, owners }) {
  const totals = useMemo(() => {
    const total = cuecs.length;
    const done = cuecs.filter((c) => c.status === "approved").length;
    const inReview = cuecs.filter((c) => c.status === "submitted").length;
    const needEvidence = cuecs.filter((c) => c.status === "pending" || c.status === "not-in-place").length;
    return { total, done, inReview, needEvidence };
  }, [cuecs]);

  const byOwner = useMemo(() => {
    return owners.map((o) => {
      const mine = cuecs.filter((c) => c.ownerId === o.id);
      const total = mine.length;
      const complete = mine.filter((c) => c.status === "approved").length;
      return { owner: o, total, complete };
    });
  }, [cuecs, owners]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Completion stats and progress by owner."
        right={
          <Card style={{ padding: "10px 12px" }}>
            <div
              style={{
                fontFamily:
                  '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: 12,
                color: "#9CA3AF",
                fontWeight: 800,
              }}
            >
              Total CUECs: <span style={{ color: "#F9FAFB" }}>{totals.total}</span>
            </div>
          </Card>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Approved", value: totals.done },
          { label: "Under review", value: totals.inReview },
          { label: "Need evidence", value: totals.needEvidence },
          { label: "Total", value: totals.total },
        ].map((k) => (
          <Card key={k.label} style={{ padding: 14 }}>
            <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 800 }}>{k.label}</div>
            <div style={{ marginTop: 8, fontSize: 24, fontWeight: 900 }}>{k.value}</div>
          </Card>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <Card style={{ padding: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>Progress by owner</div>
          <div style={{ display: "grid", gap: 10 }}>
            {byOwner.map((row) => (
              <div key={row.owner.id} style={{ display: "grid", gridTemplateColumns: "220px 1fr 80px", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 900 }}>{row.owner.name}</div>
                  <div style={{ color: "#9CA3AF", fontSize: 12 }}>{row.owner.email}</div>
                </div>
                <ProgressBar value={row.complete} total={row.total || 1} />
                <div
                  style={{
                    textAlign: "right",
                    fontFamily:
                      '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    color: "#D1D5DB",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {row.complete}/{row.total}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function CuecsPage({ cuecs, owners, setCuecs, setEmailDraft }) {
  const [query, setQuery] = useState("");
  const [ownerId, setOwnerId] = useState("All");
  const [status, setStatus] = useState("All");
  const [category, setCategory] = useState("All");
  const [openAdd, setOpenAdd] = useState(false);

  const filtered = useMemo(() => {
    return cuecs.filter((c) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        c.controlId.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q);
      const matchesOwner = ownerId === "All" || c.ownerId === ownerId;
      const matchesStatus = status === "All" || c.status === status;
      const matchesCategory = category === "All" || c.category === category;
      return matchesQuery && matchesOwner && matchesStatus && matchesCategory;
    });
  }, [cuecs, query, ownerId, status, category]);

  const ownerName = (id) => owners.find((o) => o.id === id)?.name ?? "Unassigned";

  return (
    <>
      <PageHeader
        title="CUECs"
        subtitle="Filter, assign owners, set due dates, and send emails for controls not in place."
        right={<Button onClick={() => setOpenAdd(true)}>+ Add CUEC</Button>}
      />

      <Card style={{ padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: 12 }}>
          <Field label="Search">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search control id, title, category…" />
          </Field>
          <Field label="Owner">
            <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              <option value="All">All</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="All">All</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="All">All</option>
              {Object.entries(STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <div style={{ marginTop: 12 }}>
        <Card style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 980 }}>
              <thead>
                <tr>
                  {["Control", "Title", "Category", "Owner", "Frequency", "Due", "Status", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "12px 14px",
                        fontSize: 12,
                        color: "#9CA3AF",
                        fontWeight: 900,
                        borderBottom: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(0,0,0,0.16)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <span
                        style={{
                          fontFamily:
                            '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                          fontWeight: 900,
                        }}
                      >
                        {c.controlId}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{c.title}</td>
                    <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{c.category}</td>
                    <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <Select
                        value={c.ownerId ?? ""}
                        onChange={(e) => {
                          const nextOwner = e.target.value || null;
                          setCuecs((prev) => prev.map((x) => (x.id === c.id ? { ...x, ownerId: nextOwner } : x)));
                        }}
                        style={{ height: 34 }}
                      >
                        <option value="">Unassigned</option>
                        {owners.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <Select
                        value={c.frequency}
                        onChange={(e) => setCuecs((prev) => prev.map((x) => (x.id === c.id ? { ...x, frequency: e.target.value } : x)))}
                        style={{ height: 34 }}
                      >
                        {FREQUENCIES.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <Input
                        type="date"
                        value={c.dueDate ?? ""}
                        onChange={(e) => setCuecs((prev) => prev.map((x) => (x.id === c.id ? { ...x, dueDate: e.target.value } : x)))}
                        style={{ height: 34 }}
                      />
                    </td>
                    <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <StatusPill statusKey={c.status} />
                    </td>
                    <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setCuecs((prev) =>
                              prev.map((x) =>
                                x.id === c.id ? { ...x, status: x.status === "not-in-place" ? "pending" : "not-in-place" } : x
                              )
                            );
                          }}
                        >
                          Toggle NIP
                        </Button>
                        <Button
                          variant={c.status === "not-in-place" ? "primary" : "ghost"}
                          disabled={c.status !== "not-in-place"}
                          onClick={() => {
                            const owner = owners.find((o) => o.id === c.ownerId);
                            setEmailDraft({
                              type: "assignment",
                              subject: `Action Required: ${c.controlId} – Evidence Needed`,
                              to: owner?.email ?? "(unassigned)",
                              body:
                                `Hi ${owner?.name ?? "there"},\n\n` +
                                `Please provide evidence for the control below:\n\n` +
                                `- Control: ${c.controlId}\n` +
                                `- Title: ${c.title}\n` +
                                `- Due: ${c.dueDate ?? "(not set)"}\n\n` +
                                `If this control is not in place, please document the remediation plan and target date.\n\n` +
                                `Thanks,\nCUEC Platform`,
                            });
                          }}
                        >
                          Send Email
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 16, color: "#9CA3AF" }}>
                      No results. Try clearing filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <AddCuecModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        owners={owners}
        onAdd={(row) => {
          setCuecs((prev) => [{ ...row, id: uid("cuec") }, ...prev]);
          setOpenAdd(false);
        }}
      />
    </>
  );
}

function AddCuecModal({ open, onClose, owners, onAdd }) {
  const [controlId, setControlId] = useState("AC-");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [frequency, setFrequency] = useState(FREQUENCIES[0]);
  const [dueDate, setDueDate] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    if (!open) return;
    setControlId("AC-");
    setTitle("");
    setCategory(CATEGORIES[0]);
    setFrequency(FREQUENCIES[0]);
    setDueDate("");
    setOwnerId("");
    setStatus("pending");
  }, [open]);

  return (
    <Modal
      title="Add a CUEC"
      open={open}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onAdd?.({
                controlId: controlId.trim() || "NEW",
                title: title.trim() || "(Untitled)",
                category,
                frequency,
                dueDate: dueDate || null,
                ownerId: ownerId || null,
                status,
                evidence: [],
              })
            }
          >
            Add
          </Button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
        <Field label="Control ID">
          <Input value={controlId} onChange={(e) => setControlId(e.target.value)} />
        </Field>
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Quarterly access review" />
        </Field>
        <Field label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Frequency">
          <Select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Due date">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <Field label="Owner">
          <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            <option value="">Unassigned</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Initial status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

function parseCsv(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  function splitCsvLine(line) {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        const next = line[i + 1];
        if (inQuotes && next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.replace(/^"|"$/g, "").trim());
  const rows = lines.slice(1).map((ln) => {
    const cols = splitCsvLine(ln);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (cols[idx] ?? "").replace(/^"|"$/g, "").trim();
    });
    return obj;
  });
  return { headers, rows };
}

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function BulkImportPage({ owners, setCuecs }) {
  const [step, setStep] = useState(1); // 1 upload, 2 map, 3 preview, 4 done
  const [fileName, setFileName] = useState("");
  const [rawText, setRawText] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  const [mapping, setMapping] = useState(() => ({
    controlId: "",
    title: "",
    category: "",
    ownerEmail: "",
    frequency: "",
    dueDate: "",
    status: "",
  }));

  const [importedCount, setImportedCount] = useState(0);

  const template = `control_id,title,category,owner_email,frequency,due_date,status\nAM-01,Quarterly access review,Access Management,alex@company.com,Quarterly,${formatDate(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  )},pending\n`;

  const ownerByEmail = useMemo(() => {
    const m = new Map();
    owners.forEach((o) => m.set(o.email.toLowerCase(), o));
    return m;
  }, [owners]);

  function reset() {
    setStep(1);
    setFileName("");
    setRawText("");
    setHeaders([]);
    setRows([]);
    setImportedCount(0);
    setMapping({
      controlId: "",
      title: "",
      category: "",
      ownerEmail: "",
      frequency: "",
      dueDate: "",
      status: "",
    });
  }

  async function handleFile(file) {
    const name = file?.name ?? "";
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    setFileName(name);
    setRawText(text);
    setHeaders(parsed.headers);
    setRows(parsed.rows);

    const lower = new Map(parsed.headers.map((h) => [h.toLowerCase(), h]));
    const pick = (...candidates) => {
      for (const c of candidates) {
        const hit = lower.get(c);
        if (hit) return hit;
      }
      return "";
    };
    setMapping({
      controlId: pick("control_id", "controlid", "control", "id"),
      title: pick("title", "name", "control_title"),
      category: pick("category", "domain"),
      ownerEmail: pick("owner_email", "owner", "email", "assignee_email"),
      frequency: pick("frequency", "cadence"),
      dueDate: pick("due_date", "duedate", "due", "deadline"),
      status: pick("status", "state"),
    });
    setStep(2);
  }

  const mappedPreview = useMemo(() => {
    if (rows.length === 0) return [];
    const get = (obj, key) => (key ? obj[key] ?? "" : "");
    return rows.slice(0, 50).map((r) => {
      const status = (get(r, mapping.status) || "pending").trim();
      const ownerEmail = (get(r, mapping.ownerEmail) || "").trim().toLowerCase();
      const owner = ownerByEmail.get(ownerEmail);
      return {
        controlId: get(r, mapping.controlId),
        title: get(r, mapping.title),
        category: get(r, mapping.category),
        owner: owner?.name ?? (ownerEmail ? ownerEmail : "Unassigned"),
        frequency: get(r, mapping.frequency),
        dueDate: get(r, mapping.dueDate),
        status,
      };
    });
  }, [rows, mapping, ownerByEmail]);

  function canContinueFromMap() {
    return Boolean(mapping.controlId && mapping.title);
  }

  function runImport() {
    const get = (obj, key) => (key ? obj[key] ?? "" : "");
    const newCuecs = rows
      .map((r) => {
        const controlId = (get(r, mapping.controlId) || "").trim();
        const title = (get(r, mapping.title) || "").trim();
        if (!controlId || !title) return null;
        const category = (get(r, mapping.category) || CATEGORIES[0]).trim();
        const frequency = (get(r, mapping.frequency) || FREQUENCIES[0]).trim();
        const dueDate = (get(r, mapping.dueDate) || "").trim() || null;
        const status = (get(r, mapping.status) || "pending").trim() || "pending";
        const ownerEmail = (get(r, mapping.ownerEmail) || "").trim().toLowerCase();
        const ownerId = ownerByEmail.get(ownerEmail)?.id ?? null;
        return {
          id: uid("cuec"),
          controlId,
          title,
          category,
          ownerId,
          frequency,
          dueDate,
          status: STATUS[status] ? status : "pending",
          evidence: [],
        };
      })
      .filter(Boolean);

    setCuecs((prev) => [...newCuecs, ...prev]);
    setImportedCount(newCuecs.length);
    setStep(4);
  }

  return (
    <>
      <PageHeader
        title="Bulk Import"
        subtitle="CSV import wizard (upload → map columns → preview → done)."
        right={
          <div style={{ display: "flex", gap: 10 }}>
            <Button
              variant="ghost"
              onClick={() => downloadCsv("cuec_import_template.csv", template)}
            >
              Download template
            </Button>
            <Button variant="ghost" onClick={reset}>
              Reset
            </Button>
          </div>
        }
      />

      <Card style={{ padding: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { n: 1, t: "Upload" },
            { n: 2, t: "Map columns" },
            { n: 3, t: "Preview" },
            { n: 4, t: "Done" },
          ].map((s) => (
            <div
              key={s.n}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 900,
                border: "1px solid rgba(255,255,255,0.12)",
                background: step === s.n ? "rgba(99,102,241,0.20)" : "rgba(0,0,0,0.15)",
                color: step === s.n ? "#F9FAFB" : "#9CA3AF",
              }}
            >
              {s.n}. {s.t}
            </div>
          ))}
        </div>

        {step === 1 ? (
          <div style={{ marginTop: 14 }}>
            <div
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFile(file);
              }}
              style={{
                borderRadius: 18,
                padding: 18,
                border: `1px dashed ${dragOver ? "rgba(34,211,238,0.75)" : "rgba(255,255,255,0.18)"}`,
                background: dragOver ? "rgba(34,211,238,0.08)" : "rgba(0,0,0,0.16)",
                display: "grid",
                gap: 8,
                justifyItems: "center",
                textAlign: "center",
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 16 }}>Drag & drop your CSV</div>
              <div style={{ color: "#9CA3AF", maxWidth: 560 }}>
                Upload a CSV containing your control list. You’ll map columns and preview before importing.
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <label style={{ cursor: "pointer" }}>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: "none" }}
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                  <span>
                    <Button type="button">Choose file</Button>
                  </span>
                </label>
                <Button variant="ghost" type="button" onClick={() => downloadCsv("cuec_import_template.csv", template)}>
                  Download template
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div style={{ color: "#9CA3AF" }}>
              File: <strong style={{ color: "#F9FAFB" }}>{fileName || "(unnamed)"}</strong> • Columns detected:{" "}
              <strong style={{ color: "#F9FAFB" }}>{headers.length}</strong> • Rows:{" "}
              <strong style={{ color: "#F9FAFB" }}>{rows.length}</strong>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <Field label="Control ID (required)">
                <Select value={mapping.controlId} onChange={(e) => setMapping((m) => ({ ...m, controlId: e.target.value }))}>
                  <option value="">Select…</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Title (required)">
                <Select value={mapping.title} onChange={(e) => setMapping((m) => ({ ...m, title: e.target.value }))}>
                  <option value="">Select…</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Category">
                <Select value={mapping.category} onChange={(e) => setMapping((m) => ({ ...m, category: e.target.value }))}>
                  <option value="">(not provided)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Owner email">
                <Select value={mapping.ownerEmail} onChange={(e) => setMapping((m) => ({ ...m, ownerEmail: e.target.value }))}>
                  <option value="">(not provided)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Frequency">
                <Select value={mapping.frequency} onChange={(e) => setMapping((m) => ({ ...m, frequency: e.target.value }))}>
                  <option value="">(not provided)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Due date (YYYY-MM-DD)">
                <Select value={mapping.dueDate} onChange={(e) => setMapping((m) => ({ ...m, dueDate: e.target.value }))}>
                  <option value="">(not provided)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Status">
                <Select value={mapping.status} onChange={(e) => setMapping((m) => ({ ...m, status: e.target.value }))}>
                  <option value="">(not provided)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {!canContinueFromMap() ? <div style={{ color: "#FCA5A5", fontWeight: 800, fontSize: 12 }}>Map Control ID and Title to continue.</div> : null}
                <Button disabled={!canContinueFromMap()} onClick={() => setStep(3)}>
                  Continue to preview
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div style={{ color: "#9CA3AF" }}>
              Previewing first <strong style={{ color: "#F9FAFB" }}>{Math.min(50, mappedPreview.length)}</strong> rows with your mapping.
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 980 }}>
                <thead>
                  <tr>
                    {["Control", "Title", "Category", "Owner", "Frequency", "Due", "Status"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "12px 14px",
                          fontSize: 12,
                          color: "#9CA3AF",
                          fontWeight: 900,
                          borderBottom: "1px solid rgba(255,255,255,0.10)",
                          background: "rgba(0,0,0,0.16)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mappedPreview.map((r, idx) => (
                    <tr key={`${r.controlId}_${idx}`}>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontWeight: 900 }}>{r.controlId}</span>
                      </td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{r.title}</td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{r.category}</td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{r.owner}</td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{r.frequency}</td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{r.dueDate || "—"}</td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        <StatusPill statusKey={STATUS[r.status] ? r.status : "pending"} />
                      </td>
                    </tr>
                  ))}
                  {mappedPreview.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 14, color: "#9CA3AF" }}>
                        Nothing to preview. Go back and upload a CSV.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <Button variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
              <div style={{ display: "flex", gap: 10 }}>
                <Button variant="ghost" onClick={() => setStep(2)}>
                  Edit mapping
                </Button>
                <Button onClick={runImport}>Import {rows.length} rows</Button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <Card style={{ padding: 14, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.22)" }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Import complete</div>
              <div style={{ marginTop: 6, color: "#9CA3AF" }}>
                Imported <strong style={{ color: "#F9FAFB" }}>{importedCount}</strong> CUECs into your in-memory table.
              </div>
            </Card>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="ghost" onClick={() => downloadCsv("cuec_import_template.csv", template)}>
                Download template
              </Button>
              <Button onClick={reset}>Import another file</Button>
            </div>
          </div>
        ) : null}
      </Card>
    </>
  );
}

function ReminderTable({ rows, onSend }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 860 }}>
        <thead>
          <tr>
            {["Control", "Owner", "Due date", "Status", ""].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  fontSize: 12,
                  color: "#9CA3AF",
                  fontWeight: 900,
                  borderBottom: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(0,0,0,0.16)",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontWeight: 900, fontFamily: '"IBM Plex Mono", monospace' }}>{r.controlId}</div>
                <div style={{ color: "#9CA3AF", fontSize: 12 }}>{r.title}</div>
              </td>
              <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontWeight: 900 }}>{r.ownerName}</div>
                <div style={{ color: "#9CA3AF", fontSize: 12 }}>{r.ownerEmail}</div>
              </td>
              <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {r.dueDate || "—"}
                {typeof r.daysLeft === "number" ? (
                  <div style={{ color: r.daysLeft < 0 ? "#FCA5A5" : "#9CA3AF", fontSize: 12 }}>
                    {r.daysLeft < 0 ? `${Math.abs(r.daysLeft)} days overdue` : `${r.daysLeft} days left`}
                  </div>
                ) : null}
              </td>
              <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <StatusPill statusKey={r.status} />
              </td>
              <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button onClick={() => onSend(r)}>Send Reminder</Button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: 14, color: "#9CA3AF" }}>
                Nothing here.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function RemindersPage({ cuecs, owners, setEmailDraft }) {
  const ownerById = useMemo(() => new Map(owners.map((o) => [o.id, o])), [owners]);

  const candidates = useMemo(() => {
    return cuecs
      .filter((c) => c.status !== "approved")
      .map((c) => {
        const o = c.ownerId ? ownerById.get(c.ownerId) : null;
        const daysLeft = c.dueDate ? daysUntil(c.dueDate) : null;
        return {
          ...c,
          ownerName: o?.name ?? "Unassigned",
          ownerEmail: o?.email ?? "(unassigned)",
          daysLeft,
        };
      });
  }, [cuecs, ownerById]);

  const overdue = useMemo(
    () => candidates.filter((c) => typeof c.daysLeft === "number" && c.daysLeft < 0),
    [candidates]
  );
  const expiringSoon = useMemo(
    () => candidates.filter((c) => typeof c.daysLeft === "number" && c.daysLeft >= 0 && c.daysLeft <= 30),
    [candidates]
  );
  const incomplete = useMemo(
    () => candidates.filter((c) => c.status === "not-in-place" || c.status === "pending" || c.status === "in-progress"),
    [candidates]
  );

  const allToRemind = useMemo(() => {
    const map = new Map();
    [...overdue, ...expiringSoon, ...incomplete].forEach((c) => map.set(c.id, c));
    return [...map.values()];
  }, [overdue, expiringSoon, incomplete]);

  function sendOne(c) {
    setEmailDraft({
      type: "reminder",
      to: c.ownerEmail,
      subject: `Reminder: ${c.controlId} evidence due ${c.dueDate ?? "(date not set)"}`,
      body:
        `Hi ${c.ownerName},\n\n` +
        `This is a reminder to complete your assigned control:\n\n` +
        `- Control: ${c.controlId}\n` +
        `- Title: ${c.title}\n` +
        `- Due date: ${c.dueDate ?? "(not set)"}\n` +
        `- Current status: ${STATUS[c.status]?.label ?? c.status}\n\n` +
        `Please upload evidence or submit an attestation via the Owner Portal.\n\n` +
        `Thanks,\nCUEC Platform`,
    });
  }

  function sendAll() {
    const lines = allToRemind
      .map((c) => `- ${c.controlId} (${c.ownerName}) — due ${c.dueDate ?? "n/a"} — ${STATUS[c.status]?.label ?? c.status}`)
      .join("\n");
    setEmailDraft({
      type: "reminder-batch",
      to: "(multiple owners)",
      subject: `Reminder batch — ${allToRemind.length} controls`,
      body:
        `This would send reminders for the following controls:\n\n${lines || "(none)"}\n\n` +
        `Note: email sending is simulated (in-memory) for now.`,
    });
  }

  return (
    <>
      <PageHeader
        title="Reminders"
        subtitle="Overdue, expiring soon, and incomplete controls."
        right={<Button onClick={sendAll}>Send All</Button>}
      />

      <div style={{ display: "grid", gap: 12 }}>
        <Card style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <div style={{ fontWeight: 900 }}>Overdue Controls</div>
            <div style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 800 }}>{overdue.length} items</div>
          </div>
          <div style={{ marginTop: 10 }}>
            <ReminderTable rows={overdue} onSend={sendOne} />
          </div>
        </Card>

        <Card style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <div style={{ fontWeight: 900 }}>Expiring Within 30 Days</div>
            <div style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 800 }}>{expiringSoon.length} items</div>
          </div>
          <div style={{ marginTop: 10 }}>
            <ReminderTable rows={expiringSoon} onSend={sendOne} />
          </div>
        </Card>

        <Card style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <div style={{ fontWeight: 900 }}>Incomplete Controls</div>
            <div style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 800 }}>{incomplete.length} items</div>
          </div>
          <div style={{ marginTop: 10 }}>
            <ReminderTable rows={incomplete} onSend={sendOne} />
          </div>
        </Card>
      </div>
    </>
  );
}

function ReviewQueuePage({ cuecs, owners, setCuecs, setEmailDraft }) {
  const ownerById = useMemo(() => new Map(owners.map((o) => [o.id, o])), [owners]);
  const submitted = useMemo(() => cuecs.filter((c) => c.status === "submitted"), [cuecs]);

  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState("");

  function approve(c) {
    setCuecs((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: "approved" } : x)));
    const owner = c.ownerId ? ownerById.get(c.ownerId) : null;
    setEmailDraft({
      type: "approval",
      to: owner?.email ?? "(unassigned)",
      subject: `Approved: ${c.controlId}`,
      body:
        `Hi ${owner?.name ?? "there"},\n\n` +
        `Your submission for ${c.controlId} has been approved.\n\n` +
        `Thanks,\nCUEC Platform`,
    });
  }

  function openReject(c) {
    setRejectingId(c.id);
    setReason("");
  }

  function confirmReject(c) {
    const owner = c.ownerId ? ownerById.get(c.ownerId) : null;
    setCuecs((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: "rejected" } : x)));
    setEmailDraft({
      type: "rejection",
      to: owner?.email ?? "(unassigned)",
      subject: `Changes requested: ${c.controlId}`,
      body:
        `Hi ${owner?.name ?? "there"},\n\n` +
        `We reviewed your submission for ${c.controlId} and need updates before approval.\n\n` +
        `Reason:\n${reason.trim() || "(no reason provided)"}\n\n` +
        `Please update the evidence/attestation and resubmit.\n\n` +
        `Thanks,\nCUEC Platform`,
    });
    setRejectingId(null);
    setReason("");
  }

  return (
    <>
      <PageHeader title="Review Queue" subtitle="Approve or reject submissions with a rejection reason." />
      <div style={{ display: "grid", gap: 12 }}>
        {submitted.map((c) => {
          const owner = c.ownerId ? ownerById.get(c.ownerId) : null;
          const isRejecting = rejectingId === c.id;
          return (
            <Card key={c.id} style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>
                    <span style={{ fontFamily: '"IBM Plex Mono", monospace' }}>{c.controlId}</span> — {c.title}
                  </div>
                  <div style={{ marginTop: 6, color: "#9CA3AF", fontSize: 12 }}>
                    Owner: <span style={{ color: "#E5E7EB", fontWeight: 800 }}>{owner?.name ?? "Unassigned"}</span>{" "}
                    <span style={{ color: "#6B7280" }}>({owner?.email ?? "—"})</span> • Due {c.dueDate ?? "—"} •{" "}
                    {c.category} • {c.frequency}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <StatusPill statusKey={c.status} />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <Button onClick={() => approve(c)}>Approve</Button>
                  <Button variant="danger" onClick={() => openReject(c)}>
                    Reject
                  </Button>
                </div>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                <div style={{ fontWeight: 900, fontSize: 13 }}>Evidence</div>
                <div style={{ display: "grid", gap: 6 }}>
                  {(c.evidence ?? []).length > 0 ? (
                    (c.evidence ?? []).map((e, idx) => (
                      <div
                        key={`${e.name}_${idx}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: "10px 12px",
                          borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(0,0,0,0.18)",
                        }}
                      >
                        <div style={{ fontWeight: 800 }}>{e.name}</div>
                        <div
                          style={{
                            color: "#9CA3AF",
                            fontFamily: '"IBM Plex Mono", monospace',
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {typeof e.size === "number" ? `${Math.round(e.size / 1024)} KB` : "—"}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#9CA3AF" }}>No files attached.</div>
                  )}
                </div>
              </div>

              {isRejecting ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Rejection reason</div>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain what needs to change (required)."
                    style={{
                      width: "100%",
                      minHeight: 110,
                      resize: "vertical",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(0,0,0,0.28)",
                      color: "#F9FAFB",
                      padding: 12,
                      outline: "none",
                    }}
                  />
                  <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <Button variant="ghost" onClick={() => setRejectingId(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      disabled={reason.trim().length === 0}
                      onClick={() => confirmReject(c)}
                    >
                      Confirm Reject (send email)
                    </Button>
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })}

        {submitted.length === 0 ? (
          <Card style={{ padding: 14 }}>
            <div style={{ fontWeight: 900 }}>No submissions right now</div>
            <div style={{ marginTop: 6, color: "#9CA3AF" }}>Submitted controls will appear here for admin review.</div>
          </Card>
        ) : null}
      </div>
    </>
  );
}

function OwnersPage({ owners }) {
  return (
    <>
      <PageHeader title="Owners" subtitle="Manage control owners and progress." />
      <Card style={{ padding: 14 }}>
        <div style={{ display: "grid", gap: 10 }}>
          {owners.map((o) => (
            <div key={o.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 900 }}>{o.name}</div>
                <div style={{ color: "#9CA3AF", fontSize: 12 }}>{o.email}</div>
              </div>
              <div
                style={{
                  fontFamily:
                    '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  fontSize: 12,
                  color: "#9CA3AF",
                  fontWeight: 800,
                }}
              >
                {o.token}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function EmailPreviewPage({ emailDraft }) {
  return (
    <>
      <PageHeader title="Email Preview" subtitle="Preview assignment, reminder, and rejection emails before sending." />
      <Card style={{ padding: 14 }}>
        {!emailDraft ? (
          <div style={{ color: "#9CA3AF" }}>
            No email draft yet. Go to <strong>CUECs</strong> and click <strong>Send Email</strong> on a Not In Place control.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 800 }}>
              Type: <span style={{ color: "#F9FAFB" }}>{emailDraft.type}</span>
            </div>
            <div style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 800 }}>
              To: <span style={{ color: "#F9FAFB" }}>{emailDraft.to}</span>
            </div>
            <div style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 800 }}>
              Subject: <span style={{ color: "#F9FAFB" }}>{emailDraft.subject}</span>
            </div>
            <pre
              style={{
                margin: 0,
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.22)",
                color: "#E5E7EB",
                whiteSpace: "pre-wrap",
                fontFamily:
                  '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: 12,
                lineHeight: 1.55,
              }}
            >
              {emailDraft.body}
            </pre>
          </div>
        )}
      </Card>
    </>
  );
}

function OwnerPortalPage({ owners, cuecs, setCuecs, setEmailDraft }) {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const owner = owners.find((o) => o.token === token);
  const myCuecs = useMemo(() => cuecs.filter((c) => c.ownerId === owner?.id), [cuecs, owner?.id]);
  const [attestation, setAttestation] = useState("");
  const fileRef = useRef(null);

  if (!owner) {
    return (
      <Layout>
        <Card style={{ padding: 14 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Owner Portal</div>
          <div style={{ marginTop: 8, color: "#9CA3AF" }}>
            Invalid or missing token. Try the demo link in the sidebar.
          </div>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Owner Portal"
        subtitle={`Signed in as ${owner.name} (${owner.email})`}
        right={
          <Button
            variant="ghost"
            onClick={() => {
              setEmailDraft({
                type: "reminder",
                to: owner.email,
                subject: "Owner portal submission received",
                body: `Hi ${owner.name},\n\nYour submission has been received. Our team will review and respond shortly.\n\nThanks,\nCUEC Platform`,
              });
            }}
          >
            Preview confirmation email
          </Button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 12 }}>
        <Card style={{ padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Your assigned controls</div>
          <div style={{ display: "grid", gap: 10 }}>
            {myCuecs.map((c) => (
              <div
                key={c.id}
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(0,0,0,0.18)",
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>
                      {c.controlId} — {c.title}
                    </div>
                    <div style={{ color: "#9CA3AF", fontSize: 12 }}>
                      Due {c.dueDate ?? "(not set)"} • {c.frequency} • {c.category}
                    </div>
                  </div>
                  <StatusPill statusKey={c.status} />
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      fileRef.current?.click?.();
                      setCuecs((prev) =>
                        prev.map((x) => (x.id === c.id ? { ...x, status: x.status === "pending" ? "in-progress" : x.status } : x))
                      );
                    }}
                  >
                    Upload file
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setCuecs((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: "submitted" } : x)))}
                  >
                    Submit for review
                  </Button>
                </div>
              </div>
            ))}
            {myCuecs.length === 0 ? <div style={{ color: "#9CA3AF" }}>No assigned controls yet.</div> : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              // In-memory only: don't persist file contents. Store metadata on the first assigned control.
              const first = myCuecs[0];
              if (!first) return;
              setCuecs((prev) =>
                prev.map((x) =>
                  x.id === first.id ? { ...x, evidence: [...(x.evidence ?? []), { name: f.name, size: f.size }] } : x
                )
              );
            }}
          />
        </Card>

        <Card style={{ padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Attestation</div>
          <textarea
            value={attestation}
            onChange={(e) => setAttestation(e.target.value)}
            placeholder="Write a brief attestation describing how the control is met, and reference any uploaded evidence."
            style={{
              width: "100%",
              minHeight: 160,
              resize: "vertical",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.28)",
              color: "#F9FAFB",
              padding: 12,
              outline: "none",
            }}
          />
          <div style={{ marginTop: 10, display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button
              variant="ghost"
              onClick={() => {
                setEmailDraft({
                  type: "attestation",
                  to: "(review team)",
                  subject: `Owner attestation submitted — ${owner.name}`,
                  body: `Owner: ${owner.name} (${owner.email})\n\nAttestation:\n${attestation || "(empty)"}`,
                });
              }}
            >
              Preview submission email
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

function AppShell() {
  ensureFonts();

  const [owners] = useState(() => [
    { id: "o1", name: "Alex Morgan", email: "alex@company.com", token: "demo-owner-token" },
    { id: "o2", name: "Priya Singh", email: "priya@company.com", token: "demo-owner-token-2" },
    { id: "o3", name: "Jordan Lee", email: "jordan@company.com", token: "demo-owner-token-3" },
  ]);

  const [cuecs, setCuecs] = useState(() => [
    {
      id: "c1",
      controlId: "AM-01",
      title: "Quarterly access review",
      category: "Access Management",
      ownerId: "o1",
      frequency: "Quarterly",
      dueDate: formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      status: "not-in-place",
      evidence: [],
    },
    {
      id: "c2",
      controlId: "TA-02",
      title: "Annual security awareness training",
      category: "Training & Awareness",
      ownerId: "o2",
      frequency: "Annual",
      dueDate: formatDate(new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)),
      status: "approved",
      evidence: [{ name: "training-report.pdf", size: 182201 }],
    },
    {
      id: "c3",
      controlId: "IR-01",
      title: "Incident response tabletop exercise",
      category: "Incident Response",
      ownerId: "o3",
      frequency: "Semi-Annual",
      dueDate: formatDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
      status: "pending",
      evidence: [],
    },
    {
      id: "c4",
      controlId: "TPR-03",
      title: "Vendor risk assessment",
      category: "Third-Party Risk",
      ownerId: "o1",
      frequency: "Annual",
      dueDate: formatDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
      status: "submitted",
      evidence: [{ name: "vendor-due-diligence.xlsx", size: 298118 }],
    },
  ]);

  const [emailDraft, setEmailDraft] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (emailDraft) navigate("/email-preview");
  }, [emailDraft, navigate]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage cuecs={cuecs} owners={owners} />} />
        <Route
          path="/cuecs"
          element={<CuecsPage cuecs={cuecs} owners={owners} setCuecs={setCuecs} setEmailDraft={setEmailDraft} />}
        />
        <Route path="/bulk-import" element={<BulkImportPage owners={owners} setCuecs={setCuecs} />} />
        <Route path="/reminders" element={<RemindersPage cuecs={cuecs} owners={owners} setEmailDraft={setEmailDraft} />} />
        <Route path="/review-queue" element={<ReviewQueuePage cuecs={cuecs} owners={owners} setCuecs={setCuecs} setEmailDraft={setEmailDraft} />} />
        <Route path="/owners" element={<OwnersPage owners={owners} />} />
        <Route path="/email-preview" element={<EmailPreviewPage emailDraft={emailDraft} />} />
        <Route
          path="*"
          element={
            <Card style={{ padding: 14 }}>
              <div style={{ fontWeight: 900 }}>Not found</div>
              <div style={{ marginTop: 6, color: "#9CA3AF" }}>That page doesn’t exist.</div>
            </Card>
          }
        />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/owner" element={<OwnerPortalGate />} />
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  );
}

function OwnerPortalGate() {
  ensureFonts();
  // Local state mirrors AppShell basics for now (all in-memory).
  const [owners] = useState(() => [
    { id: "o1", name: "Alex Morgan", email: "alex@company.com", token: "demo-owner-token" },
    { id: "o2", name: "Priya Singh", email: "priya@company.com", token: "demo-owner-token-2" },
    { id: "o3", name: "Jordan Lee", email: "jordan@company.com", token: "demo-owner-token-3" },
  ]);
  const [cuecs, setCuecs] = useState(() => [
    {
      id: "c1",
      controlId: "AM-01",
      title: "Quarterly access review",
      category: "Access Management",
      ownerId: "o1",
      frequency: "Quarterly",
      dueDate: formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      status: "pending",
      evidence: [],
    },
  ]);
  const [emailDraft, setEmailDraft] = useState(null);

  return <OwnerPortalPage owners={owners} cuecs={cuecs} setCuecs={setCuecs} setEmailDraft={setEmailDraft} emailDraft={emailDraft} />;
}
