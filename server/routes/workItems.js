
import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();


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
    const items = await prisma.workItem.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch work items" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, description, priority } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const allowedPriorities = ["URGENT", "HIGH", "MEDIUM", "LOW"];
    const selectedPriority = (priority || "MEDIUM").toUpperCase();

    if (!allowedPriorities.includes(selectedPriority)) {
      return res.status(400).json({ error: "Invalid priority" });
    }

    const item = await prisma.workItem.create({
      data: {
        title: title.trim(),
        description: description || null,
        priority: selectedPriority,
        assignee: "Unassigned",
      },
    });
    await recordActivity(item.id, "CREATED", "Work item created");
    res.status(201).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create work item" });
  }
});

// Claim a work item

router.patch("/:id/claim", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid task ID" });
    }

    const claimed = await prisma.$transaction(async (tx) => {
      const result = await tx.workItem.updateMany({
        where: {
          id,
          assignee: "Unassigned",
        },
        data: {
          assignee: "Anku",
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
          details: "Work item claimed by Anku",
        },
      });

      return item;
    });

    if (!claimed) {
      const existing = await prisma.workItem.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({ error: "Task not found" });
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
});


// Update work item status
router.patch("/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid work item ID" });
    }

    const allowedStatuses = [
      "OPEN",
      "IN PROGRESS",
      "AWAITING APPROVAL",
      "RESOLVED",
      "CLOSED",
    ];

    if (typeof status !== "string" ||
        !allowedStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const item = await prisma.workItem.update({
      where: { id },
      data: { status: status.toUpperCase() },
    });
    await recordActivity(
        item.id,
        "STATUS_CHANGED",
        `Status changed to ${item.status}`
    );

    res.json(item);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Work item not found" });
    }

    console.error(error);
    res.status(500).json({ error: "Failed to update status" });
  }
});

router.get("/:id/activity", async (req, res) => {
  try {
    const workItemId = Number(req.params.id);

    if (!Number.isInteger(workItemId) || workItemId <= 0) {
      return res.status(400).json({ error: "Invalid work item ID" });
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
router.delete("/:id", async (req, res) => {
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
