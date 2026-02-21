"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AttendeeToggleProps {
  isIn: boolean;
  name: string;
  onToggle: (isIn: boolean, name: string) => void;
  disabled?: boolean;
}

export function AttendeeToggle({ isIn, name, onToggle, disabled }: AttendeeToggleProps) {
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [nameInput, setNameInput] = useState(name);

  const handleToggle = () => {
    if (!isIn && !name) {
      setShowNameDialog(true);
    } else {
      onToggle(!isIn, name);
    }
  };

  const handleNameSubmit = () => {
    if (nameInput.trim()) {
      setShowNameDialog(false);
      onToggle(true, nameInput.trim());
    }
  };

  return (
    <>
      <Button
        onClick={handleToggle}
        disabled={disabled}
        size="lg"
        className={`w-full h-16 text-lg font-semibold transition-colors ${
          isIn
            ? "bg-green-600 hover:bg-green-700 text-white"
            : "bg-gray-200 hover:bg-gray-300 text-gray-700"
        }`}
        variant={isIn ? "default" : "secondary"}
      >
        {isIn ? "I'm In!" : "I'm Out"}
      </Button>

      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What&apos;s your name?</DialogTitle>
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
            <Button onClick={handleNameSubmit} className="w-full" disabled={!nameInput.trim()}>
              Join
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
