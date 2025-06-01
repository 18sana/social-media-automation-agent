/**
 * Aether Agent Workspace - Main Application Logic
 * Manages dashboard state, rendering scheduled queues, Slack alerts, and calendar setups.
 */

document.addEventListener("DOMContentLoaded", () => {
    // ---------------------------------------------------------
    // 1. STATE INITIALIZATION
    // ---------------------------------------------------------
    const state = {
        posts: [...window.SocialMediaMockData.posts],
        templates: [...window.SocialMediaMockData.templates],
        logs: [...window.SocialMediaMockData.systemLogs],
        activeTab: "dashboard",
        activeWorkflowPost: null, // Holds post currently undergoing generation
        slackUnreadCount: 1,
        // Calendar date focus (May 2026 as per local dates)
        currentYear: 2026,
        currentMonth: 4, // 0-indexed, so 4 is May
    };

    // Instantiate simulated LangGraph engine
    const workflow = new AgentWorkflowEngine(
        // Graph node change callback
        (nodeId) => updateGraphVisualization(nodeId),
        // Log output callback
        (logObj) => addConsoleLog(logObj)
    );

    // ---------------------------------------------------------
    // 2. DOM ELEMENT BINDINGS
    // ---------------------------------------------------------
    const dom = {
        // Navigation & Titles
        navItems: document.querySelectorAll(".sidebar-nav .nav-item"),
        tabContents: document.querySelectorAll(".tab-content"),
        tabTitle: document.getElementById("current-tab-title"),
        tabSubtitle: document.getElementById("current-tab-subtitle"),
        
        // Metrics Numbers
        metricTotal: document.getElementById("metric-total"),
        metricReview: document.getElementById("metric-review"),
        metricScheduled: document.getElementById("metric-scheduled"),
        metricPublished: document.getElementById("metric-published"),
        
        // Inbox & Cards Containers
        hitlContainer: document.getElementById("hitl-inbox-container"),
        inboxCount: document.getElementById("inbox-count"),
        
        // Scheduler Views
        calendarDaysGrid: document.getElementById("calendar-days-grid"),
        calendarMonthYear: document.getElementById("calendar-month-year"),
        calendarCountBadge: document.getElementById("calendar-count-badge"),
        scheduledPostsList: document.getElementById("schedule-posts-list"),
        btnPrevMonth: document.getElementById("btn-prev-month"),
        btnNextMonth: document.getElementById("btn-next-month"),
        
        // Terminal elements
        logsContainer: document.getElementById("terminal-logs-container"),
        btnClearLogs: document.getElementById("btn-clear-logs"),
        
        // Slack Drawer components
        slackDrawer: document.getElementById("slack-drawer"),
        slackMessages: document.getElementById("slack-messages"),
        btnToggleSlack: document.getElementById("btn-toggle-slack"),
        btnCloseSlack: document.getElementById("btn-close-slack"),
        slackUnreadBadge: document.getElementById("slack-unread-badge"),
        
        // Creator Modal components
        creatorModal: document.getElementById("creator-modal"),
        btnOpenCreator: document.getElementById("btn-open-creator"),
        btnCloseCreator: document.getElementById("btn-close-creator"),
        btnCancelCreator: document.getElementById("btn-cancel-creator"),
        btnTriggerAgent: document.getElementById("btn-trigger-agent"),
        agentTemplateSelect: document.getElementById("agent-template-select"),
        agentPlatformSelect: document.getElementById("agent-platform-select"),
        agentTopicInput: document.getElementById("agent-topic-input"),
        agentToneSelect: document.getElementById("agent-tone-select"),
        agentPromptInput: document.getElementById("agent-prompt-input"),

        // Revision Modal components
        revisionModal: document.getElementById("revision-modal"),
        btnCloseRevision: document.getElementById("btn-close-revision"),
        btnCancelRevision: document.getElementById("btn-cancel-revision"),
        btnSubmitRevision: document.getElementById("btn-submit-revision"),
        revisionFeedbackInput: document.getElementById("revision-feedback-input")
    };

    // ---------------------------------------------------------
    // 3. TAB CONTROLLER
    // ---------------------------------------------------------
    dom.navItems.forEach(button => {
        button.addEventListener("click", () => {
            const targetTab = button.getAttribute("data-tab");
            
            // Toggle active buttons
            dom.navItems.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
            
            // Toggle view containers
            dom.tabContents.forEach(content => {
                content.classList.remove("active");
                if (content.getAttribute("id") === `tab-${targetTab}`) {
                    content.classList.add("active");
                }
            });

            state.activeTab = targetTab;
            updateHeaderTitles(targetTab);

            // Trigger conditional rendering
            if (targetTab === "scheduler") {
                renderCalendar();
                renderScheduledList();
            }
        });
    });

    function updateHeaderTitles(tab) {
        const titles = {
            dashboard: {
                title: "Dashboard & Workflow",
                subtitle: "Generate posts, run LangGraph routines, and authorize queued outputs."
            },
            scheduler: {
                title: "Calendar & Scheduler",
                subtitle: "Map planned social updates, manage calendar slots, and view publication queues."
            },
            integrations: {
                title: "Settings & API Config",
                subtitle: "Manage external platform tokens, OAuth workflows, and automated cron triggers."
            }
        };
        dom.tabTitle.innerText = titles[tab].title;
        dom.tabSubtitle.innerText = titles[tab].subtitle;
    }

    // ---------------------------------------------------------
    // 4. METRICS & CARD RENDERERS
    // ---------------------------------------------------------
    function updateMetrics() {
        const reviewCount = state.posts.filter(p => p.status === "review").length;
        const scheduledCount = state.posts.filter(p => p.status === "scheduled").length;
        const publishedCount = state.posts.filter(p => p.status === "published").length;
        
        dom.metricTotal.innerText = state.posts.length;
        dom.metricReview.innerText = reviewCount;
        dom.metricScheduled.innerText = scheduledCount;
        dom.metricPublished.innerText = publishedCount;
        
        dom.inboxCount.innerText = reviewCount;
    }

    function renderHITLInbox() {
        const reviewPosts = state.posts.filter(p => p.status === "review");
        dom.hitlContainer.innerHTML = "";

        if (reviewPosts.length === 0) {
            dom.hitlContainer.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🎉</span>
                    <p>All clean! No posts currently in review.</p>
                </div>
            `;
            return;
        }

        reviewPosts.forEach(post => {
            const card = document.createElement("div");
            card.className = "post-card";
            card.setAttribute("data-id", post.id);

            const isTemp = post.id.startsWith("temp");

            card.innerHTML = `
                <div class="card-top">
                    <span class="platform-badge ${post.platform}">${post.platform}</span>
                    <span class="badge ${isTemp ? 'badge-purple' : 'badge-amber'}">${isTemp ? 'new draft' : 'in review'}</span>
                </div>
                
                <!-- Toggleable Read/Edit Field -->
                <div class="post-content-wrap">
                    <div class="post-content-area" id="content-view-${post.id}">${post.content}</div>
                    <textarea class="post-content-editor" id="content-edit-${post.id}" style="display:none;"></textarea>
                </div>
                
                ${post.mediaUrl ? `
                    <div class="post-media-area">
                        <img src="${post.mediaUrl}" alt="Media Post Idea">
                        <div class="media-idea-text"><strong>Visual Idea:</strong> ${post.mediaIdea}</div>
                    </div>
                ` : ''}
                
                <div class="card-actions">
                    <button class="btn btn-secondary btn-sm" id="action-edit-${post.id}">✏️ Edit</button>
                    <button class="btn btn-danger btn-sm" id="action-rev-${post.id}">🔄 Revise</button>
                    <button class="btn btn-primary btn-sm" id="action-app-${post.id}">✅ Approve</button>
                </div>
            `;

            dom.hitlContainer.appendChild(card);

            // Bind individual card triggers
            const btnEdit = card.querySelector(`#action-edit-${post.id}`);
            const btnRev = card.querySelector(`#action-rev-${post.id}`);
            const btnApp = card.querySelector(`#action-app-${post.id}`);
            const viewDiv = card.querySelector(`#content-view-${post.id}`);
            const editArea = card.querySelector(`#content-edit-${post.id}`);

            // Direct Inline Edit Toggle
            btnEdit.addEventListener("click", () => {
                if (editArea.style.display === "none") {
                    editArea.value = post.content;
                    editArea.style.display = "block";
                    viewDiv.style.display = "none";
                    btnEdit.innerText = "💾 Save";
                } else {
                    post.content = editArea.value;
                    viewDiv.innerText = editArea.value;
                    editArea.style.display = "none";
                    viewDiv.style.display = "block";
                    btnEdit.innerText = "✏️ Edit";
                    workflow.log(`Post [ID: ${post.id}] content updated directly by human approver.`, "SUCCESS");
                }
            });

            // Revision Feedback trigger
            btnRev.addEventListener("click", () => {
                state.activeWorkflowPost = post;
                openRevisionModal();
            });

            // Approve trigger
            btnApp.addEventListener("click", () => {
                approvePost(post.id);
            });
        });
    }

    // Move post from review -> scheduled
    function approvePost(postId) {
        const post = state.posts.find(p => p.id === postId);
        if (post) {
            post.status = "scheduled";
            post.logs.push("Approved via dashboard HITL queue.");
            workflow.log(`Post [ID: ${post.id}] approved by human review node. Routing state variables to publish queue.`, "SUCCESS");
            
            // Clean graph highlights
            updateGraphVisualization("SCHEDULE");
            setTimeout(() => updateGraphVisualization(null), 3000);

            // Re-render UI
            updateMetrics();
            renderHITLInbox();
            if (state.activeTab === "scheduler") {
                renderCalendar();
                renderScheduledList();
            }
        }
    }

    // ---------------------------------------------------------
    // 5. CALENDAR & SCHEDULE LIST VIEW
    // ---------------------------------------------------------
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    function renderCalendar() {
        dom.calendarMonthYear.innerText = `${monthNames[state.currentMonth]} ${state.currentYear}`;
        
        // Days in May 2026 configuration
        const firstDayIndex = new Date(state.currentYear, state.currentMonth, 1).getDay();
        const totalDays = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
        
        dom.calendarDaysGrid.innerHTML = "";
        
        // Insert leading blank offset days
        for (let i = 0; i < firstDayIndex; i++) {
            const blank = document.createElement("div");
            blank.className = "calendar-day empty";
            dom.calendarDaysGrid.appendChild(blank);
        }

        const todayDate = new Date();
        const isCurrentMonthReal = todayDate.getFullYear() === state.currentYear && todayDate.getMonth() === state.currentMonth;

        // Build actual day blocks
        for (let day = 1; day <= totalDays; day++) {
            const dayCard = document.createElement("div");
            dayCard.className = "calendar-day";
            
            // Highlight today
            if (isCurrentMonthReal && todayDate.getDate() === day) {
                dayCard.classList.add("today");
            }

            dayCard.innerHTML = `
                <span class="day-number">${day}</span>
                <div class="day-posts" id="day-posts-${day}"></div>
            `;

            dom.calendarDaysGrid.appendChild(dayCard);

            // Populate posts belonging to this date
            const dateStrPrefix = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const matches = state.posts.filter(p => p.status === "scheduled" && p.scheduledTime.startsWith(dateStrPrefix));
            
            const postsContainer = dayCard.querySelector(`#day-posts-${day}`);
            matches.forEach(post => {
                const tag = document.createElement("span");
                tag.className = `calendar-event-tag ${post.platform}`;
                tag.innerText = post.content;
                tag.title = post.content;
                postsContainer.appendChild(tag);
            });
        }

        const scheduledTotal = state.posts.filter(p => p.status === "scheduled").length;
        dom.calendarCountBadge.innerText = `${scheduledTotal} Scheduled`;
    }

    function renderScheduledList() {
        const listContainer = dom.scheduledPostsList;
        listContainer.innerHTML = "";

        const scheduled = state.posts.filter(p => p.status === "scheduled");

        if (scheduled.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📅</span>
                    <p>No active scheduled social posts found.</p>
                </div>
            `;
            return;
        }

        // Sort schedules chronologically
        scheduled.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));

        scheduled.forEach(post => {
            const card = document.createElement("div");
            card.className = "schedule-card";

            const dateOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            const formattedTime = new Date(post.scheduledTime).toLocaleDateString("en-US", dateOptions);

            card.innerHTML = `
                <div class="schedule-card-top">
                    <span class="platform-badge ${post.platform}">${post.platform}</span>
                    <span class="schedule-time">${formattedTime}</span>
                </div>
                <div class="schedule-content">${post.content}</div>
                <div class="schedule-card-footer">
                    <button class="btn btn-secondary btn-sm" id="btn-cancel-sched-${post.id}">Cancel Slot</button>
                </div>
            `;

            listContainer.appendChild(card);

            // Bind cancel schedule button
            card.querySelector(`#btn-cancel-sched-${post.id}`).addEventListener("click", () => {
                post.status = "review";
                post.logs.push("Schedule canceled; moved back to review.");
                workflow.log(`Canceled scheduled post [ID: ${post.id}]. Pushing back to active HITL queue.`, "WARNING");
                
                // Refresh views
                updateMetrics();
                renderScheduledList();
                renderCalendar();
            });
        });
    }

    // Calendar month shift actions
    dom.btnPrevMonth.addEventListener("click", () => {
        state.currentMonth--;
        if (state.currentMonth < 0) {
            state.currentMonth = 11;
            state.currentYear--;
        }
        renderCalendar();
    });

    dom.btnNextMonth.addEventListener("click", () => {
        state.currentMonth++;
        if (state.currentMonth > 11) {
            state.currentMonth = 0;
            state.currentYear++;
        }
        renderCalendar();
    });

    // ---------------------------------------------------------
    // 6. TERMINAL LOG MONITOR SYSTEM
    // ---------------------------------------------------------
    function initConsoleLogs() {
        dom.logsContainer.innerHTML = "";
        state.logs.forEach(log => addConsoleLogLine(log));
    }

    function addConsoleLog(logObj) {
        state.logs.push(logObj);
        addConsoleLogLine(logObj);
    }

    function addConsoleLogLine(logObj) {
        const line = document.createElement("div");
        line.className = "log-line";
        line.innerHTML = `
            <span class="log-time">[${logObj.time}]</span>
            <span class="log-level ${logObj.level}">${logObj.level}</span>
            <span class="log-msg">${escapeHtml(logObj.message)}</span>
        `;
        dom.logsContainer.appendChild(line);
        // Scroll terminal to bottom automatically
        dom.logsContainer.scrollTop = dom.logsContainer.scrollHeight;
    }

    dom.btnClearLogs.addEventListener("click", () => {
        dom.logsContainer.innerHTML = "";
        state.logs = [];
        workflow.log("Console cleared successfully.", "INFO");
    });

    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // ---------------------------------------------------------
    // 7. LANGGRAPH GRAPH VISUALIZER HIGHLIGHTS
    // ---------------------------------------------------------
    function updateGraphVisualization(activeNodeId) {
        const nodes = document.querySelectorAll(".dag-node");
        const connectors = document.querySelectorAll(".dag-connector");
        
        nodes.forEach(node => {
            node.classList.remove("node-active");
            
            // Mark completed nodes
            const nodeId = node.getAttribute("id").replace("node-", "");
            if (activeNodeId) {
                const nodeHierarchy = ["START", "WEB_SEARCH", "IMAGE_GEN", "DRAFT_POST", "SLACK_HITL", "SCHEDULE"];
                const activeIndex = nodeHierarchy.indexOf(activeNodeId);
                const selfIndex = nodeHierarchy.indexOf(nodeId);
                
                if (selfIndex !== -1 && activeIndex !== -1 && selfIndex < activeIndex) {
                    node.classList.add("node-completed");
                } else {
                    node.classList.remove("node-completed");
                }
            } else {
                node.classList.remove("node-completed");
            }
        });

        // Set active pulsating class
        if (activeNodeId) {
            const activeNode = document.getElementById(`node-${activeNodeId}`);
            if (activeNode) activeNode.classList.add("node-active");
        }
    }

    // ---------------------------------------------------------
    // 8. SIMULATED SLACK GATEWAY
    // ---------------------------------------------------------
    function renderSlackDrawer() {
        const reviewPosts = state.posts.filter(p => p.status === "review");
        dom.slackMessages.innerHTML = "";

        if (reviewPosts.length === 0) {
            dom.slackMessages.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">💬</span>
                    <p style="color:#b8a2bb;">No pending Slack approval payloads.</p>
                </div>
            `;
            dom.slackUnreadBadge.style.display = "none";
            return;
        }

        // Show alert badges
        dom.slackUnreadBadge.style.display = "flex";
        dom.slackUnreadBadge.innerText = reviewPosts.length;

        reviewPosts.forEach(post => {
            const msg = document.createElement("div");
            msg.className = "slack-msg";
            msg.innerHTML = `
                <div class="slack-avatar">🤖</div>
                <div class="slack-msg-body">
                    <span class="slack-sender">Aether Agent APP</span>
                    <p class="slack-msg-text">Graph suspended execution at checkpoint <strong>'slack_hitl'</strong>. Human intervention required for drafted social post.</p>
                    
                    <div class="slack-card-attachment">
                        <div class="slack-card-title">${post.platform.toUpperCase()} POST DRAFT</div>
                        <div class="slack-card-body">${post.content}</div>
                        
                        <div class="slack-card-actions">
                            <button class="slack-btn slack-btn-approve" id="slack-app-${post.id}">Approve Post</button>
                            <button class="slack-btn slack-btn-reject" id="slack-rev-${post.id}">Request Edit</button>
                        </div>
                    </div>
                </div>
            `;

            dom.slackMessages.appendChild(msg);

            // Approve via Slack trigger
            msg.querySelector(`#slack-app-${post.id}`).addEventListener("click", () => {
                approvePost(post.id);
                renderSlackDrawer();
            });

            // Re-route to editor revision
            msg.querySelector(`#slack-rev-${post.id}`).addEventListener("click", () => {
                // Focus dashboard and reveal HITL card
                dom.slackDrawer.classList.remove("open");
                dom.navItems[0].click();
                setTimeout(() => {
                    const hitlCard = document.querySelector(`.post-card[data-id="${post.id}"]`);
                    if (hitlCard) {
                        hitlCard.scrollIntoView({ behavior: 'smooth' });
                        hitlCard.style.outline = "2px dashed var(--neon-purple)";
                        setTimeout(() => hitlCard.style.outline = "none", 2000);
                    }
                }, 500);
            });
        });
    }

    // Toggle drawers
    dom.btnToggleSlack.addEventListener("click", () => {
        dom.slackDrawer.classList.toggle("open");
        state.slackUnreadCount = 0;
    });

    dom.btnCloseSlack.addEventListener("click", () => {
        dom.slackDrawer.classList.remove("open");
    });

    // ---------------------------------------------------------
    // 9. MODALS & FORMS CONTROLLERS
    // ---------------------------------------------------------
    
    // Creator Modal Show/Hide
    dom.btnOpenCreator.addEventListener("click", () => {
        dom.creatorModal.classList.add("open");
        // Reset defaults
        dom.agentTemplateSelect.value = "custom";
        dom.agentTopicInput.value = "";
        dom.agentTopicInput.disabled = false;
        dom.agentToneSelect.value = "Inspiring & Professional";
        dom.agentToneSelect.disabled = false;
        dom.agentPromptInput.value = "";
        dom.agentPromptInput.disabled = false;
    });

    dom.btnCloseCreator.addEventListener("click", () => dom.creatorModal.classList.remove("open"));
    dom.btnCancelCreator.addEventListener("click", () => dom.creatorModal.classList.remove("open"));

    // Selection changes pre-populates config
    dom.agentTemplateSelect.addEventListener("change", (e) => {
        const val = e.target.value;
        if (val === "custom") {
            dom.agentTopicInput.value = "";
            dom.agentTopicInput.disabled = false;
            dom.agentToneSelect.disabled = false;
            dom.agentPromptInput.value = "";
            dom.agentPromptInput.disabled = false;
        } else {
            const template = state.templates[parseInt(val)];
            dom.agentTopicInput.value = template.topic;
            dom.agentTopicInput.disabled = true;
            dom.agentPlatformSelect.value = template.platform;
            dom.agentToneSelect.value = template.tone;
            dom.agentToneSelect.disabled = true;
            dom.agentPromptInput.value = template.prompt;
            dom.agentPromptInput.disabled = true;
        }
    });

    // Run workflow action
    dom.btnTriggerAgent.addEventListener("click", async () => {
        const config = {
            topic: dom.agentTopicInput.value || "Dynamic Enterprise Architecture",
            platform: dom.agentPlatformSelect.value,
            tone: dom.agentToneSelect.value,
            customPrompt: dom.agentPromptInput.value
        };

        dom.creatorModal.classList.remove("open");
        
        // Switch to main dashboard active tab
        dom.navItems[0].click();

        // Start Workflow
        document.getElementById("workflow-status-badge").className = "badge badge-purple";
        document.getElementById("workflow-status-badge").innerText = "RUNNING";
        
        try {
            const draftPost = await workflow.run(config);
            
            // Push draft to workspace state
            state.posts.push(draftPost);
            
            // Render updates
            updateMetrics();
            renderHITLInbox();
            renderSlackDrawer();
            
            document.getElementById("workflow-status-badge").className = "badge badge-amber";
            document.getElementById("workflow-status-badge").innerText = "SUSPENDED (HITL)";
        } catch(e) {
            document.getElementById("workflow-status-badge").className = "badge badge-red";
            document.getElementById("workflow-status-badge").innerText = "FAILED";
        }
    });

    // Revision Request Show/Hide
    function openRevisionModal() {
        dom.revisionModal.classList.add("open");
        dom.revisionFeedbackInput.value = "";
    }

    dom.btnCloseRevision.addEventListener("click", () => dom.revisionModal.classList.remove("open"));
    dom.btnCancelRevision.addEventListener("click", () => dom.revisionModal.classList.remove("open"));

    dom.btnSubmitRevision.addEventListener("click", async () => {
        const feedback = dom.revisionFeedbackInput.value;
        if (!feedback) return;

        dom.revisionModal.classList.remove("open");
        document.getElementById("workflow-status-badge").className = "badge badge-purple";
        document.getElementById("workflow-status-badge").innerText = "RUNNING";

        const postIndex = state.posts.findIndex(p => p.id === state.activeWorkflowPost.id);
        
        if (postIndex !== -1) {
            try {
                // Clear inline nodes styling while running revision loop
                updateGraphVisualization(null);
                
                const revisedPost = await workflow.runRevision(state.activeWorkflowPost, feedback);
                
                // Update item in state
                state.posts[postIndex] = revisedPost;
                
                // Re-render UI
                updateMetrics();
                renderHITLInbox();
                renderSlackDrawer();

                document.getElementById("workflow-status-badge").className = "badge badge-amber";
                document.getElementById("workflow-status-badge").innerText = "SUSPENDED (HITL)";
            } catch (e) {
                document.getElementById("workflow-status-badge").className = "badge badge-red";
                document.getElementById("workflow-status-badge").innerText = "FAILED";
            }
        }
    });

    // ---------------------------------------------------------
    // 10. INITIALIZATION TRIGGERS
    // ---------------------------------------------------------
    updateMetrics();
    renderHITLInbox();
    initConsoleLogs();
    renderSlackDrawer();

    workflow.log("All dashboard handlers set. Ready for execution workflows.", "SUCCESS");
});
