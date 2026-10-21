import { useState } from "react";
import { useApp } from "../AppContext";
import { ComplaintTable } from "./DashboardPage";
import {
  IconList,
  IconCheck,
  IconReopen,
  IconEye,
  IconRefresh,
  IconSearch,
  IconPlus,
} from "../components/Icons";

// Which status can follow another status. Mirrors the backend
// ALLOWED_TRANSITIONS map so the dropdown only offers valid moves.
const ALLOWED_TRANSITIONS = {
  PENDING: ["REVIEWED", "ASSIGNED", "REJECTED"],
  REVIEWED: ["ASSIGNED", "REJECTED"],
  ASSIGNED: ["IN_PROGRESS", "REJECTED"],
  IN_PROGRESS: ["RESOLVED", "REJECTED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
  REJECTED: [],
  REOPENED: ["IN_PROGRESS", "REJECTED"],
};

// Which roles may perform each transition. Mirrors the backend rules.
const TRANSITION_ROLES = {
  REVIEWED: ["STAFF", "ADMINISTRATOR"],
  ASSIGNED: ["STAFF", "ADMINISTRATOR"],
  IN_PROGRESS: ["STAFF", "DEPARTMENT_OFFICER", "ADMINISTRATOR"],
  RESOLVED: ["STAFF", "DEPARTMENT_OFFICER", "ADMINISTRATOR"],
  CLOSED: ["STAFF", "ADMINISTRATOR"],
  REJECTED: ["STAFF", "DEPARTMENT_OFFICER", "ADMINISTRATOR"],
};

const statusOptions = [
  "PENDING",
  "REVIEWED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
  "REOPENED",
];

// ============================================================
// COMPLAINTS PAGE — list, filters, staff actions and the
// student Confirm / Reopen workflow.
// ============================================================
function ComplaintsPage() {
  const {
    isStudent,
    isStaff,
    isOfficer,
    isAdmin,
    complaints,
    complaintLoading,
    loadComplaints,
    loadComplaintDetails,
    departments,
    selectedDepartments,
    setSelectedDepartments,
    selectedStatuses,
    setSelectedStatuses,
    handleAssignComplaint,
    handleUpdateStatus,
    handleConfirmComplaint,
    handleReopenComplaint,
    actionMessage,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    navigate,
  } = useApp();

  const [reopenTarget, setReopenTarget] = useState(null);
  const [reopenReason, setReopenReason] = useState("");

  const filteredComplaints = complaints.filter((complaint) => {
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

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{isStudent ? "My Complaints" : "Complaint Management"}</h2>

          <p>Search and manage campus complaints.</p>
        </div>

        <div className="panel-actions">
          {isStudent && (
            <button
              className="primary-button"
              onClick={() => navigate("/new-complaint")}
            >
              <IconPlus /> New Complaint
            </button>
          )}

          <button
            type="button"
            className="outline-button"
            onClick={loadComplaints}
            disabled={complaintLoading}
          >
            {complaintLoading ? (
              <>
                <IconRefresh /> Refreshing...
              </>
            ) : (
              <>
                <IconRefresh /> Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="filter-bar">
        <div className="search-box">
          <IconSearch />

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
        <StudentComplaintTable
          complaints={filteredComplaints}
          onViewDetails={loadComplaintDetails}
          onConfirm={handleConfirmComplaint}
          onReopen={(complaint) => {
            setReopenTarget(complaint);
            setReopenReason("");
          }}
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

      {actionMessage && <div className="action-message">{actionMessage}</div>}

      {/* REOPEN MODAL */}
      {reopenTarget && (
        <div className="modal-backdrop" onClick={() => setReopenTarget(null)}>
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Reopen Complaint #{reopenTarget.id}</h3>

            <p>
              Tell the department what was not fixed so they can work on it
              again.
            </p>

            <textarea
              rows={4}
              maxLength={1000}
              placeholder="Example: The electricity came back but went off again the next day."
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
            />

            <div className="form-buttons">
              <button
                type="button"
                className="cancel-button"
                onClick={() => setReopenTarget(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                disabled={reopenReason.trim().length < 10}
                onClick={async () => {
                  const ok = await handleReopenComplaint(
                    reopenTarget.id,
                    reopenReason.trim(),
                  );

                  if (ok) {
                    setReopenTarget(null);
                  }
                }}
              >
                Reopen Complaint
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ============================================================
// STUDENT TABLE with Confirm / Reopen actions
// ============================================================
function StudentComplaintTable({
  complaints,
  onViewDetails,
  onConfirm,
  onReopen,
}) {
  if (!complaints || complaints.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <IconList />
        </div>

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
                <div className="table-action">
                  <button
                    type="button"
                    className="small-button"
                    onClick={() => onViewDetails(complaint.id)}
                  >
                    <IconEye /> View
                  </button>

                  {complaint.status === "RESOLVED" && (
                    <>
                      <button
                        type="button"
                        className="small-button confirm-button"
                        onClick={() => onConfirm(complaint.id)}
                      >
                        <IconCheck /> Confirm Fixed
                      </button>

                      <button
                        type="button"
                        className="small-button reopen-button"
                        onClick={() => onReopen(complaint)}
                      >
                        <IconReopen /> Reopen
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// MANAGEMENT TABLE (staff / officers / admins)
// ============================================================
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
  const role = isOfficer
    ? "DEPARTMENT_OFFICER"
    : isStaff
      ? "STAFF"
      : isAdmin
        ? "ADMINISTRATOR"
        : "";

  // Only statuses that are both a valid transition from the
  // current status AND permitted for this role.
  const getAllowedStatuses = (currentStatus) => {
    if (!role) {
      return [];
    }

    const transitions = ALLOWED_TRANSITIONS[currentStatus] || [];

    return transitions.filter((status) =>
      (TRANSITION_ROLES[status] || []).includes(role),
    );
  };

  if (!complaints || complaints.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <IconList />
        </div>

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

            const allowedStatuses = getAllowedStatuses(complaint.status);

            return (
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
                  {complaint.reporter?.fullName ||
                    complaint.reporter?.email ||
                    "Unknown"}
                </td>

                <td>{complaint.category?.name || "Unknown"}</td>

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
                      disabled={isFinalStatus || allowedStatuses.length === 0}
                    >
                      <option value={complaint.status}>
                        Current: {complaint.status}
                      </option>

                      {allowedStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="small-button"
                      onClick={() => handleUpdateStatus(complaint.id)}
                      disabled={isFinalStatus || allowedStatuses.length === 0}
                    >
                      Update
                    </button>
                  </div>
                </td>

                <td>
                  <button
                    type="button"
                    className="small-button"
                    onClick={() => onViewDetails(complaint.id)}
                  >
                    <IconEye /> View
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

export default ComplaintsPage;
