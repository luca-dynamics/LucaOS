export const exec = () => {
  console.warn("Mock child_process.exec called in browser environment");
  return {
    on: () => {},
    stdout: { on: () => {} },
    stderr: { on: () => {} },
    kill: () => {}
  };
};
export const spawn = () => {
    console.warn("Mock child_process.spawn called in browser environment");
    return {
      on: () => {},
      stdout: { on: () => {} },
      stderr: { on: () => {} },
      kill: () => {}
    };
  };

export const execSync = () => {
    console.warn("Mock child_process.execSync called in browser environment");
    return Buffer.from("");
};

export const spawnSync = () => {
    console.warn("Mock child_process.spawnSync called in browser environment");
    return { status: 0, stdout: Buffer.from(""), stderr: Buffer.from("") };
};

export default {
    exec,
    spawn,
    execSync,
    spawnSync
};
