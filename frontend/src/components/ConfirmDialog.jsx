import { AnimatePresence, motion } from "framer-motion";
import { FiAlertTriangle } from "react-icons/fi";
import Button from "./Button";

function ConfirmDialog({
  open,
  title = "Are you sure?",
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.18 }}
            className="card relative w-full max-w-sm p-6 sm:p-7 border-red-500/20"
          >
            <div className="h-11 w-11 rounded-xl bg-red-500/10 flex items-center justify-center text-red-300 mb-4">
              <FiAlertTriangle size={20} />
            </div>
            <h2
              id="confirm-dialog-title"
              className="text-lg font-bold text-white font-display"
            >
              {title}
            </h2>
            {description && (
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                {description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-6">
              <Button variant="danger" onClick={onConfirm} className="flex-1">
                {confirmLabel}
              </Button>
              <Button variant="ghost" onClick={onCancel} className="flex-1">
                {cancelLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ConfirmDialog;
