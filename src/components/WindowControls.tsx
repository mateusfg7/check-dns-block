import { CopySimple, Minus, Square, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { closeWindow, minimizeWindow, onMaximizedChange, toggleMaximizeWindow } from "../lib/ipc";

/**
 * Custom minimize/maximize/close buttons that replace the native window
 * decorations (disabled via `decorations: false`), so the title bar looks
 * identical on Windows, macOS and Linux.
 */
export function WindowControls() {
  const { t } = useI18n();
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    onMaximizedChange((value) => setMaximized(value)).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      unlisten = fn;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  return (
    <div className="flex h-full items-stretch">
      <button
        type="button"
        aria-label={t.window.minimize}
        className="flex w-11 items-center justify-center text-kumo-default hover:bg-kumo-tint"
        onClick={minimizeWindow}
      >
        <Minus size={16} />
      </button>
      <button
        type="button"
        aria-label={maximized ? t.window.restore : t.window.maximize}
        className="flex w-11 items-center justify-center text-kumo-default hover:bg-kumo-tint"
        onClick={toggleMaximizeWindow}
      >
        {maximized ? <CopySimple size={14} /> : <Square size={14} />}
      </button>
      <button
        type="button"
        aria-label={t.window.close}
        className="flex w-11 items-center justify-center text-kumo-default hover:bg-red-600 hover:text-white"
        onClick={closeWindow}
      >
        <X size={16} />
      </button>
    </div>
  );
}
