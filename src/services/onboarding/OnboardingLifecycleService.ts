export const KERNEL_BOOT_MESSAGES = [
  "KERNEL AWAKENING IN PROGRESS...",
  "STABILIZING LUCA TENSORS...",
  "GENERATING IDENTITY KEYPAIR [ED25519]...",
  "LUCA AGENT INITIALIZED.",
];

export const startKernelBootSequence = (options: {
  onMessage: (message: string) => void;
  onKeystroke: () => void;
  onComplete: () => void;
}) => {
  let messageIndex = 0;
  let completionTimeout: ReturnType<typeof setTimeout> | null = null;

  const interval = setInterval(() => {
    if (messageIndex < KERNEL_BOOT_MESSAGES.length) {
      options.onMessage(KERNEL_BOOT_MESSAGES[messageIndex]);
      options.onKeystroke();
      messageIndex += 1;
      return;
    }

    clearInterval(interval);
    completionTimeout = setTimeout(() => {
      options.onComplete();
    }, 1000);
  }, 800);

  return () => {
    clearInterval(interval);
    if (completionTimeout) {
      clearTimeout(completionTimeout);
    }
  };
};

export const scheduleOnboardingDelay = (
  callback: () => void,
  delayMs: number,
) => {
  const timeout = setTimeout(callback, delayMs);
  return () => clearTimeout(timeout);
};

export const waitForOnboardingDelay = (delayMs: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
