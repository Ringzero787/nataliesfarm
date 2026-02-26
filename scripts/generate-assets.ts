/**
 * Asset Generation Script for Natalie's Farm
 * Uses OpenAI gpt-image-1 to generate all game art assets.
 *
 * Usage:
 *   npx tsx scripts/generate-assets.ts              # generate all
 *   npx tsx scripts/generate-assets.ts horse         # just horse assets
 *   npx tsx scripts/generate-assets.ts tools         # just tool assets
 *   npx tsx scripts/generate-assets.ts food          # just food assets
 *   npx tsx scripts/generate-assets.ts environment   # just backgrounds
 *   npx tsx scripts/generate-assets.ts ui            # just UI elements
 */

import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load API key from data.env
dotenv.config({ path: path.resolve(__dirname, '../data.env') });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ASSETS_DIR = path.resolve(__dirname, '../public/assets/sprites');

// ── Style prefix applied to EVERY prompt for consistency ──────
const STYLE_PREFIX =
  'Pixar/Illumination animation style, semi-realistic 3D-rendered look, ' +
  'soft diffused lighting, warm color palette, slightly exaggerated proportions, ' +
  'adorable expressive eyes, smooth rounded shapes, high detail fur/skin textures, ' +
  "children's game art, cheerful and friendly, professional quality game asset";

const TRANSPARENT_SUFFIX = 'isolated on transparent background, clean edges, no shadow on ground';
const BACKGROUND_SUFFIX = 'high detail, vibrant colors, professional game background, 16:9 aspect ratio';

// ── Asset Definitions ─────────────────────────────────────────

interface AssetDef {
  filename: string;
  prompt: string;
  folder: string;
  transparent: boolean;
  size?: '1024x1024' | '1536x1024' | '1024x1536';
}

const HORSE_ASSETS: AssetDef[] = [
  {
    filename: 'horse-idle.png',
    prompt: 'A friendly cartoon farm horse standing calmly, facing slightly left, warm brown coat, dark flowing mane, big round sparkling eyes, gentle smile, full body visible, children\'s storybook character',
    folder: 'horse', transparent: true,
  },
  {
    filename: 'horse-eating.png',
    prompt: 'A cute cartoon horse with head lowered eating hay, mouth open with hay sticking out, happy satisfied expression, warm brown coat',
    folder: 'horse', transparent: true,
  },
  {
    filename: 'horse-happy.png',
    prompt: 'A cartoon brown farm horse with a content peaceful expression, ears relaxed, soft warm eyes with a gentle look, standing proudly, children\'s book art style',
    folder: 'horse', transparent: true,
  },
  {
    filename: 'horse-dirty.png',
    prompt: 'A cute cartoon horse covered in mud splotches and dirt, looking a bit sheepish, brown coat with visible mud patches, messy mane',
    folder: 'horse', transparent: true,
  },
  {
    filename: 'horse-clean.png',
    prompt: 'A cute cartoon horse that is freshly bathed, coat is shiny and gleaming, sparkle effects around it, looking proud and clean, warm brown coat',
    folder: 'horse', transparent: true,
  },
  {
    filename: 'horse-wet.png',
    prompt: 'A cute cartoon horse dripping with water, wet mane flat against neck, water droplets flying off, slightly surprised expression, warm brown coat',
    folder: 'horse', transparent: true,
  },
  {
    filename: 'horse-brushed.png',
    prompt: 'A cute cartoon horse with perfectly groomed shiny coat, fluffy mane neatly brushed, sparkles around the coat, looking content, warm brown coat',
    folder: 'horse', transparent: true,
  },
];

