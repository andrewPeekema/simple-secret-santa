# 🎅 Simple Secret Santa

People picking through practically private pairings

**Try it here:** https://andrewpeekema.github.io/simple-secret-santa/

How it works:
1. Generate pairings by entering participant names
2. Share each link privately with the right person
3. Each person sees their assignment and gets a wishlist password
4. Wishlists are optional — each person can create one for their Santa

Wishlists are gift-wrapped, not locked up — keep anything private off them. 🎁

This site doesn't store or collect any data — everything runs locally in your browser.

## Development

The app is plain ES modules with no build step — there is nothing to compile or bundle, so pushing to `main` deploys exactly what you see in the repository. Browsers block ES modules from loading over the `file://` protocol, so double-clicking `index.html` will not work; instead, serve the directory locally, for example with `python3 -m http.server 8000`, and open `http://localhost:8000` in your browser. Run the test suite with `npm test`; there are no dependencies to install first, since it relies on Node's built-in test runner.
