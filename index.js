/**
 * index.js
 * A complete Node.js Fulfillment for a Book Recommender Chatbot
 * that handles multiple Intents with "prepared" answers (no DB calls).
 */

const express = require('express');
const bodyParser = require('body-parser');
const { WebhookClient } = require('dialogflow-fulfillment');

const app = express().use(bodyParser.json());

// ====================== 1. 内置“知识库”模拟 ======================

// 1.1 书籍详细信息 (BookInformationIntent) 
//     覆盖了训练短语中出现的书籍，如 1984, War and Peace, Pride and Prejudice, 等
//     每个对象可含 author, publishedYear, pages, summary 等信息
const bookDetails = {
  "1984": {
    title: "1984",
    author: "George Orwell",
    publishedYear: 1949,
    pages: 328,
    summary: "A dystopian novel that explores totalitarianism, surveillance, and repression."
  },
  "war and peace": {
    title: "War and Peace",
    author: "Leo Tolstoy",
    publishedYear: 1869,
    pages: 1225,
    summary: "A historical novel that chronicles the French invasion of Russia and its impact."
  },
  "pride and prejudice": {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    publishedYear: 1813,
    pages: 279,
    summary: "A romantic novel of manners that deals with issues of class, marriage, and morality."
  },
  "the hunger games": {
    title: "The Hunger Games",
    author: "Suzanne Collins",
    publishedYear: 2008,
    pages: 374,
    summary: "A dystopian novel set in Panem, focusing on the deadly annual Hunger Games."
  },
  "lord of the rings": {
    title: "The Lord of the Rings",
    author: "J.R.R. Tolkien",
    publishedYear: 1954,
    pages: 1178,
    summary: "An epic fantasy trilogy about the quest to destroy the One Ring."
  },
  "to kill a mockingbird": {
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    publishedYear: 1960,
    pages: 281,
    summary: "A novel about racial injustice in the Deep South, seen through the eyes of a young girl."
  },
  "the great gatsby": {
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    publishedYear: 1925,
    pages: 180,
    summary: "A critique of the American Dream, set in the Roaring Twenties."
  },
  "little women": {
    title: "Little Women",
    author: "Louisa May Alcott",
    publishedYear: 1868,
    pages: 759,
    summary: "A coming-of-age story about the four March sisters growing up during the Civil War."
  },
  "vampire academy": {
    title: "Vampire Academy",
    author: "Richelle Mead",
    publishedYear: 2007,
    pages: 332,
    summary: "A young adult paranormal romance focusing on a vampire boarding school."
  },
  "heart of darkness": {
    title: "Heart of Darkness",
    author: "Joseph Conrad",
    publishedYear: 1899,
    pages: 96,
    summary: "A novella exploring colonialism in the Congo and the darkness within human nature."
  }
};

// 1.2 按作者推荐书籍 (AuthorBasedRecommendationIntent)
//     覆盖了训练短语里常见的作者
const authorRecommendations = {
  "louisa may alcott": ["Little Women", "Good Wives", "Jo's Boys"],
  "margaret atwood": ["The Handmaid's Tale", "Oryx and Crake", "Alias Grace"],
  "ernest hemingway": ["The Old Man and the Sea", "A Farewell to Arms", "For Whom the Bell Tolls"],
  "agatha christie": ["Murder on the Orient Express", "And Then There Were None", "The Mysterious Affair at Styles"],
  "neil gaiman": ["American Gods", "Coraline", "Neverwhere", "The Graveyard Book"],
  "john grisham": ["The Firm", "A Time to Kill", "The Pelican Brief"],
  "orson scott card": ["Ender's Game", "Speaker for the Dead", "Xenocide"],
  "jane austen": ["Pride and Prejudice", "Sense and Sensibility", "Emma"]
};