const PIG_ASSETS: AssetDef[] = [
  {
    filename: 'pig-idle.png',
    prompt: 'A cute cartoon pink pig standing with a cheerful smile, curly tail, round snout, big expressive eyes, chubby round body',
    folder: 'pig', transparent: true,
  },
  {
    filename: 'pig-eating.png',
    prompt: 'A cute cartoon pink pig happily eating from a trough, mouth full, crumbs around snout, eyes squinting with joy',
    folder: 'pig', transparent: true,
  },
  {
    filename: 'pig-happy.png',
    prompt: 'A cute cartoon pink pig jumping with joy, huge smile, curly tail bouncing, hooves off the ground, pure delight expression',
    folder: 'pig', transparent: true,
  },
  {
    filename: 'pig-dirty.png',
    prompt: 'A cute cartoon pink pig covered in mud, mud splotches all over, looking playful and muddy, mud on snout',
    folder: 'pig', transparent: true,
  },
  {
    filename: 'pig-clean.png',
    prompt: 'A cute cartoon pink pig freshly washed, bright pink shiny skin, sparkles around it, looking proud and squeaky clean',
    folder: 'pig', transparent: true,
  },
  {
    filename: 'pig-wet.png',
    prompt: 'A cute cartoon pink pig dripping wet, water droplets everywhere, shaking off water, surprised but amused expression',
    folder: 'pig', transparent: true,
  },
  {
    filename: 'pig-brushed.png',
    prompt: 'A cute cartoon pink pig with perfectly smooth shiny skin after being brushed, content expression, sparkles on coat',
    folder: 'pig', transparent: true,
  },
];

const SHEEP_ASSETS: AssetDef[] = [
  {
    filename: 'sheep-idle.png',
    prompt: 'A cute cartoon fluffy white sheep standing with a sweet gentle smile, very fluffy white wool body, dark chocolate brown face and dark brown legs, big round eyes, black-faced sheep breed',
    folder: 'sheep', transparent: true,
  },
  {
    filename: 'sheep-eating.png',
    prompt: 'A cute cartoon fluffy white sheep munching on green grass, grass poking out of mouth, content expression, fluffy white wool, dark chocolate brown face and dark brown legs, black-faced sheep breed',
    folder: 'sheep', transparent: true,
  },
  {
    filename: 'sheep-happy.png',
    prompt: 'A cute cartoon fluffy white sheep bouncing with happiness, extra fluffy white wool puffed out, huge smile, dark chocolate brown face and dark brown legs with bright eyes, black-faced sheep breed',
    folder: 'sheep', transparent: true,
  },
  {
    filename: 'sheep-dirty.png',
    prompt: 'A cute cartoon white sheep with dirty matted wool, twigs and leaves stuck in fleece, looking disheveled, dark chocolate brown face and dark brown legs with mud, black-faced sheep breed',
    folder: 'sheep', transparent: true,
  },
  {
    filename: 'sheep-clean.png',
    prompt: 'A cute cartoon white sheep with perfectly clean fluffy wool, cloud-like pristine fleece, sparkles throughout, glowing white wool, dark chocolate brown face and dark brown legs, black-faced sheep breed',
    folder: 'sheep', transparent: true,
  },
  {
    filename: 'sheep-wet.png',
    prompt: 'A cute cartoon white sheep soaking wet, wool flat and dripping, looking like a skinny wet sheep, funny surprised expression, dark chocolate brown face and dark brown legs, black-faced sheep breed',
    folder: 'sheep', transparent: true,
  },
  {
    filename: 'sheep-brushed.png',
    prompt: 'A cute cartoon white sheep with incredibly fluffy brushed-out wool, extra poofy like a cloud, proud expression, perfectly groomed, dark chocolate brown face and dark brown legs, black-faced sheep breed',
    folder: 'sheep', transparent: true,
  },
];

