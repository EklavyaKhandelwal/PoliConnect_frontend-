# Admin dashboard

This is a separate admin dashboard frontend. Admin sign-in, the complaint queue and complaint detail actions, the Overview and Reports metrics, and the Departments, Officers, and Reply Templates settings use protected backend APIs. The queue supports status, category, block, SLA, search, sorting, and pagination filters. Admins can assign a team and working-day deadline, send messages or information requests, add private notes, and update complaint status.

Overview and Reports use live complaint records and support 7-, 30-, and 90-day presets plus custom date ranges (up to 366 days). Submitted totals, category breakdowns, submission trends, and activity are scoped to the selected range. Open and overdue counts are current snapshots; waiting-for-citizen complaints count as open but not overdue while their SLA is paused. Resolution rate is resolved during the selected range divided by submissions in that range.

The Suggestions section uses live citizen submissions and complaint feedback. Admins can filter/search suggestions, mark them read or unread, highlight them, and save internal admin replies. Saved suggestion replies are for admin reference only and are not sent to citizens. The feedback inbox displays complaint resolution confirmations, ratings, tags, and comments without citizen contact details.

From this directory, run:

```sh
npm install
npm run dev
```

Vite serves the dashboard at `http://127.0.0.1:5181`. Use the language selector to switch between Hindi, English, and Marathi; the selection is stored locally in this browser. Run `npm run build` to create a production preview bundle.

Set `VITE_API_URL` in a local `.env` file if the backend is not running at `http://127.0.0.1:5001` (see `.env.example`). Do not put admin passwords or tokens in this file.

## Create the first admin owner

Configure `MONGO_URI` and a `JWT_SECRET` of at least 32 characters in the backend `.env`. The bootstrap command connects to the database itself; the server does not need to be running. In a terminal in `backend/backend`, run:

```sh
npm run admin:bootstrap
```

The command prompts for the owner email, name, and a password of at least 12 characters (maximum 72 UTF-8 bytes) that is entered without being echoed. It creates only the first owner and refuses to overwrite an existing account or create another owner. The owner can sign in to the admin site and authorize additional admin accounts through the protected `POST /api/v1/admin/users` endpoint. There is no public admin sign-up.

Production deployments must set `ADMIN_FRONTEND_URL` in the backend to the exact admin-site origin so credentialed requests and the secure refresh cookie work correctly.
