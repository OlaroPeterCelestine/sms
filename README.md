# SMS

Next.js app for sending SMS through [Africa's Talking](https://africastalking.com).

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `AT_API_KEY`. Sandbox apps always use `AT_USERNAME=sandbox`.
3. Run `npm run dev` and open [http://localhost:3000](http://localhost:3000).

Optional `AT_SENDER_ID` is a registered short code or alphanumeric sender ID. Leave it blank in sandbox.

## Callbacks

Point these at your public URL in the Africa's Talking dashboard:

- Incoming SMS: `/api/sms/incoming`
- Delivery reports: `/api/sms/delivery`

Messages received while the server is running show in the inbox. They are kept in memory and clear on restart.
