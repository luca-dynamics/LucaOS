import { Type, FunctionDeclaration } from "@google/genai";

export const postTweetTool: FunctionDeclaration = {
  name: "postTweet",
  description:
    "Post a new tweet to Twitter/X. Requires the Twitter Luca Link to be connected.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      text: {
        type: Type.STRING,
        description: "The tweet content (max 280 characters).",
      },
      imagePath: {
        type: Type.STRING,
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
    type: Type.OBJECT,
    properties: {
      count: {
        type: Type.NUMBER,
        description: "Number of tweets to retrieve (default 10, max 20).",
      },
    },
  },
};

export const likeTwitterPostTool: FunctionDeclaration = {
  name: "likeTwitterPost",
  description: "Like a specific tweet on Twitter/X.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      tweetUrl: {
        type: Type.STRING,
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
    type: Type.OBJECT,
    properties: {
      tweetUrl: {
        type: Type.STRING,
        description: "The full URL of the tweet to reply to.",
      },
      text: {
        type: Type.STRING,
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
    type: Type.OBJECT,
    properties: {
      tweetUrl: {
        type: Type.STRING,
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
    type: Type.OBJECT,
    properties: {
      tweetUrl: {
        type: Type.STRING,
        description: "The full URL of the tweet to quote.",
      },
      text: {
        type: Type.STRING,
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
    type: Type.OBJECT,
    properties: {
      username: {
        type: Type.STRING,
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
    type: Type.OBJECT,
    properties: {
      username: {
        type: Type.STRING,
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
    type: Type.OBJECT,
    properties: {
      username: {
        type: Type.STRING,
        description: "The Twitter handle of the recipient.",
      },
      message: {
        type: Type.STRING,
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
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "The search query or hashtag.",
      },
      count: {
        type: Type.NUMBER,
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
    type: Type.OBJECT,
    properties: {},
  },
};
