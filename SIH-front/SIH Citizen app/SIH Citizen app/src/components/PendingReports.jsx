import React from "react";
import IssueCard from "./IssueCard";

function PendingReports({ reports }) {
  return (
    <div className="pending-reports">
      <h2>📋 Pending Reports</h2>
      {reports.length === 0 ? (
        <p>No pending reports yet.</p>
      ) : (
        reports.map((issue, idx) => <IssueCard key={idx} issue={issue} />)
      )}
    </div>
  );
}

export default PendingReports;
