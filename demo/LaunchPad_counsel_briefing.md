# LaunchPad — Counsel Briefing (30 minutes)

## What LaunchPad is
A web application that lets government staff submit AI use-case ideas through a guided, AI-assisted intake. Reviewers and leaders then track those ideas through a pipeline and compare candidates to decide what to fund. Packaged Agile built it at our own expense. It is a working prototype today, not yet deployed or authorized at any agency.

## The core question (from Merker's question at the demo)
How do we sell LaunchPad to a federal agency (first likely USPTO / Dept. of Commerce) without losing ownership?

The risk Merker flagged: code the government pays to develop, or that government employees write, can fall into the public domain / CC0. We also offered the license for free, which could blur into giving the product away. Our goal is to give the first agency a great deal, keep total control of the IP, and still sell to other agencies afterward.

## The structure we think works (please confirm or correct)
- Deliver LaunchPad as a **commercial item developed at private expense**; license it, do not transfer it.
- Give the first customer a **free, perpetual, agency-wide license**; charge only for **labor** (configuration, integration, support).
- Keep the **proprietary core in a private repo**; any government-funded work happens only in a **thin integration/adapter layer**.
- **Host it ourselves (SaaS)** so source is never delivered; use **source-code escrow**, not open source, for the customer's continuity comfort.

## Top questions (prioritized for the time)
1. Does the commercial-item + license-not-transfer structure actually keep our ownership? What must we document to prove private-expense development?
2. Does the federal open-source / CC0 requirement reach us if we deliver a commercial product rather than custom-developed code? Does the core-vs-adapter split hold up legally?
3. Which FAR data-rights clauses apply (e.g., 52.227-14, commercial software 52.227-19), and how do we assert and mark our rights so we don't lose them by default?
4. Does giving the license away for free create any exposure to our ownership or to charging other agencies later?
5. Can we sell this as **services** (no software SIN needed) with the software provided at no cost, or is a **HUBZone sole-source** award the cleaner path for the first pilot?
6. What liability / warranty terms protect us given it is an unproven prototype (not ATO'd)? Do we have Privacy Act exposure for storing submitter names and contact info, and is that ours or the agency's?

## The one ask to leave with
What single contract structure lets us give the first agency a great deal, keep total IP control, and stay free to sell to other agencies?
