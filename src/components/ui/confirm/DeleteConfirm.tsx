import React from "react";
import { Modal } from "../modal";
import Button from "../button/Button";

interface DeleteConfirmProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  mediaPreviewUrl?: string; // optional visual preview
}

const DeleteConfirm: React.FC<DeleteConfirmProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  title = "Delete Item",
  description = "Are you sure you want to delete this item? This action cannot be undone.",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  mediaPreviewUrl,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} isFullscreen={false} className="max-w-md w-[95%]">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 text-error-500">
            {/* Warning icon */}
            <svg
              className="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M20.3499 12.0004C20.3499 16.612 16.6115 20.3504 11.9999 20.3504C7.38832 20.3504 3.6499 16.612 3.6499 12.0004C3.6499 7.38881 7.38833 3.65039 11.9999 3.65039C16.6115 3.65039 20.3499 7.38881 20.3499 12.0004ZM11.9999 22.1504C17.6056 22.1504 22.1499 17.6061 22.1499 12.0004C22.1499 6.3947 17.6056 1.85039 11.9999 1.85039C6.39421 1.85039 1.8499 6.3947 1.8499 12.0004C1.8499 17.6061 6.39421 22.1504 11.9999 22.1504ZM13.0008 16.4753C13.0008 15.923 12.5531 15.4753 12.0008 15.4753L11.9998 15.4753C11.4475 15.4753 10.9998 15.923 10.9998 16.4753C10.9998 17.0276 11.4475 17.4753 11.9998 17.4753L12.0008 17.4753C12.5531 17.4753 13.0008 17.0276 13.0008 16.4753ZM11.9998 6.62898C12.414 6.62898 12.7498 6.96476 12.7498 7.37898L12.7498 13.0555C12.7498 13.4697 12.414 13.8055 11.9998 13.8055C11.5856 13.8055 11.2498 13.4697 11.2498 13.0555L11.2498 7.37898C11.2498 6.96476 11.5856 6.62898 11.9998 6.62898Z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">{title}</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
          </div>
        </div>

        {mediaPreviewUrl && (
          <div className="mt-3">
            <div className="aspect-video w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/5">
              <img src={mediaPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 justify-end">
          <Button size="sm" variant="outline" type="button" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          {/* Use a plain button for a red destructive action style */}
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={loading}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3.5 text-sm transition bg-red-600 text-white hover:bg-red-700 ${
              loading ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            {loading ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirm;