# Twelve-realm visual and child-learning acceptance contract

The approved visual references are:

- `reference/cloudglow-gameplay-reference.png` — composition, environment and lighting direction
- `reference/mochi-character-reference.png` — face, proportions and material direction

The game is not accepted merely because it builds or runs. Every release must preserve the complete journey, child-safe interaction model and authored visual quality described below.

## Twelve continuous realms

- Cloudglow Garden is open, warm, botanical and visibly cultivated.
- Starwind Citadel uses pearl cloudstone, cool tower silhouettes, stars and aerial architecture.
- Lantern Reef reads unmistakably underwater through caustic colour, coral, bubbles and jelly forms.
- Moonvine Wilds is wet, indigo, dense and bioluminescent while keeping the road and foliage readable.
- Sunbeam Prism Desert is warm and luminous, with sculpted peach-gold mesas, crystals and rainbow motes.
- Clockwork Toy Town uses painted blocks, felt pennants, brass gears and moving toy forms.
- Aurora Snowglobe feels crystalline, snowy and luminous rather than like a blue recolour.
- Dinosaur Fern Valley uses friendly prehistoric scale, fossils and dense fern silhouettes without becoming frightening.
- Candy Cloud Carnival reads as a bright carousel world with distinct confectionery architecture.
- Melody Mountain makes musical forms, rhythm and movement visible in the environment.
- Bubble Planet Spaceport uses playful low-gravity forms, planets, rockets and bubble-like materials.
- Storybook Harbor resolves its three learning discoveries before a visible crest, using warm paper, page, harbour and storybook motifs.
- The final route includes a long authored downhill, an unmistakable green-land reveal and a grounded Home Meadow landing.
- Transitions remain continuous. No realm may read as a flat background or palette swap.
- The finale remains authored, readable and luminous through progress `0.995`; it may not teleport, fade out or loop back to the sky.

## Composition and camera

- Landscape chase camera uses a stable horizon and approximately `52–55°` vertical field of view.
- Normal journey framing keeps Mochi inside a soft horizontal safe band of roughly `42–58%` of screen width.
- Small camera drift is welcome; edge clipping and rigid centre-locking are not.
- Curve anticipation uses physical world distance so route extensions cannot multiply the look-ahead unexpectedly.
- Downhill framing preserves a stable world horizon while still making the changing slope and meadow below legible.
- Mochi's head remains readable above the lower controls and her body anchors the lower frame.
- The living road fills the near frame while preserving enough horizon to preview choices and landmarks.
- Learning prompts remain compact, high and central without obscuring Mochi or the three answer paths.
- Camera roll stays below two degrees during normal travel.

## Character and natural movement

- Mochi retains one continuous chubby body silhouette with no visible ball or capsule chain.
- Broad snout, plum eyes, catchlights, pale belly and soft rose material remain visible at gameplay scale.
- Her follow-the-leader spine carries the path taken by the head naturally toward the tail.
- Lane changes propagate backward instead of translating the whole body at once.
- Compression and stretch waves preserve volume and never resemble an exaggerated earthworm bulge.
- Garden, aerial, swimming, jungle, snow, dinosaur, carnival, musical, space and storybook motion profiles remain visibly distinct.
- Her head stays stable enough for facial expression and eye direction to remain readable.
- Cloud Bounce and Sky Reach have an authored coil, tall rise of approximately five world units, short hold, controlled descent and soft landing.
- Sky Reach may not translate the route root, skate the tail or leave a body kink after landing.

## Environment and lighting

- Every realm contains at least three obvious physical depth layers.
- Roads have an authored deck, edge treatment and visible underside structure where exposed.
- Floating islands have readable top surfaces, detailed sides and real undersides; no island may become a flat black block.
- Waterfalls visibly originate from terrain and include mist or spray.
- Foreground plants and architectural forms have thickness, shading and readable silhouettes.
- Petrol teal, rose Mochi, gold learning objects and each realm's accent palette remain distinct.
- No crushed foliage shadows, global neon bloom, motion blur or continuous camera bob.
- Mobile optimisation may reduce effects, but not remove the core world silhouette or lighting direction.

## Learning journey

- Twelve realms contain three discoveries each: `36` successful learning moments in one smooth journey.
- Shape Trail, Math Quest and Surprise Mix are all fully playable from beginning to finale.
- Shape Trail includes familiar, advanced and explorer tiers across `25` 2D and 3D shapes.
- Math Quest uses addition and subtraction only, with every answer between `0` and `10`.
- Surprise Mix distributes shapes and maths across all twelve realms using balanced rotating patterns; neither subject is permanently backloaded.
- Targets, distractors, maths values and answer-lane positions are regenerated for each fresh journey.
- The three paths remain equally attractive before selection and never reveal the correct answer through brightness alone.
- One elevated third challenge per realm remains generously reachable through Cloud Bounce or Sky Reach.
- A wrong choice pauses gently with a visual retry and no speech, penalty, disappearing answer or forced auto-steer.
- Optional assistance appears only after the child has had time to explore independently.
- Correct choices speak only the collected shape or answer name when answer naming is enabled.
- Completion recaps successful discoveries and never displays wrong attempts as failures.

## Child-safe play

- Soft Breeze, Adventure and Comet remain meaningfully different, smooth and predictable.
- Holding accelerate creates a temporary burst without changing the selected base speed.
- Steering and acceleration remain available from the Storybook crest through the Home Meadow approach.
- At least two lanes remain safe around every friendly obstacle.
- Contact creates a soft poof and short slowdown only: no loss, red flash, harsh buzzer, camera shake or restart.
- There is no timer, leaderboard, life counter, score penalty or game-over state.
- Story voice, world sounds and music can be controlled independently.
- Narration is captioned and music ducks beneath spoken learning feedback.
- Progress and parent-selected settings resume locally without requiring an account or child profile.
- Mobile-landscape controls remain large, reachable and clear at `667 × 375` and above.
- The grounded arrival remains visible for approximately two seconds before the recap covers the scene.

## Public-repository safety gate

- `.env`, `.env.*`, `.vercel`, `.private`, dependency folders and generated build output remain ignored.
- No API key, authentication token, password, private key, child photo or private family asset may be committed.
- README screenshots must come from the live game and contain no browser chrome, account information or personal identifiers.
- Production dependencies must pass `npm audit --omit=dev` before a public release.

## Automatic rejection

- Flat reference art used as the playable background
- Smooth undecorated tube used as the finished road
- Primitive sphere or capsule snake silhouette
- Empty sky standing in for authored island composition
- A realm distinguished only by palette
- Flat black islands, placeholder geometry or unreadable crushed shadows
- Random speed changes, punitive obstacles or spoken wrong-answer feedback
- Fixed question order or fixed correct-answer lanes across every journey
- Midpoint menus that break the continuous twelve-realm trip
- An abrupt road cutoff, floating final island, fade, teleport or recap that hides the Home Meadow landing
- Mobile optimisation that removes essential scene identity or learning controls
