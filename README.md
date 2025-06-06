# Bunny Planet

This repo contains a small Three.js demo where you hop across tiny spherical planets to catch mischievous bunnies.

The world features a bright blue gradient skybox and each bunny is now a simple model with a body, head, and floppy ears so they look more like real bunnies. The starting planet is a vibrant orange so it stands out against the sky.

Open `start.html` and press **Start Game** to begin playing.

## Controls

- **W/A/S/D** — move around the current planet
- **Space** — jump off the surface
- Drag anywhere else on the screen to rotate the camera
- **E** or **Hop** button — instantly hop to the closest planet up to 12 units away

Gravity always pulls you back toward the planet you are on.

On touch screens, a joystick appears in the lower-left corner with **Jump** and **Hop** buttons on the right so you can play on mobile devices.

Catch all five bunnies before the **250 second** timer expires to win the level. Bunnies will dart away if you get too close. The counter in the corner shows how many remain. After you catch them all, a completion screen lets you restart or return to the title.

## GitHub Pages

To publish the site with GitHub Pages:

1. Go to your repository Settings.
2. Under **Pages**, set the branch to `main` and select the `/` root folder.
3. Save, then visit the URL GitHub provides.

A workflow in `.github/workflows/gh-pages.yml` now runs on pushes to **main** or the **work** branch. Push to either branch and GitHub Actions will deploy the site automatically.
