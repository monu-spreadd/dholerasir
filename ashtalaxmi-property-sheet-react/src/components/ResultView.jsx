import React from 'react';
import { SUMMARY_ROWS } from '../lib/form.js';

/** Shown after SUBMIT: the sheet preview, download status and next actions. */
export default function ResultView({ result, status, onDownload, onEdit, onNew }) {
  return (
    <section className="view" id="done">
      <div className="done-card">
        <div>
          <img id="sheetImg" src={result.preview} alt="Generated property information sheet" />
        </div>
        <div>
          <div className="okmark" aria-hidden="true">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h2>PDF created</h2>
          <p id="dlStatus" className="dlstatus" role="status">
            {status}
          </p>
          <div className="fn" id="doneName">
            {result.name}
          </div>
          <div className="side-actions">
            <button type="button" className="btn btn-primary" id="dlAgain" onClick={onDownload}>
              Download PDF
            </button>
            <button type="button" className="btn btn-outline" id="editBtn" onClick={onEdit}>
              Edit details
            </button>
            <button type="button" className="btn btn-outline" id="newBtn" onClick={onNew}>
              New property
            </button>
          </div>
          <dl className="sum" id="sum">
            {SUMMARY_ROWS.filter(([, key]) => result.data[key]).map(([label, key]) => (
              <React.Fragment key={key}>
                <dt>{label}</dt>
                <dd>{result.data[key]}</dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