// 1.3 按类型（Genre）推荐书籍 (GenreBasedRecommendationIntent)
//     训练短语中出现了 science fiction, fantasy, mystery, romance, historical fiction, 
//     non-fiction, thriller, young adult, horror, self-help 等
const genreRecommendations = {
  "science fiction": ["Dune", "Ender's Game", "Foundation"],
  "fantasy": ["The Hobbit", "A Game of Thrones", "The Name of the Wind"],
  "mystery": ["Gone Girl", "The Girl with the Dragon Tattoo", "In the Woods"],
  "romance": ["Pride and Prejudice", "Me Before You", "The Notebook"],
  "historical fiction": ["The Book Thief", "War and Peace", "All the Light We Cannot See"],
  "non-fiction": ["Sapiens", "Educated", "The Immortal Life of Henrietta Lacks"],
  "thriller": ["The Da Vinci Code", "The Silence of the Lambs", "Misery"],
  "young adult": ["The Hunger Games", "Divergent", "The Fault in Our Stars"],
  "horror": ["The Shining", "It", "House of Leaves"],
  "self-help": ["The 7 Habits of Highly Effective People", "How to Win Friends & Influence People"]
};

// 1.4 寻找类似的书籍 (SimilarBookRecommendationIntent)
//     训练短语中出现: Game of Thrones, Pride and Prejudice, To Kill a Mockingbird, 1984, 
//     The Great Gatsby, Lord of the Rings, Jane Eyre, The Hunger Games 等
const similarBooks = {
  "game of thrones": ["The Name of the Wind", "The Way of Kings", "The Wheel of Time"],
  "pride and prejudice": ["Sense and Sensibility", "Emma", "Wuthering Heights"],
  "to kill a mockingbird": ["The Help", "A Time to Kill", "Go Set a Watchman"],
  "1984": ["Brave New World", "Fahrenheit 451", "We"],
  "the great gatsby": ["This Side of Paradise", "The Sun Also Rises", "The Age of Innocence"],
  "lord of the rings": ["The Silmarillion", "Wheel of Time", "Mistborn"],
  "jane eyre": ["Wuthering Heights", "Rebecca", "North and South"],
  "the hunger games": ["Divergent", "Battle Royale", "The Maze Runner"]
};

// 1.5 推荐评分最高的书籍 (TopRatedBooksIntent)
//     如果用户提到某个类型，就给出该类型里一些高评分作品；若未提到类型，则给出通用高评分
const topRatedByGenre = {
  "science fiction": ["Dune", "Neuromancer", "Ender's Game"],
  "fantasy": ["The Lord of the Rings", "A Song of Ice and Fire", "The Name of the Wind"],
  "mystery": ["The Girl with the Dragon Tattoo", "Gone Girl", "Big Little Lies"],
  "romance": ["Pride and Prejudice", "Outlander", "Jane Eyre"],
  "non-fiction": ["Sapiens", "Educated", "Hiroshima"],
  "horror": ["Dracula", "Frankenstein", "The Haunting of Hill House"]
};
// 通用的高评分书单（如果用户没指定genre）
const topRatedGeneral = [
  "To Kill a Mockingbird",
  "1984",
  "The Great Gatsby",
  "The Catcher in the Rye"
];

