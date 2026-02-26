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

type Status = "in" | "out" | "maybe";

interface AttendeeToggleProps {
  status: Status;
  name: string;
  onToggle: (status: Status, name: string) => void;
  disabled?: boolean;
}

export function AttendeeToggle({ status, name, onToggle, disabled }: AttendeeToggleProps) {
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [nameInput, setNameInput] = useState(name);
  const [pendingStatus, setPendingStatus] = useState<Status>("in");

  // Sync nameInput when name prop changes (e.g., from SSE)
  useEffect(() => {
    if (name) setNameInput(name);
  }, [name]);

  const handleStatusClick = (newStatus: Status) => {
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
    onToggle(newStatus, name);
  };

  const handleConfirm = () => {
    setShowConfirmDialog(false);
    onToggle(pendingStatus, name);
  };

  const handleNameSubmit = () => {
    if (nameInput.trim()) {
      setShowNameDialog(false);
      onToggle(pendingStatus, nameInput.trim());
    }
  };

  const handleEditName = () => {
    setNameInput(name);
    setShowNameDialog(true);
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
    </>
  );
}
