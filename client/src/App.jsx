

import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api/work-items";

function displayTask(item) {
  const format = (value) =>
    value
      ? value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ")
      : value;

  return {
    ...item,
    priority: format(item.priority),
    status: format(item.status),
    assignee: item.assignee || "Unassigned",
  };
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [apiMessage, setApiMessage] = useState("Loading tasks...");
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("Medium");
  const [loading, setLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [activities, setActivities] = useState([]);

  async function loadTasks() {
    try {
      const response = await fetch(API);
      if (!response.ok) throw new Error("Could not load tasks");

      const data = await response.json();
      setTasks(data.map(displayTask));
      setApiMessage("Connected to database");
    } catch (error) {
      setApiMessage("Backend connection failed");
      console.error(error);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus =
      filter === "All" || task.status === filter;

    const matchesPriority =
      priorityFilter === "All" ||
      task.priority.toLowerCase() === priorityFilter.toLowerCase();

    const matchesSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      String(task.id).includes(search);

    return matchesStatus && matchesPriority && matchesSearch;
  });
  async function createTask(event) {
    event.preventDefault();
    if (!newTitle.trim() || loading) return;

    setLoading(true);

    try {
      const response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          priority: newPriority.toUpperCase(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create task");
      }

      setTasks((current) => [displayTask(data), ...current]);
      setNewTitle("");
      setNewPriority("Medium");
      setApiMessage("Task saved to database");
    } catch (error) {
      setApiMessage(error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  }


async function viewActivity(id) {
  try {
    setSelectedTaskId(id);
    setActivities([]);

    const response = await fetch(`${API}/${id}/activity`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to load activity");
    }

    setActivities(data);
  } catch (error) {
    setApiMessage(error.message);
    console.error(error);
  }
}

async function deleteTask(id) {
  const confirmed = window.confirm(
    "Are you sure you want to delete this task?"
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`${API}/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to delete task");
    }

    setTasks((current) => current.filter((task) => task.id !== id));

    if (selectedTaskId === id) {
      setSelectedTaskId(null);
      setActivities([]);
    }

    setApiMessage("Task deleted successfully");
  } catch (error) {
    setApiMessage(error.message);
    console.error(error);
  }
}
async function claimTask(id) {
  try {
    const response = await fetch(`${API}/${id}/claim`, {
      method: "PATCH",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to claim task");
    }

    setTasks((current) =>
      current.map((task) =>
        task.id === id ? displayTask(data) : task
      )
    );

    setApiMessage("Task claimed and saved");
  } catch (error) {
    setApiMessage(error.message);
    console.error(error);
    await loadTasks();
  }
}


  
async function changeStatus(id, status) {
  try {
    const response = await fetch(`${API}/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: status.toUpperCase() }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to update status");
    }

    setTasks((current) =>
      current.map((task) =>
        task.id === id ? displayTask(data) : task
      )
    );

    setApiMessage("Status updated and saved");
  } catch (error) {
    setApiMessage(error.message);
    console.error(error);
    await loadTasks();
  }
}


  return (
    <main className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">NEWTONITE · OPERATIONS CENTER</p>
          <h1>Work Items</h1>
          <p className="subtitle">
            Create, assign, track and resolve team operations.
          </p>
        </div>
        <div className="user-badge" title="Logged in user">A</div>
      </header>

      <div className="api-status">
        <span className="status-dot" />
        {apiMessage}
      </div>

      <section className="stats">
        <article className="stat-card">
          <span>Total items</span>
          <strong>{tasks.length}</strong>
        </article>
        <article className="stat-card">
          <span>Open items</span>
          <strong>{tasks.filter((task) => task.status === "Open").length}</strong>
        </article>
        <article className="stat-card">
          <span>Urgent items</span>
          <strong>{tasks.filter((task) => task.priority === "Urgent").length}</strong>
        </article>
      </section>

      <section className="task-section">
        <div className="section-heading">
          <div>
            <h2>Team work queue</h2>
            <p>Review and manage operational tasks.</p>
          </div>

          <select
            aria-label="Filter tasks by status"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="All">All statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Awaiting Approval">Awaiting Approval</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        <form className="create-form" onSubmit={createTask}>
          <input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="Enter a new work item title..."
            aria-label="New work item title"
            required
          />

          <select
            value={newPriority}
            onChange={(event) => setNewPriority(event.target.value)}
            aria-label="New task priority"
          >
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : "+ Create item"}
          </button>
        </form>

        <div className="task-filters">
          <input
            type="text"
            placeholder="Search tasks by title or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="All">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
        <div className="task-list">
          {filteredTasks.map((task) => (
            <article className="task-card" key={task.id}>
              <div className="task-info">
                <h3>{task.title}</h3>
                <div className="task-tags">
                  <span className={`priority ${task.priority.toLowerCase()}`}>
                    {task.priority}
                  </span>
                  <span className="status">{task.status}</span>
                </div>
                <small>Assignee: {task.assignee}</small>
              </div>

              <div className="task-actions">
                {task.assignee === "Unassigned" && (
                  <button type="button" onClick={() => claimTask(task.id)}>
                    Claim
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteTask(task.id)}
                  style={{ backgroundColor: "#c62828" }}
                >
                  Delete
                </button>
                <select
                  aria-label={`Change status for ${task.title}`}
                  value={task.status}
                  onChange={(event) => changeStatus(task.id, event.target.value)}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Awaiting Approval">Awaiting Approval</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
                <button
                  type="button"
                  onClick={() => viewActivity(task.id)}
                >
                  View Activity
                </button>
              </div>
            </article>
          ))}

          {filteredTasks.length === 0 && (
            <p className="empty-state">No items found for this status.</p>
          )}
        </div>
        
      {selectedTaskId !== null && (
        <div className="activity-panel">
          <h2>Activity History — Task #{selectedTaskId}</h2>

          <button
            type="button"
            onClick={() => setSelectedTaskId(null)}
          >
            Close History
          </button>

          {activities.length === 0 ? (
            <p>No activity recorded for this task yet.</p>
          ) : (
            activities.map((activity) => (
              <article className="task-card" key={activity.id}>
                <div>
                  <h3>{activity.action.replaceAll("_", " ")}</h3>
                  <p>{activity.details}</p>
                  <small>
                    {new Date(activity.createdAt).toLocaleString()}
                  </small>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      </section>

      <footer className="footer">
        Newtonite Operations · Development preview
      </footer>
    </main>
  );
}

export default App;