// 1.6 多重条件推荐 (MultiCriteriaRecommendationIntent)
//     训练短语中可能出现：genre(romance, fantasy, etc.), length(short/long), rated(high-rate, good reviews), pages (<300?)等
//     这里只做简单示例，根据“short/long + rated + genre”拼接回答
function getMultiCriteriaBooks(genre, length, rated) {
  // 只做部分组合示例；可根据需要扩展
  const shortHighlyRated = {
    romance: ["Breakfast at Tiffany's (Novella)", "The Princess Bride (relatively short)"],
    fantasy: ["The Ocean at the End of the Lane", "Coraline"],
    horror: ["Carmilla", "We Have Always Lived in the Castle"],
    mystery: ["The Big Sleep", "The Hound of the Baskervilles"],
    nonfiction: ["Man's Search for Meaning", "The Art of War"]
  };
  const longHighlyRated = {
    fantasy: ["The Way of Kings", "The Eye of the World"],
    romance: ["Gone with the Wind", "Outlander"],
    horror: ["IT by Stephen King", "The Stand"],
    mystery: ["The Girl with the Dragon Tattoo", "Lonesome Dove (more western)"],
    nonfiction: ["Team of Rivals", "The Power Broker"]
  };

  // 将空字符串转为null，方便逻辑判断
  genre = genre || null;
  length = length || null;
  rated = rated || null;

  // 如果没有genre，就默认给一个提示
  if (!genre) {
    return ["(No specific genre provided) Possibly: '1984', 'Pride and Prejudice', 'The Hobbit'..."];
  }

  // 转成小写
  genre = genre.toLowerCase();

  // 简单判断
  if (rated && (rated.includes("high") || rated.includes("good"))) {
    // high rated
    if (length && length.includes("short")) {
      // short + high rated + genre
      if (shortHighlyRated[genre]) {
        return shortHighlyRated[genre];
      } else {
        return [`No short highly-rated ${genre} in my list right now.`];
      }
    } else if (length && length.includes("long")) {
      // long + high rated + genre
      if (longHighlyRated[genre]) {
        return longHighlyRated[genre];
      } else {
        return [`No long highly-rated ${genre} in my list right now.`];
      }
    } else {
      // 只写 high rated + genre
      if (topRatedByGenre[genre]) {
        return topRatedByGenre[genre];
      } else {
        return [`No highly-rated ${genre} in my list.`];
      }
    }
  } else {
    // 没有 "rated" 或没包含 high/good => 就给一个普通推荐
    if (genreRecommendations[genre]) {
      return genreRecommendations[genre];
    } else {
      return [`I don't have multi-criteria data for genre "${genre}" right now.`];
    }
  }
}

// ====================== 2. 意图处理函数 ======================

/** Default Welcome Intent */
function welcome(agent) {
  agent.add(
    "Hello! I'm your Book Recommender Bot. " +
    "I can help you with: \n" +
    "• Author-based recommendations\n" +
    "• Book information\n" +
    "• Genre-based recommendations\n" +
    "• Multi-criteria recommendations\n" +
    "• Similar book suggestions\n" +
    "• Top-rated books\n\n" +
    "Just ask! And if you're done, say 'goodbye'."
  );
}

/** Default Fallback Intent */
function fallback(agent) {
  agent.add("I’m sorry, I didn’t catch that. Could you please rephrase?");
}

/** 1) 按作者推荐书籍 */
function authorBasedRecommendation(agent) {
  const author = (agent.parameters.author || "").toLowerCase().trim();
  
  if (!author) {
    // 未提取到author
    agent.add("Which author are you interested in?");
    return;
  }
  
  const recs = authorRecommendations[author];
  if (recs) {
    agent.add(`Here are some recommended books by ${author}:\n• ${recs.join("\n• ")}`);
  } else {
    agent.add(`I don't have recommendations for "${author}" at the moment.`);
  }
  agent.add("Is there anything else you'd like to know?");
}

/** 2) 查询书籍信息 */
function bookInformation(agent) {
  const book = (agent.parameters.book_info || "").toLowerCase().trim();
  
  if (!book) {
    agent.add("Which book would you like information about?");
    return;
  }
  
  if (!bookDetails[book]) {
    agent.add(`I don't have information about "${book}" at the moment.`);
    agent.add("Is there anything else you'd like to know?");
    return;
  }
  
  const query = agent.query.toLowerCase();
  const info = bookDetails[book];
  let response = "";
  
  // 根据用户问句里的关键词，判断要返回哪部分信息
  if (query.includes("published")) {
    response = `${info.title} was published in ${info.publishedYear}.`;
  } else if (query.includes("page") || query.includes("pages")) {
    response = `${info.title} has about ${info.pages} pages.`;
  } else if (query.includes("who wrote") || query.includes("author")) {
    response = `${info.title} was written by ${info.author}.`;
  } else if (query.includes("about") || query.includes("what is") || query.includes("tell me")) {
    response = `${info.title}: ${info.summary}`;
  } else {
    // 默认给 summary
    response = `${info.title}: ${info.summary}`;
  }
  
  agent.add(response);
  agent.add("Is there anything else you'd like to know?");
}

