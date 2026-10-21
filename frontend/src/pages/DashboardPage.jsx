import { useEffect, useState } from "react";
import { api } from "../api";
import { useApp } from "../AppContext";
import {
  IconList,
  IconCheck,
  IconClock,
  IconReopen,
} from "../components/Icons";

// ============================================================
// DASHBOARD PAGE — stats cards + status/priority charts,
// driven by the real /complaints/stats endpoint.
// ============================================================
function DashboardPage() {
  const { user, isStudent, role, complaints, loadComplaintDetails, navigate } =
    useApp();

  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const data = await api.get("/complaints/stats");

        if (!cancelled) {
          setStats(data.stats);
        }
      } catch (error) {
        if (!cancelled) {
          setStatsError(error.message || "Unable to load statistics.");
        }
      }
    };

    loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  const counts = stats?.counts || {};

  const statusData = [
    { label: "Pending", value: counts.PENDING || 0, color: "#f59e0b" },
    { label: "Reviewed", value: counts.REVIEWED || 0, color: "#8b5cf6" },
    { label: "Assigned", value: counts.ASSIGNED || 0, color: "#3b82f6" },
    { label: "In Progress", value: counts.IN_PROGRESS || 0, color: "#06b6d4" },
    { label: "Resolved", value: counts.RESOLVED || 0, color: "#22c55e" },
    { label: "Closed", value: counts.CLOSED || 0, color: "#64748b" },
    { label: "Rejected", value: counts.REJECTED || 0, color: "#ef4444" },
    { label: "Reopened", value: counts.REOPENED || 0, color: "#e879f9" },
  ];

  const total = stats?.total || 0;

  return (
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
            onClick={() => navigate("/new-complaint")}
          >
            + New Complaint
          </button>
        )}
      </section>

      {/* STATISTICS */}
      <section className="stats-grid">
        <div className="stat-box">
          <div className="stat-icon blue">
            <IconList />
          </div>

          <div>
            <span>Total Complaints</span>

            <strong>{total}</strong>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon orange">
            <IconClock />
          </div>

          <div>
            <span>Pending</span>

            <strong>{counts.PENDING || 0}</strong>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon purple">
            <IconReopen />
          </div>

          <div>
            <span>In Progress</span>

            <strong>
              {(counts.IN_PROGRESS || 0) + (counts.REOPENED || 0)}
            </strong>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon green">
            <IconCheck />
          </div>

          <div>
            <span>Resolved</span>

            <strong>{counts.RESOLVED || 0}</strong>
          </div>
        </div>
      </section>

      {statsError && <div className="action-message">{statsError}</div>}

      {/* CHARTS */}
      <div className="charts-row">
        <section className="panel chart-panel">
          <div className="panel-header">
            <div>
              <h2>Status Breakdown</h2>

              <p>Complaints by current status.</p>
            </div>
          </div>

          <StatusBars data={statusData} total={total} />
        </section>

        <section className="panel chart-panel">
          <div className="panel-header">
            <div>
              <h2>Progress Share</h2>

              <p>Resolved vs. everything else.</p>
            </div>
          </div>

          <DonutChart
            resolved={counts.RESOLVED || 0}
            closed={counts.CLOSED || 0}
            other={Math.max(
              0,
              total - (counts.RESOLVED || 0) - (counts.CLOSED || 0),
            )}
          />
        </section>
      </div>

      {/* RECENT COMPLAINTS */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Recent Complaints</h2>

            <p>Latest campus complaints</p>
          </div>

          <button
            className="outline-button"
            onClick={() => navigate("/complaints")}
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
  );
}

// ============================================================
// SIMPLE CSS-BASED BAR CHART (no chart library needed)
// ============================================================
function StatusBars({ data, total }) {
  const max = Math.max(1, ...data.map((item) => item.value));

  return (
    <div className="chart-bars">
      {data.map((item) => (
        <div className="chart-bar-row" key={item.label}>
          <span className="chart-bar-label">{item.label}</span>

          <div className="chart-bar-track">
            <div
              className="chart-bar-fill"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color,
              }}
            />
          </div>

          <span className="chart-bar-value">{item.value}</span>
        </div>
      ))}

      <small className="chart-total">
        {total} complaint{total !== 1 ? "s" : ""} in total
      </small>
    </div>
  );
}

// ============================================================
// SIMPLE CSS DONUT CHART (conic-gradient)
// ============================================================
function DonutChart({ resolved, closed, other }) {
  const total = resolved + closed + other;

  const resolvedPct = total ? (resolved / total) * 100 : 0;
  const closedPct = total ? (closed / total) * 100 : 0;

  const gradient =
    total === 0
      ? "conic-gradient(#e2e8f0 0% 100%)"
      : `conic-gradient(#22c55e 0% ${resolvedPct}%, #64748b ${resolvedPct}% ${
          resolvedPct + closedPct
        }%, #f59e0b ${resolvedPct + closedPct}% 100%)`;

  return (
    <div className="donut-wrapper">
      <div className="donut" style={{ background: gradient }}>
        <div className="donut-hole">
          <strong>{total}</strong>

          <span>total</span>
        </div>
      </div>

      <div className="donut-legend">
        <div>
          <i style={{ backgroundColor: "#22c55e" }} /> Resolved ({resolved})
        </div>

        <div>
          <i style={{ backgroundColor: "#64748b" }} /> Closed ({closed})
        </div>

        <div>
          <i style={{ backgroundColor: "#f59e0b" }} /> In progress ({other})
        </div>
      </div>
    </div>
  );
}

// ======================================================
// COMPLAINT TABLE (shared)
// ======================================================
function ComplaintTable({ complaints, onViewDetails }) {
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

export { ComplaintTable };

export default DashboardPage;
