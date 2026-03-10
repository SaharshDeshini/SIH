import React from "react";

function IssueCard({ issue }) {
  return (
    <div className={`issue-card ${issue.status.toLowerCase()}`}>
      <h3>{issue.description}</h3>
      {issue.file && (
        <p>
          📎 File: <strong>{issue.file.name}</strong>
        </p>
      )}
      <p>📍 Location: {issue.location?.lat}, {issue.location?.lng}</p>
      <span className="status">{issue.status}</span>
    </div>
  );
}

export default IssueCard;
