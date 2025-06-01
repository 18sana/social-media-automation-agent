# Aether Social Media Agent Workspace 🤖📊

An interactive, high-fidelity **AI Social Media Agent Workspace** demonstrating a complete, production-ready design architecture for autonomous content operations. 

This workspace visually illustrates how modern developer frameworks—such as **LangGraph**, **OAuth Authentication**, **Slack Integration**, **Cron Automation**, and **Tool Calling Workflows**—interoperate to build a robust, safe, and automated enterprise social engine.

---

## 🛠️ Tech Stack & Concept Architecture

This project maps directly to the enterprise patterns utilized to construct AI Agents in production:

### 1. LangGraph State Machine
* **Concept**: Standardizing workflow paths inside a modular, cyclical Directed Acyclic Graph (DAG) pattern.
* **Implementation**: The visual canvas displays state graph nodes (`START` ➔ `WEB_SEARCH` ➔ `IMAGE_GEN` ➔ `DRAFT_POST` ➔ `SLACK_HITL` ➔ `SCHEDULE`). When the user triggers an agent workflow, it cycles node-by-node, highlighting active states, updating context models, and demonstrating cyclical routing back to `REVISION` if human feedback is injected.

### 2. Human-In-The-Loop (HITL) Checkpoints
* **Concept**: Blocking autonomous publication actions with mandatory human approval gates to eliminate branding risks and model hallucinations.
* **Implementation**: Graph execution suspends state variables at the `SLACK_HITL` checkpoint. The drafted content is pushed to both the **HITL Inbox** card stack and the **Slack notification channel** where users can review, inline-edit, reject, or authorize the publishing flow.

### 3. Tool Calling Workflows
* **Concept**: Empowering LLMs to securely execute operational scripts (e.g. Web search indices, DALL-E/Midjourney styling APIs).
* **Implementation**: The dashboard streams live log sequences in the retro console at the bottom, illustrating tool schemas, input parameters, JSON responses, and token metric outputs.

### 4. Slack Gateway Integration
* **Concept**: Utilizing webhooks to interact with developers where they work, enabling approvals from internal communication tools.
* **Implementation**: Features a sliding panel mimicking a Slack messaging stream. Includes fully clickable interactive buttons that update the state machine directly from Slack.

### 5. Cron Scheduling & Automation
* **Concept**: Automating agent routines to execute on custom, time-based intervals (e.g. posting every weekday morning at 9:00 AM).
* **Implementation**: An interactive monthly calendar grid rendering scheduled posts, paired with configurations to adjust trigger crons (e.g., `*/60 * * * *`).

---

## 📁 Project Structure

```
ai-social-media-agent/
│
├── index.html          # Main dashboard semantic layout and HTML widgets
├── styles.css          # Styling system (Premium Dark theme, glassmorphism, node animations)
├── mock-data.js        # Seed posts, scheduled items, configurations, and console logs
├── agent-workflow.js   # Simulated StateGraph machine executing asynchronous steps
├── app.js              # DOM controllers, state handlers, calendar grids, drawer transitions
└── README.md           # Documentation and guides (this file)
```

---

## 🚀 Getting Started

No databases, complex installation rules, or API keys are required to explore this high-fidelity workspace! Everything runs instantly inside your web browser.

### Direct Execution
1. Double-click [index.html](file:///Users/sana18/Desktop/ai-social-media-agent/index.html) (or right-click and open with **Google Chrome**, **Safari**, or **Firefox**).
2. Enjoy the premium aesthetics, glowing cards, and seamless UI transitions.

### Development Dev Server (Optional)
To run on a local server environment, navigate into the directory and use standard tools:

```bash
# Using Node.js npx static server
npx serve ./

# Or using Python's built-in server
python3 -m http.server 8000
```
Then open `http://localhost:3000` or `http://localhost:8000` in your web browser.

---

## 💡 Production Migration: Mapping to Real Code

To transform this interactive simulation into a live production system, developers should connect these frontend states to a Python backend using the following structures:

### LangGraph State Machine (Python)
Define your graph state structure and compile with memory checkpoints:

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict, List

class AgentState(TypedDict):
    topic: str
    platform: str
    content: str
    media_url: str
    logs: List[str]

# Define cyclic graph nodes
workflow = StateGraph(AgentState)
workflow.add_node("web_search", search_node)
workflow.add_node("draft_post", writer_node)
workflow.add_node("slack_hitl", hitl_checkpoint_node) # Interrupt node
workflow.add_node("publish_post", publish_node)

# Set up routing and conditional loopbacks
workflow.add_edge("web_search", "draft_post")
workflow.add_edge("draft_post", "slack_hitl")

# Compile graph with thread checkpointers
app = workflow.compile(checkpointer=memory_saver, interrupt_before=["slack_hitl"])
```

### Slack Interactive Block Kit Approval
Push drafted cards to your Slack channel using rich interactive button payload blocks:

```json
[
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "*🤖 Autonomous Agent generated a new LinkedIn Post!*"
    }
  },
  {
    "type": "actions",
    "elements": [
      {
        "type": "button",
        "text": {"type": "plain_text", "text": "Approve ✅"},
        "style": "primary",
        "value": "post_id_101",
        "action_id": "approve_post_action"
      },
      {
        "type": "button",
        "text": {"type": "plain_text", "text": "Edit / Revise 🔄"},
        "style": "danger",
        "value": "post_id_101",
        "action_id": "request_revision_action"
      }
    ]
  }
]
```

### Cron Daemon Triggering (Celery / APScheduler)
Use Python schedulers to execute the agent graph on configured crons:

```python
from apscheduler.schedulers.blocking import BlockingScheduler

scheduler = BlockingScheduler()

@scheduler.scheduled_job('cron', hour=9, day_of_week='mon-fri')
def run_agent_routine():
    initial_state = {"topic": "MCP Integrations", "platform": "linkedin"}
    app.invoke(initial_state, config={"thread_id": "cron_thread_2026"})

scheduler.start()
```
