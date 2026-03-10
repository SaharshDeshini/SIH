import React from "react";

function WorkerMap({ location }) {
  if (!location) return null;
  const { lat, lng } = location;

  return (
    <div className="map-placeholder">
      <p>Map: {lat}, {lng}</p>
    </div>
  );
}

export default WorkerMap;
