import React, { useState, useEffect } from "react";
import ReportModal from "./components/ReportModal";
import MapView from "./components/MapView";
import PendingReports from "./components/PendingReports";
import BASE_URL from "./config"; // 👈 create this file with backend URL

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userPos, setUserPos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState("");
  const [reports, setReports] = useState([]);

  // Detect user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserPos({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setLoading(false);
        },
        (err) => {
          console.error("Location error:", err);
          setLoading(false);
        }
      );
    } else {
      alert("Geolocation not supported in your browser.");
      setLoading(false);
    }
  }, []);

  // Reverse Geocoding
  useEffect(() => {
    if (userPos) {
      fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${userPos.lat},${userPos.lng}&key=YOUR_GOOGLE_API_KEY`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.results && data.results.length > 0) {
            setLocationName(data.results[0].formatted_address);
          } else {
            setLocationName("Unknown location");
          }
        })
        .catch((err) => {
          console.error("Geocoding error:", err);
          setLocationName("Location name not found");
        });
    }
  }, [userPos]);

  // ✅ Fetch existing reports from backend
  useEffect(() => {
    fetch(`${BASE_URL}/issues`)
      .then((res) => res.json())
      .then((data) => setReports(data))
      .catch((err) => console.error("Error fetching issues:", err));
  }, []);

  // ✅ Submit new report to backend
  const handleReportSubmit = async (data) => {
    try {
      const res = await fetch(`${BASE_URL}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Citizen Report",
          description: data.description,
          imageUrl: data.file ? data.file.name : null, // TODO: handle actual upload later
          location: data.location,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit issue");

      const newIssue = await res.json();
      setReports((prev) => [...prev, newIssue]); // update local state
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error submitting report:", err);
      alert("Failed to submit report");
    }
  };

  return (
    <div className="app-container">
      <h1 className="title">🛠 NagarSeva</h1>

      {loading ? (
        <p className="loading">📍 Detecting your location...</p>
      ) : (
        <>
          <p className="location">
            📍 Location: {locationName || `${userPos.lat}, ${userPos.lng}`}
          </p>
          <MapView userPos={userPos} reports={reports} /> {/* ✅ all reports */}
        </>
      )}

      <button className="report-btn" onClick={() => setIsModalOpen(true)}>
        ➕ Report Issue
      </button>

      <ReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleReportSubmit}
        userPos={userPos}
      />

      <PendingReports reports={reports} />
    </div>
  );
}

export default App;

