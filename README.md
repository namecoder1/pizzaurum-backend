# Fastify Tutorial Web Server

## Overview
Simple web server created with Node.js, Fastify and Supabase.

## Getting Started

1. Clone the repository
```sh
gh clone github.com/namecoder1/fastify-tuto
```

2. Install the dependencies
```sh
cd fastify-tuto
npm i
```

3. Set your environment variables
```sh
touch .env 
```

```sh
nano .env
SUPABASE_URL=<your_supabase_url>
SUPABASE_ANON_KEY=<your_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
```

## Endpoints

> Use `| jq` after the cURL request to properly format the JSON response



  - Manca mode → 400 dal requireField:
    curl -i "http://127.0.0.1:8080/api/debug/error"
    
  - Forza 400:
    curl -i "http://127.0.0.1:8080/api/debug/error?mode=badrequest"
    
  - Forza 500:
    curl -i "http://127.0.0.1:8080/api/debug/error?mode=servererror"

  - Risposta OK:
    curl -i "http://127.0.0.1:8080/api/debug/error?mode=ok"