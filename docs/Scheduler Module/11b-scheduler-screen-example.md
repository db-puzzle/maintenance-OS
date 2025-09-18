<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gantt Chart + Scheduler Pro Demo</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            /* Light mode colors */
            --gantt-bg: #f9fafb;
            --gantt-grid-bg: #f3f4f6;
            --gantt-header-bg: #ffffff;
            --gantt-text: #374151;
            --gantt-text-secondary: #6b7280;
            --gantt-header-text: #4b5563;
            --gantt-task-bg: #60a5fa;
            --gantt-task-progress: rgba(0, 0, 0, 0.15);
            --gantt-task-text: #ffffff;
            --gantt-border: #e5e7eb;
            --gantt-dependency: #9ca3af;
            --gantt-nonworking: rgba(239, 68, 68, 0.1);
            --gantt-hover: rgba(0, 0, 0, 0.05);
            --gantt-selected: #3b82f6;
            --gantt-milestone: #f59e0b;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: var(--gantt-bg);
            color: var(--gantt-text);
            height: 100vh;
            overflow: hidden;
        }

        .app-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }

        /* Header Toolbar */
        .toolbar {
            background: var(--gantt-header-bg);
            border-bottom: 1px solid var(--gantt-border);
            padding: 12px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
        }

        .toolbar-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--gantt-text);
        }

        .toolbar-controls {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .theme-selector {
            padding: 6px 12px;
            border: 1px solid var(--gantt-border);
            border-radius: 6px;
            background: white;
            cursor: pointer;
            font-size: 14px;
        }

        .btn {
            padding: 6px 12px;
            border: 1px solid var(--gantt-border);
            border-radius: 6px;
            background: white;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }

        .btn:hover {
            background: var(--gantt-grid-bg);
        }

        .btn-primary {
            background: var(--gantt-selected);
            color: white;
            border-color: var(--gantt-selected);
        }

        .btn-primary:hover {
            background: #2563eb;
        }

        /* Main content area */
        .content-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* Gantt View */
        .gantt-view {
            flex: 1;
            display: flex;
            flex-direction: column;
            border-bottom: 2px solid var(--gantt-border);
            min-height: 300px;
        }

        .gantt-container {
            display: flex;
            flex: 1;
            overflow: hidden;
        }

        /* Gantt Grid (Left Panel) */
        .gantt-grid {
            width: 610px;
            background: var(--gantt-header-bg);
            border-right: 1px solid var(--gantt-border);
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
        }

        .gantt-grid-header {
            display: flex;
            background: var(--gantt-header-bg);
            border-bottom: 1px solid var(--gantt-border);
            height: 40px;
            flex-shrink: 0;
        }

        .grid-column {
            display: flex;
            align-items: center;
            padding: 0 12px;
            font-size: 13px;
            font-weight: 600;
            color: var(--gantt-header-text);
            border-right: 1px solid var(--gantt-border);
        }

        .col-sequence { width: 50px; justify-content: center; }
        .col-name { width: 280px; }
        .col-percent { width: 120px; }
        .col-resources { width: 160px; }

        .gantt-grid-body {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
        }

        .gantt-row {
            display: flex;
            height: 45px;
            border-bottom: 1px solid var(--gantt-border);
            background: white;
            transition: background 0.2s;
        }

        .gantt-row:hover {
            background: var(--gantt-hover);
        }

        .gantt-row.selected {
            background: rgba(59, 130, 246, 0.1);
        }

        .grid-cell {
            display: flex;
            align-items: center;
            padding: 0 12px;
            font-size: 14px;
            border-right: 1px solid var(--gantt-border);
            overflow: hidden;
        }

        .cell-sequence {
            width: 50px;
            justify-content: flex-end;
            color: var(--gantt-text-secondary);
            font-size: 12px;
        }

        .cell-name {
            width: 280px;
            gap: 6px;
        }

        .tree-icon {
            width: 16px;
            height: 16px;
            cursor: pointer;
            transition: transform 0.2s;
            flex-shrink: 0;
        }

        .tree-icon.expanded {
            transform: rotate(90deg);
        }

        .task-icon {
            width: 16px;
            height: 16px;
            flex-shrink: 0;
        }

        .task-name {
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .cell-percent {
            width: 120px;
        }

        .progress-bar {
            width: 100%;
            height: 20px;
            background: var(--gantt-grid-bg);
            border-radius: 10px;
            overflow: hidden;
            position: relative;
        }

        .progress-fill {
            height: 100%;
            background: #10b981;
            transition: width 0.3s;
        }

        .progress-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 11px;
            font-weight: 600;
            color: var(--gantt-text);
        }

        .cell-resources {
            width: 160px;
            gap: 4px;
        }

        .resource-avatar {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: var(--gantt-selected);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 600;
        }

        /* Gantt Timeline (Right Panel) */
        .gantt-timeline {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
        }

        .timeline-header {
            height: 40px;
            background: var(--gantt-header-bg);
            border-bottom: 1px solid var(--gantt-border);
            position: relative;
            overflow: hidden;
            flex-shrink: 0;
        }

        .timeline-header-content {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            display: flex;
        }

        .timeline-body {
            flex: 1;
            position: relative;
            overflow: auto;
        }

        .timeline-content {
            position: relative;
            min-width: 100%;
        }

        .timeline-grid {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
        }

        .day-column {
            position: absolute;
            top: 0;
            bottom: 0;
            border-right: 1px solid var(--gantt-border);
        }

        .day-column.weekend {
            background: var(--gantt-nonworking);
        }

        .timeline-tasks {
            position: relative;
        }

        .task-bar-row {
            height: 45px;
            position: relative;
            border-bottom: 1px solid var(--gantt-border);
        }

        .task-bar {
            position: absolute;
            height: 30px;
            top: 7px;
            background: var(--gantt-task-bg);
            border-radius: 4px;
            cursor: move;
            display: flex;
            align-items: center;
            padding: 0 8px;
            transition: transform 0.2s, box-shadow 0.2s;
            z-index: 10;
        }

        .task-bar:hover {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            transform: translateY(-1px);
        }

        .task-bar.parent {
            background: var(--gantt-text);
        }

        .task-bar.milestone {
            background: var(--gantt-milestone);
            width: 30px !important;
            border-radius: 50%;
            padding: 0;
            justify-content: center;
        }

        .task-progress {
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            background: var(--gantt-task-progress);
            border-radius: 4px;
        }

        .task-label {
            position: relative;
            color: var(--gantt-task-text);
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            z-index: 1;
        }

        .dependency-line {
            position: absolute;
            stroke: var(--gantt-dependency);
            stroke-width: 2;
            fill: none;
            pointer-events: none;
            z-index: 5;
        }

        .milestone-line {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 2px;
            background: var(--gantt-milestone);
            z-index: 15;
        }

        .milestone-label {
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--gantt-milestone);
            color: white;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
        }

        /* Splitter */
        .splitter {
            height: 4px;
            background: var(--gantt-border);
            cursor: row-resize;
            position: relative;
            flex-shrink: 0;
        }

        .splitter:hover {
            background: var(--gantt-selected);
        }

        /* Scheduler View */
        .scheduler-view {
            flex: 1;
            display: flex;
            overflow: hidden;
            min-height: 200px;
        }

        .scheduler-grid {
            width: 610px;
            background: var(--gantt-header-bg);
            border-right: 1px solid var(--gantt-border);
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
        }

        .scheduler-timeline {
            flex: 1;
            position: relative;
            overflow: auto;
        }

        .resource-row {
            display: flex;
            height: 60px;
            border-bottom: 1px solid var(--gantt-border);
            background: white;
        }

        .resource-row:hover {
            background: var(--gantt-hover);
        }

        .resource-cell {
            display: flex;
            align-items: center;
            padding: 0 12px;
            gap: 8px;
        }

        .resource-name {
            width: 200px;
            font-weight: 500;
        }

        .resource-tasks {
            width: 200px;
            color: var(--gantt-text-secondary);
            font-size: 13px;
        }

        .resource-days {
            width: 210px;
            color: var(--gantt-text-secondary);
            font-size: 13px;
        }

        .allocation-bar {
            position: absolute;
            height: 40px;
            top: 10px;
            background: var(--gantt-selected);
            border-radius: 4px;
            display: flex;
            align-items: center;
            padding: 0 8px;
            cursor: move;
            z-index: 10;
        }

        .allocation-label {
            color: white;
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* Scrollbar styling */
        ::-webkit-scrollbar {
            width: 10px;
            height: 10px;
        }

        ::-webkit-scrollbar-track {
            background: var(--gantt-grid-bg);
        }

        ::-webkit-scrollbar-thumb {
            background: var(--gantt-text-secondary);
            border-radius: 5px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--gantt-text);
        }
    </style>
