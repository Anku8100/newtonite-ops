
import { Router } from "express";
import { prisma } from "../db.js";
import { authorizeRoles } from "../middleware/auth.js";

const router = Router();

function canAccessWorkItem(user, item) {
  if (user.role === "ADMIN") {
    return true;
  }

  return (
    user.teamId != null &&
    item.teamId === user.teamId
  );
}
async function recordActivity(workItemId, action, details) {
  return prisma.activity.create({
    data: {
      workItemId,
      action,
      details,
    },
  });
}



router.get("/", async (req, res) => {
  try {
    let where = {};

    // Admin can view all work items
    if (req.user.role !== "ADMIN") {
      if (!req.user.teamId) {
        return res.status(403).json({
          error: "You are not assigned to a team",
        });
      }

      where = {
        teamId: req.user.teamId,
      };
    }

    const items = await prisma.workItem.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(items);
  } catch (error) {
    console.error("Fetch work items error:", error);

    return res.status(500).json({
      error: "Failed to fetch work items",
    });
  }
});



router.post(
  "/",
  authorizeRoles("ADMIN", "LEAD", "MEMBER"),
  async (req, res) => {
    try {
      const { title, description, priority, teamId } = req.body;

      if (!title || typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
          error: "Title is required",
        });
      }

      const allowedPriorities = ["URGENT", "HIGH", "MEDIUM", "LOW"];
      const selectedPriority = (priority || "MEDIUM").toUpperCase();

      if (!allowedPriorities.includes(selectedPriority)) {
        return res.status(400).json({
          error: "Invalid priority",
        });
      }

      let assignedTeamId = null;

      if (req.user.role === "ADMIN") {
        if (teamId !== undefined && teamId !== null) {
          const parsedTeamId = Number(teamId);

          if (!Number.isSafeInteger(parsedTeamId) || parsedTeamId <= 0) {
            return res.status(400).json({
              error: "Invalid team ID",
            });
          }

          const team = await prisma.team.findUnique({
            where: { id: parsedTeamId },
          });

          if (!team) {
            return res.status(400).json({
              error: "Team not found",
            });
          }

          assignedTeamId = team.id;
        }
      } else {
        if (!req.user.teamId) {
          return res.status(403).json({
            error: "You are not assigned to a team",
          });
        }

        if (
          teamId !== undefined &&
          Number(teamId) !== req.user.teamId
        ) {
          return res.status(403).json({
            error: "You can only create tasks for your own team",
          });
        }

        assignedTeamId = req.user.teamId;
      }

      const item = await prisma.$transaction(async (tx) => {
        const createdItem = await tx.workItem.create({
          data: {
            title: title.trim(),
            description:
              typeof description === "string" && description.trim()
                ? description.trim()
                : null,
            priority: selectedPriority,
            assignee: "Unassigned",
            teamId: assignedTeamId,
          },
        });

        await tx.activity.create({
          data: {
            workItemId: createdItem.id,
            action: "CREATED",
            details: `Work item created by ${req.user.name}`,
          },
        });

        return createdItem;
      });

      return res.status(201).json(item);
    } catch (error) {
      console.error("Create work item error:", error);

      return res.status(500).json({
        error: "Failed to create work item",
      });
    }
  }
);


// Claim a work item


router.patch(
  "/:id/claim",
  authorizeRoles("ADMIN", "LEAD", "MEMBER"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid task ID" });
      }
      const existing = await prisma.workItem.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({
          error: "Task not found",
        });
      }

      if (!canAccessWorkItem(req.user, existing)) {
        return res.status(403).json({
          error: "You cannot access this team's task",
        });
      }

      const claimed = await prisma.$transaction(async (tx) => {
        const result = await tx.workItem.updateMany({
          where: {
            id,
            assignee: "Unassigned",
          },
          data: {
            assignee: req.user.name,
            version: { increment: 1 },
          },
        });

        if (result.count === 0) {
          return null;
        }

        const item = await tx.workItem.findUnique({
          where: { id },
        });

        await tx.activity.create({
          data: {
            workItemId: id,
            action: "CLAIMED",
            details: `Work item claimed by ${req.user.name}`,
          },
        });

        return item;
      });

      if (!claimed) {
        const existing = await prisma.workItem.findUnique({
          where: { id },
        });

        if (!existing) {
          return res.status(404).json({
            error: "Task not found",
          });
        }

        return res.status(409).json({
          error: "Task has already been claimed",
        });
      }

      return res.json(claimed);
    } catch (error) {
      console.error("Claim error:", error);

      return res.status(500).json({
        error: "Failed to claim task",
      });
    }
  }
);


