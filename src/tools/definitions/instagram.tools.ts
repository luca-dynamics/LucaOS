import { SchemaType, FunctionDeclaration } from "@google/generative-ai";

export const postInstagramTool: FunctionDeclaration = {
  name: "postInstagram",
  description:
    "Post to Instagram with a caption and optional image. Requires Instagram Luca Link.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      caption: {
        type: SchemaType.STRING,
        description: "The caption for the post.",
      },
      imagePath: {
        type: SchemaType.STRING,
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
    type: SchemaType.OBJECT,
    properties: {
      count: {
        type: SchemaType.NUMBER,
        description: "Number of posts to retrieve (default 10).",
      },
    },
  },
};

export const likeInstagramPostTool: FunctionDeclaration = {
  name: "likeInstagramPost",
  description: "Like a specific Instagram post.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      postUrl: {
        type: SchemaType.STRING,
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
    type: SchemaType.OBJECT,
    properties: {
      postUrl: {
        type: SchemaType.STRING,
        description: "The full URL of the Instagram post.",
      },
      comment: {
        type: SchemaType.STRING,
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
    type: SchemaType.OBJECT,
    properties: {
      imagePath: {
        type: SchemaType.STRING,
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
    type: SchemaType.OBJECT,
    properties: {},
  },
};

export const followInstagramUserTool: FunctionDeclaration = {
  name: "followInstagramUser",
  description: "Follow a user on Instagram.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      username: {
        type: SchemaType.STRING,
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
    type: SchemaType.OBJECT,
    properties: {
      username: {
        type: SchemaType.STRING,
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
    type: SchemaType.OBJECT,
    properties: {
      username: {
        type: SchemaType.STRING,
        description: "The recipient's Instagram username.",
      },
      message: {
        type: SchemaType.STRING,
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
    type: SchemaType.OBJECT,
    properties: {},
  },
};

export const exploreInstagramContentTool: FunctionDeclaration = {
  name: "exploreInstagramContent",
  description: "Discover new content on the Instagram Explore page.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
};

export const getInstagramStatsTool: FunctionDeclaration = {
  name: "getInstagramStats",
  description: "Get profile statistics (followers, posts, etc.) for a user.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      username: {
        type: SchemaType.STRING,
        description: "The Instagram username (optional, defaults to 'me').",
      },
    },
  },
};
