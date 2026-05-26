import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";

// Pass the tailwind config by absolute path so resolution doesn't depend on cwd.
const here = dirname(fileURLToPath(import.meta.url));

export default {
  plugins: [tailwindcss(join(here, "tailwind.config.ts")), autoprefixer()],
};