// Update work item status


router.patch(
  "/:id/status",
  authorizeRoles("ADMIN", "LEAD", "MEMBER"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status, expectedVersion } = req.body ?? {};

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid work item ID" });
      }

      if (typeof status !== "string") {
        return res.status(400).json({ error: "Invalid status" });
      }

      if (
        !Number.isSafeInteger(expectedVersion) ||
        expectedVersion < 1
      ) {
        return res.status(400).json({
          error: "A valid expectedVersion is required",
        });
      }

      const nextStatus = status.trim().toUpperCase();
      const allowedStatuses = [
        "OPEN",
        "IN PROGRESS",
        "AWAITING APPROVAL",
        "RESOLVED",
        "CLOSED",
      ];

      if (!allowedStatuses.includes(nextStatus)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const existing = await prisma.workItem.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({ error: "Work item not found" });
      }

      if (!canAccessWorkItem(req.user, existing)) {
        return res.status(403).json({
          error: "You cannot update this team's task",
        });
      }

      if (existing.version !== expectedVersion) {
        return res.status(409).json({
          error: "Work item has changed. Refresh and try again.",
          currentVersion: existing.version,
        });
      }

      const role = req.user.role;

      if (
        ["RESOLVED", "CLOSED"].includes(nextStatus) &&
        !["ADMIN", "LEAD"].includes(role)
      ) {
        return res.status(403).json({
          error: "Only a Lead or Admin can approve or close work items",
        });
      }

      const transitions = {
        OPEN: ["IN PROGRESS"],
        "IN PROGRESS": ["AWAITING APPROVAL"],
        "AWAITING APPROVAL": ["RESOLVED"],
        RESOLVED: ["CLOSED"],
        CLOSED: [],
      };

      if (!transitions[existing.status]?.includes(nextStatus)) {
        return res.status(409).json({
          error: `Cannot change status from ${existing.status} to ${nextStatus}`,
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Atomic check prevents concurrent requests from overwriting
        // a newer version of the same work item.
        const update = await tx.workItem.updateMany({
          where: {
            id,
            version: expectedVersion,
            status: existing.status,
          },
          data: {
            status: nextStatus,
            version: { increment: 1 },
          },
        });

        if (update.count === 0) {
          return null;
        }

        const item = await tx.workItem.findUnique({
          where: { id },
        });

        await tx.activity.create({
          data: {
            workItemId: id,
            action: "STATUS_CHANGED",
            details: `Status changed from ${existing.status} to ${nextStatus} by ${req.user.name}`,
          },
        });

        return item;
      });

      if (!result) {
        return res.status(409).json({
          error: "Work item has changed. Refresh and try again.",
        });
      }

      return res.json(result);
    } catch (error) {
      console.error("Status update error:", error);
      return res.status(500).json({
        error: "Failed to update status",
      });
    }
  }
);


router.get("/:id/activity", async (req, res) => {
  try {
    const workItemId = Number(req.params.id);

    if (!Number.isInteger(workItemId) || workItemId <= 0) {
      return res.status(400).json({ error: "Invalid work item ID" });
    }
    const item = await prisma.workItem.findUnique({
      where: { id: workItemId },
    });

    if (!item) {
      return res.status(404).json({
        error: "Work item not found",
      });
    }

    if (!canAccessWorkItem(req.user, item)) {
      return res.status(403).json({
        error: "You cannot access this team's activity",
      });
    }
    const activities = await prisma.activity.findMany({
      where: { workItemId },
      orderBy: { createdAt: "desc" },
    });

    res.json(activities);
  } catch (error) {
    console.error("Activity history error:", error);
    res.status(500).json({ error: "Failed to fetch activity history" });
  }
});
router.delete("/:id", authorizeRoles("ADMIN"), async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid task ID" });
    }

    const item = await prisma.workItem.findUnique({
      where: { id },
    });

    if (!item) {
      return res.status(404).json({ error: "Task not found" });
    }

    await prisma.$transaction([
      prisma.activity.deleteMany({
        where: { workItemId: id },
      }),
      prisma.workItem.delete({
        where: { id },
      }),
    ]);

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});




export default router;
