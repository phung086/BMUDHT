import React from "react";

const TransferSuccessModal = ({
  show,
  details,
  onClose,
  onCopy,
  text,
  language,
}) => {
  if (!show || !details) return null;

  const { reference, amountLabel, sender, recipient, createdAt, description } =
    details;

  const formattedTime = createdAt
    ? new Date(createdAt).toLocaleString(language === "vi" ? "vi-VN" : "en-US")
    : "-";

  const handleCopy = () => {
    if (typeof onCopy === "function") {
      onCopy(reference);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-card--success">
        <div className="transfer-success__header d-flex align-items-center gap-3">
          <span className="badge bg-success-subtle text-success p-3 rounded-circle">
            <i className="bi bi-shield-check" aria-hidden></i>
          </span>
          <div>
            <h5 className="mb-1">{text.transferSuccessTitle}</h5>
            <p className="mb-0 text-muted">{text.transferSuccessSubtitle}</p>
          </div>
        </div>

        <div className="transfer-success__body mt-4">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <span className="text-muted d-block">
                {text.transferSuccessReferenceLabel}
              </span>
              <code className="fs-5 fw-semibold text-primary">
                {reference || "REF-UNKNOWN"}
              </code>
            </div>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={handleCopy}
            >
              <i className="bi bi-clipboard-check me-2" aria-hidden></i>
              {text.transferSuccessCopy}
            </button>
          </div>

          <dl className="row mb-0">
            <dt className="col-sm-4 text-muted">
              {text.transferSuccessAmountLabel}
            </dt>
            <dd className="col-sm-8 fw-semibold">{amountLabel}</dd>

            <dt className="col-sm-4 text-muted">
              {text.transferSuccessSenderLabel}
            </dt>
            <dd className="col-sm-8">{sender}</dd>

            <dt className="col-sm-4 text-muted">
              {text.transferSuccessRecipientLabel}
            </dt>
            <dd className="col-sm-8">{recipient}</dd>

            <dt className="col-sm-4 text-muted">
              {text.transferSuccessTimeLabel}
            </dt>
            <dd className="col-sm-8">{formattedTime}</dd>

            {description ? (
              <>
                <dt className="col-sm-4 text-muted">
                  {text.transferSuccessNoteLabel}
                </dt>
                <dd className="col-sm-8">{description}</dd>
              </>
            ) : null}
          </dl>
        </div>

        <div className="modal-actions justify-content-end mt-4">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            {text.transferSuccessClose}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferSuccessModal;
