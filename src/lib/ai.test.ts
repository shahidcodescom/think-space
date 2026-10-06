import { answerQuery } from "./ai";
import { StoreData } from "./types";

const sample: StoreData = {
  notes: [
    {
      id: "note-1",
      title: "Database backup",
      content: "<p>Take a snapshot <strong>every 5 days</strong>.</p>",
      linkedMeetingIds: [],
      linkedThoughtIds: [],
      createdAt: "2026-09-20T10:00:00.000Z",
      updatedAt: "2026-09-20T10:00:00.000Z",
    },
  ],
  tasks: [
    {
      id: "task-1",
      title: "Review voice flow",
      done: true,
      meetingId: "meeting-1",
      thoughtId: null,
      createdAt: "2026-10-02T10:00:00.000Z",
      updatedAt: "2026-10-05T10:00:00.000Z",
    },
  ],
  meetings: [
    {
      id: "meeting-1",
      title: "Product planning",
      date: "2026-10-12",
      participants: ["Alex", "Maya", "Jordan"],
      agenda: "Plan the next release.",
      minutes: "Reviewed feedback and agreed on priorities.",
      decisions: "Ship the voice workflow first.",
      linkedNoteIds: [],
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-01T10:00:00.000Z",
    },
  ],
  thoughts: [],
  memories: [],
  profile: {
    name: "Test User",
    language: "English (India)",
    voice: "Default voice",
    readAloud: true,
  },
  chatHistory: [],
};

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const notes = answerQuery("List my notes", sample);
assert(notes.title === "Your active notes", "expected notes title");
assert(notes.text.includes("Database backup"), "expected note title in answer");
assert(notes.text.includes("every 5 days"), "expected plain snippet without HTML tags");
assert(!notes.text.includes("<strong>"), "HTML should be stripped in chat");

const meetings = answerQuery("show my meetings", sample);
assert(meetings.text.includes("Product planning"), "expected meeting in answer");

const glance = answerQuery("at a glance", sample);
assert(glance.text.includes("Notes:** 1"), "expected note count");

console.log("ai.test.ts: all assertions passed");
