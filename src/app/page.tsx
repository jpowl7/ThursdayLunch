"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export default function LandingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"home" | "join" | "create">("home");
  const [joinSlug, setJoinSlug] = useState("");
  const [joinError, setJoinError] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupSlug, setGroupSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [createError, setCreateError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [groups, setGroups] = useState<{ slug: string; name: string; eventCount: number }[]>([]);
  const [aboutOpen, setAboutOpen] = useState(false);

  // Expand on first visit, collapsed on return visits
  useEffect(() => {
    const seen = localStorage.getItem("ili-about-seen");
    if (!seen) {
      setAboutOpen(true);
      localStorage.setItem("ili-about-seen", "1");
    }
  }, []);

  useEffect(() => {
    fetch("/api/groups")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setGroups(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleJoin = async () => {
    const slug = joinSlug.trim().toLowerCase();
    if (!slug) return;
    setJoinError("");
    try {
      const res = await fetch(`/api/groups/${slug}`);
      if (res.ok) {
        router.push(`/g/${slug}`);
      } else {
        setJoinError("Group not found");
      }
    } catch {
      setJoinError("Network error");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: groupSlug,
          name: groupName.trim(),
          passcode,
        }),
      });
      if (res.ok) {
        router.push(`/g/${groupSlug}/admin?new=1`);
      } else {
        const data = await res.json();
        setCreateError(data.error || "Failed to create group");
      }
    } catch {
      setCreateError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNameChange = (name: string) => {
    setGroupName(name);
    if (!slugEdited) {
      setGroupSlug(slugify(name));
    }
  };

  const inputClass =
    "w-full bg-white border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm";

  return (
    <div className="flex justify-center min-h-screen">
      <main className="w-full max-w-[430px] min-h-screen shadow-2xl bg-[#f8f7f5]">
        <div className="px-6 pt-16 pb-8">
          <div className="text-center mb-10">
            <span className="material-symbols-outlined text-orange-500 text-[64px]">
              lunch_dining
            </span>
            <h1 className="text-3xl font-bold mt-2 text-slate-800">
              I Like Lunch!
            </h1>
            <p className="text-slate-400 mt-1">
              Organize group meals, effortlessly
            </p>
          </div>

          {mode === "home" && (
            <div className="space-y-3">
              <button
                onClick={() => setMode("join")}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-full shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">group_add</span>
                Join a Group
              </button>
              <button
                onClick={() => setMode("create")}
                className="w-full border-2 border-orange-500/20 text-orange-500 font-bold py-4 rounded-full hover:bg-orange-500/5 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">add_circle</span>
                Create a Group
              </button>

              {groups.length > 0 && (
                <div className="pt-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1">
                    Groups
                  </h2>
                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm divide-y divide-slate-100">
                    {groups.map((group) => (
                      <Link
                        key={group.slug}
                        href={`/g/${group.slug}`}
                        className="flex items-center justify-between px-4 py-3 hover:bg-orange-50/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                      >
                        <span className="text-sm font-semibold text-slate-700">{group.name}</span>
                        <span className="material-symbols-outlined text-slate-300 text-[18px]">chevron_right</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={() => setAboutOpen(!aboutOpen)}
                  className="flex items-center justify-between w-full text-left px-1 py-1"
                >
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    About I Like Lunch
                  </h2>
                  <span className={`material-symbols-outlined text-slate-300 text-[18px] transition-transform ${aboutOpen ? "rotate-180" : ""}`}>
                    expand_more
                  </span>
                </button>

                {aboutOpen && (
                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mt-2 space-y-4">
                    <div className="text-sm text-slate-600 space-y-2">
                      <p>
                        I built this little app to solve a weekly problem my Thursday lunch group kept running into: <span className="italic text-slate-500">Who&apos;s in? What time works? Where are we going?</span>
                      </p>
                      <p>
                        Your group can RSVP, pick a time window that works, vote on (or suggest) places to eat &mdash; and once finalized, everyone sees the who/when/where at a glance.
                      </p>
                    </div>

                    <div className="border-t border-slate-100 pt-3 space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">FAQ</h3>

                      <div>
                        <p className="text-sm font-semibold text-slate-700">How do I get started?</p>
                        <p className="text-sm text-slate-500">Join an existing group or create a new one above. Once you&apos;re in, just tap &ldquo;I&apos;m In&rdquo; to RSVP.</p>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-700">Is this free?</p>
                        <p className="text-sm text-slate-500">Yep, totally free.</p>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-700">Have feedback?</p>
                        <p className="text-sm text-slate-500">
                          Shoot an email to{" "}
                          <a href="mailto:gccjason@gmail.com" className="text-orange-500 hover:underline">gccjason@gmail.com</a>
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 text-right">&mdash; Jason Powell</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === "join" && (
            <div className="space-y-4">
              <button
                onClick={() => setMode("home")}
                className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back
              </button>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 px-1">
                  Group URL
                </label>
                <div className="flex gap-2">
                  <input
                    value={joinSlug}
                    onChange={(e) => {
                      setJoinSlug(e.target.value);
                      setJoinError("");
                    }}
                    placeholder="e.g. thursday-lunch"
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    className={inputClass}
                    autoFocus
                  />
                  <button
                    onClick={handleJoin}
                    disabled={!joinSlug.trim()}
                    className="px-5 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
                  >
                    Go
                  </button>
                </div>
                {joinError && (
                  <p className="text-red-500 text-sm mt-2">{joinError}</p>
                )}
              </div>
            </div>
          )}

          {mode === "create" && (
            <div className="space-y-4">
              <button
                onClick={() => setMode("home")}
                className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back
              </button>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 px-1">
                    Group Name
                  </label>
                  <input
                    value={groupName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Thursday Lunch Crew"
                    required
                    className={inputClass}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 px-1">
                    URL Slug
                  </label>
                  <input
                    value={groupSlug}
                    onChange={(e) => {
                      setGroupSlug(e.target.value);
                      setSlugEdited(true);
                    }}
                    placeholder="thursday-lunch-crew"
                    required
                    className={inputClass}
                  />
                  <p className="text-[11px] text-slate-400 mt-1 px-1">
                    Your group will be at /g/{groupSlug || "..."}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 px-1">
                    Admin Passcode (4 digits)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={passcode}
                    onChange={(e) =>
                      setPasscode(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    placeholder="0000"
                    required
                    className={inputClass}
                  />
                  <p className="text-[11px] text-slate-400 mt-1 px-1">
                    Share this with group admins to manage events
                  </p>
                </div>

                {createError && (
                  <p className="text-red-500 text-sm">{createError}</p>
                )}

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !groupName.trim() ||
                    !groupSlug.trim() ||
                    passcode.length !== 4
                  }
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-4 rounded-full shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">add_circle</span>
                  {submitting ? "Creating..." : "Create Group"}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
