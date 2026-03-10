import React, { useState, useRef } from "react";

function ReportModal({ isOpen, onClose, onSubmit, userPos }) {
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false); // 🎤 new state
  const recognitionRef = useRef(null);

  if (!isOpen) return null;

  // 🎤 Voice input function
  const startVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Your browser does not support voice input.");
      return;
    }

    recognitionRef.current = new window.webkitSpeechRecognition();
    recognitionRef.current.lang = "en-US";
    recognitionRef.current.interimResults = false;
    recognitionRef.current.maxAlternatives = 1;

    recognitionRef.current.onstart = () => {
      setIsRecording(true); // 🔴 start glowing
    };

    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setDescription((prev) => prev + " " + transcript);
    };

    recognitionRef.current.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };

    recognitionRef.current.onend = () => {
      setIsRecording(false); // 🟢 stop glowing
    };

    recognitionRef.current.start();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      description,
      file,
      location: userPos,
    });
    setDescription("");
    setFile(null);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>📌 Report an Issue</h2>
        <form onSubmit={handleSubmit}>
          {/* Description + Mic */}
          <div className="input-group">
            <textarea
              placeholder="Describe the issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <i
              className={`bi bi-mic mic-icon ${isRecording ? "recording" : ""}`}
              onClick={startVoiceInput}
            ></i>
          </div>

          {/* File Upload */}
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />

          {/* Location Display */}
          {userPos && (
            <p className="location">
              📍 Location: {userPos.lat.toFixed(4)}, {userPos.lng.toFixed(4)}
            </p>
          )}

          <div className="actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReportModal;
