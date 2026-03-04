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
  onToggle: (status: Status, name: string) => void;
  disabled?: boolean;
  participantKey?: string;
  onParticipantKeyChange?: (newKey: string) => void;
  onSignOut?: () => void;
  eventId?: string;
}

export function AttendeeToggle({ status, name, onToggle, disabled, participantKey, onParticipantKeyChange, onSignOut, eventId }: AttendeeToggleProps) {
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showLoginPinDialog, setShowLoginPinDialog] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [nameInput, setNameInput] = useState(name);
  const [pendingStatus, setPendingStatus] = useState<Status>("in");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [loginPinError, setLoginPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [loginPinLoading, setLoginPinLoading] = useState(false);
  const [pendingLoginName, setPendingLoginName] = useState("");
  const [conflictName, setConflictName] = useState("");

  // Sync nameInput when name prop changes (e.g., from SSE)
  useEffect(() => {
    if (name) setNameInput(name);
  }, [name]);

  // Returns true if the name is OK to use, false if blocked (dialog shown)
  const checkNameConflict = async (checkName: string, newStatus: Status): Promise<boolean> => {
    try {
      const params = new URLSearchParams({ name: checkName, participantKey: participantKey || "" });
      if (eventId) params.set("eventId", eventId);
      const res = await fetch(`/api/participants/check?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.registered && !data.isOwner) {
          // Registered name — require PIN
          setPendingStatus(newStatus);
          setPendingLoginName(checkName);
          setLoginPin("");
          setLoginPinError("");
          setShowLoginPinDialog(true);
          return false;
        }
        if (data.conflict) {
          // Same name already on this event from a different device
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
    if (!name) {
      setPendingStatus(newStatus);
      setShowNameDialog(true);
      return;
    }
    // Confirm when going from "in" to "maybe" or "out" (clears votes)
    if (status === "in" && newStatus !== "in") {
      setPendingStatus(newStatus);
      setShowConfirmDialog(true);
      return;
    }
    // Check for name conflicts when RSVPing with a saved name
    if (newStatus === "in") {
      const ok = await checkNameConflict(name, newStatus);
      if (!ok) return;
    }
    onToggle(newStatus, name);
  };

  const handleConfirm = () => {
    setShowConfirmDialog(false);
    onToggle(pendingStatus, name);
  };

  const handleNameSubmit = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;

    setShowNameDialog(false);
    const ok = await checkNameConflict(trimmed, pendingStatus);
    if (!ok) return;

    onToggle(pendingStatus, trimmed);
  };

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
        // Swap to the registered participant's key
        if (onParticipantKeyChange && data.participantKey) {
          onParticipantKeyChange(data.participantKey);
        }
        setShowLoginPinDialog(false);
        onToggle(pendingStatus, pendingLoginName);
      } else {
        setLoginPinError("Wrong PIN. Try again.");
      }
    } catch {
      setLoginPinError("Something went wrong, try again");
    } finally {
      setLoginPinLoading(false);
    }
  };

  const handleEditName = () => {
    setNameInput(name);
    setShowNameDialog(true);
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

        {name && !disabled && (
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

      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{name ? "Change your name" : "What\u0027s your name?"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter your name"
                onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                autoFocus
              />
            </div>
            <Button onClick={handleNameSubmit} className="w-full bg-orange-500 hover:bg-orange-600" disabled={!nameInput.trim()}>
              {name ? "Save" : "Join"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                setPendingStatus(pendingStatus);
                setShowNameDialog(true);
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
