export const WEB_UNAVAILABLE_TITLE = "Available in LucaOS Desktop";

export const getWebUnavailableMessage = (featureName: string): string =>
  `${featureName} requires the LucaOS Desktop runtime and is not available in the browser release.`;
