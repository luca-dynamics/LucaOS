import { Type, FunctionDeclaration } from "@google/genai";

export const postInstagramTool: FunctionDeclaration = {
  name: "postInstagram",
  description:
    "Post to Instagram with a caption and optional image. Requires Instagram Luca Link.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      caption: {
        type: Type.STRING,
        description: "The caption for the post.",
      },
      imagePath: {
        type: Type.STRING,
        description: "Optional path to an image file to post.",
      },
    },
    required: ["caption"],
  },
};

export const readInstagramFeedTool: FunctionDeclaration = {
  name: "readInstagramFeed",
  description: "Read recent posts from the Instagram feed.",
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

export const likeInstagramPostTool: FunctionDeclaration = {
  name: "likeInstagramPost",
  description: "Like a specific Instagram post.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      postUrl: {
        type: Type.STRING,
        description: "The full URL of the Instagram post to like.",
      },
    },
    required: ["postUrl"],
  },
};

export const commentInstagramPostTool: FunctionDeclaration = {
  name: "commentInstagramPost",
  description: "Post a comment on an Instagram post.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      postUrl: {
        type: Type.STRING,
        description: "The full URL of the Instagram post.",
      },
      comment: {
        type: Type.STRING,
        description: "The comment text.",
      },
    },
    required: ["postUrl", "comment"],
  },
};

export const postInstagramStoryTool: FunctionDeclaration = {
  name: "postInstagramStory",
  description: "Post a story to Instagram. Requires an image file.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      imagePath: {
        type: Type.STRING,
        description: "Path to the image file to post as a story.",
      },
    },
    required: ["imagePath"],
  },
};

export const getInstagramStoriesTool: FunctionDeclaration = {
  name: "getInstagramStories",
  description: "Get available stories from your Instagram feed.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const followInstagramUserTool: FunctionDeclaration = {
  name: "followInstagramUser",
  description: "Follow a user on Instagram.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      username: {
        type: Type.STRING,
        description: "The Instagram username to follow.",
      },
    },
    required: ["username"],
  },
};

export const unfollowInstagramUserTool: FunctionDeclaration = {
  name: "unfollowInstagramUser",
  description: "Unfollow a user on Instagram.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      username: {
        type: Type.STRING,
        description: "The Instagram username to unfollow.",
      },
    },
    required: ["username"],
  },
};

export const sendInstagramDMTool: FunctionDeclaration = {
  name: "sendInstagramDM",
  description: "Send a Direct Message on Instagram.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      username: {
        type: Type.STRING,
        description: "The recipient's Instagram username.",
      },
      message: {
        type: Type.STRING,
        description: "The message content.",
      },
    },
    required: ["username", "message"],
  },
};

export const readInstagramDMsTool: FunctionDeclaration = {
  name: "readInstagramDMs",
  description: "Read your Instagram DM inbox.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const exploreInstagramContentTool: FunctionDeclaration = {
  name: "exploreInstagramContent",
  description: "Discover new content on the Instagram Explore page.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const getInstagramStatsTool: FunctionDeclaration = {
  name: "getInstagramStats",
  description: "Get profile statistics (followers, posts, etc.) for a user.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      username: {
        type: Type.STRING,
        description: "The Instagram username (optional, defaults to 'me').",
      },
    },
  },
};
