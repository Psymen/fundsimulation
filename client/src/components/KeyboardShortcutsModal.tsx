import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

export default function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Open modal when "?" is pressed (Shift + /)
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Don't trigger if user is typing in an input
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
          return;
        }
        e.preventDefault();
        setOpen(true);
      }
      // Close modal on Escape
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const shortcuts = [
    {
      category: "General",
      items: [
        { keys: ["?"], description: "Show keyboard shortcuts" },
        { keys: ["T"], description: "Toggle dark/light mode" },
        { keys: ["Esc"], description: "Close dialog/modal" },
      ],
    },
    {
      category: "Simulation",
      items: [
        { keys: ["⌘", "Enter"], description: "Run simulation (Mac)" },
        { keys: ["Ctrl", "Enter"], description: "Run simulation (Windows/Linux)" },
      ],
    },
    {
      category: "Portfolio Construction",
      items: [
        { keys: ["⌘", "Enter"], description: "Run grid analysis (Mac)" },
        { keys: ["Ctrl", "Enter"], description: "Run grid analysis (Windows/Linux)" },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and perform actions quickly
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-sm text-muted-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
          Press <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded">?</kbd> anytime to show this dialog
        </div>
      </DialogContent>
    </Dialog>
  );
}