const CHICKEN_ASSETS: AssetDef[] = [
  {
    filename: 'chicken-idle.png',
    prompt: 'A cute cartoon golden yellow chicken standing with a cheerful expression, bright red comb and wattle, fluffy feathers, round body, big expressive eyes, short orange beak',
    folder: 'chicken', transparent: true,
  },
  {
    filename: 'chicken-eating.png',
    prompt: 'A cute cartoon golden yellow chicken pecking at grain on the ground, head lowered, beak open, happy eating expression, fluffy feathers',
    folder: 'chicken', transparent: true,
  },
  {
    filename: 'chicken-happy.png',
    prompt: 'A cute cartoon golden yellow chicken flapping wings with joy, feathers ruffled happily, huge smile, bright red comb bouncing, eyes sparkling',
    folder: 'chicken', transparent: true,
  },
  {
    filename: 'chicken-dirty.png',
    prompt: 'A cute cartoon golden yellow chicken covered in dirt and dust, messy feathers with mud spots, looking sheepish, dusty comb',
    folder: 'chicken', transparent: true,
  },
  {
    filename: 'chicken-clean.png',
    prompt: 'A cute cartoon golden yellow chicken freshly cleaned, bright shiny feathers, sparkles around it, gleaming red comb, proud fluffy posture',
    folder: 'chicken', transparent: true,
  },
  {
    filename: 'chicken-wet.png',
    prompt: 'A cute cartoon golden yellow chicken dripping wet, feathers flat and soggy, water droplets flying off, surprised expression, skinny wet look',
    folder: 'chicken', transparent: true,
  },
  {
    filename: 'chicken-brushed.png',
    prompt: 'A cute cartoon golden yellow chicken with perfectly preened glossy feathers, extra fluffy and shiny, content expression, sparkles on plumage',
    folder: 'chicken', transparent: true,
  },
];

const GOAT_ASSETS: AssetDef[] = [
  {
    filename: 'goat-idle.png',
    prompt: 'A cute cartoon grey and white goat standing with a playful expression, short curved horns, floppy ears, small beard, big round expressive eyes, sturdy body',
    folder: 'goat', transparent: true,
  },
  {
    filename: 'goat-eating.png',
    prompt: 'A cute cartoon grey and white goat munching on hay, mouth full and chewing happily, bits of hay sticking out, content expression, floppy ears',
    folder: 'goat', transparent: true,
  },
  {
    filename: 'goat-happy.png',
    prompt: 'A cute cartoon grey and white goat jumping and prancing with joy, all four hooves off the ground, huge smile, ears perked up, tail wagging',
    folder: 'goat', transparent: true,
  },
  {
    filename: 'goat-dirty.png',
    prompt: 'A cute cartoon grey and white goat covered in mud and dirt, messy fur with mud patches, looking mischievous, dirty hooves and beard',
    folder: 'goat', transparent: true,
  },
  {
    filename: 'goat-clean.png',
    prompt: 'A cute cartoon grey and white goat freshly cleaned, bright shiny fur, sparkles around it, gleaming horns, proud fluffy posture',
    folder: 'goat', transparent: true,
  },
  {
    filename: 'goat-wet.png',
    prompt: 'A cute cartoon grey and white goat dripping wet, fur flat and soggy, water droplets flying off, surprised grumpy expression, droopy ears',
    folder: 'goat', transparent: true,
  },
  {
    filename: 'goat-brushed.png',
    prompt: 'A cute cartoon grey and white goat with perfectly groomed fluffy fur, extra soft and shiny coat, content expression with eyes half-closed, sparkles on fur',
    folder: 'goat', transparent: true,
  },
];

const BUNNY_ASSETS: AssetDef[] = [
  {
    filename: 'bunny-idle.png',
    prompt: 'A cute cartoon light brown bunny rabbit sitting upright, long floppy ears, fluffy cotton tail, pink nose, big round sparkly eyes',
    folder: 'bunny', transparent: true,
  },
  {
    filename: 'bunny-eating.png',
    prompt: 'A cute cartoon light brown bunny holding and nibbling a carrot with both paws, cheeks puffed, happy munching expression',
    folder: 'bunny', transparent: true,
  },
  {
    filename: 'bunny-happy.png',
    prompt: 'A cute cartoon light brown bunny hopping with joy, ears flopping, big smile, eyes sparkling with happiness, fluffy tail bouncing',
    folder: 'bunny', transparent: true,
  },
  {
    filename: 'bunny-dirty.png',
    prompt: 'A cute cartoon light brown bunny with dirt and mud on fur, messy whiskers, paws dirty, looking a bit embarrassed',
    folder: 'bunny', transparent: true,
  },
  {
    filename: 'bunny-clean.png',
    prompt: 'A cute cartoon light brown bunny freshly cleaned, soft shiny fur, sparkles around it, pink nose gleaming, perfectly groomed whiskers',
    folder: 'bunny', transparent: true,
  },
  {
    filename: 'bunny-wet.png',
    prompt: 'A cute cartoon light brown bunny soaking wet, ears drooping with water, fur slicked down, looking small and soggy but cute',
    folder: 'bunny', transparent: true,
  },
  {
    filename: 'bunny-brushed.png',
    prompt: 'A cute cartoon light brown bunny with perfectly brushed fluffy fur, extra soft looking, content eyes half-closed, luxurious coat',
    folder: 'bunny', transparent: true,
  },
];

