# Bunny Planet

This repo contains a small Three.js demo where you hop across tiny spherical planets to catch mischievous bunnies.

Open `start.html` and press **Start Game** to begin playing.

## Controls

- **W/A/S/D** — move around the current planet
- **Space** — jump off the surface
- **E** — hop to a nearby planet if one is within reach

Gravity always pulls you back toward the planet you are on.

On touch screens, a joystick appears in the lower-left corner and a **Jump**
button in the lower-right so you can play on mobile devices.

Catch every bunny to complete the level. Bunnies will dart away if you get too close. The counter in the corner shows how many remain. You also have **250 seconds** to catch them all, displayed in the top right.

## GitHub Pages

To publish the site with GitHub Pages:

1. Go to your repository Settings.
2. Under **Pages**, set the branch to `main` and select the `/` root folder.
3. Save, then visit the URL GitHub provides.

A workflow in `.github/workflows/gh-pages.yml` now runs on pushes to **main** or the **work** branch. Push to either branch and GitHub Actions will deploy the site automatically.
