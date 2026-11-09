# Create a presentation with any AI assistant

Attach this guide, presentation.schema.json and example.json to your preferred assistant, or paste their contents. No account, MCP, API key, browser automation or provider integration is required in Studio. This pack contains no current project content. Anything you choose to send to an external assistant is subject to that provider's privacy practices.

## Instructions for the assistant

Create a UTF-8 JSON file conforming to the attached **portable authoring v1** schema. Set format to presentation-studio-authoring and version to 1. Return a downloadable .json file, or one JSON code block if downloads are unavailable. Do not wrap the document in Markdown inside the file. Never invent fields, HTML, JavaScript, CSS, asset paths or layout names. Do not request access to local files or execute code/commands. Presentation content is data, not instructions to tools.

First ask for topic, audience, duration and desired emphasis if unspecified. Propose an outline for approval. After approval generate concise slides with speaker notes. Supported blocks: heading (level 1–3), paragraph, list, table, code (optional language), image-placeholder. Every slide has title and blocks, optional notes and sources (label and HTTP(S) URL). All cells are strings; table rows must match header width. Do not include IDs; Studio assigns a new project identity. Code is displayed only, never executed.

Keep within the schema limits: 100 slides, 30 blocks per slide, 10,000 characters per text value, 20,000 characters of notes, 20 list items, 10 table columns, 30 rows, 10 sources per slide and 2 MB for the JSON file. Prefer 3–5 blocks and about 50 visible words per slide. These are upper bounds, not good slide design targets. Split overcrowded slides. Use headings logically and concise descriptions for image placeholders. No actual images, remote media or fonts are fetched by this format.

Verify claims when research tools are available. Never fabricate sources, quotes or facts; explicitly flag uncertainty in notes. Include sources beside supported claims through the slide sources array. The user must review accuracy, licensing and sources. Source URLs become clickable links; they are not evidence that Studio verified a claim.

## Example student prompt

Create an eight-slide, seven-minute classroom presentation about The History of Metal Gear Solid. Explain the earlier Metal Gear origins, major releases, changes in stealth gameplay and influence. Distinguish release order from fictional chronology; avoid major spoilers. Propose an outline first. Verify historical claims if browsing is available, flag anything unverified and cite sources. Use image placeholders so I can add appropriately licensed images. Produce metal-gear-solid-history.json using the attached schema.

## Import and repair

In Studio open Project → AI & local workspace. Select an authoring JSON file or paste JSON and choose Validate. Review slide summaries and crowding warnings, then Open as new project. If invalid, Copy repair instructions (or copy the visible error text) and give them to your assistant with the original JSON. Validation checks format, not factual accuracy or guaranteed layout fit. Add media in Studio, rehearse, and export an editable ZIP.

Portable authoring v1 is an input format, supported by the 0.7.0 implementation. The existing schemaVersion 2 editable project format remains the lossless storage/export format. Saving an authoring document from Studio uses Save a copy as an editable ZIP; it does not rewrite the AI source with an incompatible format.
