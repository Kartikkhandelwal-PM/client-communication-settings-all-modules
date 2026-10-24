# Client Communication Settings: All Modules (GST, TDS, ITR)

Separate from the live "Client Communication Settings" project, which is not touched from here.
This folder is a working app built from the approved design mockup (sample data only).

## What it does

- **One list of clients** for GST, TDS and ITR. A client row expands to its GSTINs, TANs and PAN; a registration opens in a side panel with every report and event, each with an Email and a WhatsApp switch.
- **Module column** and a Module filter; a collapsed client shows `GST (4)  TDS  ITR`.
- **Contact per registration:** the client's contact, or another contact of the client; edit a contact or add one (shown with avatars, `+count` when collapsed).
- **Bulk:** tick registrations, pick a report or event, a channel, then On or Off. "Copy to the other GSTINs of this client". "Defaults for new clients" per module, with "Apply to all existing".
- **Send icon** on scheduled reports (sends that report now).
- **WhatsApp Logs** for all modules: Bulk and Single messages, Upcoming row (the next scheduled GSTR-2A / 2B report), run page, Module column and filter, export.
- Every change saves on its own.

## Where to look

- `src/api/data.js`: modules, the DEMO list of reports and events per module, sample clients.
- `src/api/settings.js` and `src/api/whatsappLogs.js`: stand-ins for the real endpoints.
- `src/hooks/useSettings.js`: all edits.
- `src/components/`: `SettingsPage`, `RegistrationPanel`, `DefaultsPanel`, `MessageList`, `Avatar`, `WhatsAppLogs`, `RunDetail`.

## Still to decide or get

1. The real reports and events for GST, TDS and ITR, and their names (domain team).
2. Contact edit: today it changes the contact everywhere it is used. Is "only for this GSTIN" also needed?
3. Entry point in GST, TDS and ITR (today: "Client Settings" tab in the GST profile drawer).
4. Rampwin: message ID, webhook payload, template send (see the older project's DATA-SOURCES.md).

```
npm install
npm run dev
```
