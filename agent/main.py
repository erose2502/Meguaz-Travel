"""Meguaz voice travel agent — runs on LiveKit Cloud.

One agent, one brain: the same tool registry as the web orchestrator, reached
over HTTP so model routing/cost guards stay server-side in the Next.js app.
"""

import os

import aiohttp
from dotenv import load_dotenv
from livekit import agents
from livekit.agents import Agent, AgentSession, RunContext, function_tool
from livekit.plugins import openai, silero

load_dotenv()

API_BASE = os.getenv("MEGUAZ_API_BASE", "http://localhost:3000")
CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-5-nano")

INSTRUCTIONS = """You are Meguaz, a warm, culturally-rooted voice travel companion.
You solve door-to-door trips against two budgets: money and time. Keep replies
short and spoken-friendly — one or two sentences. Use tools for real prices;
never guess. Collect a trip brief conversationally: destination, arrive-by date,
budget cap, party size. Never take payment details by voice — locking in a plan
happens in the app."""


class MeguazVoiceAgent(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=INSTRUCTIONS)

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


async def entrypoint(ctx: agents.JobContext) -> None:
    session = AgentSession(
        vad=silero.VAD.load(),
        stt=openai.STT(model="gpt-4o-mini-transcribe"),
        llm=openai.LLM(model=CHAT_MODEL),
        tts=openai.TTS(model="gpt-4o-mini-tts", voice="alloy"),
    )
    await session.start(room=ctx.room, agent=MeguazVoiceAgent())
    await session.generate_reply(
        instructions="Greet the traveler in one short sentence and ask where they're headed."
    )


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
