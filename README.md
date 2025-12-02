# Pizzaurum Backend

API server Fastify per Pizzaurum: integra Supabase, Stripe, Sanity, Twilio, Expo push e servizi email.

## Prerequisiti
- Node.js 20+
- npm

## Setup rapido
```sh
git clone <repo>
cd pizzaurum-backend
npm install
```

Configura il file `.env` (vedi sotto) e avvia:
```sh
npm run dev       # reload in sviluppo
npm run build     # type-check e build in dist/
npm run start     # avvia il build JS (usa PORT/HOST)
npm run start:dev # avvia direttamente TS con ts-node
```

## Variabili d'ambiente
Imposta almeno questi valori:
```dotenv
NODE_ENV=development
APP_ENV=development
PORT=8080
HOST=0.0.0.0
BASE_URL=http://localhost:8081        # usato per chiamate interne (es. update-net-profit)

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

SANITY_PROJECT_ID=
SANITY_DATASET=production
SANITY_STUDIO_URL=

STRIPE_SECRET_KEY=
STRIPE_SECRET_KEY_TEST=
STRIPE_WEBHOOK_SECRET=
STRIPE_WEBHOOK_SECRET_TEST=
EXPO_PUBLIC_STRIPE_PUBLIC_KEY=
EXPO_PUBLIC_STRIPE_PUBLIC_KEY_TEST=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SID=
TWILIO_PHONE_NUMBER=
```

## Endpoint principali
- Sanity catalogo: `GET /api/sanity/featured|pizzas|pizzaurums|drinks|others|spianatas|opendays`, `GET /api/sanity/product/:id`
- Ordini Supabase: `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders`, `GET /api/admin/orders`
- Gestione ordini: `POST /api/orders/assign-rider`, `POST /api/orders/complete-order`, `POST /api/orders/update-status`
- Stripe: `POST /api/stripe/webhook`, `POST /api/stripe/create-checkout`, `POST /api/stripe/create-payment-sheet`, `GET /api/stripe/order-id`, `POST /api/stripe/payment-methods`, `POST /api/stripe/hosted-checkout`, `POST /api/stripe/refund`, `POST /api/stripe/update-net-profit`
- Notifiche/OTP: `POST /api/twilio/verify`, `PUT /api/twilio/verify`, `POST /api/twilio/send-message`, `POST /api/notification/send`
- Email Resend proxy: `POST /api/resend/admin-invite|purchase-email|rider-invite|welcome-email`
- Admin: `POST /api/admin/create-rider`, `POST /api/admin/create-admin`, `POST /api/admin/change-password`
- Debug: `GET /api/debug/error?mode=ok|badrequest|servererror`

## Note per il deploy
- Il server ora legge `PORT` e `HOST` (default `8080` e `0.0.0.0`).
- Configura i webhook Stripe verso `/api/stripe/webhook` usando la chiave (prod o test) corretta.
- `BASE_URL` deve puntare all'istanza pubblica per le chiamate interne (SMS/Stripe) quando non sei in locale.
