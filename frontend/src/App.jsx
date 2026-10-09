import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;
const roleMap = {
  1: "STUDENT",
  2: "STAFF",
  3: "DEPARTMENT_OFFICER",
  4: "ADMINISTRATOR",
};

const statusOptions = [
  "PENDING",
  "REVIEWED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
];

const roleOptions = [
  { id: 1, name: "STUDENT" },
  { id: 2, name: "STAFF" },
  { id: 3, name: "DEPARTMENT_OFFICER" },
  { id: 4, name: "ADMINISTRATOR" },
];

function App() {
  // ======================================================
  // AUTHENTICATION
  // ======================================================
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // ======================================================
  // COMPLAINT DETAILS
  // ======================================================
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const [statusHistory, setStatusHistory] = useState([]);

  const [detailsLoading, setDetailsLoading] = useState(false);

  const [detailsMessage, setDetailsMessage] = useState("");

  // ======================================================
  // COMPLAINT COMMENTS
  // ======================================================
  const [comments, setComments] = useState([]);

  const [commentText, setCommentText] = useState("");

  const [commentsLoading, setCommentsLoading] = useState(false);

  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const [commentMessage, setCommentMessage] = useState("");

  // ======================================================
  // NAVIGATION
  // ======================================================
  const [activePage, setActivePage] = useState("dashboard");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ======================================================
  // NOTIFICATIONS
  // ======================================================
  const [showNotifications, setShowNotifications] = useState(false);

  // ======================================================
  // PROFILE
  // ======================================================
  const [profileEditing, setProfileEditing] = useState(false);

  const [profileName, setProfileName] = useState("");

  const [profileEmail, setProfileEmail] = useState("");

  const [profileMessage, setProfileMessage] = useState("");

  // ======================================================
  // COMPLAINTS
  // ======================================================
  const [complaints, setComplaints] = useState([]);

  const [complaintLoading, setComplaintLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");

  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // ======================================================
  // COMPLAINT FORM
  // ======================================================
  const [complaintMessage, setComplaintMessage] = useState("");

  const [complaintForm, setComplaintForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    locationId: "",
    priority: "MEDIUM",
  });

  // ======================================================
  // SUPPORTING DATA
  // ======================================================
  const [categories, setCategories] = useState([]);

  const [locations, setLocations] = useState([]);

  const [departments, setDepartments] = useState([]);

  // ======================================================
  // COMPLAINT MANAGEMENT
  // ======================================================
  const [selectedDepartments, setSelectedDepartments] = useState({});

  const [selectedStatuses, setSelectedStatuses] = useState({});

  const [actionMessage, setActionMessage] = useState("");

  // ======================================================
  // USER MANAGEMENT
  // ======================================================
  const [users, setUsers] = useState([]);

  const [userSearchTerm, setUserSearchTerm] = useState("");

  const [userMessage, setUserMessage] = useState("");

  const [userLoading, setUserLoading] = useState(false);

  const [showUserForm, setShowUserForm] = useState(false);

  const [editingUserId, setEditingUserId] = useState(null);

  const emptyUserForm = {
    fullName: "",
    email: "",
    password: "",
    roleId: "1",
    departmentId: "",
  };

  const [userForm, setUserForm] = useState(emptyUserForm);

  // ======================================================
  // USER ROLE
  // ======================================================
  const role = roleMap[user?.roleId] || "";

  const isStudent = role === "STUDENT";

  const isStaff = role === "STAFF";

  const isOfficer = role === "DEPARTMENT_OFFICER";

  const isAdmin = role === "ADMINISTRATOR";

  // ======================================================
  // INITIAL LOADING
  // ======================================================
  useEffect(() => {
    if (token) {
      loadUser();
      loadCategories();
      loadLocations();
      loadDepartments();
    }
  }, [token]);

  useEffect(() => {
    if (token && user) {
      loadComplaints();

      if (user.roleId === 4) {
        loadUsers();
      }
    }
  }, [token, user]);

  // ======================================================
  // LOAD CURRENT USER
  // ======================================================
  const loadUser = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
      } else {
        logout();
      }
    } catch (error) {
      console.error("User error:", error);
    }
  };

  // ======================================================
  // LOAD COMPLAINT COMMENTS
  // ======================================================
  const loadComplaintComments = async (complaintId) => {
    if (!token || !complaintId) {
      return;
    }

    setCommentsLoading(true);
    setCommentMessage("");

    try {
      const response = await fetch(
        `${API_URL}/complaints/${complaintId}/comments`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load comments.");
      }

      setComments(data.comments || []);
    } catch (error) {
      console.error("Load comments error:", error);

      setCommentMessage(error.message || "Unable to load comments.");
    } finally {
      setCommentsLoading(false);
    }
  };

  // ======================================================
  // LOAD COMPLAINT DETAILS + HISTORY + COMMENTS
  // ======================================================
  const loadComplaintDetails = async (complaintId) => {
    if (!token) {
      setDetailsMessage("You are not authenticated.");
      return;
    }

    setDetailsLoading(true);
    setDetailsMessage("");

    setSelectedComplaint(null);
    setStatusHistory([]);

    setComments([]);
    setCommentText("");
    setCommentMessage("");

    try {
      const [complaintResponse, historyResponse] = await Promise.all([
        fetch(`${API_URL}/complaints/${complaintId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),

        fetch(`${API_URL}/complaints/${complaintId}/history`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const complaintData = await complaintResponse.json();

      const historyData = await historyResponse.json();

      console.log("Complaint details:", complaintData);

      console.log("Complaint history:", historyData);

      if (!complaintResponse.ok || !complaintData.success) {
        setDetailsMessage(
          complaintData.message || "Failed to load complaint details.",
        );
        return;
      }

      setSelectedComplaint(complaintData.complaint);

      if (historyData.success) {
        setStatusHistory(
          historyData.history || historyData.statusHistory || [],
        );
      } else {
        setStatusHistory([]);
      }

      // Open details page
      setActivePage("complaint-details");

      setSidebarOpen(false);

      // Load comments
      await loadComplaintComments(complaintId);
    } catch (error) {
      console.error("Complaint details error:", error);

      setDetailsMessage(
        "Cannot connect to server. Check that the backend is running.",
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  // ======================================================
  // ADD COMPLAINT COMMENT
  // ======================================================
  const handleAddComment = async () => {
    if (!token || !selectedComplaint) {
      return;
    }

    const trimmedComment = commentText.trim();

    if (!trimmedComment) {
      setCommentMessage("Please enter a comment.");
      return;
    }

    if (trimmedComment.length > 2000) {
      setCommentMessage("Comment cannot exceed 2000 characters.");
      return;
    }

    setCommentSubmitting(true);
    setCommentMessage("");

    try {
      const response = await fetch(
        `${API_URL}/complaints/${selectedComplaint.id}/comments`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            comment: trimmedComment,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to add comment.");
      }

      // Add new comment immediately
      setComments((previousComments) => [...previousComments, data.comment]);

      // Clear textarea
      setCommentText("");

      setCommentMessage("Comment added successfully.");
    } catch (error) {
      console.error("Add comment error:", error);

      setCommentMessage(error.message || "Unable to add comment.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  // ======================================================
  // CLOSE COMPLAINT DETAILS
  // ======================================================
  const closeComplaintDetails = () => {
    setSelectedComplaint(null);
    setStatusHistory([]);

    setComments([]);
    setCommentText("");
    setCommentMessage("");

    setDetailsMessage("");

    setActivePage("complaints");
  };

  // ======================================================
  // PROFILE - START EDITING
  // ======================================================
  const startProfileEditing = () => {
    setProfileName(user?.fullName || "");

    setProfileEmail(user?.email || "");

    setProfileMessage("");
    setProfileEditing(true);
  };

  // ======================================================
  // PROFILE - CANCEL
  // ======================================================
  const cancelProfileEditing = () => {
    setProfileEditing(false);
    setProfileMessage("");
    setProfileName("");
    setProfileEmail("");
  };

  // ======================================================
  // PROFILE - SAVE
  // ======================================================
  const handleSaveProfile = async () => {
    setProfileMessage("");

    if (!profileName.trim()) {
      setProfileMessage("Full name is required.");
      return;
    }

    if (!profileEmail.trim()) {
      setProfileMessage("Email is required.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          fullName: profileName.trim(),

          email: profileEmail.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(
          data.user || {
            ...user,

            fullName: profileName.trim(),

            email: profileEmail.trim(),
          },
        );

        setProfileMessage("Profile updated successfully.");

        setTimeout(() => {
          setProfileEditing(false);
          setProfileMessage("");
        }, 1200);
      } else {
        setProfileMessage(data.message || "Failed to update profile.");
      }
    } catch (error) {
      console.error("Profile update error:", error);

      setProfileMessage(
        "Cannot connect to server. Check that the backend is running.",
      );
    }
  };

  // ======================================================
  // LOAD COMPLAINTS
  // ======================================================
  const loadComplaints = async () => {
    if (!token || !user) {
      console.warn("Cannot load complaints: missing token or user.");
      return;
    }

    setComplaintLoading(true);
    setActionMessage("");

    try {
      const endpoint =
        user.roleId === 1
          ? `${API_URL}/complaints/my`
          : `${API_URL}/complaints`;

      const response = await fetch(endpoint, {
        method: "GET",

        headers: {
          Authorization: `Bearer ${token}`,

          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setComplaints(data.complaints || []);
      } else {
        setActionMessage(data.message || "Failed to refresh complaints.");
      }
    } catch (error) {
      console.error("Complaints refresh error:", error);

      setActionMessage(
        "Unable to refresh complaints. Check that the backend is running.",
      );
    } finally {
      setComplaintLoading(false);
    }
  };

  // ======================================================
  // LOAD CATEGORIES
  // ======================================================
  const loadCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/categories`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Categories error:", error);
    }
  };

  // ======================================================
  // LOAD LOCATIONS
  // ======================================================
  const loadLocations = async () => {
    try {
      const response = await fetch(`${API_URL}/locations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setLocations(data.locations || []);
      }
    } catch (error) {
      console.error("Locations error:", error);
    }
  };

  // ======================================================
  // LOAD DEPARTMENTS
  // ======================================================
  const loadDepartments = async () => {
    try {
      const response = await fetch(`${API_URL}/departments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error("Departments error:", error);
    }
  };

  // ======================================================
  // LOAD USERS - ADMIN ONLY
  // ======================================================
  const loadUsers = async () => {
    if (!token || !isAdmin) {
      return;
    }

    setUserLoading(true);

    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setUsers(data.users || []);
      } else {
        setUserMessage(data.message || "Failed to load users.");
      }
    } catch (error) {
      console.error("Users error:", error);

      setUserMessage("Cannot connect to server.");
    } finally {
      setUserLoading(false);
    }
  };

  // ======================================================
  // LOGIN
  // ======================================================
  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      console.log("LOGIN RESPONSE:", data);

      if (data.success) {
        localStorage.setItem("token", data.token);

        setToken(data.token);

        setUser(data.user || null);

        setMessage("");
      } else {
        setMessage(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);

      setMessage("Cannot connect to server");
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // LOGOUT
  // ======================================================
  const logout = () => {
    localStorage.removeItem("token");

    setToken(null);
    setUser(null);

    setComplaints([]);
    setUsers([]);

    setSelectedComplaint(null);
    setStatusHistory([]);

    setComments([]);
    setCommentText("");
    setCommentMessage("");

    setEmail("");
    setPassword("");

    setActivePage("dashboard");
    setSidebarOpen(false);
    setShowNotifications(false);
  };

  // ======================================================
  // COMPLAINT FORM CHANGE
  // ======================================================
  const handleComplaintChange = (e) => {
    const { name, value } = e.target;

    setComplaintForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ======================================================
  // SUBMIT COMPLAINT
  // ======================================================
  const handleSubmitComplaint = async (e) => {
    e.preventDefault();

    setComplaintMessage("");

    if (!complaintForm.title.trim()) {
      setComplaintMessage("Complaint title is required.");
      return;
    }

    if (!complaintForm.description.trim()) {
      setComplaintMessage("Complaint description is required.");
      return;
    }

    if (!complaintForm.categoryId) {
      setComplaintMessage("Please select a category.");
      return;
    }

    if (!complaintForm.locationId) {
      setComplaintMessage("Please select a location.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/complaints`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          title: complaintForm.title.trim(),

          description: complaintForm.description.trim(),

          categoryId: Number(complaintForm.categoryId),

          locationId: Number(complaintForm.locationId),

          priority: complaintForm.priority,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setComplaintMessage("Complaint submitted successfully!");

        setComplaintForm({
          title: "",
          description: "",
          categoryId: "",
          locationId: "",
          priority: "MEDIUM",
        });

        await loadComplaints();

        setTimeout(() => {
          setActivePage("complaints");

          setComplaintMessage("");
        }, 1200);
      } else {
        setComplaintMessage(data.message || "Failed to submit complaint");
      }
    } catch (error) {
      console.error("Submit complaint error:", error);

      setComplaintMessage("Cannot connect to server");
    }
  };

  // ======================================================
  // ASSIGN COMPLAINT
  // ======================================================
  const handleAssignComplaint = async (complaintId) => {
    if (!isStaff && !isAdmin) {
      setActionMessage("You do not have permission to assign complaints.");
      return;
    }

    const complaint = complaints.find((item) => item.id === complaintId);

    if (!complaint) {
      setActionMessage("Complaint not found.");
      return;
    }

    if (complaint.status === "CLOSED" || complaint.status === "REJECTED") {
      setActionMessage("Closed or rejected complaints cannot be assigned.");
      return;
    }

    const departmentId = selectedDepartments[complaintId];

    if (!departmentId) {
      setActionMessage("Please select a department first.");
      return;
    }

    if (
      complaint.departmentId &&
      Number(complaint.departmentId) === Number(departmentId)
    ) {
      setActionMessage("Complaint is already assigned to this department.");
      return;
    }

    setActionMessage("");

    try {
      const response = await fetch(
        `${API_URL}/complaints/${complaintId}/assign`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            departmentId: Number(departmentId),
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setActionMessage("Complaint assigned successfully.");

        setSelectedDepartments((previous) => {
          const updated = {
            ...previous,
          };

          delete updated[complaintId];

          return updated;
        });

        await loadComplaints();
      } else {
        setActionMessage(data.message || "Failed to assign complaint.");
      }
    } catch (error) {
      console.error("Assign error:", error);

      setActionMessage("Cannot connect to server.");
    }
  };

  // ======================================================
  // UPDATE COMPLAINT STATUS
  // ======================================================
  const handleUpdateStatus = async (complaintId) => {
    const complaint = complaints.find((item) => item.id === complaintId);

    if (!complaint) {
      setActionMessage("Complaint not found.");
      return;
    }

    if (isStudent) {
      setActionMessage("Students cannot update complaint status.");
      return;
    }

    if (complaint.status === "CLOSED" || complaint.status === "REJECTED") {
      setActionMessage("Closed or rejected complaints cannot be updated.");
      return;
    }

    const status = selectedStatuses[complaintId];

    if (!status) {
      setActionMessage("Please select a status first.");
      return;
    }

    if (status === complaint.status) {
      setActionMessage("Please select a different status before updating.");
      return;
    }

    setActionMessage("");

    try {
      const response = await fetch(
        `${API_URL}/complaints/${complaintId}/status`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            status,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setActionMessage("Complaint status updated successfully.");

        setSelectedStatuses((previous) => {
          const updated = {
            ...previous,
          };

          delete updated[complaintId];

          return updated;
        });

        await loadComplaints();

        // Refresh currently open details
        if (selectedComplaint?.id === complaintId) {
          await loadComplaintDetails(complaintId);
        }
      } else {
        setActionMessage(data.message || "Failed to update complaint status.");
      }
    } catch (error) {
      console.error("Status update error:", error);

      setActionMessage("Cannot connect to server.");
    }
  };

  // ======================================================
  // USER FORM CHANGE
  // ======================================================
  const handleUserFormChange = (e) => {
    const { name, value } = e.target;

    setUserForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ======================================================
  // OPEN ADD USER FORM
  // ======================================================
  const openAddUserForm = () => {
    setEditingUserId(null);
    setUserForm(emptyUserForm);

    setUserMessage("");
    setShowUserForm(true);
  };

  // ======================================================
  // OPEN EDIT USER FORM
  // ======================================================
  const openEditUserForm = (selectedUser) => {
    setEditingUserId(selectedUser.id);

    setUserForm({
      fullName: selectedUser.fullName || "",

      email: selectedUser.email || "",

      password: "",

      roleId: String(selectedUser.roleId || ""),

      departmentId: selectedUser.departmentId
        ? String(selectedUser.departmentId)
        : "",
    });

    setUserMessage("");
    setShowUserForm(true);
  };

  // ======================================================
  // CANCEL USER FORM
  // ======================================================
  const cancelUserForm = () => {
    setShowUserForm(false);
    setEditingUserId(null);

    setUserForm(emptyUserForm);
  };

  // ======================================================
  // CREATE / UPDATE USER
  // ======================================================
  const handleSaveUser = async (e) => {
    e.preventDefault();

    setUserMessage("");

    if (!userForm.fullName.trim()) {
      setUserMessage("Full name is required.");
      return;
    }

    if (!userForm.email.trim()) {
      setUserMessage("Email is required.");
      return;
    }

    if (!editingUserId && !userForm.password.trim()) {
      setUserMessage("Password is required when creating a user.");
      return;
    }

    if (!userForm.roleId) {
      setUserMessage("Please select a role.");
      return;
    }

    try {
      const url = editingUserId
        ? `${API_URL}/users/${editingUserId}`
        : `${API_URL}/users`;

      const method = editingUserId ? "PATCH" : "POST";

      const body = {
        fullName: userForm.fullName.trim(),

        email: userForm.email.trim(),

        roleId: Number(userForm.roleId),

        departmentId: userForm.departmentId
          ? Number(userForm.departmentId)
          : null,
      };

      if (userForm.password.trim()) {
        body.password = userForm.password.trim();
      }

      const response = await fetch(url, {
        method,

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        setUserMessage(
          editingUserId
            ? "User updated successfully."
            : "User created successfully.",
        );

        await loadUsers();

        setTimeout(() => {
          cancelUserForm();
        }, 900);
      } else {
        setUserMessage(data.message || "Failed to save user.");
      }
    } catch (error) {
      console.error("Save user error:", error);

      setUserMessage("Cannot connect to server.");
    }
  };

  // ======================================================
  // DELETE USER
  // ======================================================
  const handleDeleteUser = async (selectedUser) => {
    if (selectedUser.id === user?.id) {
      setUserMessage("You cannot delete your own account.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedUser.fullName}?`,
    );

    if (!confirmed) {
      return;
    }

    setUserMessage("");

    try {
      const response = await fetch(`${API_URL}/users/${selectedUser.id}`, {
        method: "DELETE",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setUserMessage("User deleted successfully.");

        await loadUsers();
      } else {
        setUserMessage(data.message || "Failed to delete user.");
      }
    } catch (error) {
      console.error("Delete user error:", error);

      setUserMessage("Cannot connect to server.");
    }
  };

  // ======================================================
  // FILTER COMPLAINTS
  // ======================================================
  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      const search = searchTerm.toLowerCase().trim();

      const matchesSearch =
        !search ||
        complaint.title?.toLowerCase().includes(search) ||
        complaint.description?.toLowerCase().includes(search) ||
        complaint.category?.name?.toLowerCase().includes(search) ||
        complaint.department?.name?.toLowerCase().includes(search) ||
        complaint.reporter?.fullName?.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "ALL" || complaint.status === statusFilter;

      const matchesPriority =
        priorityFilter === "ALL" || complaint.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [complaints, searchTerm, statusFilter, priorityFilter]);

  // ======================================================
  // FILTER USERS
  // ======================================================
  const filteredUsers = useMemo(() => {
    const search = userSearchTerm.toLowerCase().trim();

    if (!search) {
      return users;
    }

    return users.filter((selectedUser) => {
      return (
        selectedUser.fullName?.toLowerCase().includes(search) ||
        selectedUser.email?.toLowerCase().includes(search) ||
        selectedUser.role?.name?.toLowerCase().includes(search) ||
        selectedUser.department?.name?.toLowerCase().includes(search)
      );
    });
  }, [users, userSearchTerm]);

  // ======================================================
  // STATISTICS
  // ======================================================
  const statistics = {
    total: complaints.length,

    pending: complaints.filter((c) => c.status === "PENDING").length,

    assigned: complaints.filter((c) => c.status === "ASSIGNED").length,

    inProgress: complaints.filter((c) => c.status === "IN_PROGRESS").length,

    resolved: complaints.filter((c) => c.status === "RESOLVED").length,

    closed: complaints.filter((c) => c.status === "CLOSED").length,
  };

  // ======================================================
  // NOTIFICATIONS
  // ======================================================
  const notifications = useMemo(() => {
    if (!complaints || complaints.length === 0) {
      return [];
    }

    return complaints
      .slice()
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0);

        const dateB = new Date(b.updatedAt || b.createdAt || 0);

        return dateB - dateA;
      })
      .slice(0, 5)
      .map((complaint) => ({
        id: complaint.id,

        title: complaint.title,

        status: complaint.status,

        priority: complaint.priority,

        message:
          complaint.status === "PENDING"
            ? "New complaint is waiting for review."
            : `Complaint status: ${complaint.status.replace("_", " ")}`,
      }));
  }, [complaints]);

  // ======================================================
  // NAVIGATION
  // ======================================================
  const changePage = (page) => {
    setActivePage(page);
    setSidebarOpen(false);

    if (page === "users" && isAdmin) {
      loadUsers();
    }
  };

  // ======================================================
  // LOGIN SCREEN
  // ======================================================
  if (!token) {
    return (
      <div className="login-page">
        <div className="login-background-shape shape-one"></div>

        <div className="login-background-shape shape-two"></div>

        <div className="login-card">
          <div className="login-logo">
            <span>CR</span>
          </div>

          <h1>Campus Reporting System</h1>

          <p className="login-subtitle">Sign in to your account</p>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Email</label>

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>Password</label>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {message && <div className="login-message">{message}</div>}
        </div>
      </div>
    );
  }

  // ======================================================
  // MAIN APPLICATION
  // ======================================================
  return (
    <div className="app-layout">
      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* ==================================================
          SIDEBAR
      ================================================== */}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">CR</div>

          <div>
            <h2>Campus</h2>

            <span>Reporting System</span>
          </div>
        </div>

        <div className="sidebar-menu-title">MAIN MENU</div>

        <nav className="sidebar-nav">
          {/* DASHBOARD */}
          <button
            className={`nav-item ${activePage === "dashboard" ? "active" : ""}`}
            onClick={() => changePage("dashboard")}
          >
            <span className="nav-icon">⌂</span>

            <span>Dashboard</span>
          </button>

          {/* COMPLAINTS */}
          <button
            className={`nav-item ${
              activePage === "complaints" ? "active" : ""
            }`}
            onClick={() => changePage("complaints")}
          >
            <span className="nav-icon">▤</span>

            <span>{isStudent ? "My Complaints" : "Complaints"}</span>
          </button>

          {/* NEW COMPLAINT */}
          {isStudent && (
            <button
              className={`nav-item ${
                activePage === "new-complaint" ? "active" : ""
              }`}
              onClick={() => changePage("new-complaint")}
            >
              <span className="nav-icon">＋</span>

              <span>New Complaint</span>
            </button>
          )}

          {/* DEPARTMENTS */}
          {(isStaff || isAdmin) && (
            <button
              className={`nav-item ${
                activePage === "departments" ? "active" : ""
              }`}
              onClick={() => changePage("departments")}
            >
              <span className="nav-icon">▦</span>

              <span>Departments</span>
            </button>
          )}

          {/* USERS */}
          {isAdmin && (
            <button
              className={`nav-item ${activePage === "users" ? "active" : ""}`}
              onClick={() => changePage("users")}
            >
              <span className="nav-icon">♙</span>

              <span>Users</span>
            </button>
          )}

          {/* REPORTS */}
          <button
            className={`nav-item ${activePage === "reports" ? "active" : ""}`}
            onClick={() => changePage("reports")}
          >
            <span className="nav-icon">◫</span>

            <span>Reports</span>
          </button>
        </nav>

        {/* ACCOUNT */}
        <div className="sidebar-bottom">
          <div className="sidebar-menu-title">ACCOUNT</div>

          {/* PROFILE */}
          <button
            className={`nav-item ${activePage === "profile" ? "active" : ""}`}
            onClick={() => changePage("profile")}
          >
            <span className="nav-icon">◉</span>

            <span>My Profile</span>
          </button>

          {/* LOGOUT */}
          <button className="nav-item logout-nav" onClick={logout}>
            <span className="nav-icon">↪</span>

            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ==================================================
          MAIN AREA
      ================================================== */}
      <div className="main-area">
        {/* ==================================================
            TOP BAR
        ================================================== */}
        <header className="topbar">
          {/* MOBILE MENU */}
          <button
            className="mobile-menu-button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>

          {/* PAGE TITLE */}
          <div className="topbar-title">
            <h1>
              {activePage === "dashboard" && "Dashboard"}

              {activePage === "complaints" &&
                (isStudent ? "My Complaints" : "Complaint Management")}

              {activePage === "complaint-details" && "Complaint Details"}

              {activePage === "new-complaint" && "New Complaint"}

              {activePage === "departments" && "Departments"}

              {activePage === "users" && "User Management"}

              {activePage === "reports" && "Reports"}

              {activePage === "profile" && "My Profile"}
            </h1>

            <p>Manage campus reporting activities</p>
          </div>

          {/* TOPBAR RIGHT */}
          <div className="topbar-right">
            {/* NOTIFICATIONS */}
            <div className="notification-wrapper">
              <button
                type="button"
                className="notification"
                onClick={() => setShowNotifications((previous) => !previous)}
                aria-label="Notifications"
              >
                <span>♢</span>

                {notifications.length > 0 && <i></i>}
              </button>

              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <div>
                      <h3>Notifications</h3>

                      <span>
                        {notifications.length} recent notification
                        {notifications.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="notification-close"
                      onClick={() => setShowNotifications(false)}
                    >
                      ×
                    </button>
                  </div>

                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div className="notification-empty">
                        <div>♢</div>

                        <strong>No notifications</strong>

                        <span>You don't have any new notifications.</span>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          className="notification-item"
                          key={notification.id}
                          onClick={() => {
                            setShowNotifications(false);

                            setActivePage("complaints");
                          }}
                        >
                          <div className="notification-icon">
                            {notification.status === "CLOSED" ||
                            notification.status === "RESOLVED"
                              ? "✓"
                              : "!"}
                          </div>

                          <div className="notification-content">
                            <strong>{notification.title}</strong>

                            <p>{notification.message}</p>

                            <small>Priority: {notification.priority}</small>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <button
                      type="button"
                      className="notification-view-all"
                      onClick={() => {
                        setShowNotifications(false);

                        setActivePage("complaints");
                      }}
                    >
                      View all complaints →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* CURRENT USER */}
            <div className="topbar-user">
              <div className="avatar">
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
              </div>

              <div className="topbar-user-info">
                <strong>{user?.fullName || user?.email || "User"}</strong>

                <span>{role}</span>
              </div>
            </div>
          </div>
        </header>

        {/* ==================================================
            CONTENT
        ================================================== */}
        <main className="content">
          {/* ==================================================
              DASHBOARD
          ================================================== */}
          {activePage === "dashboard" && (
            <>
              <section className="welcome-banner">
                <div>
                  <span className="welcome-small">Welcome back 👋</span>

                  <h2>{user?.fullName || "User"}</h2>

                  <p>Here's what's happening with your campus reports today.</p>
                </div>

                {isStudent && (
                  <button
                    className="primary-button"
                    onClick={() => changePage("new-complaint")}
                  >
                    + New Complaint
                  </button>
                )}
              </section>

              {/* STATISTICS */}
              <section className="stats-grid">
                <div className="stat-box">
                  <div className="stat-icon blue">▤</div>

                  <div>
                    <span>Total Complaints</span>

                    <strong>{statistics.total}</strong>
                  </div>
                </div>

                <div className="stat-box">
                  <div className="stat-icon orange">◷</div>

                  <div>
                    <span>Pending</span>

                    <strong>{statistics.pending}</strong>
                  </div>
                </div>

                <div className="stat-box">
                  <div className="stat-icon purple">◌</div>

                  <div>
                    <span>In Progress</span>

                    <strong>{statistics.inProgress}</strong>
                  </div>
                </div>

                <div className="stat-box">
                  <div className="stat-icon green">✓</div>

                  <div>
                    <span>Resolved</span>

                    <strong>{statistics.resolved}</strong>
                  </div>
                </div>
              </section>

              {/* RECENT COMPLAINTS */}
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Recent Complaints</h2>

                    <p>Latest campus complaints</p>
                  </div>

                  <button
                    className="outline-button"
                    onClick={() => changePage("complaints")}
                  >
                    View All
                  </button>
                </div>

                <ComplaintTable
                  complaints={complaints.slice(0, 5)}
                  onViewDetails={loadComplaintDetails}
                />
              </section>
            </>
          )}

          {/* ==================================================
              COMPLAINTS
          ================================================== */}
          {activePage === "complaints" && (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>
                    {isStudent ? "My Complaints" : "Complaint Management"}
                  </h2>

                  <p>Search and manage campus complaints.</p>
                </div>

                <div className="panel-actions">
                  {isStudent && (
                    <button
                      className="primary-button"
                      onClick={() => changePage("new-complaint")}
                    >
                      + New Complaint
                    </button>
                  )}

                  <button
                    type="button"
                    className="outline-button"
                    onClick={loadComplaints}
                    disabled={complaintLoading}
                  >
                    {complaintLoading ? "↻ Refreshing..." : "↻ Refresh"}
                  </button>
                </div>
              </div>

              {/* FILTERS */}
              <div className="filter-bar">
                <div className="search-box">
                  <span>⌕</span>

                  <input
                    type="text"
                    placeholder="Search complaints..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>

                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="ALL">All Priorities</option>

                  <option value="LOW">Low</option>

                  <option value="MEDIUM">Medium</option>

                  <option value="HIGH">High</option>

                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              {/* TABLE */}
              {isStudent ? (
                <ComplaintTable
                  complaints={filteredComplaints}
                  onViewDetails={loadComplaintDetails}
                />
              ) : (
                <ManagementTable
                  complaints={filteredComplaints}
                  isStaff={isStaff}
                  isOfficer={isOfficer}
                  isAdmin={isAdmin}
                  departments={departments}
                  selectedDepartments={selectedDepartments}
                  setSelectedDepartments={setSelectedDepartments}
                  selectedStatuses={selectedStatuses}
                  setSelectedStatuses={setSelectedStatuses}
                  handleAssignComplaint={handleAssignComplaint}
                  handleUpdateStatus={handleUpdateStatus}
                  onViewDetails={loadComplaintDetails}
                />
              )}

              {actionMessage && (
                <div className="action-message">{actionMessage}</div>
              )}
            </section>
          )}

          {/* ==================================================
              COMPLAINT DETAILS
          ================================================== */}
          {activePage === "complaint-details" && (
            <ComplaintDetails
              complaint={selectedComplaint}
              history={statusHistory}
              comments={comments}
              commentText={commentText}
              setCommentText={setCommentText}
              commentsLoading={commentsLoading}
              commentSubmitting={commentSubmitting}
              commentMessage={commentMessage}
              onAddComment={handleAddComment}
              loading={detailsLoading}
              message={detailsMessage}
              onBack={closeComplaintDetails}
            />
          )}

          {/* ==================================================
              NEW COMPLAINT
          ================================================== */}
          {activePage === "new-complaint" && isStudent && (
            <section className="panel form-panel">
              <div className="panel-header">
                <div>
                  <h2>Submit New Complaint</h2>

                  <p>Provide detailed information about your campus problem.</p>
                </div>
              </div>

              <form className="complaint-form" onSubmit={handleSubmitComplaint}>
                {/* TITLE */}
                <div className="form-group">
                  <label>Complaint Title</label>

                  <input
                    type="text"
                    name="title"
                    placeholder="Example: Internet not working"
                    value={complaintForm.title}
                    onChange={handleComplaintChange}
                    required
                  />
                </div>

                {/* DESCRIPTION */}
                <div className="form-group">
                  <label>Description</label>

                  <textarea
                    name="description"
                    placeholder="Describe your problem in detail..."
                    value={complaintForm.description}
                    onChange={handleComplaintChange}
                    rows="6"
                    required
                  />
                </div>

                <div className="form-grid">
                  {/* CATEGORY */}
                  <div className="form-group">
                    <label>Category</label>

                    <select
                      name="categoryId"
                      value={complaintForm.categoryId}
                      onChange={handleComplaintChange}
                      required
                    >
                      <option value="">Select category</option>

                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* LOCATION */}
                  <div className="form-group">
                    <label>Location</label>

                    <select
                      name="locationId"
                      value={complaintForm.locationId}
                      onChange={handleComplaintChange}
                      required
                    >
                      <option value="">Select location</option>

                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {[
                            location.building,

                            location.floor ? `Floor ${location.floor}` : "",

                            location.room ? `Room ${location.room}` : "",

                            location.area,
                          ]
                            .filter(Boolean)
                            .join(" — ")}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* PRIORITY */}
                  <div className="form-group">
                    <label>Priority</label>

                    <select
                      name="priority"
                      value={complaintForm.priority}
                      onChange={handleComplaintChange}
                    >
                      <option value="LOW">Low</option>

                      <option value="MEDIUM">Medium</option>

                      <option value="HIGH">High</option>

                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </div>

                {complaintMessage && (
                  <div className="success-message">{complaintMessage}</div>
                )}

                <div className="form-buttons">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => changePage("dashboard")}
                  >
                    Cancel
                  </button>

                  <button type="submit" className="primary-button">
                    Submit Complaint
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* ==================================================
              DEPARTMENTS
          ================================================== */}
          {activePage === "departments" && (isStaff || isAdmin) && (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Departments</h2>

                  <p>Campus departments available for complaint assignment.</p>
                </div>
              </div>

              <div className="department-grid">
                {departments.map((department) => (
                  <div className="department-card" key={department.id}>
                    <div className="department-icon">
                      {department.name.charAt(0).toUpperCase()}
                    </div>

                    <h3>{department.name}</h3>

                    <p>{department.description || "Campus department"}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ==================================================
              USERS - ADMIN ONLY
          ================================================== */}
          {activePage === "users" && isAdmin && (
            <section className="panel user-management-panel">
              <div className="panel-header">
                <div>
                  <h2>User Management</h2>

                  <p>Create, edit, search, and manage system users.</p>
                </div>

                <div className="panel-actions">
                  <button className="primary-button" onClick={openAddUserForm}>
                    + Add User
                  </button>

                  <button
                    className="outline-button"
                    onClick={loadUsers}
                    disabled={userLoading}
                  >
                    ↻ Refresh
                  </button>
                </div>
              </div>

              {/* USER SEARCH */}
              <div className="filter-bar user-filter-bar">
                <div className="search-box">
                  <span>⌕</span>

                  <input
                    type="text"
                    placeholder="Search users by name, email, role..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* USER MESSAGE */}
              {userMessage && !showUserForm && (
                <div className="action-message">{userMessage}</div>
              )}

              {/* USER FORM */}
              {showUserForm && (
                <div className="user-form-container">
                  <div className="user-form-header">
                    <div>
                      <h3>{editingUserId ? "Edit User" : "Create New User"}</h3>

                      <p>
                        {editingUserId
                          ? "Update account information and permissions."
                          : "Add a new user to the campus reporting system."}
                      </p>
                    </div>
                  </div>

                  <form
                    className="complaint-form user-form"
                    onSubmit={handleSaveUser}
                  >
                    <div className="form-grid user-form-grid">
                      {/* FULL NAME */}
                      <div className="form-group">
                        <label>Full Name</label>

                        <input
                          type="text"
                          name="fullName"
                          placeholder="Enter full name"
                          value={userForm.fullName}
                          onChange={handleUserFormChange}
                          required
                        />
                      </div>

                      {/* EMAIL */}
                      <div className="form-group">
                        <label>Email</label>

                        <input
                          type="email"
                          name="email"
                          placeholder="user@example.com"
                          value={userForm.email}
                          onChange={handleUserFormChange}
                          required
                        />
                      </div>

                      {/* PASSWORD */}
                      <div className="form-group">
                        <label>
                          Password{" "}
                          {editingUserId && (
                            <small className="optional-label">
                              Leave empty to keep current password
                            </small>
                          )}
                        </label>

                        <input
                          type="password"
                          name="password"
                          placeholder={
                            editingUserId
                              ? "Enter new password"
                              : "Enter password"
                          }
                          value={userForm.password}
                          onChange={handleUserFormChange}
                          required={!editingUserId}
                        />
                      </div>

                      {/* ROLE */}
                      <div className="form-group">
                        <label>Role</label>

                        <select
                          name="roleId"
                          value={userForm.roleId}
                          onChange={handleUserFormChange}
                          required
                        >
                          {roleOptions.map((roleOption) => (
                            <option key={roleOption.id} value={roleOption.id}>
                              {roleOption.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* DEPARTMENT */}
                      <div className="form-group">
                        <label>Department</label>

                        <select
                          name="departmentId"
                          value={userForm.departmentId}
                          onChange={handleUserFormChange}
                        >
                          <option value="">No Department</option>

                          {departments.map((department) => (
                            <option key={department.id} value={department.id}>
                              {department.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {userMessage && (
                      <div className="action-message">{userMessage}</div>
                    )}

                    <div className="form-buttons">
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={cancelUserForm}
                      >
                        Cancel
                      </button>

                      <button type="submit" className="primary-button">
                        {editingUserId ? "Save Changes" : "Create User"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* USERS TABLE */}
              {userLoading ? (
                <div className="empty-state">
                  <div className="empty-icon">◌</div>

                  <h3>Loading users...</h3>

                  <p>Please wait.</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">♙</div>

                  <h3>No users found</h3>

                  <p>
                    {userSearchTerm
                      ? "No users match your search."
                      : "There are no users to display."}
                  </p>
                </div>
              ) : (
                <div className="table-wrapper user-table-wrapper">
                  <table className="user-table">
                    <thead>
                      <tr>
                        <th>ID</th>

                        <th>User</th>

                        <th>Email</th>

                        <th>Role</th>

                        <th>Department</th>

                        <th>Created</th>

                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredUsers.map((selectedUser) => (
                        <tr key={selectedUser.id}>
                          <td>
                            <span className="complaint-id">
                              #{selectedUser.id}
                            </span>
                          </td>

                          <td>
                            <div className="user-name-cell">
                              <div className="user-table-avatar">
                                {selectedUser.fullName
                                  ?.charAt(0)
                                  .toUpperCase() || "U"}
                              </div>

                              <strong>{selectedUser.fullName}</strong>
                            </div>
                          </td>

                          <td>{selectedUser.email}</td>

                          <td>
                            <span
                              className={`badge role-badge role-${selectedUser.roleId}`}
                            >
                              {selectedUser.role?.name ||
                                roleMap[selectedUser.roleId] ||
                                "UNKNOWN"}
                            </span>
                          </td>

                          <td>
                            {selectedUser.department?.name || "No Department"}
                          </td>

                          <td>
                            {selectedUser.createdAt
                              ? new Date(
                                  selectedUser.createdAt,
                                ).toLocaleDateString()
                              : "—"}
                          </td>

                          <td>
                            <div className="user-actions">
                              <button
                                className="edit-button"
                                onClick={() => openEditUserForm(selectedUser)}
                              >
                                Edit
                              </button>

                              <button
                                className="delete-button"
                                onClick={() => handleDeleteUser(selectedUser)}
                                disabled={selectedUser.id === user?.id}
                                title={
                                  selectedUser.id === user?.id
                                    ? "You cannot delete yourself"
                                    : "Delete user"
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* ==================================================
              REPORTS
          ================================================== */}
          {activePage === "reports" && (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Complaint Reports</h2>

                  <p>Overview of complaint activity.</p>
                </div>
              </div>

              <div className="report-grid">
                <div className="report-card">
                  <span>Total</span>

                  <strong>{statistics.total}</strong>

                  <small>All complaints</small>
                </div>

                <div className="report-card">
                  <span>Pending</span>

                  <strong>{statistics.pending}</strong>

                  <small>Awaiting action</small>
                </div>

                <div className="report-card">
                  <span>Assigned</span>

                  <strong>{statistics.assigned}</strong>

                  <small>Assigned departments</small>
                </div>

                <div className="report-card">
                  <span>In Progress</span>

                  <strong>{statistics.inProgress}</strong>

                  <small>Currently being handled</small>
                </div>

                <div className="report-card">
                  <span>Resolved</span>

                  <strong>{statistics.resolved}</strong>

                  <small>Resolved complaints</small>
                </div>

                <div className="report-card">
                  <span>Closed</span>

                  <strong>{statistics.closed}</strong>

                  <small>Completed complaints</small>
                </div>
              </div>
            </section>
          )}

          {/* ==================================================
              PROFILE
          ================================================== */}
          {activePage === "profile" && (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>My Profile</h2>

                  <p>View and manage your account information.</p>
                </div>

                {!profileEditing && (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={startProfileEditing}
                  >
                    ✏️ Edit Profile
                  </button>
                )}
              </div>

              {profileMessage && (
                <div className="action-message">{profileMessage}</div>
              )}

              <div className="profile-card">
                {/* AVATAR */}
                <div className="large-avatar">
                  {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                </div>

                {/* PROFILE INFORMATION */}
                {!profileEditing ? (
                  <div className="profile-info">
                    <div>
                      <span>Full Name</span>

                      <strong>{user?.fullName || "Not available"}</strong>
                    </div>

                    <div>
                      <span>Email</span>

                      <strong>{user?.email || "Not available"}</strong>
                    </div>

                    <div>
                      <span>Role</span>

                      <strong>{role}</strong>
                    </div>

                    <div>
                      <span>Department</span>

                      <strong>
                        {user?.department?.name ||
                          user?.departmentId ||
                          "Not assigned"}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="profile-edit-form">
                    <div className="form-group">
                      <label>Full Name</label>

                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className="form-group">
                      <label>Email</label>

                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        placeholder="Enter your email"
                      />
                    </div>

                    <div className="profile-form-buttons">
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={cancelProfileEditing}
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        className="primary-button"
                        onClick={handleSaveProfile}
                      >
                        💾 Save Changes
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ACCOUNT DETAILS */}
              <div className="profile-extra">
                <div className="profile-extra-card">
                  <span>Account Status</span>

                  <strong className="status-RESOLVED">Active</strong>
                </div>

                <div className="profile-extra-card">
                  <span>Account Role</span>

                  <strong>{role}</strong>
                </div>

                <div className="profile-extra-card">
                  <span>Department</span>

                  <strong>
                    {user?.department?.name ||
                      user?.departmentId ||
                      "Not assigned"}
                  </strong>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

// ======================================================
// COMPLAINT DETAILS COMPONENT
// ======================================================
function ComplaintDetails({
  complaint,
  history,
  comments,
  commentText,
  setCommentText,
  commentsLoading,
  commentSubmitting,
  commentMessage,
  onAddComment,
  loading,
  message,
  onBack,
}) {
  // ====================================================
  // LOADING
  // ====================================================
  if (loading) {
    return (
      <section className="panel">
        <div className="loading-state">
          <div>
            <h3>Loading complaint details...</h3>

            <p>Please wait while the complaint is loaded.</p>
          </div>
        </div>
      </section>
    );
  }

  // ====================================================
  // ERROR
  // ====================================================
  if (message) {
    return (
      <section className="panel">
        <div className="empty-state">
          <div className="empty-icon">!</div>

          <h3>Unable to load complaint</h3>

          <p>{message}</p>

          <button type="button" className="primary-button" onClick={onBack}>
            ← Back to Complaints
          </button>
        </div>
      </section>
    );
  }

  // ====================================================
  // COMPLAINT NOT FOUND
  // ====================================================
  if (!complaint) {
    return (
      <section className="panel">
        <div className="empty-state">
          <div className="empty-icon">▤</div>

          <h3>Complaint not found</h3>

          <p>The requested complaint could not be found.</p>

          <button type="button" className="primary-button" onClick={onBack}>
            ← Back to Complaints
          </button>
        </div>
      </section>
    );
  }

  // ====================================================
  // LOCATION TEXT
  // ====================================================
  const locationText =
    [
      complaint.location?.building,

      complaint.location?.floor ? `Floor ${complaint.location.floor}` : "",

      complaint.location?.room ? `Room ${complaint.location.room}` : "",

      complaint.location?.area,
    ]
      .filter(Boolean)
      .join(" — ") || "Unknown";

  return (
    <div className="complaint-details-page">
      {/* ==================================================
          HEADER
      ================================================== */}
      <section className="page-header">
        <div>
          <button type="button" className="secondary-button" onClick={onBack}>
            ← Back to Complaints
          </button>

          <h1>Complaint Details</h1>

          <p>View complete complaint information and status history.</p>
        </div>
      </section>

      {/* ==================================================
          COMPLAINT INFORMATION
      ================================================== */}
      <section className="details-card">
        <div className="details-header">
          <div>
            <span className="complaint-id">Complaint #{complaint.id}</span>

            <h2>{complaint.title}</h2>
          </div>

          <span className={`badge status-${complaint.status}`}>
            {complaint.status}
          </span>
        </div>

        <div className="details-grid">
          {/* REPORTER */}
          <div className="detail-item">
            <span>Reporter</span>

            <strong>
              {complaint.reporter?.fullName ||
                complaint.reporter?.email ||
                "Unknown"}
            </strong>
          </div>

          {/* EMAIL */}
          <div className="detail-item">
            <span>Email</span>

            <strong>{complaint.reporter?.email || "Unknown"}</strong>
          </div>

          {/* CATEGORY */}
          <div className="detail-item">
            <span>Category</span>

            <strong>{complaint.category?.name || "Unknown"}</strong>
          </div>

          {/* PRIORITY */}
          <div className="detail-item">
            <span>Priority</span>

            <strong>
              <span className={`badge priority-${complaint.priority}`}>
                {complaint.priority}
              </span>
            </strong>
          </div>

          {/* DEPARTMENT */}
          <div className="detail-item">
            <span>Department</span>

            <strong>{complaint.department?.name || "Not assigned"}</strong>
          </div>

          {/* LOCATION */}
          <div className="detail-item">
            <span>Location</span>

            <strong>{locationText}</strong>
          </div>

          {/* CREATED */}
          <div className="detail-item">
            <span>Created</span>

            <strong>
              {complaint.createdAt
                ? new Date(complaint.createdAt).toLocaleString()
                : "Unknown"}
            </strong>
          </div>

          {/* UPDATED */}
          <div className="detail-item">
            <span>Last Updated</span>

            <strong>
              {complaint.updatedAt
                ? new Date(complaint.updatedAt).toLocaleString()
                : "Unknown"}
            </strong>
          </div>
        </div>

        {/* DESCRIPTION */}
        <div className="description-section">
          <h3>Description</h3>

          <p>{complaint.description}</p>
        </div>
      </section>

      {/* ==================================================
          STATUS HISTORY
      ================================================== */}
      <section className="details-card">
        <div className="section-heading">
          <div>
            <h2>Status History</h2>

            <p>Complete history of changes made to this complaint.</p>
          </div>
        </div>

        {!history || history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◷</div>

            <h3>No status history</h3>

            <p>No status changes have been recorded yet.</p>
          </div>
        ) : (
          <div className="status-timeline">
            {history.map((item, index) => (
              <div className="timeline-item" key={item.id}>
                <div className="timeline-marker">{index + 1}</div>

                <div className="timeline-content">
                  <div className="timeline-top">
                    <span className={`badge status-${item.newStatus}`}>
                      {item.newStatus}
                    </span>

                    <span className="timeline-date">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : ""}
                    </span>
                  </div>

                  <p>
                    {item.oldStatus
                      ? `${item.oldStatus} → ${item.newStatus}`
                      : `Complaint created with status ${item.newStatus}`}
                  </p>

                  <small>
                    Changed by:{" "}
                    <strong>
                      {item.changedBy?.fullName ||
                        item.changedBy?.email ||
                        "Unknown"}
                    </strong>
                  </small>

                  {item.note && (
                    <div className="timeline-note">
                      <strong>Note:</strong> {item.note}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ==================================================
          COMMENTS
      ================================================== */}
      <section className="details-comments-card">
        {/* COMMENTS HEADER */}
        <div className="section-heading">
          <div>
            <h2>Comments</h2>

            <p>Communicate with the people handling this complaint.</p>
          </div>
        </div>

        {/* ==================================================
            COMMENTS LIST
        ================================================== */}
        {commentsLoading ? (
          <div className="comments-loading">Loading comments...</div>
        ) : !comments || comments.length === 0 ? (
          <div className="comments-empty">
            <div className="comments-empty-icon">💬</div>

            <strong>No comments yet</strong>

            <span>Start the conversation by adding a comment below.</span>
          </div>
        ) : (
          <div className="comments-list">
            {comments.map((item) => (
              <div className="comment-item" key={item.id}>
                {/* AVATAR */}
                <div className="comment-avatar">
                  {(item.user?.fullName || "U").charAt(0).toUpperCase()}
                </div>

                {/* COMMENT BODY */}
                <div className="comment-body">
                  <div className="comment-header">
                    <div>
                      <strong>
                        {item.user?.fullName ||
                          item.user?.email ||
                          "Unknown User"}
                      </strong>

                      {item.user?.role?.name && (
                        <span className="comment-role">
                          {item.user.role.name.replaceAll("_", " ")}
                        </span>
                      )}
                    </div>

                    <small>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : ""}
                    </small>
                  </div>

                  <p>{item.comment}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ==================================================
            ADD COMMENT FORM
        ================================================== */}
        <div className="comment-form">
          <textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder="Write a comment..."
            rows="4"
            maxLength={2000}
            disabled={commentSubmitting}
          />

          <div className="comment-form-footer">
            <span>
              {commentText.length}
              /2000
            </span>

            <button
              type="button"
              className="primary-button"
              onClick={onAddComment}
              disabled={commentSubmitting || !commentText.trim()}
            >
              {commentSubmitting ? "Sending..." : "Send Comment"}
            </button>
          </div>

          {commentMessage && (
            <div className="comment-message">{commentMessage}</div>
          )}
        </div>
      </section>
    </div>
  );
}

// ======================================================
// COMPLAINT TABLE
// ======================================================
function ComplaintTable({ complaints, onViewDetails }) {
  if (!complaints || complaints.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">▤</div>

        <h3>No complaints found</h3>

        <p>There are no complaints to display.</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>ID</th>

            <th>Complaint</th>

            <th>Priority</th>

            <th>Status</th>

            <th>Department</th>

            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {complaints.map((complaint) => (
            <tr key={complaint.id}>
              <td>
                <span className="complaint-id">#{complaint.id}</span>
              </td>

              <td>
                <div className="complaint-title">
                  <strong>{complaint.title}</strong>

                  <small>{complaint.description}</small>
                </div>
              </td>

              <td>
                <span className={`badge priority-${complaint.priority}`}>
                  {complaint.priority}
                </span>
              </td>

              <td>
                <span className={`badge status-${complaint.status}`}>
                  {complaint.status}
                </span>
              </td>

              <td>{complaint.department?.name || "Not assigned"}</td>

              <td>
                <button
                  type="button"
                  className="small-button"
                  onClick={() => onViewDetails(complaint.id)}
                >
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ======================================================
// MANAGEMENT TABLE
// ======================================================
function ManagementTable({
  complaints,
  isStaff,
  isOfficer,
  isAdmin,
  departments,
  selectedDepartments,
  setSelectedDepartments,
  selectedStatuses,
  setSelectedStatuses,
  handleAssignComplaint,
  handleUpdateStatus,
  onViewDetails,
}) {
  // ====================================================
  // ROLE-BASED STATUS OPTIONS
  // ====================================================
  const getAllowedStatuses = () => {
    if (isOfficer) {
      return ["IN_PROGRESS", "RESOLVED", "REJECTED"];
    }

    if (isStaff) {
      return [
        "REVIEWED",
        "ASSIGNED",
        "IN_PROGRESS",
        "RESOLVED",
        "CLOSED",
        "REJECTED",
      ];
    }

    if (isAdmin) {
      return [
        "PENDING",
        "REVIEWED",
        "ASSIGNED",
        "IN_PROGRESS",
        "RESOLVED",
        "CLOSED",
        "REJECTED",
      ];
    }

    return [];
  };

  const allowedStatuses = getAllowedStatuses();

  // ====================================================
  // EMPTY STATE
  // ====================================================
  if (!complaints || complaints.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">▤</div>

        <h3>No complaints found</h3>

        <p>There are no complaints matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper management-table">
      <table>
        <thead>
          <tr>
            <th>ID</th>

            <th>Complaint</th>

            <th>Reporter</th>

            <th>Category</th>

            <th>Priority</th>

            <th>Status</th>

            <th>Department</th>

            {(isStaff || isAdmin) && <th>Assign</th>}

            <th>Update Status</th>

            <th>Details</th>
          </tr>
        </thead>

        <tbody>
          {complaints.map((complaint) => {
            const isFinalStatus =
              complaint.status === "CLOSED" || complaint.status === "REJECTED";

            return (
              <tr key={complaint.id}>
                {/* ID */}
                <td>
                  <span className="complaint-id">#{complaint.id}</span>
                </td>

                {/* COMPLAINT */}
                <td>
                  <div className="complaint-title">
                    <strong>{complaint.title}</strong>

                    <small>{complaint.description}</small>
                  </div>
                </td>

                {/* REPORTER */}
                <td>
                  {complaint.reporter?.fullName ||
                    complaint.reporter?.email ||
                    "Unknown"}
                </td>

                {/* CATEGORY */}
                <td>{complaint.category?.name || "Unknown"}</td>

                {/* PRIORITY */}
                <td>
                  <span className={`badge priority-${complaint.priority}`}>
                    {complaint.priority}
                  </span>
                </td>

                {/* STATUS */}
                <td>
                  <span className={`badge status-${complaint.status}`}>
                    {complaint.status}
                  </span>
                </td>

                {/* DEPARTMENT */}
                <td>{complaint.department?.name || "Not assigned"}</td>

                {/* ASSIGN */}
                {(isStaff || isAdmin) && (
                  <td>
                    <div className="table-action">
                      <select
                        value={
                          selectedDepartments[complaint.id] ||
                          complaint.departmentId ||
                          ""
                        }
                        onChange={(e) =>
                          setSelectedDepartments((previous) => ({
                            ...previous,

                            [complaint.id]: e.target.value,
                          }))
                        }
                        disabled={isFinalStatus}
                      >
                        <option value="">Select Department</option>

                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        className="small-button"
                        onClick={() => handleAssignComplaint(complaint.id)}
                        disabled={isFinalStatus}
                      >
                        Assign
                      </button>
                    </div>
                  </td>
                )}

                {/* STATUS UPDATE */}
                <td>
                  <div className="table-action">
                    <select
                      value={selectedStatuses[complaint.id] || complaint.status}
                      onChange={(e) =>
                        setSelectedStatuses((previous) => ({
                          ...previous,

                          [complaint.id]: e.target.value,
                        }))
                      }
                      disabled={isFinalStatus}
                    >
                      <option value={complaint.status}>
                        Current: {complaint.status}
                      </option>

                      {allowedStatuses
                        .filter((status) => status !== complaint.status)
                        .map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                    </select>

                    <button
                      type="button"
                      className="small-button"
                      onClick={() => handleUpdateStatus(complaint.id)}
                      disabled={isFinalStatus}
                    >
                      Update
                    </button>
                  </div>
                </td>

                {/* DETAILS */}
                <td>
                  <button
                    type="button"
                    className="small-button"
                    onClick={() => onViewDetails(complaint.id)}
                  >
                    View
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default App;