const TOOL_ASSETS: AssetDef[] = [
  {
    filename: 'brush.png',
    prompt: 'A cartoon wooden animal grooming brush with soft bristles, wooden handle, cute and colorful, game item',
    folder: 'tools', transparent: true,
  },
  {
    filename: 'sponge.png',
    prompt: 'A cartoon yellow bath sponge with bubbles on it, soft and squishy looking, cute game item for washing',
    folder: 'tools', transparent: true,
  },
  {
    filename: 'towel.png',
    prompt: 'A cartoon fluffy blue towel folded neatly, soft and plush looking, cute game item for drying',
    folder: 'tools', transparent: true,
  },
  {
    filename: 'broom.png',
    prompt: 'A cartoon wooden broom with straw bristles, farm style, cute and colorful, game item for cleaning',
    folder: 'tools', transparent: true,
  },
  {
    filename: 'bucket.png',
    prompt: 'A cartoon metal bucket filled with soapy water, bubbles overflowing, shiny metal, cute game item',
    folder: 'tools', transparent: true,
  },
  {
    filename: 'hose.png',
    prompt: 'A cartoon green garden hose nozzle spraying water, water splash effect, cute game item',
    folder: 'tools', transparent: true,
  },
  {
    filename: 'toy.png',
    prompt: 'A cartoon colorful yarn ball toy with a string dangling, bright rainbow colors, soft and round, cute game item for playing with farm animals',
    folder: 'tools', transparent: true,
  },
  {
    filename: 'rubber-duck.png',
    prompt: 'A cartoon bright yellow rubber duck toy, cute and squeaky looking, classic bath duck with orange beak, adorable children\'s game item',
    folder: 'tools', transparent: true,
  },
  {
    filename: 'worm.png',
    prompt: 'A cartoon cute pink wiggly worm with big happy eyes, plump and squishy, bright pink with a friendly smile, adorable children\'s game toy',
    folder: 'tools', transparent: true,
  },
  {
    filename: 'cowbell.png',
    prompt: 'A cartoon shiny golden cowbell with a rope string attached, cute and jingly looking, bright gold metal bell, adorable children\'s game toy',
    folder: 'tools', transparent: true,
  },
  {
    filename: 'shiny-button.png',
    prompt: 'A cartoon big shiny colorful button or coin, sparkling and glittery, bright rainbow reflections, adorable children\'s game toy for a chicken to peck at',
    folder: 'tools', transparent: true,
  },
  {
    filename: 'teddy-bear.png',
    prompt: 'A cartoon cute small brown stuffed teddy bear toy, soft and cuddly with button eyes, adorable children\'s game toy',
    folder: 'tools', transparent: true,
  },
  {
    filename: 'pompom.png',
    prompt: 'A cartoon fluffy soft pom-pom ball, pastel pink and white fuzzy texture, bouncy and adorable, cute children\'s game toy for a bunny',
    folder: 'tools', transparent: true,
  },
];

