# UbwengeAI SME Assistant

A local-first, responsive MVP for the SME administrative assistant in the supplied SRS and UML appendix.

## Run

Open Google Chrome or any supported browser and type in "ubwengeai.vercel.app" to access the website. This project is supported through out any device such as Windows, Mac, Android, iOS. There is no build step, install, server, or network requirement. Create the first account to set up a workspace owner. The owner can add employee or administrator accounts under **Team & settings**.

## Included

- Workspace registration and sign-in, with salted SHA-256 password hashes
- Owner, administrator, and employee roles; workspace members
- Tasks with assignment, status, due dates, reminders, filters, and search
- Schedule creation, editing, listing, and deletion
- Business notes, reports, and procedures with text export
- Task report CSV export and workspace JSON backup
- Natural-language demo assistant for common task and schedule drafts, plus summaries from workspace data
- Human approval queue: proposed changes are saved only after approval
- Activity log and responsive desktop/mobile interface
- Browser-local persistence

## Assistant and data scope

The assistant is a deterministic rules-based MVP; it does not call a third-party AI API. It supports common task and schedule prompts and simple queries about saved workspace records. Unsupported prompts receive a capability response. Assistant drafts remain pending until a user approves or rejects them.

This is a functional single-browser prototype, not a production multi-user service. Workspace data and password hashes stay in local browser storage, accounts do not sync across devices, and anyone with access to the device may inspect browser data. Use a trusted device and download backups. A production release should use an HTTPS backend, database-enforced tenant isolation, server-side authorization, Argon2id or equivalent password hashing, recovery flows, and a configured AI provider with appropriate data controls.

## Link to the project 

https://ubwengeai.vercel.app/