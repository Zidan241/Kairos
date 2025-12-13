#!/usr/bin/env bun
import { db } from "../core/database";
import { tasks, subtasks, activityBuckets } from "../../shared/schema";

// use bun run server/add-test-tasks.ts to run

async function clearTables() {
  console.log('🗑️  Clearing existing data...');
  
  try {
    // Delete in proper order to respect foreign key constraints
    await db.delete(activityBuckets);
    console.log('  ✓ Cleared activity buckets');
    
    await db.delete(subtasks);
    console.log('  ✓ Cleared subtasks');
    
    await db.delete(tasks);
    console.log('  ✓ Cleared tasks');
    
    console.log('🎯 All tables cleared successfully!\n');
  } catch (error) {
    console.error('❌ Error clearing tables:', error);
    throw error;
  }
}

async function addTestData() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dayAfterTomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const fourDaysFromNow = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  console.log(`Adding hackathon project test data across multiple days:`);
  console.log(`  Three days ago: ${threeDaysAgo} (spec written)`);
  console.log(`  Two days ago: ${twoDaysAgo} (project skeleton)`);
  console.log(`  Yesterday: ${yesterday} (focus page backend)`);
  console.log(`  Today: ${today} (continuing focus page)`);
  console.log(`  Tomorrow: ${tomorrow} (plan page backend)`);
  console.log(`  Day after tomorrow: ${dayAfterTomorrow} (reflect page backend)`);
  console.log(`  Weekend: ${fourDaysFromNow} - ${fiveDaysFromNow} (presentation)`);
  
  try {
    // Create hackathon project tasks
    console.log('Creating hackathon project tasks...');
    const hackathonSpec = await db.insert(tasks).values({
      title: "Write hackathon project spec",
      description: "Write a comprehensive spec for the hackathon project including objectives, features, and UI pages",
      priority: "urgent",
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Due Sunday (2 days)
      isCompleted: true,
      completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Completed yesterday
    }).returning();

    const projectSkeleton = await db.insert(tasks).values({
      title: "Build project skeleton with Replit",
      description: "Set up the initial project structure and development environment",
      priority: "high",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // Due Monday (3 days)
      isCompleted: false,
    }).returning();

    const focusPageBackend = await db.insert(tasks).values({
      title: "Implement backend for Focus page",
      description: "Build the backend functionality for the Focus page with nested lists and metrics",
      priority: "high",
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), // Due Tuesday (4 days)
      isCompleted: false,
    }).returning();

    const planPageBackend = await db.insert(tasks).values({
      title: "Implement backend for Plan page",
      description: "Build the backend functionality for the Plan page with nested lists and modals",
      priority: "high",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // Due Wednesday (5 days)
      isCompleted: false,
    }).returning();

    const reflectPageBackend = await db.insert(tasks).values({
      title: "Implement backend for Reflect page",
      description: "Build metrics calculation and reporting functionality",
      priority: "high",
      dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(), // Due Thursday (6 days)
      isCompleted: false,
    }).returning();

    const presentationDemo = await db.insert(tasks).values({
      title: "Create presentation and demo",
      description: "Prepare final presentation and demonstration for hackathon submission",
      priority: "urgent",
      dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(), // Due Saturday (8 days)
      isCompleted: false,
    }).returning();

    console.log(`Created hackathon project tasks:`, {
      hackathonSpec: hackathonSpec[0].id,
      projectSkeleton: projectSkeleton[0].id,
      focusPageBackend: focusPageBackend[0].id,
      planPageBackend: planPageBackend[0].id,
      reflectPageBackend: reflectPageBackend[0].id,
      presentationDemo: presentationDemo[0].id
    });

    // Create subtasks for hackathon project
    console.log('Creating hackathon subtasks...');
    
    // Spec writing subtasks (completed)
    const subtask1 = await db.insert(subtasks).values({
      parentTaskId: hackathonSpec[0].id,
      title: "Outline high-level objectives",
      description: "Define the main goals and objectives for the hackathon project",
      estimatedMinutes: 60,
      isCompleted: true,
      isActive: false,
      scheduledStartTime: 9 * 60, // 9:00 AM
      scheduledDate: threeDaysAgo,
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    }).returning();

    const subtask2 = await db.insert(subtasks).values({
      parentTaskId: hackathonSpec[0].id,
      title: "Draft technical implementation plan",
      description: "Document the technical approach and architecture decisions",
      estimatedMinutes: 90,
      isCompleted: true,
      isActive: false,
      scheduledStartTime: 11 * 60, // 11:00 AM
      scheduledDate: threeDaysAgo,
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    }).returning();

    // Project skeleton subtasks (completed)
    const subtask3 = await db.insert(subtasks).values({
      parentTaskId: projectSkeleton[0].id,
      title: "Initialize Vite + React + TypeScript project",
      description: "Set up the basic project structure with modern tooling",
      estimatedMinutes: 45,
      isCompleted: true,
      isActive: false,
      scheduledStartTime: 9 * 60, // 9:00 AM
      scheduledDate: twoDaysAgo,
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    }).returning();

    const subtask4 = await db.insert(subtasks).values({
      parentTaskId: projectSkeleton[0].id,
      title: "Set up Drizzle ORM with SQLite",
      description: "Configure database schema and connection",
      estimatedMinutes: 90,
      isCompleted: true,
      isActive: false,
      scheduledStartTime: 10 * 60, // 10:00 AM
      scheduledDate: twoDaysAgo,
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    }).returning();

    const subtask5 = await db.insert(subtasks).values({
      parentTaskId: projectSkeleton[0].id,
      title: "Basic routing and layout components",
      description: "Create main layout and navigation structure",
      estimatedMinutes: 120,
      isCompleted: true,
      isActive: false,
      scheduledStartTime: 12 * 60, // 12:00 PM
      scheduledDate: twoDaysAgo,
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    }).returning();

    // Focus page backend subtasks (in progress)
    const subtask6 = await db.insert(subtasks).values({
      parentTaskId: focusPageBackend[0].id,
      title: "Design task and subtask database schema",
      description: "Create tables for tasks, subtasks, and scheduling",
      estimatedMinutes: 60,
      isCompleted: true,
      isActive: false,
      scheduledStartTime: 9 * 60, // 9:00 AM
      scheduledDate: yesterday,
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    }).returning();

    const subtask7 = await db.insert(subtasks).values({
      parentTaskId: focusPageBackend[0].id,
      title: "Implement CRUD operations for tasks",
      description: "Create, read, update, delete operations for task management",
      estimatedMinutes: 150,
      isCompleted: true,
      isActive: false,
      scheduledStartTime: 10 * 60, // 10:00 AM
      scheduledDate: yesterday,
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    }).returning();

    const subtask8 = await db.insert(subtasks).values({
      parentTaskId: focusPageBackend[0].id,
      title: "Build timer and time tracking API",
      description: "API endpoints for starting, stopping, and tracking work sessions",
      estimatedMinutes: 180,
      isCompleted: false,
      isActive: true,
      scheduledStartTime: 14 * 60, // 2:00 PM
      scheduledDate: today,
    }).returning();

    // Plan page backend subtasks (scheduled)
    const subtask9 = await db.insert(subtasks).values({
      parentTaskId: planPageBackend[0].id,
      title: "Design calendar and scheduling data model",
      description: "Schema for calendar events and task scheduling",
      estimatedMinutes: 90,
      isCompleted: false,
      isActive: false,
      scheduledStartTime: 9 * 60, // 9:00 AM
      scheduledDate: tomorrow,
    }).returning();

    const subtask10 = await db.insert(subtasks).values({
      parentTaskId: planPageBackend[0].id,
      title: "Calendar integration API endpoints",
      description: "CRUD operations for calendar events and scheduling",
      estimatedMinutes: 180,
      isCompleted: false,
      isActive: false,
      scheduledStartTime: 11 * 60, // 11:00 AM
      scheduledDate: tomorrow,
    }).returning();

    const subtask11 = await db.insert(subtasks).values({
      parentTaskId: planPageBackend[0].id,
      title: "Time blocking and conflict detection",
      description: "Logic to prevent overlapping schedules and suggest optimal times",
      estimatedMinutes: 240,
      isCompleted: false,
      isActive: false,
      scheduledStartTime: 14 * 60, // 2:00 PM
      scheduledDate: tomorrow,
    }).returning();

    // Reflect page backend subtasks (scheduled)
    const subtask12 = await db.insert(subtasks).values({
      parentTaskId: reflectPageBackend[0].id,
      title: "Design metrics and analytics schema",
      description: "Database design for productivity metrics and insights",
      estimatedMinutes: 120,
      isCompleted: false,
      isActive: false,
      scheduledStartTime: 9 * 60, // 9:00 AM
      scheduledDate: dayAfterTomorrow,
    }).returning();

    const subtask13 = await db.insert(subtasks).values({
      parentTaskId: reflectPageBackend[0].id,
      title: "Implement productivity analytics algorithms",
      description: "Calculate time tracking, focus patterns, and productivity scores",
      estimatedMinutes: 180,
      isCompleted: false,
      isActive: false,
      scheduledStartTime: 11 * 60, // 11:00 AM
      scheduledDate: dayAfterTomorrow,
    }).returning();

    // Presentation subtasks (scheduled for weekend)
    const subtask14 = await db.insert(subtasks).values({
      parentTaskId: presentationDemo[0].id,
      title: "Create demo script and flow",
      description: "Plan the demo presentation and key features to showcase",
      estimatedMinutes: 90,
      isCompleted: false,
      isActive: false,
      scheduledStartTime: 10 * 60, // 10:00 AM
      scheduledDate: fourDaysFromNow, // Friday
    }).returning();

    const subtask15 = await db.insert(subtasks).values({
      parentTaskId: presentationDemo[0].id,
      title: "Record demo video",
      description: "Record a polished demo showcasing all three pages",
      estimatedMinutes: 120,
      isCompleted: false,
      isActive: false,
      scheduledStartTime: 14 * 60, // 2:00 PM
      scheduledDate: fourDaysFromNow, // Friday
    }).returning();

    const subtask16 = await db.insert(subtasks).values({
      parentTaskId: presentationDemo[0].id,
      title: "Prepare presentation slides",
      description: "Create slides covering architecture, features, and future roadmap",
      estimatedMinutes: 150,
      isCompleted: false,
      isActive: false,
      scheduledStartTime: 9 * 60, // 9:00 AM
      scheduledDate: fiveDaysFromNow, // Saturday
    }).returning();

    console.log(`Created ${16} hackathon subtasks`);

    // Create activity buckets (simulate work activity)
    console.log('Creating activity buckets...');
    const now = new Date();

    // Create activity for completed hackathon subtasks
    // Subtask 1 - Outline objectives (completed 3 days ago)
    const specOutlineStart = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000); // 9 AM three days ago
    for (let i = 0; i < 12; i++) { // 1 hour of spec writing
      const bucketStart = new Date(specOutlineStart.getTime() + i * 5 * 60 * 1000);
      const bucketEnd = new Date(bucketStart.getTime() + 5 * 60 * 1000);
      
      await db.insert(activityBuckets).values({
        subtaskId: subtask1[0].id,
        date: threeDaysAgo,
        startTime: bucketStart.toISOString(),
        endTime: bucketEnd.toISOString(),
        category: i < 10 ? "focus" as const : "prefocus" as const,
        dominantApp: "Notion",
        apps: JSON.stringify({
          "Notion": 260,
          "Chrome": 30,
          "Slack": 10
        }),
        workSessionApp: "Notion",
      });
    }

    // Subtask 2 - Technical implementation plan (completed 3 days ago)
    const techPlanStart = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000); // 11 AM three days ago
    for (let i = 0; i < 18; i++) { // 1.5 hours of technical planning
      const bucketStart = new Date(techPlanStart.getTime() + i * 5 * 60 * 1000);
      const bucketEnd = new Date(bucketStart.getTime() + 5 * 60 * 1000);
      
      await db.insert(activityBuckets).values({
        subtaskId: subtask2[0].id,
        date: threeDaysAgo,
        startTime: bucketStart.toISOString(),
        endTime: bucketEnd.toISOString(),
        category: i < 12 ? "focus" as const : i < 15 ? "prefocus" as const : "distraction" as const,
        dominantApp: i < 15 ? "Notion" : "Slack",
        apps: JSON.stringify({
          "Notion": i < 15 ? 220 : 80,
          "Figma": i < 15 ? 60 : 20,
          "Chrome": i < 15 ? 20 : 100,
          "Slack": i < 15 ? 0 : 100
        }),
        workSessionApp: "Notion",
      });
    }

    // Subtask 3 - Initialize Vite project (completed 2 days ago)
    const viteSetupStart = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000); // 9 AM two days ago
    for (let i = 0; i < 9; i++) { // 45 minutes of project setup
      const bucketStart = new Date(viteSetupStart.getTime() + i * 5 * 60 * 1000);
      const bucketEnd = new Date(bucketStart.getTime() + 5 * 60 * 1000);
      
      await db.insert(activityBuckets).values({
        subtaskId: subtask3[0].id,
        date: twoDaysAgo,
        startTime: bucketStart.toISOString(),
        endTime: bucketEnd.toISOString(),
        category: i < 6 ? "focus" as const : i < 8 ? "prefocus" as const : "distraction" as const,
        dominantApp: i < 8 ? "Terminal" : "Chrome",
        apps: JSON.stringify({
          "Terminal": i < 8 ? 240 : 60,
          "Visual Studio Code": i < 8 ? 40 : 20,
          "Chrome": i < 8 ? 20 : 220
        }),
        workSessionApp: "Terminal",
      });
    }

    // Subtask 4 - Drizzle ORM setup (spans 2 days - started 2 days ago, continued yesterday)
    // Day 1: Initial setup (2 days ago)
    const drizzleSetupDay1Start = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000); // 10 AM two days ago
    for (let i = 0; i < 12; i++) { // 1 hour on day 1
      const bucketStart = new Date(drizzleSetupDay1Start.getTime() + i * 5 * 60 * 1000);
      const bucketEnd = new Date(bucketStart.getTime() + 5 * 60 * 1000);
      
      await db.insert(activityBuckets).values({
        subtaskId: subtask4[0].id,
        date: twoDaysAgo,
        startTime: bucketStart.toISOString(),
        endTime: bucketEnd.toISOString(),
        category: i < 8 ? "focus" as const : i < 10 ? "prefocus" as const : "distraction" as const,
        dominantApp: i < 10 ? "Visual Studio Code" : "Slack",
        apps: JSON.stringify({
          "Visual Studio Code": i < 10 ? 200 : 80,
          "Terminal": i < 10 ? 80 : 20,
          "Chrome": i < 10 ? 20 : 60,
          "Slack": i < 10 ? 0 : 140
        }),
        workSessionApp: "Visual Studio Code",
      });
    }
    
    // Day 2: Completion (yesterday)
    const drizzleSetupDay2Start = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000); // 8 AM yesterday
    for (let i = 0; i < 6; i++) { // 30 minutes on day 2 to finish
      const bucketStart = new Date(drizzleSetupDay2Start.getTime() + i * 5 * 60 * 1000);
      const bucketEnd = new Date(bucketStart.getTime() + 5 * 60 * 1000);
      
      await db.insert(activityBuckets).values({
        subtaskId: subtask4[0].id,
        date: yesterday,
        startTime: bucketStart.toISOString(),
        endTime: bucketEnd.toISOString(),
        category: i < 5 ? "focus" as const : "idle" as const,
        dominantApp: i < 5 ? "Visual Studio Code" : "System Idle",
        apps: JSON.stringify({
          "Visual Studio Code": i < 5 ? 220 : 0,
          "Terminal": i < 5 ? 60 : 0,
          "Chrome": i < 5 ? 20 : 0,
          "System Idle": i < 5 ? 0 : 300
        }),
        workSessionApp: "Visual Studio Code",
      });
    }

    // Current active subtask (subtask 8 - Timer API, in progress today - more realistic pattern)
    const timerApiStart = new Date(now.getTime() - 2 * 60 * 60 * 1000); // Started 2 hours ago
    for (let i = 0; i < 20; i++) { // 1 hour 40 minutes of current activity
      const bucketStart = new Date(timerApiStart.getTime() + i * 5 * 60 * 1000);
      const bucketEnd = new Date(bucketStart.getTime() + 5 * 60 * 1000);
      
      // More realistic pattern: some focus, some distractions, some idle time
      let category: "focus" | "prefocus" | "distraction" | "idle";
      let dominantApp: string;
      let apps: any;
      
      if (i < 8) { // First 40 minutes: good focus
        category = i % 3 === 0 ? "prefocus" as const : "focus" as const;
        dominantApp = "Visual Studio Code";
        apps = {
          "Visual Studio Code": 240,
          "Terminal": 40,
          "Chrome": 20
        };
      } else if (i < 12) { // 20 minutes: distraction break
        category = "distraction" as const;
        dominantApp = "Slack";
        apps = {
          "Slack": 180,
          "Chrome": 80,
          "Visual Studio Code": 40
        };
      } else if (i < 16) { // 20 minutes: back to focus
        category = i % 2 === 0 ? "focus" as const : "prefocus" as const;
        dominantApp = "Visual Studio Code";
        apps = {
          "Visual Studio Code": 200,
          "Terminal": 80,
          "Chrome": 20
        };
      } else { // Last 20 minutes: losing focus, some idle
        category = i < 18 ? "distraction" as const : "idle" as const;
        dominantApp = i < 18 ? "Chrome" : "System Idle";
        apps = i < 18 ? {
          "Chrome": 160,
          "Slack": 100,
          "Visual Studio Code": 40
        } : {
          "System Idle": 300
        };
      }
      
      await db.insert(activityBuckets).values({
        subtaskId: subtask8[0].id,
        date: today,
        startTime: bucketStart.toISOString(),
        endTime: bucketEnd.toISOString(),
        category,
        dominantApp,
        apps: JSON.stringify(apps),
        workSessionApp: "Visual Studio Code",
      });
    }

    console.log(`Created ${12 + 18 + 9 + 12 + 6 + 20} activity buckets for hackathon project`);
    
    // Add activity buckets for historical hackathon days
    console.log('Creating historical hackathon activity buckets...');
    
    // Yesterday's activities (focus page backend)
    const yesterdayDate = yesterday;
    
    // Subtask 6 - Database schema design (completed yesterday)
    const yesterdaySchemaStart = new Date(new Date(yesterday + 'T09:00:00').getTime()); // Started at 9 AM yesterday
    for (let i = 0; i < 12; i++) { // 1 hour of schema design
      const bucketStart = new Date(yesterdaySchemaStart.getTime() + i * 5 * 60 * 1000);
      const bucketEnd = new Date(bucketStart.getTime() + 5 * 60 * 1000);
      
      await db.insert(activityBuckets).values({
        subtaskId: subtask6[0].id,
        date: yesterdayDate,
        startTime: bucketStart.toISOString(),
        endTime: bucketEnd.toISOString(),
        category: "focus" as const,
        dominantApp: "Visual Studio Code",
        apps: JSON.stringify({
          "Visual Studio Code": 220,
          "DBDiagram.io": 60,
          "Chrome": 20
        }),
        workSessionApp: "Visual Studio Code",
      });
    }

    // Subtask 7 - CRUD operations (spans 2 days - started yesterday, continued today)
    // Day 1: Main implementation (yesterday) 
    const yesterdayCrudStart = new Date(new Date(yesterday + 'T10:00:00').getTime()); // Started at 10 AM yesterday
    for (let i = 0; i < 24; i++) { // 2 hours yesterday
      const bucketStart = new Date(yesterdayCrudStart.getTime() + i * 5 * 60 * 1000);
      const bucketEnd = new Date(bucketStart.getTime() + 5 * 60 * 1000);
      
      await db.insert(activityBuckets).values({
        subtaskId: subtask7[0].id,
        date: yesterdayDate,
        startTime: bucketStart.toISOString(),
        endTime: bucketEnd.toISOString(),
        category: i < 18 ? (i % 6 === 0 ? "prefocus" as const : "focus" as const) : i < 22 ? "distraction" as const : "idle" as const,
        dominantApp: i < 18 ? "Visual Studio Code" : i < 22 ? "Slack" : "System Idle",
        apps: JSON.stringify({
          "Visual Studio Code": i < 18 ? 200 : i < 22 ? 60 : 0,
          "Terminal": i < 18 ? 80 : i < 22 ? 20 : 0,
          "Chrome": i < 18 ? 20 : i < 22 ? 80 : 0,
          "Slack": i < 18 ? 0 : i < 22 ? 140 : 0,
          "System Idle": i < 22 ? 0 : 300
        }),
        workSessionApp: "Visual Studio Code",
      });
    }
    
    // Day 2: Final touches (today, before timer API work)
    const todayCrudStart = new Date(now.getTime() - 5 * 60 * 60 * 1000); // 5 hours ago today
    for (let i = 0; i < 6; i++) { // 30 minutes to finish CRUD
      const bucketStart = new Date(todayCrudStart.getTime() + i * 5 * 60 * 1000);
      const bucketEnd = new Date(bucketStart.getTime() + 5 * 60 * 1000);
      
      await db.insert(activityBuckets).values({
        subtaskId: subtask7[0].id,
        date: today,
        startTime: bucketStart.toISOString(),
        endTime: bucketEnd.toISOString(),
        category: i < 4 ? "focus" as const : "prefocus" as const,
        dominantApp: "Visual Studio Code",
        apps: JSON.stringify({
          "Visual Studio Code": 240,
          "Terminal": 40,
          "Chrome": 20
        }),
        workSessionApp: "Visual Studio Code",
      });
    }

    // Subtask 5 - Routing and layout (completed 2 days ago, with some distractions)
    const twoDaysAgoRoutingStart = new Date(new Date(twoDaysAgo + 'T12:00:00').getTime()); // Started at 12 PM two days ago
    for (let i = 0; i < 24; i++) { // 2 hours of routing setup
      const bucketStart = new Date(twoDaysAgoRoutingStart.getTime() + i * 5 * 60 * 1000);
      const bucketEnd = new Date(bucketStart.getTime() + 5 * 60 * 1000);
      
      await db.insert(activityBuckets).values({
        subtaskId: subtask5[0].id,
        date: twoDaysAgo,
        startTime: bucketStart.toISOString(),
        endTime: bucketEnd.toISOString(),
        category: i < 14 ? "focus" as const : i < 18 ? "prefocus" as const : i < 22 ? "distraction" as const : "idle" as const,
        dominantApp: i < 18 ? "Visual Studio Code" : i < 22 ? "Chrome" : "System Idle",
        apps: JSON.stringify({
          "Visual Studio Code": i < 18 ? 200 : i < 22 ? 40 : 0,
          "Chrome": i < 18 ? 80 : i < 22 ? 180 : 0,
          "Terminal": i < 18 ? 20 : i < 22 ? 80 : 0,
          "System Idle": i < 22 ? 0 : 300
        }),
        workSessionApp: "Visual Studio Code",
      });
    }

    const historicalBuckets = 12 + 24 + 6 + 24; // Yesterday: 12 + 24 + 6, Two days ago: 24
    console.log(`Created ${historicalBuckets} historical hackathon activity buckets`);
    
    console.log(`Created ${12 + 18 + 9 + 18 + 20 + historicalBuckets} total activity buckets for hackathon project`);
    
    
    // Show summary
    const allTasks = await db.select().from(tasks);
    const allSubtasks = await db.select().from(subtasks);
    const allBuckets = await db.select().from(activityBuckets);
    
    console.log(`\n=== TEST DATA SUMMARY ===`);
    console.log(`Tasks: ${allTasks.length} (${allTasks.filter(t => t.isCompleted).length} completed)`);
    console.log(`Subtasks: ${allSubtasks.length} (${allSubtasks.filter(s => s.isCompleted).length} completed, ${allSubtasks.filter(s => s.isActive).length} active)`);
    console.log(`Activity Buckets: ${allBuckets.length}`);
    
    console.log(`\nScheduled subtasks by day:`);
    console.log(`  Three days ago (${threeDaysAgo}): ${allSubtasks.filter(s => s.scheduledDate === threeDaysAgo).length}`);
    console.log(`  Yesterday (${yesterday}): ${allSubtasks.filter(s => s.scheduledDate === yesterday).length}`);
    console.log(`  Today (${today}): ${allSubtasks.filter(s => s.scheduledDate === today).length}`);
    console.log(`  Future subtasks: ${allSubtasks.filter(s => s.scheduledDate && new Date(s.scheduledDate) > new Date(today)).length}`);

  } catch (error) {
    console.error('Error adding test data:', error);
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