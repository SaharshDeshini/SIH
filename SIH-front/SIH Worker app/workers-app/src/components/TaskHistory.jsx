import React from "react";

function TaskHistory({ workerId }) {
  return (
    <div>
      <p>Work history for worker: {workerId}</p>
      {/* You can fetch completed tasks later from /issues endpoint */}
    </div>
  );
}

export default TaskHistory;
