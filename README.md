# Bunny Planet

This repo contains a small Three.js demo where you can hop around tiny spherical planets.

Open `start.html` to load the start screen then jump into `index.html` to begin playing.

## Controls

- **W/A/S/D** — move around the current planet
- **Space** — jump off the surface

Gravity always pulls you back toward the planet you are on.

## GitHub Pages

To publish the site with GitHub Pages:

1. Go to your repository Settings.
2. Under **Pages**, set the branch to `main` and select the `/` root folder.
3. Save, then visit the URL GitHub provides.

A workflow file is included in `.github/workflows/gh-pages.yml` to automate deployments when pushing to `main`. Just commit and push your changes to `main` and GitHub will build and publish the site.