const FOOD_ASSETS: AssetDef[] = [
  {
    filename: 'hay.png',
    prompt: 'A cartoon bundle of golden hay tied with a string, farm animal food, cute game item, no face no eyes no mouth, inanimate object only',
    folder: 'food', transparent: true,
  },
  {
    filename: 'apple.png',
    prompt: 'A cartoon shiny red apple with a green leaf on the stem, delicious looking, cute game food item, no face no eyes no mouth, inanimate object only',
    folder: 'food', transparent: true,
  },
  {
    filename: 'carrot.png',
    prompt: 'A cartoon bright orange carrot with green leafy top, fresh and crunchy looking, cute game food item, no face no eyes no mouth, inanimate object only',
    folder: 'food', transparent: true,
  },
  {
    filename: 'slop.png',
    prompt: 'A cartoon wooden trough bucket filled with pig slop food, chunky farm feed, cute game item, no face no eyes no mouth, inanimate object only',
    folder: 'food', transparent: true,
  },
  {
    filename: 'grass.png',
    prompt: 'A cartoon tuft of fresh green grass, bright green blades, farm animal food, cute game item, no face no eyes no mouth, inanimate object only',
    folder: 'food', transparent: true,
  },
  {
    filename: 'lettuce.png',
    prompt: 'A cartoon head of fresh green lettuce, crispy leaves, bright green, cute game food item for bunny, no face no eyes no mouth, inanimate object only',
    folder: 'food', transparent: true,
  },
  {
    filename: 'grain.png',
    prompt: 'A cartoon small pile of golden grain seeds, scattered wheat kernels, farm chicken food, cute game food item, no face no eyes no mouth, inanimate object only',
    folder: 'food', transparent: true,
  },
  {
    filename: 'corn.png',
    prompt: 'A cartoon bright yellow ear of corn with green husk partially peeled back, plump kernels, cute game food item for chicken, no face no eyes no mouth, inanimate object only',
    folder: 'food', transparent: true,
  },
];

const ENVIRONMENT_ASSETS: AssetDef[] = [
  {
    filename: 'barn-interior.png',
    prompt: 'Interior of an empty cozy cartoon barn with no animals or characters, wooden plank walls, hay scattered on the floor, warm lantern lighting, two windows showing blue sky, wooden fence railing in the middle, hay bales stacked on the left side, charming and inviting farm setting for a children\'s game, empty room ready for animals to be placed in',
    folder: 'environment', transparent: false, size: '1536x1024',
  },
  {
    filename: 'wash-station.png',
    prompt: 'Interior of a cartoon animal wash station in a barn, light blue tiled walls, wet floor with puddles, bucket and hose visible, soap bubbles floating, bright cheerful lighting, children\'s game background',
    folder: 'environment', transparent: false, size: '1536x1024',
  },
  {
    filename: 'feeding-area.png',
    prompt: 'Interior of a cartoon barn feeding area, wooden feeding trough in center, hay bales stacked on sides, warm golden lighting, rustic charm, children\'s game background',
    folder: 'environment', transparent: false, size: '1536x1024',
  },
  {
    filename: 'hay-bale.png',
    prompt: 'A cartoon hay bale, golden straw tied with rope, farm decoration, cute and detailed',
    folder: 'environment', transparent: true,
  },
  {
    filename: 'water-trough.png',
    prompt: 'A cartoon stone water trough filled with clear blue water, small ripples on surface, farm decoration',
    folder: 'environment', transparent: true,
  },
  {
    filename: 'lantern.png',
    prompt: 'A cartoon hanging barn lantern with warm orange glow, rustic metal frame, cozy lighting, farm decoration',
    folder: 'environment', transparent: true,
  },
];

