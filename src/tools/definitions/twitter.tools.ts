import { SchemaType, FunctionDeclaration } from "@google/generative-ai";

export const postTweetTool: FunctionDeclaration = {
  name: "postTweet",
  description:
    "Post a new tweet to Twitter/X. Requires the Twitter Luca Link to be connected.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      text: {
        type: SchemaType.STRING,
        description: "The tweet content (max 280 characters).",
      },
      imagePath: {
        type: SchemaType.STRING,
        description: "Optional path to an image file to attach.",
      },
    },
    required: ["text"],
  },
};

export const readTwitterTimelineTool: FunctionDeclaration = {
  name: "readTwitterTimeline",
  description:
    "Read recent posts from the Twitter/X home timeline. Returns author, text, and time of recent tweets.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      count: {
        type: SchemaType.NUMBER,
        description: "Number of tweets to retrieve (default 10, max 20).",
      },
    },
  },
};

export const likeTwitterPostTool: FunctionDeclaration = {
  name: "likeTwitterPost",
  description: "Like a specific tweet on Twitter/X.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      tweetUrl: {
        type: SchemaType.STRING,
        description:
          "The full URL of the tweet to like (e.g., https://x.com/user/status/123456).",
      },
    },
    required: ["tweetUrl"],
  },
};

export const replyToTweetTool: FunctionDeclaration = {
  name: "replyToTweet",
  description: "Post a reply to a specific tweet on Twitter/X.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      tweetUrl: {
        type: SchemaType.STRING,
        description: "The full URL of the tweet to reply to.",
      },
      text: {
        type: SchemaType.STRING,
        description: "The reply content.",
      },
    },
    required: ["tweetUrl", "text"],
  },
};

export const retweetTwitterPostTool: FunctionDeclaration = {
  name: "retweetTwitterPost",
  description: "Retweet a specific tweet on Twitter/X.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      tweetUrl: {
        type: SchemaType.STRING,
        description: "The full URL of the tweet to retweet.",
      },
    },
    required: ["tweetUrl"],
  },
};

export const quoteTwitterPostTool: FunctionDeclaration = {
  name: "quoteTwitterPost",
  description: "Quote tweet a specific post with your own commentary.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      tweetUrl: {
        type: SchemaType.STRING,
        description: "The full URL of the tweet to quote.",
      },
      text: {
        type: SchemaType.STRING,
        description: "Your commentary for the quote tweet.",
      },
    },
    required: ["tweetUrl", "text"],
  },
};

export const followTwitterUserTool: FunctionDeclaration = {
  name: "followTwitterUser",
  description: "Follow a user on Twitter/X.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      username: {
        type: SchemaType.STRING,
        description: "The Twitter handle (with or without @).",
      },
    },
    required: ["username"],
  },
};

export const unfollowTwitterUserTool: FunctionDeclaration = {
  name: "unfollowTwitterUser",
  description: "Unfollow a user on Twitter/X.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      username: {
        type: SchemaType.STRING,
        description: "The Twitter handle (with or without @).",
      },
    },
    required: ["username"],
  },
};

export const sendTwitterDMTool: FunctionDeclaration = {
  name: "sendTwitterDM",
  description: "Send a Direct Message to a user on Twitter/X.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      username: {
        type: SchemaType.STRING,
        description: "The Twitter handle of the recipient.",
      },
      message: {
        type: SchemaType.STRING,
        description: "The message content.",
      },
    },
    required: ["username", "message"],
  },
};

export const searchTwitterTool: FunctionDeclaration = {
  name: "searchTwitter",
  description: "Search for tweets on Twitter/X.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "The search query or hashtag.",
      },
      count: {
        type: SchemaType.NUMBER,
        description: "Number of results to retrieve (default 10).",
      },
    },
    required: ["query"],
  },
};

export const getTwitterTrendingTool: FunctionDeclaration = {
  name: "getTwitterTrending",
  description: "Get currently trending topics on Twitter/X.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
};
