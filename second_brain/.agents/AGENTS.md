# Second Brain & Google Keep Ingestion Guidelines

- **Playwright Google Keep Scraper / WebSocket Hangs**: When automating or scraping Google Keep, avoid using `wait_until="networkidle"` on page navigation because persistent background WebSockets will cause the browser page to hang. Instead, use `wait_until="domcontentloaded"` and a fixed rendering wait (e.g., 5 seconds) to ensure notes are fully loaded.
- **Chrome macOS Cookie Decryption**: When decrypting macOS Chrome cookies for session injection:
  - Extract the "Chrome Safe Storage" key from the macOS Keychain.
  - Derive the AES key using PBKDF2 (1000 iterations, HMAC-SHA1).
  - Strip the 32-byte binary signature/metadata header prepended by modern Chrome from the decrypted plaintext to retrieve the clean UTF-8 cookie value.
- **Keep Note Selector Reference**: When parsing Google Keep DOM elements:
  - Note title selector: `.IZ65Hb-r4nke-haAclf`
  - Note content selector: `.IZ65Hb-qJTHM-haAclf`
- **Obsidian Report Format**: Always format Keep digests and reports using Obsidian-flavored markdown, including frontmatter tags, date, source, and alerts for metadata or opinions.