const ICON_ASSETS: AssetDef[] = [
  {
    filename: 'icon-feed.png',
    prompt: 'A round cartoon icon of a red apple and golden hay bundle together, bright and appetizing, game activity button icon for feeding farm animals',
    folder: 'ui', transparent: true,
  },
  {
    filename: 'icon-brush.png',
    prompt: 'A round cartoon icon of a wooden grooming brush with sparkles coming off bristles, game activity button icon for brushing farm animals',
    folder: 'ui', transparent: true,
  },
  {
    filename: 'icon-wash.png',
    prompt: 'A round cartoon icon of a sponge with soap bubbles and water splash, bubbly and fun, game activity button icon for washing farm animals',
    folder: 'ui', transparent: true,
  },
  {
    filename: 'icon-dry.png',
    prompt: 'A round cartoon icon of a fluffy towel with a warm sunshine glow behind it, game activity button icon for drying farm animals',
    folder: 'ui', transparent: true,
  },
  {
    filename: 'icon-barn.png',
    prompt: 'A round cartoon icon of a broom sweeping with dust clouds, tidy and clean theme, game activity button icon for cleaning a farm barn',
    folder: 'ui', transparent: true,
  },
  {
    filename: 'icon-play.png',
    prompt: 'A round cartoon icon of a yarn ball with playful motion lines, bright colorful, game activity button icon for playing with farm animals',
    folder: 'ui', transparent: true,
  },
];

const UI_ASSETS: AssetDef[] = [
  {
    filename: 'star.png',
    prompt: 'A cartoon five-pointed golden yellow star shape, shiny metallic surface with sparkle highlights, children\'s game reward collectible icon',
    folder: 'ui', transparent: true,
  },
  {
    filename: 'heart.png',
    prompt: 'A cartoon red heart icon, shiny and plump, love/affection symbol, game UI element',
    folder: 'ui', transparent: true,
  },
  {
    filename: 'lock.png',
    prompt: 'A cartoon padlock icon, grey metal, locked state, cute rounded shape, game UI lock icon',
    folder: 'ui', transparent: true,
  },
  {
    filename: 'sparkle.png',
    prompt: 'A cartoon white sparkle/twinkle star effect, bright glowing, magical clean effect, game particle',
    folder: 'ui', transparent: true,
  },
  {
    filename: 'bubble.png',
    prompt: 'A cartoon translucent soap bubble, rainbow sheen on surface, reflective highlight, game particle effect',
    folder: 'ui', transparent: true,
  },
  {
    filename: 'waterdrop.png',
    prompt: 'A cartoon blue water droplet, shiny and translucent, teardrop shape with highlight, game particle effect',
    folder: 'ui', transparent: true,
  },
  {
    filename: 'title-logo.png',
    prompt: "Game logo text reading exactly \"Natalie's Farm\" (N-A-T-A-L-I-E-'-S  F-A-R-M, only one letter L) in a fun cartoon wooden sign style, rustic wood plank with carved colorful letters, farm theme with small horseshoe decoration, children's game title, text only no characters or animals",
    folder: 'ui', transparent: true, size: '1536x1024',
  },
];

const COSMETIC_ASSETS: AssetDef[] = [
  {
    filename: 'red-bow.png',
    prompt: 'A cute cartoon bright red bow ribbon accessory for a farm animal, silk ribbon tied in a bow, shiny and cheerful, children\'s game cosmetic item',
    folder: 'cosmetics', transparent: true,
  },
  {
    filename: 'cowboy-hat.png',
    prompt: 'A cute cartoon brown cowboy hat with a star badge, western ranch style, children\'s game cosmetic item for a farm animal',
    folder: 'cosmetics', transparent: true,
  },
  {
    filename: 'pink-tiara.png',
    prompt: 'A cute cartoon sparkly pink princess tiara with small gems and glitter, shiny and adorable, children\'s game cosmetic item for a farm animal',
    folder: 'cosmetics', transparent: true,
  },
  {
    filename: 'glasses.png',
    prompt: 'Cute cartoon round eyeglasses with thin colorful frames, simple and adorable, children\'s game cosmetic wearable accessory for a farm animal, front-facing view',
    folder: 'cosmetics', transparent: true,
  },
  {
    filename: 'daisy-necklace.png',
    prompt: 'A cute cartoon daisy flower chain necklace, white and yellow daisies strung together, children\'s game cosmetic item for a farm animal',
    folder: 'cosmetics', transparent: true,
  },
  {
    filename: 'gold-crown.png',
    prompt: 'A cute cartoon golden crown with jewels, royal and shiny, small and adorable, children\'s game cosmetic item for a farm animal',
    folder: 'cosmetics', transparent: true,
  },
];

