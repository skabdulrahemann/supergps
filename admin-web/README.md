# SuperGPS Admin Web

Modern React admin dashboard for SuperGPS platform.

## Setup

```bash
cd supergps-admin-web
npm install
npm run dev
```

Open `http://localhost:5173`

## Login
- Email: `admin@supergps.com`
- Password: `admin123`

Make sure backend is running on `http://13.211.206.24:5000`

## Environment

Create `.env` from `.env.example`.

For local development:

```env
VITE_API_BASE_URL=http://13.211.206.24:5000/api
VITE_DEV_API_PROXY=http://13.211.206.24:5000
```

For production:

```env
VITE_API_BASE_URL=/api
```

On Vercel, `vercel.json` rewrites `/api/*` to the AWS backend. Do not set
`VITE_API_BASE_URL` to the raw `http://13.211.206.24:5000/api` URL for the
Vercel frontend, because the deployed site runs on HTTPS.

## Features

- **Dashboard** — Stats cards, bar chart (order status), pie chart (activation status), recent orders table
- **Orders** — Search, filter by status, view details, mark payment
- **Dealers** — Card grid view with sales code, contact info, order & vehicle counts
- **Vehicles** — Card grid with IMEI, serial, customer, dealer, activation status
- **Customers** — Table with contact, orders, vehicles, total spent
- **Activations** — Progress bars, step-by-step activation timeline modal

## Tech Stack
- Vite + React 18
- React Router v6
- Tailwind CSS
- Recharts (charts)
- Lucide React (icons)
- Axios (API calls)