/** 3) 按类型推荐书籍 */
function genreBasedRecommendation(agent) {
  const genre = (agent.parameters.genre || "").toLowerCase().trim();
  
  if (!genre) {
    agent.add("Which genre are you interested in?");
    return;
  }
  
  const recs = genreRecommendations[genre];
  if (recs) {
    agent.add(`Here are some ${genre} recommendations:\n• ${recs.join("\n• ")}`);
  } else {
    agent.add(`I'm not sure about "${genre}" right now. I don't have data for that genre.`);
  }
  agent.add("Is there anything else you'd like to know?");
}

/** 4) 多重条件推荐 */
function multiCriteriaRecommendation(agent) {
  const genre = (agent.parameters.genre || "").toLowerCase().trim();
  const length = (agent.parameters.length || "").toLowerCase().trim();
  const rated = (agent.parameters.rated || "").toLowerCase().trim();
  
  // 如果都没有，就提示
  if (!genre && !length && !rated) {
    agent.add("Sure, can you specify the genre, length (short/long), or rating preference (high-rate/good reviews) you're looking for?");
    return;
  }
  
  const results = getMultiCriteriaBooks(genre, length, rated);
  if (results.length > 0) {
    agent.add(`Based on your preferences, here are some suggestions:\n• ${results.join("\n• ")}`);
  } else {
    agent.add("I couldn't find any matches for those criteria, sorry.");
  }
  agent.add("Is there anything else you'd like to know?");
}

/** 5) 寻找类似的书籍 */
function similarBookRecommendation(agent) {
  const bookTitle = (agent.parameters.book_title || "").toLowerCase().trim();
  
  if (!bookTitle) {
    agent.add("Which book would you like to find something similar to?");
    return;
  }
  
  const recs = similarBooks[bookTitle];
  if (recs) {
    agent.add(`Here are some books similar to "${bookTitle}":\n• ${recs.join("\n• ")}`);
  } else {
    agent.add(`I don't have similar titles for "${bookTitle}" at the moment.`);
  }
  agent.add("Is there anything else you'd like to know?");
}

/** 6) 推荐评分最高的书籍 */
function topRatedBooks(agent) {
  const genre = (agent.parameters.genre || "").toLowerCase().trim();
  
  if (!genre) {
    // 如果用户没有给 genre，就给通用高分书
    agent.add(`Some top-rated books in general:\n• ${topRatedGeneral.join("\n• ")}`);
  } else {
    const recs = topRatedByGenre[genre];
    if (recs) {
      agent.add(`Here are some top-rated ${genre} books:\n• ${recs.join("\n• ")}`);
    } else {
      agent.add(`I don't have top-rated ${genre} books on my list right now.`);
    }
  }
  agent.add("Is there anything else you'd like to know?");
}

/** 7) 结束聊天 (Goodbye Intent) */
function goodbye(agent) {
  agent.add("It was my pleasure to help you! Have a great day!");
}

// ====================== 3. Express 路由 & Intent Map ======================

app.post('/webhook', (request, response) => {
  const agent = new WebhookClient({ request, response });
  
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  
  intentMap.set('AuthorBasedRecommendationIntent', authorBasedRecommendation);
  intentMap.set('BookInformationIntent', bookInformation);
  intentMap.set('GenreBasedRecommendationIntent', genreBasedRecommendation);
  intentMap.set('MultiCriteriaRecommendationIntent', multiCriteriaRecommendation);
  intentMap.set('SimilarBookRecommendationIntent', similarBookRecommendation);
  intentMap.set('TopRatedBooksIntent', topRatedBooks);

  // 自定义结束聊天意图
  intentMap.set('Goodbye', goodbye);
  
  agent.handleRequest(intentMap);
});

// ====================== 4. 启动服务器 ======================
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Book Recommender Fulfillment is running on port ${port}`);
});
