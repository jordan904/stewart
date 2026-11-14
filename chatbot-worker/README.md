# Stewart & Co. Assistant: Chat Worker

Cloudflare Worker behind the site's chat widget. Same setup as The Handywoman
and J Squared bots: Workers AI (Llama 4 Scout, temperature 0.2, trailing
REMINDER), no API keys, nothing sensitive in the browser.

- Prompt: `prompt.js` (built from the site and Dan's answers on 2026-11-12).
- Deployed: https://stewart-co-chatbot.jordan-574.workers.dev (2026-11-12).
- Leads: the chat "Get a quote" form posts to the same Formspree form as the
  page (xaqlwyrr), from the visitor's browser.
- Chat logs: off (no privacy policy yet).

## Deploy
```bash
cd stewart-copainting/chatbot-worker
../../node_modules/.bin/wrangler deploy
```

## Test
```bash
../../node_modules/.bin/wrangler dev --port 8816 --ip 127.0.0.1 --inspector-port 9314
node chat-test.mjs 2
```
28 questions; 56/56 passed on 2026-11-12.
