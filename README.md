# Bunny Planet

This repo contains a small Three.js demo where you hop across tiny spherical planets to catch mischievous bunnies.

**Live preview:** https://noah670.github.io/Bunny_Planet/

The world now loads with a bright blue cloud-filled skybox and a prefiltered reflection map. Surfaces use physically based `MeshStandardMaterial` shaders so hats, planets, and collectibles pick up crisp highlights and believable reflections. A subtle fog pass and a trio of key, fill, and rim lights add depth while the planets borrow a tiling normal map for extra surface detail. New named planets surround the starting world so you can preview nearby destinations from a HUD and hop between them more easily.

A new loading overlay prefetches the skybox, environment reflections, and normal maps before play begins. The progress bar fades away once assets are ready, then the **Start** button enables so gameplay always begins with the full high-quality presentation.

The player has a small humanoid model complete with arms, legs, and a hat. Movement and orientation have been tweaked so the avatar stays upright on the planets. A minor bug that caused the model to spin and fall over after moving has been fixed by ensuring its forward vector always remains tangent to the surface.

Bunnies now sport reflective eyes, pink inner ears, and a little nose so they feel more alive when they scurry around each planet.

Open `start.html` and press **Start Game** to begin playing.

## Controls

- **W/A/S/D** — move around the current planet
- **Space** — jump off the surface
- Drag anywhere else on the screen to rotate the camera
- **E** or **Hop** button — instantly hop to the closest planet up to 22 units away
- **F** or **Tongue** button — snag bunnies with a stretchy tongue (only after picking up the power‑up)

Gravity always pulls you back toward the planet you are on.

On touch screens, a joystick appears in the lower-left corner with **Jump** and **Hop** buttons on the right so you can play on mobile devices. The joystick now snaps to your thumb on touch and you can double tap the playfield to hop toward the closest planet.

Catch all five bunnies before the **250 second** timer expires to win the level. Bunnies will dart away if you get too close. The counter in the corner shows how many remain. After you catch them all, a completion screen lets you restart or return to the title.

Question‑mark item boxes float above the planets. Touch one and an item pops out, spinning briefly before granting a random power‑up like a speed boost or the tongue ability.

## GitHub Pages

To publish the site with GitHub Pages:

1. Go to your repository Settings.
2. Under **Pages**, set the branch to `main` and select the `/` root folder.
3. Save, then visit the URL GitHub provides.

A workflow in `.github/workflows/gh-pages.yml` now runs on pushes to **main** or the **work** branch. Push to either branch and GitHub Actions will deploy the site automatically.

## Netlify Deployment

You can also host the demo on [Netlify](https://www.netlify.com/). Install the CLI with:

```bash
npm install -g netlify-cli
```

Run `netlify login` once to authenticate and then deploy the current folder:

```bash
netlify deploy --prod --dir .
```

The URL that Netlify prints is where your game will be live.
