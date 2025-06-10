# Bunny Planet

This repo contains a small Three.js demo where you hop across tiny spherical planets to catch mischievous bunnies.

The world features a bright blue gradient skybox and each bunny is now a simple model with a body, head, and floppy ears so they look more like real bunnies. The starting planet is a vibrant orange so it stands out against the sky.

The player has a small humanoid model complete with arms, legs, and a hat. Movement and orientation have been tweaked so the avatar stays upright on the planets. A minor bug that caused the model to spin and fall over after moving has been fixed by ensuring its forward vector always remains tangent to the surface.

Open `start.html` and press **Start Game** to begin playing.

## Controls

- **W/A/S/D** — move around the current planet
- **Space** — jump off the surface
- Drag anywhere else on the screen to rotate the camera
- **E** or **Hop** button — instantly hop to the closest planet up to 15 units away
- **F** or **Tongue** button — snag bunnies with a stretchy tongue (only after picking up the power‑up)

Gravity always pulls you back toward the planet you are on.

On touch screens, a joystick appears in the lower-left corner with **Jump** and **Hop** buttons on the right so you can play on mobile devices.

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
