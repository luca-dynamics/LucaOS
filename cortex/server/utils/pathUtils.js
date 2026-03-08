import path from 'path';

/**
 * Checks if a child path is within a parent directory.
 * Prevents directory traversal attacks.
 * @param {string} parent - The base allowed directory
 * @param {string} child - The target path to check
 * @returns {boolean}
 */
export const isPathWithinDirectory = (parent, child) => {
    const relative = path.relative(parent, child);
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
};

export default { isPathWithinDirectory };
