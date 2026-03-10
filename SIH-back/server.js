import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db } from "./config/firebase.js";
import { classifyDepartment } from "./utils/aiClassifier.js";
import admin from "firebase-admin";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// health check
app.get("/", (req, res) => {
  res.send("SIH Backend is running ✅");
});

// Middleware to verify Firebase Auth token
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // contains uid, email, etc.
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token", error: err.message });
  }
};

// ---------------- AUTH ----------------

// Register user (Google or Email login)
app.post("/auth/register", verifyToken, async (req, res) => {
  try {
    const { uid, email } = req.user;
    const { name } = req.body;

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      const newUser = {
        uid,
        email,
        name: name || email.split("@")[0],
        role: "citizen",  // default
        createdAt: new Date()
      };
      await userRef.set(newUser);
      return res.json({ message: "User registered", user: newUser });
    } else {
      return res.json({ message: "User already exists", user: userSnap.data() });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error registering user", error: err.message });
  }
});

// ---------------- USERS ----------------

// Get all users
app.get("/users", async (req, res) => {
  try {
    const snapshot = await db.collection("users").get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching users", error: err.message });
  }
});

// Get single user by Firestore document ID
app.get("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const doc = await db.collection("users").doc(userId).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Worker not found" });
    }

    // Send all fields, including uid, deptId, name, email, role
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching user", error: err.message });
  }
});


// ---------------- DEPARTMENTS ----------------

// Create department
app.post("/departments", async (req, res) => {
  try {
    const { name, keywords, adminID } = req.body;

    if (!name) 
      return res.status(400).json({ message: "Department name is required" });

    // Generate a deptId manually or use Firestore doc ID
    const deptId = "dept-" + Date.now(); // simple unique ID

    const newDept = {
      deptId,
      name,
      keywords: keywords || [],
      adminID: adminID || null,
      workerIDs: [],
      timestamp: new Date()
    };

    const docRef = await db.collection("departments").doc(deptId).set(newDept);

    res.json({ id: deptId, ...newDept });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating department", error: err.message });
  }
});


app.get("/departments/:deptId", async (req, res) => {
  try {
    const deptId = req.params.deptId;
    const departmentsRef = db.collection("departments");
    
    // Query the collection for a document where the 'deptId' field matches
    const q = departmentsRef.where("deptId", "==", deptId);
    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
      return res.status(404).json({
        message: "Department not found with the specified deptId"
      });
    }
    
    // Since deptId should be unique, we take the first document found.
    const docSnap = querySnapshot.docs[0];

    res.json({
      id: docSnap.id, // This is the Firestore document ID (e.g., "azSarDGf...")
      ...docSnap.data()
    });

  } catch (err) {
    console.error("Error fetching department:", err);
    res.status(500).json({
      message: "Error fetching department",
      error: err.message
    });
  }
});


// Create a worker
app.post("/workers", async (req, res) => {
  try {
    const { uid, name, email, departmentId } = req.body;
    if (!uid || !name || !email || !departmentId)
      return res.status(400).json({ message: "All fields are required" });

    const workerRef = db.collection("workers").doc(uid);
    await workerRef.set({
      uid,
      name,
      email,
      role: "worker",
      departmentId,
      createdAt: new Date(),
    });

    // Add worker to department's workerIDs array
    const deptRef = db.collection("departments").doc(departmentId);
    await deptRef.update({
      workerIDs: admin.firestore.FieldValue.arrayUnion(uid),
    });

    res.json({ message: "Worker added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error adding worker", error: err.message });
  }
});

app.get("/issues/worker/:docId", async (req, res) => {
  try {
    const { docId } = req.params;

    // Step 1: Get worker document
    const workerDoc = await db.collection("users").doc(docId).get();

    if (!workerDoc.exists) {
      return res.status(404).json({ message: "Worker not found" });
    }

    const workerData = workerDoc.data();

    console.log("🔥 Worker data from Firestore:", workerData);

    // normalize uid field (handle "uid " with space)
    const workerUid = workerData.uid || workerData["uid "];

    if (!workerUid) {
      return res.status(400).json({ message: "Worker document missing uid field" });
    }

    // Step 2: Use the normalized uid to query issues
    const snapshot = await db
      .collection("issues")
      .where("assignedWorker", "==", workerUid)
      .get();

    const issues = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.json(issues);
  } catch (err) {
    console.error("❌ Error fetching worker issues:", err);
    res.status(500).json({ message: "Error fetching worker issues", error: err.message });
  }
});




// Get single department by ID
app.get("/departments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("departments").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching department", error: err.message });
  }
});


// ---------------- ISSUES ----------------

// app.post("/issues", verifyToken, async (req, res) => {
//   try {
//     const { title, description, imageUrl } = req.body;
//     const userId = req.user.uid;

//     if (!title || !description) {
//       return res
//         .status(400)
//         .json({ message: "Title and description are required" });
//     }

//     // Call AI classifier
//     const { department, emergency } = await classifyDepartment(
//       description,
//       imageUrl
//     );

//     // Find department workers
//     const deptSnap = await db
//       .collection("departments")
//       .where("name", "==", department)
//       .get();

//     if (deptSnap.empty)
//       return res.status(400).json({ message: "Department not found" });

