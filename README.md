# Bunny Planet

This repo contains a small Three.js demo where you hop across tiny spherical planets to catch mischievous bunnies.

Open `index.html` and press **Start** to begin playing.

## Controls

- **W/A/S/D** — move around the current planet
- **Space** — jump off the surface
- **E** — hop to a nearby planet if one is within reach

Gravity always pulls you back toward the planet you are on.

Catch every bunny to complete the level. Bunnies will dart away if you get too close. The counter in the corner shows how many remain. You also have **250 seconds** to catch them all, displayed in the top right.

## GitHub Pages

To publish the site with GitHub Pages:

1. Go to your repository Settings.
2. Under **Pages**, set the branch to `main` and select the `/` root folder.
3. Save, then visit the URL GitHub provides.

A workflow file is included in `.github/workflows/gh-pages.yml` to automate deployments when pushing to `main`. Add a remote with `git remote add origin <your-repo-url>` then run `git push -u origin main` to deploy.
