import React, { useState, useEffect } from "react";
import TaskList from "./components/TaskList";
import TaskHistory from "./components/TaskHistory";
import "./App.css";

function App() {
  const [view, setView] = useState("tasks");
  const [workerId, setWorkerId] = useState(null);
  const [workerInfo, setWorkerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const docId = params.get("worker"); // Firestore doc ID from login redirect
    setWorkerId(docId);

    if (docId) {
      setLoading(true);
      fetch(`http://localhost:5000/users/${docId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Worker not found");
          return res.json();
        })
        .then((worker) => {
          const cleanedWorker = Object.fromEntries(
            Object.entries(worker).map(([k, v]) => [k.trim(), v])
          );
          setWorkerInfo(cleanedWorker);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError(err.message);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-box">
          <h1>👷 Worker Dashboard</h1>
          <p>Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="app-container">
      {/* Header section */}
      <header className="app-header">
        <h1>👷 Worker Dashboard</h1>
      </header>

      {/* Navigation Toggles */}
      <nav className="nav-buttons">
        <button
          className={view === "tasks" ? "active" : ""}
          onClick={() => setView("tasks")}
        >
          <span role="img" aria-label="tasks">📖</span> Assigned Tasks
        </button>
        <button
          className={view === "history" ? "active" : ""}
          onClick={() => setView("history")}
        >
          <span role="img" aria-label="history">📋</span> Work History
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="content-area">
        {view === "tasks" ? (
          <TaskList workerId={workerId} />
        ) : (
          <TaskHistory workerId={workerId} />
        )}
      </main>
    </div>
  );
}

export default App;