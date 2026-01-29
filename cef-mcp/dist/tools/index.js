import { registerConnectionTools } from './connection.js';
import { registerConsoleTools } from './console.js';
import { registerPageTools } from './pages.js';
import { registerInteractionTools } from './interaction.js';
export function registerAllTools(server) {
    registerConnectionTools(server);
    registerConsoleTools(server);
    registerPageTools(server);
    registerInteractionTools(server);
}
