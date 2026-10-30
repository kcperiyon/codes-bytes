import { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";

// ---------- Toast ----------
interface ToastItem {
  id: number;
  message: string;
}
const ToastContext = createContext<(message: string) => void>(() => {});
export function useToast() {
  return useContext(ToastContext);
}

// ---------- Confirm / Prompt ----------
interface ConfirmOpts {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}
interface PromptOpts {
  title: string;
  message?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  required?: boolean;
}

type ModalState =
  | { kind: "confirm"; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { kind: "prompt"; opts: PromptOpts; resolve: (v: string | null) => void }
  | null;

const UiContext = createContext<{
  confirmAction: (opts: ConfirmOpts) => Promise<boolean>;
  promptAction: (opts: PromptOpts) => Promise<string | null>;
} | null>(null);

export function useConfirm() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useConfirm must be used inside UiProvider");
  return ctx.confirmAction;
}
export function usePrompt() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("usePrompt must be used inside UiProvider");
  return ctx.promptAction;
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState>(null);
  const [promptValue, setPromptValue] = useState("");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useRef(0);

  const showToast = useCallback((message: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const confirmAction = useCallback((opts: ConfirmOpts) => {
    return new Promise<boolean>((resolve) => {
      setModal({ kind: "confirm", opts, resolve });
    });
  }, []);

  const promptAction = useCallback((opts: PromptOpts) => {
    setPromptValue(opts.defaultValue || "");
    return new Promise<string | null>((resolve) => {
      setModal({ kind: "prompt", opts, resolve });
    });
  }, []);

  function close(result: any) {
    if (modal) (modal.resolve as (v: any) => void)(result);
    setModal(null);
  }

  return (
    <UiContext.Provider value={{ confirmAction, promptAction }}>
      <ToastContext.Provider value={showToast}>
        {children}

        {modal?.kind === "confirm" && (
          <div className="modal-backdrop" onClick={() => close(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>{modal.opts.title}</h3>
              {modal.opts.message && <p>{modal.opts.message}</p>}
              <div className="modal-actions">
                <button className="secondary" onClick={() => close(false)}>
                  {modal.opts.cancelLabel || "Cancel"}
                </button>
                <button className={modal.opts.danger ? "danger" : ""} onClick={() => close(true)}>
                  {modal.opts.confirmLabel || "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        {modal?.kind === "prompt" && (
          <div className="modal-backdrop" onClick={() => close(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>{modal.opts.title}</h3>
              {modal.opts.message && <p>{modal.opts.message}</p>}
              {modal.opts.label && <label>{modal.opts.label}</label>}
              <input
                autoFocus
                placeholder={modal.opts.placeholder}
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (!modal.opts.required || promptValue.trim())) close(promptValue);
                  if (e.key === "Escape") close(null);
                }}
              />
              <div className="modal-actions">
                <button className="secondary" onClick={() => close(null)}>
                  Cancel
                </button>
                <button disabled={!!modal.opts.required && !promptValue.trim()} onClick={() => close(promptValue)}>
                  {modal.opts.confirmLabel || "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="toast-stack">
          {toasts.map((t) => (
            <div className="toast" key={t.id}>
              {t.message}
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    </UiContext.Provider>
  );
}