</head>
<body>
    <div class="app-container">
        <!-- Toolbar -->
        <div class="toolbar">
            <div class="toolbar-title">Gantt chart + Scheduler Pro demo</div>
            <div class="toolbar-controls">
                <select class="theme-selector">
                    <option>Light Theme</option>
                    <option>Dark Theme</option>
                </select>
                <button class="btn" onclick="zoomIn()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35M11 8v6M8 11h6"/>
                    </svg>
                    Zoom In
                </button>
                <button class="btn" onclick="zoomOut()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35M8 11h6"/>
                    </svg>
                    Zoom Out
                </button>
                <button class="btn btn-primary" onclick="toggleFullscreen()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                    </svg>
                    Fullscreen
                </button>
            </div>
        </div>

        <!-- Content Area -->
        <div class="content-area">
            <!-- Gantt View -->
            <div class="gantt-view">
                <div class="gantt-container">
                    <!-- Gantt Grid -->
                    <div class="gantt-grid">
                        <div class="gantt-grid-header">
                            <div class="grid-column col-sequence">#</div>
                            <div class="grid-column col-name">Name</div>
                            <div class="grid-column col-percent">% Complete</div>
                            <div class="grid-column col-resources">Resources</div>
                        </div>
                        <div class="gantt-grid-body" id="ganttGridBody"></div>
                    </div>

                    <!-- Gantt Timeline -->
                    <div class="gantt-timeline">
                        <div class="timeline-header">
                            <div class="timeline-header-content" id="timelineHeader"></div>
                        </div>
                        <div class="timeline-body" id="ganttTimelineBody">
                            <div class="timeline-content" id="timelineContent">
                                <div class="timeline-grid" id="timelineGrid"></div>
                                <svg class="dependency-lines" id="dependencyLines" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"></svg>
                                <div class="timeline-tasks" id="timelineTasks"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Splitter -->
            <div class="splitter" id="splitter"></div>

            <!-- Scheduler View -->
            <div class="scheduler-view">
                <div class="scheduler-grid">
                    <div class="gantt-grid-header">
                        <div class="grid-column" style="width: 200px;">Resource</div>
                        <div class="grid-column" style="width: 200px;">Assigned Tasks</div>
                        <div class="grid-column" style="width: 210px;">Work Days</div>
                    </div>
                    <div class="gantt-grid-body" id="schedulerGridBody"></div>
                </div>
                <div class="scheduler-timeline" id="schedulerTimeline">
                    <div class="timeline-content" style="position: relative;" id="schedulerContent">
                        <div class="timeline-grid" id="schedulerGrid"></div>
                        <div id="schedulerAllocations"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Production-scale data model with 1000s of tasks
        const projectData = {
            startDate: new Date('2025-01-06'),
            endDate: new Date('2025-03-30'),
            tasks: [],
            resources: [],
            assignments: [],
            dependencies: []
        };

        // Generate large dataset for production testing
        function generateProductionData() {
            const resources = [
                { id: 1, name: 'Work Cell A1', type: 'internal', capacity: 'finite' },
                { id: 2, name: 'Work Cell A2', type: 'internal', capacity: 'finite' },
                { id: 3, name: 'Work Cell B1', type: 'internal', capacity: 'infinite' },
                { id: 4, name: 'Work Cell B2', type: 'internal', capacity: 'finite' },
                { id: 5, name: 'Assembly Line 1', type: 'internal', capacity: 'finite' },
                { id: 6, name: 'Assembly Line 2', type: 'internal', capacity: 'finite' },
                { id: 7, name: 'QC Station 1', type: 'internal', capacity: 'finite' },
                { id: 8, name: 'External Vendor', type: 'external', capacity: 'infinite' }
            ];

            const tasks = [];
            const dependencies = [];
            const assignments = [];
            let taskId = 1;

            // Generate multiple manufacturing orders
            for (let order = 1; order <= 5; order++) {
                const orderTask = {
                    id: taskId++,
                    name: `Manufacturing Order MO-2025-${String(order).padStart(3, '0')}`,
                    startDate: new Date(2025, 0, 6 + (order - 1) * 14),
                    duration: 10,
                    percentDone: order === 1 ? 75 : order === 2 ? 45 : order === 3 ? 20 : 0,
                    expanded: order <= 2,
                    level: 0,
                    isParent: true,
                    children: []
                };

                // Generate routing steps for each order
                const routingSteps = [
                    'Material Preparation',
                    'Initial Processing',
                    'Secondary Processing',
                    'Quality Check',
                    'Assembly',
                    'Final QC',
                    'Packaging'
                ];

                let previousStepId = null;
                routingSteps.forEach((step, stepIndex) => {
                    const stepTask = {
                        id: taskId++,
                        name: `${step}`,
                        startDate: new Date(orderTask.startDate.getTime() + stepIndex * 2 * 24 * 60 * 60 * 1000),
                        duration: 2,
                        percentDone: order === 1 ? Math.max(0, 100 - stepIndex * 15) : 0,
                        parentId: orderTask.id,
                        level: 1,
                        isParent: false
                    };

                    orderTask.children.push(stepTask.id);
                    tasks.push(stepTask);

                    // Create dependency from previous step
                    if (previousStepId) {
                        dependencies.push({
                            id: dependencies.length + 1,
                            from: previousStepId,
                            to: stepTask.id,
                            type: 'finish-to-start'
                        });
                    }

                    // Assign resources
                    const resourceId = resources[stepIndex % resources.length].id;
                    assignments.push({
                        id: assignments.length + 1,
                        taskId: stepTask.id,
                        resourceId: resourceId
                    });

                    previousStepId = stepTask.id;
                });

                tasks.push(orderTask);
            }

            projectData.tasks = tasks;
            projectData.resources = resources;
            projectData.assignments = assignments;
            projectData.dependencies = dependencies;
        }

        // Initialize data
        generateProductionData();

        // Current zoom level (days per pixel)
        let zoomLevel = 40; // pixels per day
        let scrollSyncX = 0;

        // Render functions
        function renderGanttGrid() {
            const gridBody = document.getElementById('ganttGridBody');
            gridBody.innerHTML = '';

            const visibleTasks = projectData.tasks.filter(task => {
                if (task.level === 0) return true;
                const parent = projectData.tasks.find(t => t.id === task.parentId);
                return parent && parent.expanded;
            });

            visibleTasks.forEach((task, index) => {
                const row = document.createElement('div');
                row.className = 'gantt-row';
                row.dataset.taskId = task.id;

                // Calculate indentation
                const indent = task.level * 24;

                // Sequence number
                const seqCell = document.createElement('div');
                seqCell.className = 'grid-cell cell-sequence';
                seqCell.textContent = index + 1;
                row.appendChild(seqCell);

                // Name cell
                const nameCell = document.createElement('div');
                nameCell.className = 'grid-cell cell-name';
                nameCell.style.paddingLeft = `${12 + indent}px`;

                if (task.isParent) {
                    const treeIcon = document.createElement('div');
                    treeIcon.className = `tree-icon ${task.expanded ? 'expanded' : ''}`;
                    treeIcon.innerHTML = '▶';
                    treeIcon.onclick = () => toggleTask(task.id);
                    nameCell.appendChild(treeIcon);
                }

                const taskName = document.createElement('div');
                taskName.className = 'task-name';
                taskName.textContent = task.name;
                nameCell.appendChild(taskName);
                row.appendChild(nameCell);

                // Percent complete
                const percentCell = document.createElement('div');
                percentCell.className = 'grid-cell cell-percent';
                percentCell.innerHTML = `
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${task.percentDone}%"></div>
                        <div class="progress-text">${task.percentDone}%</div>
                    </div>
                `;
                row.appendChild(percentCell);

                // Resources
                const resourceCell = document.createElement('div');
                resourceCell.className = 'grid-cell cell-resources';
                const taskAssignments = projectData.assignments.filter(a => a.taskId === task.id);
                taskAssignments.forEach(assignment => {
                    const resource = projectData.resources.find(r => r.id === assignment.resourceId);
                    if (resource) {
                        const avatar = document.createElement('div');
                        avatar.className = 'resource-avatar';
                        avatar.textContent = resource.name.substring(0, 2);
                        resourceCell.appendChild(avatar);
                    }
                });
                row.appendChild(resourceCell);

                gridBody.appendChild(row);
            });
        }

        function renderTimeline() {
            const timelineHeader = document.getElementById('timelineHeader');
            const timelineGrid = document.getElementById('timelineGrid');
            const timelineTasks = document.getElementById('timelineTasks');

            // Calculate timeline width
            const daysDiff = Math.ceil((projectData.endDate - projectData.startDate) / (1000 * 60 * 60 * 24));
            const timelineWidth = daysDiff * zoomLevel;

            // Set content width
            document.getElementById('timelineContent').style.width = `${timelineWidth}px`;
            document.getElementById('schedulerContent').style.width = `${timelineWidth}px`;

            // Clear existing content
            timelineHeader.innerHTML = '';
            timelineGrid.innerHTML = '';
            timelineTasks.innerHTML = '';

            // Render header and grid columns
            const currentDate = new Date(projectData.startDate);
            for (let day = 0; day < daysDiff; day++) {
                // Header
                const dayHeader = document.createElement('div');
                dayHeader.style.position = 'absolute';
                dayHeader.style.left = `${day * zoomLevel}px`;
                dayHeader.style.width = `${zoomLevel}px`;
                dayHeader.style.height = '100%';
                dayHeader.style.borderRight = '1px solid var(--gantt-border)';
                dayHeader.style.display = 'flex';
                dayHeader.style.alignItems = 'center';
                dayHeader.style.justifyContent = 'center';
                dayHeader.style.fontSize = '12px';
                dayHeader.style.color = 'var(--gantt-header-text)';
                
                const dayOfWeek = currentDate.getDay();
                const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                dayHeader.textContent = dayNames[dayOfWeek];
                
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    dayHeader.style.background = 'var(--gantt-nonworking)';
                }
                
                timelineHeader.appendChild(dayHeader);

                // Grid column
                const gridCol = document.createElement('div');
                gridCol.className = `day-column ${(dayOfWeek === 0 || dayOfWeek === 6) ? 'weekend' : ''}`;
                gridCol.style.left = `${day * zoomLevel}px`;
                gridCol.style.width = `${zoomLevel}px`;
                timelineGrid.appendChild(gridCol);

                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Render task bars
            const visibleTasks = projectData.tasks.filter(task => {
                if (task.level === 0) return true;
                const parent = projectData.tasks.find(t => t.id === task.parentId);
                return parent && parent.expanded;
            });

            visibleTasks.forEach((task, index) => {
                const taskRow = document.createElement('div');
                taskRow.className = 'task-bar-row';

                const startOffset = Math.floor((task.startDate - projectData.startDate) / (1000 * 60 * 60 * 24));
                const taskWidth = task.duration * zoomLevel;

                const taskBar = document.createElement('div');
                taskBar.className = `task-bar ${task.isParent ? 'parent' : ''}`;
                taskBar.style.left = `${startOffset * zoomLevel}px`;
                taskBar.style.width = `${taskWidth}px`;
                taskBar.dataset.taskId = task.id;

                // Progress indicator
                if (task.percentDone > 0) {
                    const progress = document.createElement('div');
                    progress.className = 'task-progress';
                    progress.style.width = `${task.percentDone}%`;
                    taskBar.appendChild(progress);
                }

                // Task label
                const label = document.createElement('div');
                label.className = 'task-label';
                label.textContent = task.name;
                taskBar.appendChild(label);

                // Drag functionality
                taskBar.draggable = true;
                taskBar.ondragstart = (e) => handleTaskDragStart(e, task);
                taskBar.ondragend = handleTaskDragEnd;

                taskRow.appendChild(taskBar);
                timelineTasks.appendChild(taskRow);
            });

            // Render dependencies
            renderDependencies();

            // Render milestones
            renderMilestones();
        }

        function renderDependencies() {
            const svg = document.getElementById('dependencyLines');
            svg.innerHTML = '';

            const visibleTasks = projectData.tasks.filter(task => {
                if (task.level === 0) return true;
                const parent = projectData.tasks.find(t => t.id === task.parentId);
                return parent && parent.expanded;
            });

            projectData.dependencies.forEach(dep => {
                const fromTask = visibleTasks.find(t => t.id === dep.from);
                const toTask = visibleTasks.find(t => t.id === dep.to);

                if (fromTask && toTask) {
                    const fromIndex = visibleTasks.indexOf(fromTask);
                    const toIndex = visibleTasks.indexOf(toTask);

                    const fromX = Math.floor((fromTask.startDate - projectData.startDate) / (1000 * 60 * 60 * 24)) * zoomLevel + fromTask.duration * zoomLevel;
                    const fromY = fromIndex * 45 + 22;

                    const toX = Math.floor((toTask.startDate - projectData.startDate) / (1000 * 60 * 60 * 24)) * zoomLevel;
                    const toY = toIndex * 45 + 22;

                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', `M ${fromX} ${fromY} L ${fromX + 10} ${fromY} L ${fromX + 10} ${toY} L ${toX} ${toY}`);
                    path.setAttribute('class', 'dependency-line');
                    svg.appendChild(path);

                    // Arrow head
                    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                    arrow.setAttribute('points', `${toX},${toY - 4} ${toX - 8},${toY} ${toX},${toY + 4}`);
                    arrow.setAttribute('fill', 'var(--gantt-dependency)');
                    svg.appendChild(arrow);
                }
            });
        }

        function renderMilestones() {
            const timelineContent = document.getElementById('timelineContent');
            
            // Project start milestone
            const startOffset = 0;
            const startMilestone = document.createElement('div');
            startMilestone.className = 'milestone-line';
            startMilestone.style.left = `${startOffset}px`;
            startMilestone.innerHTML = '<div class="milestone-label">Project start</div>';
            timelineContent.appendChild(startMilestone);

            // Project end milestone
            const endOffset = Math.floor((projectData.endDate - projectData.startDate) / (1000 * 60 * 60 * 24)) * zoomLevel;
            const endMilestone = document.createElement('div');
            endMilestone.className = 'milestone-line';
            endMilestone.style.left = `${endOffset}px`;
            endMilestone.innerHTML = '<div class="milestone-label">Project end</div>';
            timelineContent.appendChild(endMilestone);
        }

        function renderScheduler() {
            const schedulerGridBody = document.getElementById('schedulerGridBody');
            const schedulerAllocations = document.getElementById('schedulerAllocations');
            const schedulerGrid = document.getElementById('schedulerGrid');

            // Clear existing content
            schedulerGridBody.innerHTML = '';
            schedulerAllocations.innerHTML = '';
            schedulerGrid.innerHTML = '';

            // Calculate timeline width (same as gantt timeline)
            const daysDiff = Math.ceil((projectData.endDate - projectData.startDate) / (1000 * 60 * 60 * 24));
            const timelineWidth = daysDiff * zoomLevel;

            // Render time grid columns (same as gantt)
            const currentDate = new Date(projectData.startDate);
            for (let day = 0; day < daysDiff; day++) {
                const dayOfWeek = currentDate.getDay();
                
                const gridCol = document.createElement('div');
                gridCol.className = `day-column ${(dayOfWeek === 0 || dayOfWeek === 6) ? 'weekend' : ''}`;
                gridCol.style.left = `${day * zoomLevel}px`;
                gridCol.style.width = `${zoomLevel}px`;
                schedulerGrid.appendChild(gridCol);

                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Set the height for allocations container to match resources
            schedulerAllocations.style.height = `${projectData.resources.length * 60}px`;
            schedulerAllocations.style.position = 'relative';

            // Render resource grid and their allocations
            projectData.resources.forEach((resource, index) => {
                // Create resource row in grid
                const row = document.createElement('div');
                row.className = 'resource-row';

                const nameCell = document.createElement('div');
                nameCell.className = 'resource-cell resource-name';
                nameCell.textContent = resource.name;
                row.appendChild(nameCell);

                const tasksCell = document.createElement('div');
                tasksCell.className = 'resource-cell resource-tasks';
                const taskCount = projectData.assignments.filter(a => a.resourceId === resource.id).length;
                tasksCell.textContent = `${taskCount} tasks`;
                row.appendChild(tasksCell);

                const daysCell = document.createElement('div');
                daysCell.className = 'resource-cell resource-days';
                const totalDays = projectData.assignments
                    .filter(a => a.resourceId === resource.id)
                    .reduce((sum, a) => {
                        const task = projectData.tasks.find(t => t.id === a.taskId);
                        return sum + (task ? task.duration : 0);
                    }, 0);
                daysCell.textContent = `${totalDays} days`;
                row.appendChild(daysCell);

                schedulerGridBody.appendChild(row);

                // Render allocations for this resource in the timeline
                const resourceAllocations = projectData.assignments.filter(a => a.resourceId === resource.id);
                resourceAllocations.forEach(assignment => {
                    const task = projectData.tasks.find(t => t.id === assignment.taskId);
                    if (task && !task.isParent) { // Only show leaf tasks
                        const allocationBar = document.createElement('div');
                        allocationBar.className = 'allocation-bar';
                        
                        const startOffset = Math.floor((task.startDate - projectData.startDate) / (1000 * 60 * 60 * 24));
                        allocationBar.style.left = `${startOffset * zoomLevel}px`;
                        allocationBar.style.width = `${task.duration * zoomLevel}px`;
                        allocationBar.style.top = `${index * 60 + 10}px`; // Position based on resource index

                        const label = document.createElement('div');
                        label.className = 'allocation-label';
                        label.textContent = task.name;
                        allocationBar.appendChild(label);

                        // Add drag functionality
                        allocationBar.draggable = true;
                        allocationBar.dataset.taskId = task.id;
                        allocationBar.dataset.resourceId = resource.id;

                        schedulerAllocations.appendChild(allocationBar);
                    }
                });
            });
        }

        // Event handlers
        function toggleTask(taskId) {
            const task = projectData.tasks.find(t => t.id === taskId);
            if (task) {
                task.expanded = !task.expanded;
                renderGanttGrid();
                renderTimeline();
            }
        }

        function handleTaskDragStart(e, task) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('taskId', task.id);
            e.target.style.opacity = '0.5';
        }

        function handleTaskDragEnd(e) {
            e.target.style.opacity = '1';
        }

        function zoomIn() {
            zoomLevel = Math.min(100, zoomLevel * 1.2);
            renderTimeline();
            renderScheduler();
        }

        function zoomOut() {
            zoomLevel = Math.max(20, zoomLevel / 1.2);
            renderTimeline();
            renderScheduler();
        }

        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        }

        // Scroll synchronization
        function setupScrollSync() {
            const ganttGridBody = document.getElementById('ganttGridBody');
            const ganttTimelineBody = document.getElementById('ganttTimelineBody');
            const schedulerGridBody = document.getElementById('schedulerGridBody');
            const schedulerTimeline = document.getElementById('schedulerTimeline');

            let isSyncingGanttScroll = false;
            let isSyncingSchedulerScroll = false;
            let isSyncingHorizontalScroll = false;

            // GANTT VIEW: Sync vertical scroll between gantt grid and timeline
            ganttGridBody.addEventListener('scroll', () => {
                if (!isSyncingGanttScroll) {
                    isSyncingGanttScroll = true;
                    ganttTimelineBody.scrollTop = ganttGridBody.scrollTop;
                    requestAnimationFrame(() => { isSyncingGanttScroll = false; });
                }
            });

            ganttTimelineBody.addEventListener('scroll', () => {
                if (!isSyncingGanttScroll) {
                    isSyncingGanttScroll = true;
                    ganttGridBody.scrollTop = ganttTimelineBody.scrollTop;
                    requestAnimationFrame(() => { isSyncingGanttScroll = false; });
                }
                
                // Sync horizontal scroll with scheduler timeline
                if (!isSyncingHorizontalScroll) {
                    isSyncingHorizontalScroll = true;
                    schedulerTimeline.scrollLeft = ganttTimelineBody.scrollLeft;
                    
                    // Update header position
                    document.getElementById('timelineHeader').style.transform = `translateX(-${ganttTimelineBody.scrollLeft}px)`;
                    
                    requestAnimationFrame(() => { isSyncingHorizontalScroll = false; });
                }
            });

            // SCHEDULER VIEW: Sync vertical scroll between scheduler grid and timeline
            schedulerGridBody.addEventListener('scroll', () => {
                if (!isSyncingSchedulerScroll) {
                    isSyncingSchedulerScroll = true;
                    schedulerTimeline.scrollTop = schedulerGridBody.scrollTop;
                    requestAnimationFrame(() => { isSyncingSchedulerScroll = false; });
                }
            });

            schedulerTimeline.addEventListener('scroll', () => {
                if (!isSyncingSchedulerScroll) {
                    isSyncingSchedulerScroll = true;
                    schedulerGridBody.scrollTop = schedulerTimeline.scrollTop;
                    requestAnimationFrame(() => { isSyncingSchedulerScroll = false; });
                }
                
                // Sync horizontal scroll with gantt timeline
                if (!isSyncingHorizontalScroll) {
                    isSyncingHorizontalScroll = true;
                    ganttTimelineBody.scrollLeft = schedulerTimeline.scrollLeft;
                    
                    // Update header position
                    document.getElementById('timelineHeader').style.transform = `translateX(-${schedulerTimeline.scrollLeft}px)`;
                    
                    requestAnimationFrame(() => { isSyncingHorizontalScroll = false; });
                }
            });
        }

        // Splitter functionality
        function setupSplitter() {
            const splitter = document.getElementById('splitter');
            const ganttView = document.querySelector('.gantt-view');
            const schedulerView = document.querySelector('.scheduler-view');
            let isResizing = false;
            let startY = 0;
            let startHeight = 0;

            splitter.addEventListener('mousedown', (e) => {
                isResizing = true;
                startY = e.clientY;
                startHeight = ganttView.offsetHeight;
                document.body.style.cursor = 'row-resize';
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isResizing) return;
                
                const deltaY = e.clientY - startY;
                const newHeight = Math.max(200, Math.min(window.innerHeight - 300, startHeight + deltaY));
                
                ganttView.style.flex = 'none';
                ganttView.style.height = `${newHeight}px`;
                schedulerView.style.flex = '1';
            });

            document.addEventListener('mouseup', () => {
                isResizing = false;
                document.body.style.cursor = '';
            });
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            renderGanttGrid();
            renderTimeline();
            renderScheduler();
            setupScrollSync();
            setupSplitter();
        });
    </script>
</body>
</html>