//     const deptData = deptSnap.docs[0].data();
//     const workerIDs = deptData.workerIDs || [];
//     let assignedWorker = null;
//     if (workerIDs.length > 0) {
//       assignedWorker = workerIDs[0]; // simple pick
//     }

//     const newIssue = {
//       title,
//       description,
//       department,
//       emergency,
//       submittedBy: userId,
//       status: assignedWorker ? "assigned" : "pending",
//       assignedWorker,
//       citizenUpvotes: [],
//       feedback: [],
//       timestamp: new Date(),
//     };

//     const docRef = await db.collection("issues").add(newIssue);
//     res.json({ id: docRef.id, ...newIssue });
//   } catch (err) {
//     console.error(err);
//     res
//       .status(500)
//       .json({ message: "Error creating issue", error: err.message });
//   }
// });




app.post("/issues", async (req, res) => {
  try {
    const { title, description, location, userId: uidFromClient } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    // Use a constant deptId
    const deptId = "dept-001";
    const department = "General";       // Optional: department name
    const emergency = "Low";            // Optional: default emergency level
    const userId = uidFromClient || "testUser123"; // default user ID for testing

    // Optional: assign a worker manually for testing
    const assignedWorker = "worker-001"; // or "worker-001" if you want someone assigned

    const newIssue = {
      title,
      description,
      department,
      deptId,           // <--- constant deptId
      emergency,
      submittedBy: userId,
      status: assignedWorker ? "assigned" : "pending",
      assignedWorker,
      citizenUpvotes: [],
      feedback: [],
      timestamp: new Date(),
      location,
    };

    const docRef = await db.collection("issues").add(newIssue);
    res.json({ id: docRef.id, ...newIssue });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating issue", error: err.message });
  }
});





// Get all issues
app.get("/issues", async (req, res) => {
  try {
    const snapshot = await db.collection("issues").get();
    const issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(issues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching issues", error: err.message });
  }
});

// Get issues assigned to a worker
app.get("/issues/worker/:workerId", async (req, res) => {
  try {
    const workerId = req.params.workerId;
    const snapshot = await db.collection("issues")
                             .where("assignedWorker", "==", workerId)
                             .get();

    const issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(issues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching worker issues", error: err.message });
  }
});

// Update issue status
app.patch("/issues/:issueId/status", async (req, res) => {
  try {
    const { issueId } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ message: "Status is required" });

    const allowedStatuses = ["pending", "assigned", "in-progress", "completed", "rejected"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const issueRef = db.collection("issues").doc(issueId);
    const issueSnap = await issueRef.get();

    if (!issueSnap.exists) {
      return res.status(404).json({ message: "Issue not found" });
    }

    await issueRef.update({ status });
    res.json({ id: issueId, status });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating issue status", error: err.message });
  }
});

// Upvote issue
app.post("/issues/:issueId/upvote", async (req, res) => {
  try {
    const { issueId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const issueRef = db.collection("issues").doc(issueId);
    const issueSnap = await issueRef.get();

    if (!issueSnap.exists) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const issueData = issueSnap.data();
    const currentUpvotes = issueData.citizenUpvotes || [];

    if (currentUpvotes.includes(userId)) {
      return res.status(400).json({ message: "User already upvoted this issue" });
    }

    await issueRef.update({
      citizenUpvotes: admin.firestore.FieldValue.arrayUnion(userId)
    });

    res.json({ message: "Upvote added successfully", userId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error adding upvote", error: err.message });
  }
});

// Feedback on issue
app.post("/issues/:issueId/feedback", async (req, res) => {
  try {
    const { issueId } = req.params;
    const { userId, message, rating } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ message: "User ID and message are required" });
    }

    const feedbackEntry = {
      userId,
      message,
      rating: rating || null,
      timestamp: new Date()
    };

    const issueRef = db.collection("issues").doc(issueId);
    const issueSnap = await issueRef.get();

    if (!issueSnap.exists) {
      return res.status(404).json({ message: "Issue not found" });
    }

    await issueRef.update({
      feedback: admin.firestore.FieldValue.arrayUnion(feedbackEntry)
    });

    res.json({ message: "Feedback added successfully", feedback: feedbackEntry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error adding feedback", error: err.message });
  }
});



// ---------------- NOTIFICATIONS ----------------

// Create notification
app.post("/notifications", async (req, res) => {
  try {
    const { userId, type, message, issueId } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ message: "userId and message are required" });
    }

    const newNotif = {
      userId,
      type: type || "general",
      message,
      issueId: issueId || null,
      read: false,
      timestamp: new Date()
    };

    const docRef = await db.collection("notifications").add(newNotif);
    res.json({ id: docRef.id, ...newNotif });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating notification", error: err.message });
  }
});

// Get notifications for a user
app.get("/notifications/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const snapshot = await db
      .collection("notifications")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .get();

    const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(notifs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching notifications", error: err.message });
  }
});

// Mark notification as read
app.patch("/notifications/:notifId/read", async (req, res) => {
  try {
    const { notifId } = req.params;

    const notifRef = db.collection("notifications").doc(notifId);
    const notifSnap = await notifRef.get();

    if (!notifSnap.exists) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await notifRef.update({ read: true });
    res.json({ id: notifId, read: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating notification", error: err.message });
  }
});



// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
