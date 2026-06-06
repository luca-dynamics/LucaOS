# Identity Core

The Identity Core is the durable, user-owned profile Luca can eventually use to maintain coherent personalization across sessions and devices. It distinguishes a stable user identifier and preferred name from configurable communication style, Luca personality, active projects, model choices, device preferences, and privacy defaults.

`createIdentityProfile` copies collection inputs, assigns ISO timestamps when omitted, validates required identity fields, and returns a typed profile. This foundation does not persist the profile or inject it into current identity/runtime services.

Privacy defaults are policy hints, not authorization. A runtime adapter must still evaluate the active Privacy Policy before reading or writing data.
