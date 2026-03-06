"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Status = "in" | "out" | "maybe";

interface AttendeeToggleProps {
  status: Status;
  name: string;
  onToggle: (status: Status, name: string, participantKeyOverride?: string) => void;
  disabled?: boolean;
  participantKey?: string;
  onParticipantKeyChange?: (newKey: string) => void;
  onNameChange?: (newName: string) => void;
  onSignOut?: () => void;
  eventId?: string;
}

export function AttendeeToggle({ status, name, onToggle, disabled, participantKey, onParticipantKeyChange, onNameChange, onSignOut, eventId }: AttendeeToggleProps) {
  // Dialog visibility
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showLoginPinDialog, setShowLoginPinDialog] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);

  // Registration mode: "register" or "login"
  const [regMode, setRegMode] = useState<"register" | "login">("register");

  // Form state
  const [nameInput, setNameInput] = useState(name);
  const [pinInput, setPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  const [pendingStatus, setPendingStatus] = useState<Status>("in");

  // Change PIN dialog state
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  // Legacy login PIN dialog (for registered name conflict during name-change)
  const [loginPin, setLoginPin] = useState("");
  const [loginPinError, setLoginPinError] = useState("");
  const [loginPinLoading, setLoginPinLoading] = useState(false);
  const [pendingLoginName, setPendingLoginName] = useState("");
  const [conflictName, setConflictName] = useState("");

  // Sync nameInput when name prop changes
  useEffect(() => {
    if (name) setNameInput(name);
  }, [name]);

  // Reset registration dialog state
  const openRegisterDialog = (statusToSet: Status) => {
    setPendingStatus(statusToSet);
    setNameInput(name || "");
    setPinInput("");
    setConfirmPinInput("");
    setRegError("");
    setRegMode("register");
    setShowRegisterDialog(true);
  };

  // Check if a name is registered or conflicts on this event (used for already-signed-in users changing name)
  const checkNameConflict = async (checkName: string, newStatus: Status): Promise<boolean> => {
    try {
      const params = new URLSearchParams({ name: checkName, participantKey: participantKey || "" });
      if (eventId) params.set("eventId", eventId);
      const res = await fetch(`/api/participants/check?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.registered && !data.isOwner) {
          setPendingStatus(newStatus);
          setPendingLoginName(checkName);
          setLoginPin("");
          setLoginPinError("");
          setShowLoginPinDialog(true);
          return false;
        }
        if (data.conflict) {
          setPendingStatus(newStatus);
          setConflictName(checkName);
          setShowConflictDialog(true);
          return false;
        }
      }
    } catch {
      // If check fails, allow through
    }
    return true;
  };

  const handleStatusClick = async (newStatus: Status) => {
    if (newStatus === status) return;

    // No participantKey → must register first
    if (!participantKey) {
      openRegisterDialog(newStatus);
      return;
    }

    // Has key but no name (shouldn't normally happen, but handle it)
    if (!name) {
      openRegisterDialog(newStatus);
      return;
    }

    // Confirm when going from "in" to "maybe" or "out" (clears votes)
    if (status === "in" && newStatus !== "in") {
      setPendingStatus(newStatus);
      setShowConfirmDialog(true);
      return;
    }

    // Check for name conflicts when RSVPing with a saved name
    const ok = await checkNameConflict(name, newStatus);
    if (!ok) return;
    onToggle(newStatus, name);
  };

  const handleConfirm = async () => {
    setShowConfirmDialog(false);
    const ok = await checkNameConflict(name, pendingStatus);
    if (!ok) return;
    onToggle(pendingStatus, name);
  };

  // ── Registration / Login submit ──────────────────────────
  const handleRegisterSubmit = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    if (!/^\d{4}$/.test(pinInput)) {
      setRegError("PIN must be exactly 4 digits");
      return;
    }

    if (regMode === "register") {
      if (pinInput !== confirmPinInput) {
        setRegError("PINs don't match");
        return;
      }

      setRegLoading(true);
      setRegError("");

      try {
        // First check if the name is already registered
        const checkRes = await fetch(`/api/participants/check?name=${encodeURIComponent(trimmed)}&participantKey=`);
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.registered) {
            // Name already registered → switch to login mode
            setRegMode("login");
            setConfirmPinInput("");
            setPinInput("");
            setRegError("That name is already registered. Enter your PIN to sign in.");
            setRegLoading(false);
            return;
          }
        }

        // Register new participant
        const res = await fetch("/api/participants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed, pin: pinInput }),
        });

        if (res.ok) {
          const data = await res.json();
          if (onParticipantKeyChange && data.participantKey) {
            onParticipantKeyChange(data.participantKey);
          }
          if (onNameChange) {
            onNameChange(trimmed);
          }
          setShowRegisterDialog(false);
          onToggle(pendingStatus, trimmed, data.participantKey);
        } else {
          const data = await res.json();
          if (res.status === 409) {
            // Name+PIN combo conflict — switch to login
            setRegMode("login");
            setConfirmPinInput("");
            setRegError("That name is already registered. Enter your PIN to sign in.");
          } else {
            setRegError(data.error || "Something went wrong");
          }
        }
      } catch {
        setRegError("Something went wrong, try again");
      } finally {
        setRegLoading(false);
      }
    } else {
      // Login mode
      setRegLoading(true);
      setRegError("");

      try {
        const res = await fetch("/api/participants/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed, pin: pinInput }),
        });

        if (res.ok) {
          const data = await res.json();
          if (onParticipantKeyChange && data.participantKey) {
            onParticipantKeyChange(data.participantKey);
          }
          if (onNameChange) {
            onNameChange(data.name || trimmed);
          }
          setShowRegisterDialog(false);
          onToggle(pendingStatus, data.name || trimmed, data.participantKey);
        } else {
          setRegError("Wrong PIN. Try again.");
        }
      } catch {
        setRegError("Something went wrong, try again");
      } finally {
        setRegLoading(false);
      }
    }
  };

  // ── Legacy login PIN (for name conflict on already-signed-in user) ──
  const handleLoginPinSubmit = async () => {
    if (!/^\d{4}$/.test(loginPin)) {
      setLoginPinError("PIN must be exactly 4 digits");
      return;
    }

    setLoginPinLoading(true);
    setLoginPinError("");

    try {
      const res = await fetch("/api/participants/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: pendingLoginName, pin: loginPin }),
      });

      if (res.ok) {
        const data = await res.json();
        if (onParticipantKeyChange && data.participantKey) {
          onParticipantKeyChange(data.participantKey);
        }
        setShowLoginPinDialog(false);
        onToggle(pendingStatus, pendingLoginName, data.participantKey);
      } else {
        setLoginPinError("Wrong PIN. Try again.");
      }
    } catch {
      setLoginPinError("Something went wrong, try again");
    } finally {
      setLoginPinLoading(false);
    }
  };

  // ── Edit name (for users who are already registered) ──
  const handleEditName = () => {
    setNameInput(name);
    // For registered users, we re-use the register dialog in a simple name-edit mode
    // But since they're already registered, just open name dialog
    // Actually, we keep the old name dialog behavior for name editing
    setShowRegisterDialog(false);
    setPendingStatus(status);
    setNameInput(name);
    setPinInput("");
    setConfirmPinInput("");
    setRegError("");
    setRegMode("register");
    // Use a simpler approach: just show the register dialog but it acts as name change
    // No — for name changes we need the old flow with conflict checking
    // Let's show a dedicated name-edit approach
    setShowNameEditDialog(true);
  };

  // Simple name-edit dialog for already-registered users
  const [showNameEditDialog, setShowNameEditDialog] = useState(false);
  const handleNameEditSubmit = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setShowNameEditDialog(false);
    const ok = await checkNameConflict(trimmed, status);
    if (!ok) return;
    if (onNameChange) onNameChange(trimmed);
    onToggle(status, trimmed);
  };

  const handleOpenPinDialog = () => {
    setCurrentPin("");
    setNewPin("");
    setPinError("");
    setShowPinDialog(true);
  };

  const handlePinSubmit = async () => {
    if (!participantKey) return;
    if (!/^\d{4}$/.test(currentPin)) {
      setPinError("PIN must be exactly 4 digits");
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setPinError("New PIN must be exactly 4 digits");
      return;
    }
    if (currentPin === newPin) {
      setPinError("New PIN must be different");
      return;
    }

    setPinLoading(true);
    setPinError("");

    try {
      const res = await fetch("/api/participants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantKey, currentPin, newPin }),
      });

      if (res.ok) {
        setShowPinDialog(false);
        toast.success("PIN updated!");
      } else {
        const data = await res.json();
        if (res.status === 404) {
          setPinError("No registered account found. Register a name + PIN first.");
        } else if (res.status === 401) {
          setPinError("Current PIN is incorrect");
        } else {
          setPinError(data.error || "Something went wrong");
        }
      }
    } catch {
      setPinError("Something went wrong, try again");
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <>
      <div>
        <div className="bg-white rounded-xl p-2 shadow-sm border border-slate-100 flex gap-2">
          <button
            onClick={() => handleStatusClick("in")}
            disabled={disabled}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg font-bold transition-all ${
              status === "in"
                ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                : "bg-slate-50 text-slate-400 hover:bg-slate-100"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">restaurant</span>
            <span>I&apos;m In!</span>
          </button>
          <button
            onClick={() => handleStatusClick("maybe")}
            disabled={disabled}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg font-bold transition-all ${
              status === "maybe"
                ? "bg-amber-400 text-white shadow-md shadow-amber-400/20"
                : "bg-slate-50 text-slate-400 hover:bg-slate-100"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
            <span>Maybe</span>
          </button>
          <button
            onClick={() => handleStatusClick("out")}
            disabled={disabled}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg font-bold transition-all ${
              status === "out"
                ? "bg-slate-200 text-slate-600 shadow-sm"
                : "bg-slate-50 text-slate-400 hover:bg-slate-100"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
            <span>I&apos;m Out</span>
          </button>
        </div>

        {name && participantKey && !disabled && (
          <div className="flex items-center justify-center gap-1.5 mt-2 -mb-1">
            <span className="text-sm text-slate-500">
              Signed in as <span className="font-semibold text-slate-700">{name}</span>
            </span>
            <button
              onClick={handleEditName}
              className="text-orange-500 hover:text-orange-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
            </button>
            <button
              onClick={handleOpenPinDialog}
              className="text-orange-500 hover:text-orange-600 transition-colors"
              title="Change PIN"
            >
              <span className="material-symbols-outlined text-[16px]">key</span>
            </button>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="text-slate-300 hover:text-slate-500 transition-colors"
                title="Sign out"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Registration / Login dialog (for new users without participantKey) */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{regMode === "register" ? "Create your account" : "Sign in"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="reg-name">Name</Label>
              <Input
                id="reg-name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter your name"
                autoFocus
                disabled={regLoading}
              />
            </div>
            <div>
              <Label htmlFor="reg-pin">4-digit PIN</Label>
              <Input
                id="reg-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="Choose a 4-digit PIN"
                onKeyDown={(e) => { if (e.key === "Enter" && regMode === "login") handleRegisterSubmit(); }}
                disabled={regLoading}
              />
            </div>
            {regMode === "register" && (
              <div>
                <Label htmlFor="reg-confirm-pin">Confirm PIN</Label>
                <Input
                  id="reg-confirm-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="Re-enter your PIN"
                  onKeyDown={(e) => e.key === "Enter" && handleRegisterSubmit()}
                  disabled={regLoading}
                />
              </div>
            )}
            {regError && (
              <p className="text-sm text-red-500">{regError}</p>
            )}
            <Button
              onClick={handleRegisterSubmit}
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={regLoading || !nameInput.trim() || pinInput.length !== 4 || (regMode === "register" && confirmPinInput.length !== 4)}
            >
              {regLoading ? (regMode === "register" ? "Creating..." : "Signing in...") : (regMode === "register" ? "Create Account & Join" : "Sign In")}
            </Button>
            <button
              type="button"
              className="w-full text-sm text-orange-500 hover:text-orange-600 transition-colors"
              onClick={() => {
                setRegMode(regMode === "register" ? "login" : "register");
                setPinInput("");
                setConfirmPinInput("");
                setRegError("");
              }}
            >
              {regMode === "register" ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Simple name-edit dialog for already-registered users */}
      <Dialog open={showNameEditDialog} onOpenChange={setShowNameEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change your name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter your name"
                onKeyDown={(e) => e.key === "Enter" && handleNameEditSubmit()}
                autoFocus
              />
            </div>
            <Button onClick={handleNameEditSubmit} className="w-full bg-orange-500 hover:bg-orange-600" disabled={!nameInput.trim()}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm status change dialog (in → maybe/out) */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingStatus === "maybe" ? "Switch to maybe?" : "Heading out?"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">Your votes and time selection will be cleared.</p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowConfirmDialog(false)}
            >
              Never mind
            </Button>
            <Button
              className={`flex-1 ${pendingStatus === "maybe" ? "bg-amber-500 hover:bg-amber-600" : "bg-slate-700 hover:bg-slate-800"}`}
              onClick={handleConfirm}
            >
              {pendingStatus === "maybe" ? "I\u0027m a maybe" : "I\u0027m out"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change PIN dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change PIN</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="current-pin">Current PIN</Label>
              <Input
                id="current-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="Enter current 4-digit PIN"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="new-pin">New PIN</Label>
              <Input
                id="new-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="Enter new 4-digit PIN"
                onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
              />
            </div>
            {pinError && (
              <p className="text-sm text-red-500">{pinError}</p>
            )}
            <Button
              onClick={handlePinSubmit}
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={pinLoading || currentPin.length !== 4 || newPin.length !== 4}
            >
              {pinLoading ? "Updating..." : "Update PIN"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Login PIN dialog (for registered name conflict when already signed in) */}
      <Dialog open={showLoginPinDialog} onOpenChange={setShowLoginPinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify it&apos;s you</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            <span className="font-semibold">{pendingLoginName}</span> is a registered name. Enter the PIN to sign in.
          </p>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="login-pin">PIN</Label>
              <Input
                id="login-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="Enter 4-digit PIN"
                onKeyDown={(e) => e.key === "Enter" && handleLoginPinSubmit()}
                autoFocus
              />
            </div>
            {loginPinError && (
              <p className="text-sm text-red-500">{loginPinError}</p>
            )}
            <Button
              onClick={handleLoginPinSubmit}
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={loginPinLoading || loginPin.length !== 4}
            >
              {loginPinLoading ? "Verifying..." : "Sign In"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Name conflict dialog */}
      <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name already in use</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            <span className="font-semibold">{conflictName}</span> is already on this event from another device.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600"
              onClick={() => {
                setShowConflictDialog(false);
                setPendingLoginName(conflictName);
                setLoginPin("");
                setLoginPinError("");
                setShowLoginPinDialog(true);
              }}
            >
              Sign in with PIN
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowConflictDialog(false);
                setNameInput("");
                openRegisterDialog(pendingStatus);
              }}
            >
              Use a different name
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
