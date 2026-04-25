#!/usr/bin/env bun
import { db } from "../core/database";
import { goals, tasks, subtasks, activityBuckets, workSessionsHistory, taskScheduleHistory } from "../../shared/schema";
import { dateUtils } from "../../shared/utils";

// use bun run server/dev/add-test-tasks.ts to run

async function clearTables() {
  console.log('🗑️  Clearing existing data...');
  
  try {
    // Delete in proper order to respect foreign key constraints
    await db.delete(activityBuckets);
    console.log('  ✓ Cleared activity buckets');

    await db.delete(workSessionsHistory);
    console.log('  ✓ Cleared work sessions history');

    await db.delete(taskScheduleHistory);
    console.log('  ✓ Cleared task schedule history');

    await db.delete(subtasks);
    console.log('  ✓ Cleared subtasks');
    
    await db.delete(tasks);
    console.log('  ✓ Cleared tasks');

    await db.delete(goals);
    console.log('  ✓ Cleared goals');
    
    console.log('🎯 All tables cleared successfully!\n');
  } catch (error) {
    console.error('❌ Error clearing tables:', error);
    throw error;
  }
}

async function addTestData() {
  const today = dateUtils.getTodayDate();
  const daysAgo = (n: number) => dateUtils.formatDate(new Date(Date.now() - n * 24 * 60 * 60 * 1000));
  const daysFromNow = (n: number) => dateUtils.formatDate(new Date(Date.now() + n * 24 * 60 * 60 * 1000));
  const isoAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
  const isoFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();

  try {
    // ── Goals ──────────────────────────────────────────────
    console.log('Creating goals...');
    const [learningGoal] = await db.insert(goals).values({ title: "Learning", description: "Courses, tutorials, and skill development" }).returning();
    const [fitnessGoal] = await db.insert(goals).values({ title: "Fitness", description: "Exercise and physical health" }).returning();
    const [projectGoal] = await db.insert(goals).values({ title: "Side Project", description: "Building the weekend side project" }).returning();
    console.log(`  Created goals: Learning(${learningGoal.id}), Fitness(${fitnessGoal.id}), Side Project(${projectGoal.id})`);

    // ── Tasks (with goal links) ───────────────────────────
    console.log('Creating tasks...');

    // Task 1: linked to Learning goal, completed
    const [courseTask] = await db.insert(tasks).values({
      title: "Complete React Advanced Patterns course",
      description: "Finish the remaining modules on compound components and render props",
      priority: "high",
      dueDate: isoAgo(1),
      isCompleted: true,
      completedAt: isoAgo(1),
      goalId: learningGoal.id,
    }).returning();

    // Task 2: linked to Side Project goal, in progress
    const [apiTask] = await db.insert(tasks).values({
      title: "Build REST API for side project",
      description: "Implement all CRUD endpoints and authentication",
      priority: "urgent",
      dueDate: isoFromNow(3),
      goalId: projectGoal.id,
    }).returning();

    // Task 3: no goal, in progress
    const [groceryTask] = await db.insert(tasks).values({
      title: "Reorganize kitchen pantry",
      description: "Sort through everything and organize by category",
      priority: "low",
      dueDate: isoFromNow(5),
    }).returning();

    // Task 4: linked to Learning goal, not started
    const [bookTask] = await db.insert(tasks).values({
      title: "Read Designing Data-Intensive Applications ch. 5-8",
      description: "Chapters on replication, partitioning, transactions, and distributed systems",
      priority: "medium",
      dueDate: isoFromNow(7),
      goalId: learningGoal.id,
    }).returning();

    console.log(`  Created 4 tasks`);

    // ── Subtasks (with overrideGoal variations) ───────────
    console.log('Creating subtasks...');

    // -- courseTask subtasks (all completed, inherit Learning goal)
    const [courseS1] = await db.insert(subtasks).values({
      parentTaskId: courseTask.id,
      title: "Module 5: Compound Components",
      estimatedMinutes: 60,
      status: "completed",
      scheduledDate: daysAgo(3),
      scheduledStartTime: 9 * 60,
      completedAt: isoAgo(3),
    }).returning();

    const [courseS2] = await db.insert(subtasks).values({
      parentTaskId: courseTask.id,
      title: "Module 6: Render Props",
      estimatedMinutes: 45,
      status: "completed",
      scheduledDate: daysAgo(2),
      scheduledStartTime: 10 * 60,
      completedAt: isoAgo(2),
    }).returning();

    const [courseS3] = await db.insert(subtasks).values({
      parentTaskId: courseTask.id,
      title: "Module 7: State Reducers",
      estimatedMinutes: 50,
      status: "completed",
      scheduledDate: daysAgo(1),
      scheduledStartTime: 9 * 60,
      completedAt: isoAgo(1),
    }).returning();

    // -- apiTask subtasks (Side Project goal, with override variations)
    const [apiS1] = await db.insert(subtasks).values({
      parentTaskId: apiTask.id,
      title: "Set up Express server + middleware",
      estimatedMinutes: 90,
      status: "completed",
      scheduledDate: daysAgo(1),
      scheduledStartTime: 14 * 60,
      completedAt: isoAgo(1),
      // inherits Side Project goal (default)
    }).returning();

    const [apiS2] = await db.insert(subtasks).values({
      parentTaskId: apiTask.id,
      title: "Implement user auth endpoints",
      estimatedMinutes: 120,
      status: "active",
      activatedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      scheduledDate: today,
      scheduledStartTime: 10 * 60,
      // inherits Side Project goal (default)
    }).returning();

    const [apiS3] = await db.insert(subtasks).values({
      parentTaskId: apiTask.id,
      title: "Research OAuth2 libraries",
      description: "This is a learning task, not project work",
      estimatedMinutes: 60,
      status: "pending",
      scheduledDate: today,
      scheduledStartTime: 14 * 60,
      // overrideGoal → Learning (different from parent's Side Project)
      overrideGoal: true,
      goalId: learningGoal.id,
    }).returning();

    const [apiS4] = await db.insert(subtasks).values({
      parentTaskId: apiTask.id,
      title: "Write integration tests",
      estimatedMinutes: 90,
      status: "pending",
      scheduledDate: daysFromNow(1),
      scheduledStartTime: 9 * 60,
      // overrideGoal → no goal
      overrideGoal: true,
      goalId: null,
    }).returning();

    const [apiS5] = await db.insert(subtasks).values({
      parentTaskId: apiTask.id,
      title: "Deploy to staging",
      estimatedMinutes: 45,
      status: "pending",
      scheduledDate: daysFromNow(2),
      scheduledStartTime: 11 * 60,
      // inherits Side Project goal (default)
    }).returning();

    // -- groceryTask subtasks (no goal on parent)
    const [groceryS1] = await db.insert(subtasks).values({
      parentTaskId: groceryTask.id,
      title: "Clear out expired items",
      estimatedMinutes: 30,
      status: "pending",
      scheduledDate: daysFromNow(3),
      scheduledStartTime: 10 * 60,
    }).returning();

    // -- bookTask subtasks (Learning goal on parent)
    const [bookS1] = await db.insert(subtasks).values({
      parentTaskId: bookTask.id,
      title: "Chapter 5: Replication",
      estimatedMinutes: 90,
      status: "pending",
      scheduledDate: daysFromNow(1),
      scheduledStartTime: 15 * 60,
    }).returning();

    const [bookS2] = await db.insert(subtasks).values({
      parentTaskId: bookTask.id,
      title: "Chapter 6: Partitioning",
      estimatedMinutes: 90,
      status: "pending",
      scheduledDate: daysFromNow(3),
      scheduledStartTime: 15 * 60,
    }).returning();

    // Task 5: linked to Learning goal, many subtasks to trigger "View all"
    const [deepDiveTask] = await db.insert(tasks).values({
      title: "Deep dive into TypeScript patterns",
      description: "Comprehensive study of advanced TypeScript features",
      priority: "medium",
      dueDate: isoFromNow(14),
      goalId: learningGoal.id,
    }).returning();

    const deepDiveSubtasks = [
      "Mapped types & template literals",
      "Conditional types & infer",
      "Discriminated unions",
      "Branded types",
      "Variance & covariance",
      "Module augmentation",
      "Decorator patterns",
      "Type-level programming exercises",
    ];
    for (const title of deepDiveSubtasks) {
      await db.insert(subtasks).values({
        parentTaskId: deepDiveTask.id,
        title,
        estimatedMinutes: 45,
        status: "pending",
        scheduledDate: daysFromNow(Math.floor(Math.random() * 14) + 1),
        scheduledStartTime: 16 * 60,
      });
    }

    console.log(`  Created 11 subtasks + 8 deep-dive subtasks`);

    // ── Habits ────────────────────────────────────────────
    console.log('Creating habits...');

    // Habits need scheduleHistory + past createdAt so the summary service
    // recognises historical subtasks as valid (isHabitDueOnDate checks scheduleHistory.from)
    const habitCreatedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const habitScheduleFrom = daysAgo(30);

    // Habit 1: daily, linked to Fitness
    const [morningRun] = await db.insert(tasks).values({
      title: "Morning run",
      isHabit: true,
      frequency: "daily",
      estimateMinutes: 30,
      goalId: fitnessGoal.id,
      createdAt: habitCreatedAt,
      scheduleHistory: [{ from: habitScheduleFrom, frequency: "daily", customDays: null }],
    }).returning();

    // Habit 2: daily, linked to Learning
    const [dailyReading] = await db.insert(tasks).values({
      title: "Read for 30 minutes",
      isHabit: true,
      frequency: "daily",
      estimateMinutes: 30,
      goalId: learningGoal.id,
      createdAt: habitCreatedAt,
      scheduleHistory: [{ from: habitScheduleFrom, frequency: "daily", customDays: null }],
    }).returning();

    // Habit 3: weekly (Mon/Wed/Fri), linked to Fitness
    const [strengthTraining] = await db.insert(tasks).values({
      title: "Strength training",
      isHabit: true,
      frequency: "custom",
      customDays: [1, 3, 5], // Mon, Wed, Fri
      estimateMinutes: 45,
      goalId: fitnessGoal.id,
      createdAt: habitCreatedAt,
      scheduleHistory: [{ from: habitScheduleFrom, frequency: "custom", customDays: [1, 3, 5] }],
    }).returning();

    // Habit 4: daily, no goal
    const [journaling] = await db.insert(tasks).values({
      title: "Evening journaling",
      isHabit: true,
      frequency: "daily",
      estimateMinutes: 15,
      createdAt: habitCreatedAt,
      scheduleHistory: [{ from: habitScheduleFrom, frequency: "daily", customDays: null }],
    }).returning();

    // Extra Fitness habits (so Fitness goal triggers "View all")
    const extraFitnessHabits = [
      { title: "Stretching routine", estimateMinutes: 15, frequency: "daily" as const, customDays: null },
      { title: "Evening walk", estimateMinutes: 20, frequency: "daily" as const, customDays: null },
      { title: "Yoga session", estimateMinutes: 30, frequency: "custom" as const, customDays: [2, 4, 6] },
      { title: "Core workout", estimateMinutes: 20, frequency: "custom" as const, customDays: [1, 3, 5] },
      { title: "Hydration tracking", estimateMinutes: 5, frequency: "daily" as const, customDays: null },
    ];
    for (const h of extraFitnessHabits) {
      await db.insert(tasks).values({
        title: h.title,
        isHabit: true,
        frequency: h.frequency,
        customDays: h.customDays,
        estimateMinutes: h.estimateMinutes,
        goalId: fitnessGoal.id,
        createdAt: habitCreatedAt,
        scheduleHistory: [{ from: habitScheduleFrom, frequency: h.frequency, customDays: h.customDays }],
      });
    }

    console.log(`  Created 4 habits + 5 extra fitness habits`);

    // Track bucket count across all sections
    let bucketCount = 0;

    // ── Habit subtasks (completions over last 30 days) ────
    console.log('Creating habit completion history (30 days)...');

    for (let d = 29; d >= 0; d--) {
      const date = daysAgo(d);
      const dayOfWeek = new Date(Date.now() - d * 24 * 60 * 60 * 1000).getDay();

      // Morning run: ~70% completion (skip some days semi-randomly)
      const runSkipped = d % 5 === 0 || d % 7 === 3; // skip every 5th day and some others
      const [runSub] = await db.insert(subtasks).values({
        parentTaskId: morningRun.id,
        title: "Morning run",
        estimatedMinutes: 30,
        status: runSkipped ? "skipped" : "completed",
        scheduledDate: date,
        scheduledStartTime: 7 * 60,
        ...(!runSkipped ? { completedAt: isoAgo(d) } : {}),
      }).returning();

      if (!runSkipped) {
        const runStart = new Date(Date.now() - d * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000);
        await db.insert(workSessionsHistory).values({
          subtaskId: runSub.id,
          startedAt: runStart.toISOString(),
          endedAt: new Date(runStart.getTime() + 30 * 60 * 1000).toISOString(),
          durationMinutes: 30,
          date,
        });
        for (let b = 0; b < 6; b++) {
          const bStart = new Date(runStart.getTime() + b * 5 * 60 * 1000);
          await db.insert(activityBuckets).values({
            subtaskId: runSub.id,
            date,
            startTime: bStart.toISOString(),
            endTime: new Date(bStart.getTime() + 5 * 60 * 1000).toISOString(),
            category: b < 4 ? "focus" : b === 4 ? "prefocus" : "distraction",
            dominantApp: b < 5 ? "Strava" : "Instagram",
            apps: JSON.stringify(b < 5 ? { "Strava": 240, "Music": 60 } : { "Instagram": 200, "Strava": 100 }),
            workSessionApp: "Strava",
          });
          bucketCount++;
        }
      }

      // Daily reading: ~90% completion (perfect recent streak, missed a few early days)
      const readSkipped = d > 20 && d % 8 === 0;
      const [readSub] = await db.insert(subtasks).values({
        parentTaskId: dailyReading.id,
        title: "Read for 30 minutes",
        estimatedMinutes: 30,
        status: readSkipped ? "skipped" : "completed",
        scheduledDate: date,
        scheduledStartTime: 21 * 60,
        ...(!readSkipped ? { completedAt: isoAgo(d) } : {}),
      }).returning();

      if (!readSkipped) {
        const readStart = new Date(Date.now() - d * 24 * 60 * 60 * 1000 + 21 * 60 * 60 * 1000);
        await db.insert(workSessionsHistory).values({
          subtaskId: readSub.id,
          startedAt: readStart.toISOString(),
          endedAt: new Date(readStart.getTime() + 30 * 60 * 1000).toISOString(),
          durationMinutes: 30,
          date,
        });
        for (let b = 0; b < 6; b++) {
          const bStart = new Date(readStart.getTime() + b * 5 * 60 * 1000);
          await db.insert(activityBuckets).values({
            subtaskId: readSub.id,
            date,
            startTime: bStart.toISOString(),
            endTime: new Date(bStart.getTime() + 5 * 60 * 1000).toISOString(),
            category: b < 5 ? "focus" : "idle",
            dominantApp: b < 5 ? "Kindle" : "System Idle",
            apps: JSON.stringify(b < 5 ? { "Kindle": 280, "Notes": 20 } : { "System Idle": 300 }),
            workSessionApp: "Kindle",
          });
          bucketCount++;
        }
      }

      // Strength training: only on Mon/Wed/Fri, completed all scheduled
      if ([1, 3, 5].includes(dayOfWeek)) {
        const [strengthSub] = await db.insert(subtasks).values({
          parentTaskId: strengthTraining.id,
          title: "Strength training",
          estimatedMinutes: 45,
          status: "completed",
          scheduledDate: date,
          scheduledStartTime: 17 * 60,
          completedAt: isoAgo(d),
        }).returning();

        const strengthStart = new Date(Date.now() - d * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000);
        await db.insert(workSessionsHistory).values({
          subtaskId: strengthSub.id,
          startedAt: strengthStart.toISOString(),
          endedAt: new Date(strengthStart.getTime() + 45 * 60 * 1000).toISOString(),
          durationMinutes: 45,
          date,
        });
        for (let b = 0; b < 9; b++) {
          const bStart = new Date(strengthStart.getTime() + b * 5 * 60 * 1000);
          await db.insert(activityBuckets).values({
            subtaskId: strengthSub.id,
            date,
            startTime: bStart.toISOString(),
            endTime: new Date(bStart.getTime() + 5 * 60 * 1000).toISOString(),
            category: b < 6 ? "focus" : b < 8 ? "prefocus" : "distraction",
            dominantApp: b < 8 ? "Strong" : "YouTube",
            apps: JSON.stringify(b < 8 ? { "Strong": 200, "Music": 100 } : { "YouTube": 220, "Strong": 80 }),
            workSessionApp: "Strong",
          });
          bucketCount++;
        }
      }

      // Journaling: ~50% completion (sporadic, worse than other habits)
      const journalCompleted = d % 2 === 0 || d % 3 === 0;
      if (journalCompleted) {
        const [journalSub] = await db.insert(subtasks).values({
          parentTaskId: journaling.id,
          title: "Evening journaling",
          estimatedMinutes: 15,
          status: "completed",
          scheduledDate: date,
          scheduledStartTime: 22 * 60,
          completedAt: isoAgo(d),
        }).returning();

        const journalStart = new Date(Date.now() - d * 24 * 60 * 60 * 1000 + 22 * 60 * 60 * 1000);
        await db.insert(workSessionsHistory).values({
          subtaskId: journalSub.id,
          startedAt: journalStart.toISOString(),
          endedAt: new Date(journalStart.getTime() + 15 * 60 * 1000).toISOString(),
          durationMinutes: 15,
          date,
        });
        for (let b = 0; b < 3; b++) {
          const bStart = new Date(journalStart.getTime() + b * 5 * 60 * 1000);
          await db.insert(activityBuckets).values({
            subtaskId: journalSub.id,
            date,
            startTime: bStart.toISOString(),
            endTime: new Date(bStart.getTime() + 5 * 60 * 1000).toISOString(),
            category: "focus",
            dominantApp: "Day One",
            apps: JSON.stringify({ "Day One": 260, "Notes": 40 }),
            workSessionApp: "Day One",
          });
          bucketCount++;
        }
      }
    }

    console.log(`  Created 30 days of habit completions`);

    // ── Work sessions for task subtasks ───────────────────
    console.log('Creating work sessions for task subtasks...');

    // courseS1: 55 min session
    await db.insert(workSessionsHistory).values({
      subtaskId: courseS1.id,
      startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000).toISOString(),
      endedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 9.92 * 60 * 60 * 1000).toISOString(),
      durationMinutes: 55,
      date: daysAgo(3),
    });

    // courseS2: 40 min session
    await db.insert(workSessionsHistory).values({
      subtaskId: courseS2.id,
      startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000).toISOString(),
      endedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10.67 * 60 * 60 * 1000).toISOString(),
      durationMinutes: 40,
      date: daysAgo(2),
    });

    // courseS3: 50 min session
    await db.insert(workSessionsHistory).values({
      subtaskId: courseS3.id,
      startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000).toISOString(),
      endedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 9.83 * 60 * 60 * 1000).toISOString(),
      durationMinutes: 50,
      date: daysAgo(1),
    });

    // apiS1: 80 min session
    await db.insert(workSessionsHistory).values({
      subtaskId: apiS1.id,
      startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000).toISOString(),
      endedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 15.33 * 60 * 60 * 1000).toISOString(),
      durationMinutes: 80,
      date: daysAgo(1),
    });

    // apiS2: active session (started 45 min ago, no endedAt)
    await db.insert(workSessionsHistory).values({
      subtaskId: apiS2.id,
      startedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      endedAt: null,
      durationMinutes: null,
      date: today,
    });

    console.log(`  Created 5 work sessions for tasks`);

    // ── Activity buckets (for focus/distraction metrics) ──
    console.log('Creating activity buckets...');

    // Helper to create a batch of 5-min buckets
    async function createBuckets(
      subtaskId: number,
      date: string,
      startHour: number,
      count: number,
      pattern: Array<{ category: "focus" | "prefocus" | "distraction" | "idle"; app: string }>
    ) {
      const dayOffset = (new Date(date + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / (24 * 60 * 60 * 1000);
      const baseTime = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
      baseTime.setHours(startHour, 0, 0, 0);

      for (let i = 0; i < count; i++) {
        const p = pattern[i % pattern.length];
        const start = new Date(baseTime.getTime() + i * 5 * 60 * 1000);
        const end = new Date(start.getTime() + 5 * 60 * 1000);
        await db.insert(activityBuckets).values({
          subtaskId,
          date,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          category: p.category,
          dominantApp: p.app,
          apps: JSON.stringify({ [p.app]: 240, "Chrome": 60 }),
          workSessionApp: p.app,
        });
        bucketCount++;
      }
    }

    const focusVSCode = { category: "focus" as const, app: "Visual Studio Code" };
    const prefocusVSCode = { category: "prefocus" as const, app: "Visual Studio Code" };
    const distractionSlack = { category: "distraction" as const, app: "Slack" };
    const idlePattern = { category: "idle" as const, app: "System Idle" };

    // courseS1: 11 buckets (~55 min), mostly focus
    await createBuckets(courseS1.id, daysAgo(3), 9, 11, [focusVSCode, focusVSCode, focusVSCode, prefocusVSCode, focusVSCode]);
    // courseS2: 8 buckets (~40 min)
    await createBuckets(courseS2.id, daysAgo(2), 10, 8, [focusVSCode, focusVSCode, prefocusVSCode, focusVSCode]);
    // courseS3: 10 buckets (~50 min)
    await createBuckets(courseS3.id, daysAgo(1), 9, 10, [focusVSCode, focusVSCode, focusVSCode, prefocusVSCode, distractionSlack]);
    // apiS1: 16 buckets (~80 min), good focus with some breaks
    await createBuckets(apiS1.id, daysAgo(1), 14, 16, [focusVSCode, focusVSCode, focusVSCode, prefocusVSCode, focusVSCode, distractionSlack]);
    // apiS2: 9 buckets (~45 min, active now)
    await createBuckets(apiS2.id, today, 10, 9, [focusVSCode, focusVSCode, prefocusVSCode, focusVSCode, focusVSCode, distractionSlack, focusVSCode, prefocusVSCode, idlePattern]);

    console.log(`  Created ${bucketCount} activity buckets`);

    // ── Summary ──────────────────────────────────────────
    const allTasks = await db.select().from(tasks);
    const allSubtasks = await db.select().from(subtasks);
    const allBuckets = await db.select().from(activityBuckets);
    const allGoals = await db.select().from(goals);
    const allSessions = await db.select().from(workSessionsHistory);
    
    console.log(`\n=== TEST DATA SUMMARY ===`);
    console.log(`Goals: ${allGoals.length}`);
    console.log(`Tasks: ${allTasks.filter(t => !t.isHabit).length} (${allTasks.filter(t => !t.isHabit && t.isCompleted).length} completed)`);
    console.log(`Habits: ${allTasks.filter(t => t.isHabit).length}`);
    console.log(`Subtasks: ${allSubtasks.length} (${allSubtasks.filter(s => s.status === 'completed').length} completed, ${allSubtasks.filter(s => s.status === 'active').length} active)`);
    console.log(`Work Sessions: ${allSessions.length}`);
    console.log(`Activity Buckets: ${allBuckets.length}`);
    console.log(`\nGoal override variations:`);
    console.log(`  Inherit from parent: ${allSubtasks.filter(s => !s.overrideGoal).length}`);
    console.log(`  Override → specific goal: ${allSubtasks.filter(s => s.overrideGoal && s.goalId).length}`);
    console.log(`  Override → no goal: ${allSubtasks.filter(s => s.overrideGoal && !s.goalId).length}`);

  } catch (error) {
    console.error('Error adding test data:', error);
    throw error;
  }
}

async function main() {
  try {
    await clearTables();
    await addTestData();
    console.log('\n✅ Database cleared and test data added successfully!');
  } catch (error) {
    console.error('❌ Failed to clear and add test data:', error);
    process.exit(1);
  }
}

main().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});