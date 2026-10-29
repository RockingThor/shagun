Demo-mode result images.

Now: illustrated SVG portraits generated from the catalog. They never 404.

Replace later with real YouCam renders (JPG/PNG), same paths:

- public/demo/selfie.svg
  A real chest-up selfie (shoulders visible, frontal face, even light).

- public/demo/looks/{occasion}-{clothes|earrings|hair|lipstick}.svg
  Real chained renders for the default look of each occasion.

Any swapped combination is served live by GET /api/demo/portrait
and should be replaced with cached YouCam PNGs once a key exists.

Filenames currently in public/demo/looks:
- diwali-clothes.svg
- diwali-earrings.svg
- diwali-hair.svg
- diwali-lipstick.svg
- sangeet-clothes.svg
- sangeet-earrings.svg
- sangeet-hair.svg
- sangeet-lipstick.svg
- office-party-clothes.svg
- office-party-earrings.svg
- office-party-hair.svg
- office-party-lipstick.svg
- wedding-guest-clothes.svg
- wedding-guest-earrings.svg
- wedding-guest-hair.svg
- wedding-guest-lipstick.svg
