# ─── Complaint analysis crew ──────────────────────────────────────────────────
# Three sequential agents:
#   1. Categorizer   — groups complaints into themes
#   2. Sentiment     — scores the emotional tone of each category
#   3. Summarizer    — produces a short, human-readable insights report
#
# Usage:
#   from crew import run_analysis
#   report = run_analysis(complaints)   # complaints is a list of strings

from crewai import Agent, Task, Crew, Process
from textwrap import dedent


def run_analysis(complaints: list[str]) -> str:
    """
    Run the three-agent crew on a list of complaint strings.
    Returns a plain-text insights report.
    """
    if not complaints:
        return "No complaints to analyse."

    # Format the complaints as a numbered list for the agents
    numbered = "\n".join(f"{i + 1}. {c}" for i, c in enumerate(complaints))

    # ── Agents ────────────────────────────────────────────────────────────────

    categorizer = Agent(
        role="Complaint Categorizer",
        goal="Group a list of complaints into meaningful themes.",
        backstory=dedent("""
            You are an expert at identifying patterns in qualitative data.
            You read a list of everyday complaints and group them into clear,
            named categories (e.g. Traffic & Commute, Work & Meetings,
            Technology, Food & Dining, Home & Chores, Weather, People).
            Each complaint belongs to exactly one category.
        """),
        verbose=False,
        allow_delegation=False,
    )

    sentiment_analyst = Agent(
        role="Sentiment Analyst",
        goal="Assess the emotional tone and intensity of each complaint category.",
        backstory=dedent("""
            You specialise in sentiment analysis of short personal complaints.
            Given a set of categorised complaints, you determine whether each
            category is mildly frustrating, moderately annoying, or highly
            negative. You also note which categories carry the strongest
            emotional language.
        """),
        verbose=False,
        allow_delegation=False,
    )

    summarizer = Agent(
        role="Insights Summarizer",
        goal="Produce a concise, friendly insights report from the analysis.",
        backstory=dedent("""
            You turn structured analysis into a brief, human-readable report
            that a couple or individual can read in under a minute. Your tone
            is warm and slightly playful — this is a fun app, not a therapy
            session. You highlight the top complaint themes, the emotional
            intensity, and close with a light observation or suggestion.
        """),
        verbose=False,
        allow_delegation=False,
    )

    # ── Tasks ─────────────────────────────────────────────────────────────────

    categorize_task = Task(
        description=dedent(f"""
            Here are the complaints from the jar:

            {numbered}

            Group them into named categories. For each category list:
            - Category name
            - Count of complaints in that category
            - The complaint numbers that belong to it

            Output only the categorisation, nothing else.
        """),
        expected_output="A structured list of categories with complaint counts and indices.",
        agent=categorizer,
    )

    sentiment_task = Task(
        description=dedent("""
            Using the categories produced in the previous step, assess the
            sentiment of each category:
            - Overall tone: mild / moderate / high frustration
            - Key emotional words or phrases that stand out
            - Which category carries the strongest negative sentiment

            Output a concise sentiment breakdown per category.
        """),
        expected_output="Sentiment scores and key emotional language per category.",
        agent=sentiment_analyst,
        context=[categorize_task],
    )

    summarize_task = Task(
        description=dedent(f"""
            Using the categorisation and sentiment analysis, write a short
            insights report (150–200 words) for the jar owner(s).

            Structure it as:
            1. **Top themes** — the 2-3 most complained-about categories
            2. **Mood check** — overall emotional tone of the complaints
            3. **Standout complaint** — the single most expressive complaint
               (quote it directly)
            4. **Light observation** — one friendly, slightly humorous takeaway

            Total complaints analysed: {len(complaints)}

            Keep it warm, readable, and under 200 words.
        """),
        expected_output="A 150–200 word insights report in plain text with the four sections.",
        agent=summarizer,
        context=[categorize_task, sentiment_task],
    )

    # ── Crew ──────────────────────────────────────────────────────────────────

    crew = Crew(
        agents=[categorizer, sentiment_analyst, summarizer],
        tasks=[categorize_task, sentiment_task, summarize_task],
        process=Process.sequential,
        verbose=False,
    )

    result = crew.kickoff()
    return str(result)
