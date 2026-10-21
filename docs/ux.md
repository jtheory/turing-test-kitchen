# Experience and flow

The reference for how the tour looks and behaves. Decided October 2026; refine as we build.

## Flow

1. **Home: the finished product.** A short recorded chat between a person and a very human-seeming bot (to be tuned together near the end). Then: "Let's build this from scratch."
2. **Layers 1–8**, each adding one piece, ending back at something like the opening chat.
3. **Under the hood**: an optional aside, linked where it helps (the formatting step, base models).

## What's saved, and when

- **Each early layer starts a fresh chat.** Visitors will test things like giving a different name, so nothing carries over from the previous layer.
- **Until the long-term memory layer, nothing is saved at all.** Each chat lives only in the page; reloading clears it. The page says so plainly.
- **Long-term memory (layer 6):** notes about the visitor carry across chats. Chat history does not, because a chat held under one persona would skew replies under another.
- **Layer 2 is only re-sending this chat's history.** No notes about the user; that's layer 6.

## Live first, recorded as fallback

- **Live is the default.** On every layer where it's possible, the visitor types and gets real replies. Trying it is the main path, not an extra.
- **Recorded examples are the fallback** when live is unavailable (budget used up, provider down, offline, bot check failed). The page says so clearly ("Live replies are off right now; here's a recorded real example") and swaps in the recorded version of the same exhibit.
- No model picker in the main flow. At most a select list hidden in advanced settings.

## The core exhibit: two views of one conversation

- **What you see:** chat bubbles, the experience.
- **What the model gets:** everything actually sent.
- The model's view **grows layer by layer**. What this layer adds is highlighted; earlier additions stay visible.
- Desktop: side by side. Phone: a two-way switch with a short transition.
- Built first on layer 2 (memory), then reused everywhere.

## Showing what's added

- **The visitor's own words** are shown plainly, full contrast.
- **Markup** (role markers, special tokens, JSON structure) has a function, so it's shown, but **greyed out**.
- **Added context** (re-sent history, hidden instructions, notes, search results) is shown **muted, colour-coded by layer**.
- **Hover (desktop) or tap (touch)** on any muted part makes it fully legible and shows a short plain explanation of what it is and why it's there. On phones, tap is the only way in, so nothing may depend on hover.

## Language

- Explain as little as needed. Prefer showing over naming.
- Avoid implementation terms where possible. "Tokens" may not be needed at all (TBD); if a number helps, it lives in Details.
- A term we can't avoid gets a tap-to-explain, not a paragraph.

## Page anatomy (every layer)

1. Title and one-line takeaway.
2. Two or three plain sentences.
3. The exhibit (live, or the recorded fallback).
4. **Details** (collapsed): exact request and response, counts, cost, which company served it, sources.
5. Next.

## Navigation

- Compact stepper: "Step 2 of 8 · Memory is re-sending", with next and previous.
- Layers that aren't built aren't shown.

## Process

- Build one pattern, review phone and desktop screenshots, iterate, then roll out.
- Test with two or three non-technical people as soon as layers 1–3 exist.
