# SuperGPS Backend

Complete backend for SuperGPS - Order & Activation Flow.

## Setup

```bash
npm install
npm run seed
npm run dev
```

## Environment

Create `.env` from `.env.example`.

For Neon/Postgres, set:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
DB_SSL=true
JWT_SECRET=replace-with-a-long-random-secret
CORS_ORIGIN=http://localhost:5173
```

For production, use `.env.production.example` as the base and set `DB_SYNC=false` after your database schema is ready.

## OSRM Map Matching

OSRM is optional and disabled by default. Enable it when a self-hosted OSRM
server is running, so incoming GPS fixes are snapped to nearby roads before
they are saved and emitted to Flutter.

```env
OSRM_MAP_MATCHING_ENABLED=true
OSRM_BASE_URL=http://127.0.0.1:5000
OSRM_PROFILE=driving
OSRM_MATCH_RADIUS_METERS=35
OSRM_MAX_SNAP_METERS=80
OSRM_TIMEOUT_MS=1200
```

Example local OSRM flow:

```bash
docker run -t -v "$PWD/osrm:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/india-latest.osm.pbf
docker run -t -v "$PWD/osrm:/data" osrm/osrm-backend osrm-partition /data/india-latest.osrm
docker run -t -v "$PWD/osrm:/data" osrm/osrm-backend osrm-customize /data/india-latest.osrm
docker run -p 5000:5000 -v "$PWD/osrm:/data" osrm/osrm-backend osrm-routed --algorithm mld /data/india-latest.osrm
```

## Development Seed Users

Use these only after running `npm run seed` in development or staging. Do not run force seed against production data.

| Role       | Email                  | Password     |
|------------|------------------------|--------------|
| Admin      | admin@supergps.com     | admin123     |
| Dealer     | dealer@supergps.com    | dealer123    |
| Customer   | customer@supergps.com  | customer123  |
| Technician | tech@supergps.com      | tech123      |

Dealer Sales Code: `DLR-ABC123`

## API Endpoints

### Auth
- `POST /api/auth/register` - Register user/dealer
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Orders
- `POST /api/orders` - Place order (customer/dealer)
- `GET /api/orders/my-orders` - Customer orders
- `GET /api/orders/dealer-orders` - Dealer orders
- `GET /api/orders/all` - Admin all orders
- `GET /api/orders/:id` - Single order detail
- `PUT /api/orders/:id/payment` - Update payment status

### Vehicles
- `GET /api/vehicles/my-vehicles` - Customer vehicles
- `GET /api/vehicles/dealer-vehicles` - Dealer vehicles
- `GET /api/vehicles/all` - Admin all vehicles
- `GET /api/vehicles/:id` - Single vehicle detail

### Dealers
- `GET /api/dealers/all` - Admin all dealers
- `GET /api/dealers/profile` - Dealer own profile
- `PUT /api/dealers/profile` - Update dealer profile
- `GET /api/dealers/:id` - Single dealer

### Activation
- `GET /api/activation/pending` - Pending activation orders
- `POST /api/activation/start/:orderId` - Start activation
- `PUT /api/activation/step/:logId` - Update activation step
- `GET /api/activation/logs/:vehicleId` - Activation logs

## Flow

1. Customer registers → Login → Place order (with/without sales code)
2. If sales code entered → Order linked to dealer
3. Dealer sees order in dealer app → Starts activation
4. Technician/dealer completes 6 activation steps
5. Vehicle appears in customer app after activation complete
6. Dealer can see all activated vehicles + customer details

## Tech Stack
- Node.js + Express
- Sequelize ORM
- Neon/Postgres for production
- JWT Authentication
- bcryptjs Password Hashing