const WARDROBE_ICON: AssetDef[] = [
  {
    filename: 'wardrobe.png',
    prompt: 'A cute cartoon wardrobe/closet icon, small wooden closet with a hanger visible, children\'s game UI button icon',
    folder: 'ui', transparent: true,
  },
];

// ── Asset groups for CLI filtering ────────────────────────────

const ASSET_GROUPS: Record<string, AssetDef[]> = {
  horse: HORSE_ASSETS,
  pig: PIG_ASSETS,
  chicken: CHICKEN_ASSETS,
  goat: GOAT_ASSETS,
  sheep: SHEEP_ASSETS,
  bunny: BUNNY_ASSETS,
  tools: TOOL_ASSETS,
  food: FOOD_ASSETS,
  environment: ENVIRONMENT_ASSETS,
  icons: ICON_ASSETS,
  ui: [...UI_ASSETS, ...WARDROBE_ICON],
  cosmetics: COSMETIC_ASSETS,
};

// ── Generation logic ──────────────────────────────────────────

async function generateAsset(asset: AssetDef): Promise<void> {
  const outDir = path.join(ASSETS_DIR, asset.folder);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, asset.filename);

  // Skip if already exists
  if (fs.existsSync(outPath)) {
    console.log(`  ⏭️  Skipping ${asset.folder}/${asset.filename} (already exists)`);
    return;
  }

  const fullPrompt = asset.transparent
    ? `${STYLE_PREFIX}, ${asset.prompt}, ${TRANSPARENT_SUFFIX}`
    : `${STYLE_PREFIX}, ${asset.prompt}, ${BACKGROUND_SUFFIX}`;

  console.log(`  🎨 Generating ${asset.folder}/${asset.filename}...`);

  try {
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: fullPrompt,
      n: 1,
      size: asset.size ?? '1024x1024',
      quality: 'high',
      background: asset.transparent ? 'transparent' : 'opaque',
      output_format: 'png',
    });

    const imageData = response.data?.[0];
    if (!imageData?.b64_json) {
      console.error(`  ❌ No image data returned for ${asset.filename}`);
      return;
    }

    const buffer = Buffer.from(imageData.b64_json, 'base64');
    fs.writeFileSync(outPath, buffer);
    console.log(`  ✅ Saved ${asset.folder}/${asset.filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
  } catch (err: any) {
    console.error(`  ❌ Failed ${asset.filename}: ${err?.message ?? err}`);
  }
}

async function generateGroup(name: string, assets: AssetDef[]): Promise<void> {
  console.log(`\n📦 Generating ${name} assets (${assets.length} images)...\n`);

  // Generate sequentially to avoid rate limits
  for (const asset of assets) {
    await generateAsset(asset);
    // Small delay between requests
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✅ ${name} complete!\n`);
}

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in data.env');
    console.error('   Make sure data.env contains: OPENAI_API_KEY=sk-...');
    process.exit(1);
  }

  console.log("🐴 Natalie's Farm — Asset Generator");
  console.log('====================================\n');

  // Parse CLI args
  const filter = process.argv[2]?.toLowerCase();

  if (filter && ASSET_GROUPS[filter]) {
    await generateGroup(filter, ASSET_GROUPS[filter]);
  } else if (filter) {
    console.error(`Unknown group: "${filter}"`);
    console.log(`Available: ${Object.keys(ASSET_GROUPS).join(', ')}`);
    process.exit(1);
  } else {
    // Generate all
    const allAssets = Object.values(ASSET_GROUPS).flat();
    console.log(`Generating ${allAssets.length} total assets...\n`);

    for (const [name, assets] of Object.entries(ASSET_GROUPS)) {
      await generateGroup(name, assets);
    }

    console.log('🎉 All assets generated!');
    console.log(`📁 Output: ${ASSETS_DIR}`);
  }
}

main().catch(console.error);
