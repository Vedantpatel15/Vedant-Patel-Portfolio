# Vedant Patel Portfolio

Static portfolio site for Vedant Patel, built for GitHub Pages and simple shared-hosting deployment.

## Files

- `index.html` contains the site structure and content.
- `styles.css` contains the visual system and responsive layout.
- `script.js` handles the mobile menu, reveal animations, active nav state, and experience tabs.
- `assets/VEDANT_RESUME_SI2.pdf` is the linked resume download.
- `.github/workflows/deploy.yml` deploys the site to GitHub Pages from `main`.

## Local preview

This is a static site, so you can preview it by opening [index.html](C:\Users\vedan\Documents\New project\index.html) in a browser.

If you prefer a local server, run:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy to GitHub Pages

1. Push this project to a GitHub repository.
2. The included GitHub Actions workflow will deploy the static site from `main`.
3. In GitHub, go to `Settings` -> `Pages` if needed and make sure the source is `GitHub Actions`.
4. Wait for the workflow run named `Deploy Portfolio` to finish.

For this repository, the expected Pages URL is:

`https://vedantpatel15.github.io/Vedant-Patel-Portfolio/`

## Easy updates

- Update the email link in [index.html](C:\Users\vedan\Documents\New project\index.html) if your preferred public email changes.
- Add your LinkedIn profile by placing another contact card in [index.html](C:\Users\vedan\Documents\New project\index.html).
- Replace the resume PDF in `assets/` if you publish a newer version.
