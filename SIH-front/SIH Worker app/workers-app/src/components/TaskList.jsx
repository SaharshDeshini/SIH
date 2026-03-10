import React, { useEffect, useState } from "react";
import WorkerMap from "./WorkerMap";

function TaskList({ workerId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!workerId) return;

    setLoading(true);
    fetch(`http://localhost:5000/issues/worker/${workerId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch tasks");
        return res.json();
      })
      .then((data) => {
        setTasks(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [workerId]);

  const updateStatus = (id, newStatus, proofFile = null) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: newStatus, proof: proofFile } : t
      )
    );
  };

  if (loading) return <p>Loading tasks...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!tasks.length) return <p>No tasks assigned yet.</p>;

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <div key={task.id} className="task-card">
          <h3>{task.title}</h3>
          <p>{task.description}</p>

          {task.imageUrl && (
            <div className="problem-image">
              <img src={task.imageUrl} alt="Problem" />
            </div>
          )}

          <p>
            <strong>Status:</strong> {task.status}
          </p>

          {task.location && <WorkerMap location={task.location} />}

          {task.status === "assigned" && (
            <button onClick={() => updateStatus(task.id, "in-progress")}>
              🚧 Start Task
            </button>
          )}

          {task.status === "in-progress" && (
            <div className="proof-upload">
              <input
                type="file"
                onChange={(e) =>
                  updateStatus(task.id, "completed", e.target.files[0])
                }
              />
              <button className="resolve-btn">✅ Mark as Resolved</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default TaskList;
