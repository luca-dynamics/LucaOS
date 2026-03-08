/**
 * Standard Actions Registry
 * Defines a list of "Safe" commands allowed when God Mode is DISABLED.
 * Commands can be exact strings or regex patterns.
 */
export const STANDARD_ACTIONS = [
    // --- System Info ---
    /^pmset -g batt$/,
    /^upower -i .*$/,
    /^acpi -b$/,
    /^WMIC Path Win32_Battery Get EstimatedChargeRemaining$/,
    /^system_profiler SPDisplaysDataType | grep Resolution$/,
    /^whoami$/,
    /^pwd$/,
    /^date$/,
    /^ls -la?$/,
    /^uptime$/,

    // --- Media Controls ---
    /^osascript -e "set volume output volume \d+"$/,
    /^nircmd\.exe setsysvolume \d+$/,

    // --- Clipboard ---
    /^pbpaste$/,
    /^pbcopy$/,
    /^powershell -command "Get-Clipboard"$/,

    // --- App Management ---
    /^ls \/Applications$/,
    /^osascript -e 'quit app ".*"'$/,
    /^taskkill \/IM ".*" \/F$/,

    // --- Network ---
    /^ifconfig$/,
    /^ipconfig$/,
    /^ping -c \d+ .*$/,
];

/**
 * Validates if a command is within the safe registry.
 * @param {string} command 
 * @returns {boolean}
 */
export const isCommandSafe = (command) => {
    const trimmed = command.trim();
    return STANDARD_ACTIONS.some(pattern => {
        if (pattern instanceof RegExp) {
            return pattern.test(trimmed);
        }
        return pattern === trimmed;
    });
};

export default STANDARD_ACTIONS;
