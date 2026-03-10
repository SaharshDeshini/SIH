import React from "react";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "12px",
};

function MapView({ userPos, reports }) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: "AIzaSyArMM9lWBBGqnMd5j8Bm3jPqUT8MSraGL4", // 🔑 Replace with your key
  });

  if (!isLoaded) return <p>Loading map...</p>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={userPos}
      zoom={15}
    >
      {/* User marker */}
      <Marker position={userPos} />

      {/* Issue markers */}
      {reports.map((report) => (
        <Marker
          key={report.id}
          position={report.location}
          label={report.status === "Pending" ? "⚠️" : "✅"}
        />
      ))}
    </GoogleMap>
  );
}

export default MapView;
