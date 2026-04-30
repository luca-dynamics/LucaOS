import { Type, FunctionDeclaration } from "@google/genai";

export const postLinkedInTool: FunctionDeclaration = {
  name: "postLinkedIn",
  description: "Create a LinkedIn post. Requires LinkedIn Luca Link.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: {
        type: Type.STRING,
        description: "The post content.",
      },
      imagePath: {
        type: Type.STRING,
        description: "Optional path to an image file to attach.",
      },
    },
    required: ["content"],
  },
};

export const readLinkedInFeedTool: FunctionDeclaration = {
  name: "readLinkedInFeed",
  description: "Read recent posts from the LinkedIn feed.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      count: {
        type: Type.NUMBER,
        description: "Number of posts to retrieve (default 10).",
      },
    },
  },
};

export const likeLinkedInPostTool: FunctionDeclaration = {
  name: "likeLinkedInPost",
  description: "Like a specific LinkedIn post.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      postUrl: {
        type: Type.STRING,
        description: "The full URL of the LinkedIn post to like.",
      },
    },
    required: ["postUrl"],
  },
};

export const commentLinkedInPostTool: FunctionDeclaration = {
  name: "commentLinkedInPost",
  description: "Post a comment on a LinkedIn post.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      postUrl: {
        type: Type.STRING,
        description: "The full URL of the LinkedIn post.",
      },
      comment: {
        type: Type.STRING,
        description: "The comment text.",
      },
    },
    required: ["postUrl", "comment"],
  },
};

export const sendLinkedInConnectionTool: FunctionDeclaration = {
  name: "sendLinkedInConnection",
  description: "Send a connection request on LinkedIn.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      profileUrl: {
        type: Type.STRING,
        description: "The public profile URL of the user.",
      },
      message: {
        type: Type.STRING,
        description: "Optional personal note to include.",
      },
    },
    required: ["profileUrl"],
  },
};

export const searchLinkedInJobsTool: FunctionDeclaration = {
  name: "searchLinkedInJobs",
  description: "Search for jobs on LinkedIn.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      keywords: {
        type: Type.STRING,
        description: "Job title or keywords.",
      },
      location: {
        type: Type.STRING,
        description: "Location for the search.",
      },
    },
    required: ["keywords"],
  },
};

export const sendLinkedInMessageTool: FunctionDeclaration = {
  name: "sendLinkedInMessage",
  description: "Send a message to a LinkedIn connection.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      profileUrl: {
        type: Type.STRING,
        description: "The public profile URL of the recipient.",
      },
      message: {
        type: Type.STRING,
        description: "The message content.",
      },
    },
    required: ["profileUrl", "message"],
  },
};

export const readLinkedInMessagesTool: FunctionDeclaration = {
  name: "readLinkedInMessages",
  description: "Read your LinkedIn messages.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const viewLinkedInProfileTool: FunctionDeclaration = {
  name: "viewLinkedInProfile",
  description: "View a public LinkedIn profile and extract info.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      profileUrl: {
        type: Type.STRING,
        description: "The full profile URL.",
      },
    },
    required: ["profileUrl"],
  },
};
