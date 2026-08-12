import type OpenAI from "openai";
import { searchFlights } from "@/lib/providers/duffel";
import { searchStays, type StayPreference } from "@/lib/providers/stays";
import { searchGround } from "@/lib/providers/ground";

// Single tool registry shared by text chat, NL search, and the voice agent.
export const toolDefinitions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_flights",
      description: "Search bookable flight offers between two airports/cities.",
      parameters: {
        type: "object",
        properties: {
          origin: { type: "string", description: "Origin IATA airport code, e.g. JFK" },
          destination: { type: "string", description: "Destination IATA code, e.g. ADD" },
          departureDate: { type: "string", description: "YYYY-MM-DD" },
          returnDate: { type: "string", description: "YYYY-MM-DD, omit for one-way" },
          adults: { type: "integer", minimum: 1, default: 1 },
        },
        required: ["origin", "destination", "departureDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_stays",
      description:
        "Search places to stay. preference 'home' = Airbnb-style homes (booked on Airbnb), 'resort' = hotels/resorts bookable in-app.",
      parameters: {
        type: "object",
        properties: {
          preference: { type: "string", enum: ["home", "resort"] },
          location: { type: "string" },
          checkIn: { type: "string", description: "YYYY-MM-DD" },
          checkOut: { type: "string", description: "YYYY-MM-DD" },
          adults: { type: "integer", minimum: 1, default: 2 },
        },
        required: ["preference", "location", "checkIn", "checkOut"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_ground",
      description:
        "Research intercity ground transport (train, FlixBus, Amtrak, Greyhound, local buses) between two places.",
      parameters: {
        type: "object",
        properties: {
          origin: { type: "string" },
          destination: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["origin", "destination", "date"],
      },
    },
  },
];

export async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "search_flights":
      return searchFlights({
        origin: String(args.origin).toUpperCase(),
        destination: String(args.destination).toUpperCase(),
        departureDate: String(args.departureDate),
        returnDate: args.returnDate ? String(args.returnDate) : undefined,
        adults: Number(args.adults ?? 1),
      });
    case "search_stays":
      return searchStays({
        preference: (args.preference as StayPreference) ?? "home",
        location: String(args.location),
        checkIn: String(args.checkIn),
        checkOut: String(args.checkOut),
        adults: Number(args.adults ?? 2),
      });
    case "search_ground":
      return searchGround({
        origin: String(args.origin),
        destination: String(args.destination),
        date: String(args.date),
      });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
