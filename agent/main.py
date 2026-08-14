"""Meguaz voice travel agent — runs on LiveKit Cloud.

One agent, one brain: the same tool registry as the web orchestrator, reached
over HTTP so model routing/cost guards stay server-side in the Next.js app.

The centrepiece tool is solve_trip: it prices the traveller's brief through
the real plan solver AND pushes the brief into the app over the room's data
channel, so the planner on their screen fills in while the agent talks.
"""

import json
import os

import aiohttp
from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import Agent, AgentSession, RunContext, function_tool
from livekit.plugins import openai, silero

load_dotenv()

API_BASE = os.getenv("MEGUAZ_API_BASE", "http://localhost:3000")
CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-5-nano")

INSTRUCTIONS = """You are Meguaz, a warm, culturally-rooted voice travel companion.
You build custom door-to-gate trip plans against two budgets: money and time.
Keep replies short and spoken-friendly — one or two sentences.

Your main job: collect a trip brief conversationally — destination city, the
city or airport they leave from, arrive-by date, nights, budget cap, party
size — then call solve_trip. It prices three real lanes AND fills the planner
on the traveller's screen; tell them to glance at the app when it lands.
Refine and re-solve as they react ("cheaper", "two of us", "a week instead").

Use destination_guide for what's worth seeing and fun facts. Use the search
tools for specific flight, stay, or ground questions. Never guess prices —
always use tools. Never take payment details by voice — booking finishes in
the app."""


class MeguazVoiceAgent(Agent):
    def __init__(self, room: rtc.Room) -> None:
        super().__init__(instructions=INSTRUCTIONS)
        self._room = room

    @function_tool()
    async def solve_trip(
        self,
        context: RunContext,
        origin: str,
        destination: str,
        arrive_by: str,
        budget_usd: int,
        nights: int = 5,
        adults: int = 1,
    ) -> dict:
        """Price the full door-to-gate trip (three cost lanes) and fill the
        planner on the traveller's screen. origin and destination are city
        names or IATA codes; arrive_by is YYYY-MM-DD."""
        result = await self._post(
            "/api/plan/solve",
            {
                "from": origin,
                "to": destination,
                "arriveBy": arrive_by,
                "budget": budget_usd,
                "nights": nights,
                "adults": adults,
            },
        )
        if "error" in result:
            return result
        await self._push(
            {
                "type": "brief",
                "to": destination,
                "arrive": arrive_by,
                "nights": nights,
                "budget": budget_usd,
                "adults": adults,
            }
        )
        # Trim to what a spoken reply needs — the app shows the rest.
        return {
            "planner_filled": True,
            "lanes": [
                {
                    "name": o.get("name"),
                    "cost": o.get("cost"),
                    "doorToDoor": o.get("doorToDoor"),
                    "leaveBy": o.get("leaveBy"),
                }
                for o in (result.get("options") or [])
            ],
        }

    @function_tool()
    async def destination_guide(self, context: RunContext, city: str, country: str) -> dict:
        """Researched city guide: the attractions worth a traveller's time
        (with public review averages) and fun facts about the destination."""
        async with aiohttp.ClientSession() as http:
            async with http.get(
                f"{API_BASE}/api/attractions", params={"city": city, "country": country}
            ) as res:
                if res.status != 200:
                    return {"error": f"guide unavailable ({res.status})"}
                return await res.json()

    @function_tool()
    async def search_flights(
        self,
        context: RunContext,
        origin: str,
        destination: str,
        departure_date: str,
    ) -> dict:
        """Search bookable flight offers. Airport IATA codes, date YYYY-MM-DD."""
        return await self._post(
            "/api/flights/search",
            {"origin": origin, "destination": destination, "departureDate": departure_date, "adults": 1},
        )

    @function_tool()
    async def search_stays(
        self,
        context: RunContext,
        preference: str,
        location: str,
        check_in: str,
        check_out: str,
    ) -> dict:
        """Search stays. preference: 'home' (Airbnb-style) or 'resort' (hotels, bookable in-app)."""
        return await self._post(
            "/api/stays/search",
            {"preference": preference, "location": location, "checkIn": check_in, "checkOut": check_out, "adults": 2},
        )

    @function_tool()
    async def search_ground(
        self, context: RunContext, origin: str, destination: str, date: str
    ) -> dict:
        """Research intercity trains/buses (FlixBus, Amtrak, Greyhound, local operators)."""
        return await self._post(
            "/api/ground/search", {"origin": origin, "destination": destination, "date": date}
        )

    async def _post(self, path: str, body: dict) -> dict:
        async with aiohttp.ClientSession() as http:
            async with http.post(f"{API_BASE}{path}", json=body) as res:
                if res.status != 200:
                    return {"error": f"search failed ({res.status})"}
                return await res.json()

    async def _push(self, payload: dict) -> None:
        """Data-channel message to the app; the voice reply works without it."""
        try:
            await self._room.local_participant.publish_data(
                json.dumps(payload).encode("utf-8"), reliable=True, topic="meguaz"
            )
        except Exception:
            pass


def prewarm(proc: agents.JobProcess) -> None:
    # Fork-time model load: callers stop paying the Silero cold start, which
    # was most of the "takes forever to connect" on the t2.small.
    proc.userdata["vad"] = silero.VAD.load()


async def entrypoint(ctx: agents.JobContext) -> None:
    session = AgentSession(
        vad=ctx.proc.userdata["vad"],
        stt=openai.STT(model="gpt-4o-mini-transcribe"),
        llm=openai.LLM(model=CHAT_MODEL),
        tts=openai.TTS(
            model="gpt-4o-mini-tts",
            voice="nova",
            # gpt-4o-mini-tts supports style steering; this shapes delivery far
            # more than the voice picker alone.
            instructions=(
                "Speak as a warm, upbeat travel concierge: natural conversational "
                "pace, friendly and confident, with light enthusiasm when sharing "
                "good options. Never robotic or monotone."
            ),
        ),
    )
    await session.start(room=ctx.room, agent=MeguazVoiceAgent(ctx.room))
    # say() goes straight to TTS — the caller hears a voice seconds before a
    # generate_reply LLM round trip would land.
    session.say("Hey, Meguaz travel desk! Where are we headed?")


if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            num_idle_processes=1,
        )
    )
